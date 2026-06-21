let S = {
  role: 'employee',
  name: '',
  company: '',
  detectedRole: '',
  goal: '',
  trackFields: [],
  checkins: [],
  feedPosts: []
};

export function getState() { return S; }
export function setState(partial) { S = { ...S, ...partial }; }

export function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

export function showToast(icon, msg, duration = 3000) {
  const t = document.getElementById('toast');
  t.querySelector('.toast-ic').textContent = icon;
  t.querySelector('.toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

export function initials(name) {
  return (name || 'WP').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function getStreak(checkins) {
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

export function getAvg(checkins) {
  if (!checkins.length) return 0;
  const scores = checkins.map(c => parseInt(c.score || c._s || 65));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
