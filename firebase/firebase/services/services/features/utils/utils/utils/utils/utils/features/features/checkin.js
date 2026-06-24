import { getState, setState, showToast, getStreak, sanitizeInput } from '../utils/helpers.js';
import { saveCheckin } from '../firebase/firestore.js';
import { generateAIResponse } from '../services/ai.js';
import { saveState } from '../utils/localStorage.js';

export function initCheckin() {
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('cidate').textContent = new Date().toLocaleDateString('en-GB',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  document.getElementById('cisuccess').style.display = 'none';
  const doneTodayEl = document.getElementById('already-done');
  const formEl = document.getElementById('ci-form-wrap');
  if (getState().checkins.some(c => c.date === today)) {
    doneTodayEl.style.display = 'block'; formEl.style.display = 'none';
  } else {
    doneTodayEl.style.display = 'none'; formEl.style.display = 'block';
  }
}

export function showCheckinForm() {
  document.getElementById('already-done').style.display = 'none';
  document.getElementById('ci-form-wrap').style.display = 'block';
}

export async function submitCI() {
  const state = getState();
  const btn = document.getElementById('ci-submit-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const today = new Date().toISOString().slice(0,10);
  const data = { date: today }; let sc = 70;
  let rTotal = 0, rCount = 0;
  state.trackFields.forEach(f => {
    const el = document.getElementById('ci-'+f.id);
    if (el) data[f.label] = el.value || '';
    if (f.type.startsWith('Rating') && el?.value) { const v = parseInt(el.value); rTotal += v; rCount++; }
  });
  data.mood = document.getElementById('ci-mood')?.value || '';
  data.prod = document.getElementById('ci-prod')?.value || '';
  data.win = document.getElementById('ci-win')?.value || '';
  data.challenge = document.getElementById('ci-challenge')?.value || '';
  if (rCount > 0) sc = Math.round((rTotal/rCount/5)*100);
  if (data.prod) sc = Math.round(sc*0.6 + parseInt(data.prod)*12);
  data.flag = document.getElementById('ciflag')?.value || '';
  data._s = sc;
  state.checkins.push(data);
  state.bestStreak = Math.max(state.bestStreak, getStreak());
  state.daysActive = new Set(state.checkins.map(c => c.date)).size;
  setState(state);
  saveState(state);
  if (window.firebase?.auth().currentUser) {
    saveCheckin({ date: today, score: sc, flag: data.flag, fields: Object.fromEntries(Object.entries(data).filter(([k])=>!['date','_s','flag'].includes(k))) }).catch(e=>console.warn(e));
  }
  document.getElementById('ci-form-wrap').style.display = 'none';
  document.getElementById('cisuccess').style.display = 'block';
  document.getElementById('cisuccess').scrollIntoView({behavior:'smooth'});

  const streak = getStreak();
  document.getElementById('assess-score').textContent = sc+'%';
  setTimeout(()=>document.getElementById('assess-score-bar').style.width=sc+'%',200);
  document.getElementById('assess-subtitle').textContent = 'Check-in #'+state.checkins.length+' · '+new Date().toLocaleDateString('en-GB',{weekday:'long'});
  const sbadge = document.getElementById('assess-streak-badge');
  if (sbadge&&streak>1) { sbadge.style.display='inline'; sbadge.textContent='🔥 '+streak+'-day streak'; }
  const lvl = sc>=85?'Exceptional':sc>=70?'Strong':sc>=55?'Steady':sc>=40?'Progressing':'Developing';
  document.getElementById('assess-level-badge').textContent = lvl;

  buildSignalCards(data, sc, streak);
  const gp = Math.min(100, Math.round((state.checkins.length/22)*100));
  const gcEl = document.getElementById('assess-goal-card');
  if (gcEl) gcEl.style.display = 'block';
  document.getElementById('assess-goal-text').textContent = state.goal || 'No goal set';
  setTimeout(()=>document.getElementById('assess-goal-bar').style.width=gp+'%',400);
  document.getElementById('assess-goal-pct').textContent = gp+'%';

  if (streak===1) showToast('🎯','First check-in logged — great start!');
  else if (streak===3) showToast('🔥','3-day streak — the habit is forming!');
  else if (streak===7) showToast('🏆','One full week — elite consistency!');

  if (document.getElementById('cishare')?.checked) autoPost(data);
  await generateAssessment(data, sc, streak);
  btn.disabled = false; btn.textContent = 'Submit Daily Check-In →';
}

function buildSignalCards(data, sc, streak) {
  const wrap = document.getElementById('assess-signals');
  if (!wrap) return;
  const signals = [
    {icon:streak>=7?'🏆':streak>=3?'🔥':'📅',label:'Consistency',value:streak+' day'+(streak!==1?'s':''),sub:streak>=7?'Elite performer':streak>=3?'Habit forming':'Keep daily cadence',color:streak>=7?'var(--gold)':streak>=3?'var(--green)':'var(--ink3)'},
    {icon:sc>=80?'⚡':sc>=60?'📊':'📈',label:'Output score',value:sc+'%',sub:sc>=80?'Exceptional today':sc>=60?'Strong performance':'Room to grow',color:sc>=80?'var(--green)':sc>=60?'var(--purple)':'var(--amber)'},
    {icon:'🗂️',label:'Check-ins logged',value:getState().checkins.length,sub:getState().checkins.length>=20?'Rich data set':getState().checkins.length>=10?'Growing history':'Building baseline',color:'var(--blue)'},
    {icon:data.flag?'🚩':'✅',label:'Manager flag',value:data.flag?'Flagged':'All clear',sub:data.flag?'Item sent to manager':'No blockers raised',color:data.flag?'var(--amber)':'var(--green)'}
  ];
  wrap.innerHTML = signals.map(s => `
    <div class="card" style="padding:1rem;border-top:3px solid ${s.color}">
      <div style="font-size:1.5rem;margin-bottom:.4rem">${sanitizeInput(s.icon)}</div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--ink3);margin-bottom:.2rem">${sanitizeInput(s.label)}</div>
      <div style="font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:700;color:var(--ink);margin-bottom:.2rem">${sanitizeInput(String(s.value))}</div>
      <div style="font-size:11px;color:var(--ink4)">${sanitizeInput(s.sub)}</div>
    </div>`).join('');
}

async function generateAssessment(data, sc, streak) {
  const state = getState();
  const resp = document.getElementById('ciaiResp'), recCard = document.getElementById('assess-rec-card'), recEl = document.getElementById('assess-rec');
  try {
    const hist = state.checkins.slice(-7);
    const avgSc = hist.length ? Math.round(hist.reduce((a,c)=>a+(c._s||c.score||70),0)/hist.length) : sc;
    const ds = Object.entries(data).filter(([k])=>!['date','_s','flag','_shared'].includes(k)).map(([k,v])=>'• '+k+': '+(v||'not entered')).join('\n');
    const flagNote = data.flag ? 'Manager flag submitted: "'+data.flag+'"' : 'No items flagged to manager.';
    const prompt = `You are Workable — a professional performance system. Generate an incisive, actionable written assessment for this professional based on their latest check-in data.\n\nPROFILE:\n- Name: ${state.name}\n- Role: ${state.detectedRole||'Professional'}\n- Goal: "${state.goal||'Not set'}"\n\nDATA:\n${ds}\n${flagNote}\nOutput score: ${sc}% | Streak: ${streak} days\n\nWrite a structured professional assessment with these exact bold headers:\n**Today's Performance Read** — 2 sentences.\n**Strength Signal** — 1 sentence.\n**Strategic Recommendation** — 1 action for tomorrow.\n**Motivational Close** — 1 sentence.\n\nTone: Professional, warm, direct. 200 words max.`;
    const text = await generateAIResponse(prompt);
    if (text) {
      const safe = sanitizeInput(text)
        .replace(/\*\*(.+?)\*\*/g,'<strong style="color:var(--purple);font-weight:700;display:block;margin-top:.85rem;margin-bottom:.25rem">$1</strong>')
        .replace(/\n\n/g,'</p><p style="margin-top:.5rem">')
        .replace(/^/,'<p>').replace(/$/,'</p>');
      resp.innerHTML = safe;
      const recMatch = text.match(/Strategic Recommendation[^:]*:([\s\S]*?)(?=\*\*Motivational|$)/i);
      if (recMatch&&recCard&&recEl) {
        recCard.style.display = 'block';
        recEl.textContent = recMatch[1].replace(/\*\*/g,'').trim().slice(0,350);
      }
    } else { resp.innerHTML = fallbackAssessment(sc, streak); }
  } catch(e) { resp.innerHTML = fallbackAssessment(sc, streak); }
}

function fallbackAssessment(sc, streak) {
  const lvl = sc>=80?'exceptional':sc>=65?'strong':sc>=50?'solid':'developing';
  return `<p><strong style="color:var(--purple)">Today's Performance Read</strong><br>Check-in #${getState().checkins.length} logged with an output score of ${sc}% — ${lvl} performance for today. Your ${streak}-day streak reflects growing professional discipline.</p><p style="margin-top:.75rem"><strong style="color:var(--purple)">Strategic Recommendation</strong><br>Check in tomorrow to continue building your baseline and unlock deeper insights.</p>`;
}

function autoPost(data) {
  const state = getState();
  const wins = Object.entries(data).filter(([k,v])=>v&&k!=='date'&&k!=='flag'&&k!=='_s').slice(0,2).map(([k,v])=>`${k}: ${v}`).join(' · ');
  state.feedPosts.unshift({
    id:Date.now(), author:state.name, role:state.detectedRole||'Team member', company:state.company||'Workable',
    color:['#5B3FF8','#00C896','#FF9F1C','#3B82F6'][Math.floor(Math.random()*4)],
    text:`Just completed check-in #${state.checkins.length}! 💪${wins?' Today: '+wins+'.':''} Staying consistent.`,
    tags:['💪 Win'], likes:0, liked:false, time:'Just now', checkins:state.checkins.length
  });
  setState(state);
  saveState(state);
}

export function resetCI() {
  document.getElementById('cisuccess').style.display = 'none';
  document.getElementById('ci-form-wrap').style.display = 'block';
  document.getElementById('already-done').style.display = 'none';
  getState().trackFields.forEach(f => {
    const el = document.getElementById('ci-'+f.id);
    if (el) el.value = '';
    document.querySelectorAll('.rbtn').forEach(b => b.classList.remove('sel'));
    document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('yes','no'));
  });
  if (document.getElementById('ciflag')) document.getElementById('ciflag').value = '';
}

// Global assignments
window.showCheckinForm = showCheckinForm;
window.submitCI = submitCI;
window.resetCI = resetCI;
