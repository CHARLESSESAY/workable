let S = {
  role: 'employee',
  name: '',
  company: '',
  detectedRole: '',
  detectedIndustry: '',
  goal: '',
  trackFields: [],
  checkins: [],
  feedPosts: [],
  bestStreak: 0,
  daysActive: 0,let S = {
  role: 'employee', name: '', company: '', detectedRole: '', detectedIndustry: '',
  goal: '', trackFields: [], checkins: [], feedPosts: [],
  bestStreak: 0, daysActive: 0, perfLevel: 'performing', deliverables: [], companyCode: ''
};

export function getState() { return S; }
export function setState(partial) { S = { ...S, ...partial }; }

export function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

export function showToast(icon, msg, type = 'info', duration = 3000) {
  const t = document.getElementById('toast');
  document.getElementById('toast-ic').textContent = DOMPurify.sanitize(icon);
  document.getElementById('toast-msg').textContent = DOMPurify.sanitize(msg);
  t.className = `toast ${type}`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

export function initials(name) { return (name||'WP').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
export function fmtDate(d) { return new Date(d).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}); }
export function delay(ms) { return new Promise(r=>setTimeout(r,ms)); }

export function getStreak() {
  if (!S.checkins.length) return 0;
  const dates = [...new Set(S.checkins.map(c=>c.date))].sort().reverse();
  let s = 0;
  const now = new Date();
  for (const dt of dates) {
    const cd = new Date(dt);
    const diff = Math.round((now - cd) / 86400000);
    if (diff <= s+1) s++; else break;
  }
  return s;
}

export function getAvg() {
  if (!S.checkins.length) return 0;
  const scores = S.checkins.map(c=>parseInt(c._s || c.score || 65));
  return Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
}

export function computeAvg(checkins, key) {
  const vals = checkins.map(c=>parseFloat(c[key])).filter(v=>!isNaN(v));
  return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
}

export function renderSkeleton(container, type='card', count=1) {
  const templates = {
    kpi: () => `
      <div class="kpi skeleton">
        <div class="kpic skeleton-shimmer" style="width:46px;height:46px;border-radius:12px;"></div>
        <div class="kpiv skeleton-shimmer" style="width:60%;height:1.5rem;margin:0.5rem 0;"></div>
        <div class="kpil skeleton-shimmer" style="width:80%;height:0.8rem;"></div>
        <div class="kpid skeleton-shimmer" style="width:50%;height:0.8rem;"></div>
      </div>`,
    card: () => `
      <div class="card skeleton">
        <div class="skeleton-shimmer" style="height:1rem;width:50%;margin-bottom:0.5rem;"></div>
        <div class="skeleton-shimmer" style="height:0.8rem;width:80%;margin-bottom:0.5rem;"></div>
        <div class="skeleton-shimmer" style="height:0.8rem;width:60%;"></div>
      </div>`,
    bar: () => `
      <div class="skeleton-shimmer" style="height:8px;width:${40+Math.floor(Math.random()*40)}%;margin-bottom:1rem;border-radius:4px;"></div>`
  };
  container.innerHTML = Array.from({length:count}, ()=>templates[type]()).join('');
}

export function timeAgo(iso) {
  const d = Date.now() - new Date(iso).getTime();
  if (d<60000) return 'Just now';
  if (d<3600000) return Math.floor(d/60000)+'m ago';
  if (d<86400000) return Math.floor(d/3600000)+'h ago';
  return Math.floor(d/86400000)+'d ago';
}
  perfLevel: 'performing',
  deliverables: [],
  companyCode: ''
};

export function getState() { return S; }
export function setState(partial) { S = { ...S, ...partial }; }

export function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

export function showToast(icon, msg, duration = 3000) {
  const t = document.getElementById('toast');
  document.getElementById('toast-ic').textContent = DOMPurify.sanitize(icon);
  document.getElementById('toast-msg').textContent = DOMPurify.sanitize(msg);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

export function initials(name) {
  return (name || 'WP').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function getStreak() {
  const checkins = S.checkins;
  if (!checkins.length) return 0;
  const dates = [...new Set(checkins.map(c => c.date))].sort().reverse();
  let s = 0;
  const now = new Date();
  for (const dt of dates) {
    const cd = new Date(dt);
    const diff = Math.round((now - cd) / 86400000);
    if (diff <= s + 1) { s++; } else break;
  }
  return s;
}

export function getAvg() {
  const checkins = S.checkins;
  if (!checkins.length) return 0;
  const scores = checkins.map(c => parseInt(c._s || c.score || 65));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function timeAgo(iso) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return 'Just now';
  if (d < 3600000) return Math.floor(d / 60000) + 'm ago';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h ago';
  return Math.floor(d / 86400000) + 'd ago';
}
