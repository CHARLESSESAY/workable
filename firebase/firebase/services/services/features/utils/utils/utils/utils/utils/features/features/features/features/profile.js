import { getState, initials, fmtDate, getStreak, getAvg, sanitizeInput } from '../utils/helpers.js';

export function renderProfile() {
  const state = getState();
  const ini = initials(state.name);
  document.getElementById('prof-av').textContent = ini;
  document.getElementById('prof-name').textContent = state.name || 'Your Name';
  document.getElementById('prof-role').textContent = `${state.detectedRole||'Your role'}${state.company?' · '+state.company:''}`;
  document.getElementById('ps-ci').textContent = state.checkins.length;
  document.getElementById('ps-streak').textContent = (state.bestStreak || getStreak()) + 'd';
  document.getElementById('ps-avg').textContent = state.checkins.length ? getAvg() + '%' : '—';
  document.getElementById('ps-days').textContent = new Set(state.checkins.map(c => c.date)).size;
  document.getElementById('prof-goal').textContent = state.goal || 'No goal set — add one in Settings.';
  renderAchievements();
  renderCIGrid();
}

function renderAchievements() {
  const ci = getState().checkins.length, streak = getStreak();
  const badges = [];
  if (ci>=1) badges.push({ic:'🌱',label:'First check-in',desc:'You started!'});
  if (ci>=7) badges.push({ic:'🔥',label:'One week',desc:'7 check-ins logged'});
  if (ci>=30) badges.push({ic:'⭐',label:'30 check-ins',desc:'A month of data'});
  if (streak>=3) badges.push({ic:'💫',label:'3-day streak',desc:'Consistency building'});
  if (streak>=7) badges.push({ic:'🏆',label:'7-day streak',desc:'Full week streak!'});
  if (streak>=30) badges.push({ic:'🚀',label:'30-day streak',desc:'Elite consistency'});
  if (!badges.length) badges.push({ic:'🎯',label:'Getting started',desc:'Complete your first check-in'});
  document.getElementById('achievements').innerHTML = badges.map(b => `
    <div style="display:flex;align-items:center;gap:8px;background:var(--surface);border:1.5px solid var(--surface2);border-radius:var(--r);padding:.6rem .85rem;font-size:13px">
      <span style="font-size:18px">${sanitizeInput(b.ic)}</span>
      <div><div style="font-weight:600;color:var(--ink)">${sanitizeInput(b.label)}</div><div style="font-size:11px;color:var(--ink3)">${sanitizeInput(b.desc)}</div></div>
    </div>`).join('');
}

function renderCIGrid() {
  const grid = document.getElementById('ci-history-grid');
  const ciDates = new Set(getState().checkins.map(c => c.date));
  const days = [];
  for (let i=59; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    days.push(d.toISOString().slice(0,10));
  }
  grid.innerHTML = days.map(d => {
    const done = ciDates.has(d);
    const isToday = d === new Date().toISOString().slice(0,10);
    return `<div title="${fmtDate(d)}" style="width:28px;height:28px;border-radius:5px;background:${done?'var(--purple)':isToday?'var(--purple-light)':'var(--surface2)'};border:${isToday?'2px solid var(--purple)':'none'};transition:background .2s"></div>`;
  }).join('');
}
