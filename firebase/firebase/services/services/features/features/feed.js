import { getState, setState, showToast, sanitizeInput, timeAgo, initials } from '../utils/helpers.js';
import { loadPosts, createPost, toggleLike } from '../firebase/firestore.js';
import { saveState } from '../utils/localStorage.js';

const FCOLORS = ['#5B3FF8','#00C896','#FF9F1C','#3B82F6','#EC4899','#8B5CF6'];

export async function loadAndRenderFeed() {
  if (window.firebase?.auth().currentUser) {
    try {
      const live = await loadPosts();
      const localIds = new Set(getState().feedPosts.map(p => String(p.id)));
      const merged = [...getState().feedPosts, ...live.filter(p => !localIds.has(String(p.id)))];
      renderFeedPosts(merged);
      return;
    } catch(e) { console.warn('Feed load:',e); }
  }
  renderFeedPosts(getState().feedPosts);
}

function renderFeedPosts(all) {
  document.getElementById('feedlist').innerHTML = all.map(p => {
    const safeAuthor = sanitizeInput(p.author);
    const safeRole = sanitizeInput(p.role);
    const safeCompany = sanitizeInput(p.company);
    const safeText = sanitizeInput(p.text);
    const safeTime = sanitizeInput(p.time);
    const tags = (p.tags||[]).map(t => `<span class="ptag" style="background:${p.color}22;color:${p.color}">${sanitizeInput(t)}</span>`).join('');
    return `<div class="pcard" id="pc${p.id}">
      <div class="phead2">
        <div class="pav" style="background:${p.color}">${initials(safeAuthor)}</div>
        <div><div class="pname">${safeAuthor}</div><div class="prole">${safeRole} · ${safeCompany}</div></div>
        <div class="ptime">${safeTime}</div>
      </div>
      <div class="pbody">${safeText}</div>
      <div style="margin-bottom:.5rem">${tags}</div>
      <div><span class="pstat">✅ ${p.checkins} check-ins</span></div>
      <div class="pacts">
        <button class="pabtn ${p.liked?'liked':''}" onclick="likeP('${p.id}',this)">${p.liked?'❤️':'🤍'} ${p.likes}</button>
        <button class="pabtn" onclick="toggleComments('${p.id}')">💬 Comment</button>
        <button class="pabtn">↗ Share</button>
      </div>
      <div id="comments-section-${p.id}" style="display:none;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--surface3);">
        <div id="comments-list-${p.id}" style="max-height:200px;overflow-y:auto;margin-bottom:0.8rem;"></div>
        <div style="display:flex;gap:0.5rem;">
          <input type="text" id="comment-input-${p.id}" placeholder="Write a comment..." style="flex:1;padding:0.5rem;border:1px solid var(--surface3);border-radius:6px;font-family:inherit;">
          <button onclick="submitComment('${p.id}')" style="padding:0.5rem 1rem;background:var(--grad-purple);color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Post</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

window.likeP = async function(id, btn) {
  const state = getState();
  const p = state.feedPosts.find(x => String(x.id)===String(id));
  if (!p) return;
  p.liked = !p.liked;
  p.likes += p.liked?1:-1;
  setState(state);
  saveState(state);
  const card = document.getElementById('pc'+id);
  if (card) {
    const b = card.querySelector('.pabtn');
    if (b) { b.className = `pabtn${p.liked?' liked':''}`; b.textContent = `${p.liked?'❤️':'🤍'} ${p.likes}`; }
  }
  if (window.firebase?.auth().currentUser) {
    try { await toggleLike(id); } catch(e){console.warn(e);}
  }
};

window.toggleComments = function(postId) {
  const section = document.getElementById(`comments-section-${postId}`);
  if (section.style.display==='none') {
    section.style.display='block';
    loadComments(postId);
  } else section.style.display='none';
};

async function loadComments(postId) {
  const listDiv = document.getElementById(`comments-list-${postId}`);
  listDiv.innerHTML = '<div style="font-size:12px;color:var(--ink3);">Loading comments...</div>';
  try {
    const db = window.firebase.firestore();
    const snap = await db.collection('post_comments').where('post_id','==',postId).orderBy('created_at','asc').get();
    if (snap.empty) {
      listDiv.innerHTML = '<div style="font-size:12px;color:var(--ink3);">No comments yet. Be the first!</div>';
      return;
    }
    listDiv.innerHTML = snap.docs.map(doc=>{
      const d=doc.data();
      return `<div style="margin-bottom:0.6rem;font-size:13px;line-height:1.4;"><strong>${sanitizeInput(d.author_name)}</strong> ${sanitizeInput(d.body)}</div>`;
    }).join('');
  } catch(e) {
    listDiv.innerHTML = '<div style="font-size:12px;color:var(--amber);">Failed to load comments.</div>';
  }
}

window.submitComment = async function(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const text = input.value.trim();
  if (!text) return;
  input.disabled = true;
  try {
    const db = window.firebase.firestore();
    await db.collection('post_comments').add({
      uid: window.firebase.auth().currentUser.uid,
      post_id: postId,
      author_name: getState().name || 'Anonymous',
      body: text,
      created_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
    loadComments(postId);
  } catch(e) {
    showToast('⚠️','Failed to post comment.');
  } finally {
    input.disabled = false;
  }
};

window.postFeed = async function() {
  const t = document.getElementById('comptext').value.trim();
  if (!t) { showToast('⚠️','Write something to share!'); return; }
  const sel = [...document.querySelectorAll('#comptags .tchip.sel')].map(b=>b.textContent);
  const newPost = {
    id: Date.now(), author: getState().name, role: getState().detectedRole||'Team member', company: getState().company||'Workable',
    color: FCOLORS[Math.floor(Math.random()*FCOLORS.length)], text: t,
    tags: sel.length?sel:['💪 Win'], likes:0, liked:false, time:'Just now', checkins: getState().checkins.length
  };
  getState().feedPosts.unshift(newPost);
  setState(getState());
  saveState(getState());
  if (window.firebase?.auth().currentUser) {
    try { await createPost(newPost); } catch(e) { console.warn(e); }
  }
  document.getElementById('comptext').value='';
  document.querySelectorAll('#comptags .tchip').forEach(b=>b.classList.remove('sel'));
  loadAndRenderFeed();
  showToast('🚀','Shared to the community!');
};
