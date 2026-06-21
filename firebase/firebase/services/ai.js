import { getIdToken } from '../firebase/auth.js';
const AI_PROXY_URL = 'https://broken-glade-bcb9.sesaycharle.workers.dev';

export function initServices() {}

export async function generateAIResponse(prompt) {
  const token = await getIdToken();
  const response = await fetch(AI_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'AI proxy error');
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
// app.js additions
window.nav = function(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');

  document.querySelectorAll('.sbi').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mni').forEach(b => b.classList.remove('active'));
  // ... also update the active class on sidebar and mobile nav items (optional)

  const menu = document.getElementById('mobnav');
  if (menu && menu.classList.contains('open')) {
    menu.classList.remove('open');
    document.querySelector('.hamburger').textContent = '☰';
  }

  if (id === 'checkin') import('./features/checkin.js').then(m => m.initCheckin());
  if (id === 'community') import('./features/feed.js').then(m => m.loadAndRenderFeed());
  if (id === 'reports') import('./features/reports.js').then(m => m.initReports());
  if (id === 'profile') import('./features/profile.js').then(m => m.renderProfile());
  if (id === 'settings') import('./features/settings.js').then(m => m.initSettings());
  if (id === 'dashboard') import('./features/dashboard.js').then(m => m.refreshDashboard());
  if (id === 'team') import('./features/team.js').then(m => m.renderTeamTable());
};

window.toggleMenu = function() {
  const menu = document.getElementById('mobnav');
  const btn = document.querySelector('.hamburger');
  menu.classList.toggle('open');
  btn.textContent = menu.classList.contains('open') ? '✕' : '☰';
};
