import { getState, renderSkeleton, getStreak, getAvg, fmtDate, sanitizeInput } from '../utils/helpers.js';

export async function refreshDashboard() {
  renderSkeleton(document.getElementById('dkpis'), 'kpi', 4);
  renderSkeleton(document.getElementById('drec'), 'card', 3);
  renderSkeleton(document.getElementById('goal-progress'), 'bar', 1);

  requestAnimationFrame(() => {
    const state = getState();
    const h = new Date().getHours();
    document.getElementById('dhi').textContent = `Good ${h<12?'morning':h<17?'afternoon':'evening'}, ${(state.name||'User').split(' ')[0]} 👋`;
    document.getElementById('dsub').textContent = `${state.detectedRole||'Your role'}${state.company?' · '+state.company:''}`;
    document.getElementById('dgoal').textContent = state.goal || 'No goal set yet — add one in Settings.';
    renderKPIs();
    renderBars();
    renderStreakBanner();
    renderSparkline();
    renderRecentCI();
    renderGoalProgress();
  });
}

function renderKPIs() {
  const state = getState();
  const ci = state.checkins.length, streak = getStreak(), avg = getAvg();
  const kpis = state.role === 'employer' ? [
    {ic:'👥',bg:'var(--purple-light)',v:'0',l:'Active employees',d:'Invite your team',c:'fl'},
    {ic:'✅',bg:'var(--green-light)',v:'—',l:'Check-in rate',d:'No data yet',c:'fl'},
    {ic:'📊',bg:'var(--amber-light)',v:'—',l:'Avg output score',d:'No data yet',c:'fl'},
    {ic:'🚧',bg:'var(--red-light)',v:'0',l:'Open blockers',d:'All clear',c:'up'},
  ] : [
    {ic:'✅',bg:'var(--green-light)',v:ci,l:'Check-ins done',d:ci===0?'Start today! 👆':'+1 from yesterday',c:ci>0?'up':'fl'},
    {ic:'🔥',bg:'var(--amber-light)',v:streak+'d',l:'Current streak',d:streak>=7?'Amazing! 🏆':streak>0?'Keep it alive!':'Check in to start',c:streak>=3?'up':'fl'},
    {ic:'📊',bg:'var(--purple-light)',v:ci>0?avg+'%':'—',l:'Avg output score',d:ci>0?'From '+ci+' check-ins':'No data yet',c:avg>=70?'up':avg>0?'fl':'fl'},
    {ic:'🎯',bg:'var(--blue-light)',v:ci>0?'Active':'—',l:'Goal tracking',d:ci===0?'Set in onboarding':'AI monitoring',c:ci>0?'up':'fl'},
  ];
  document.getElementById('dkpis').innerHTML = kpis.map(k => `
    <div class="kpi"><div class="kpic" style="background:${k.bg}">${k.ic}</div>
    <div class="kpiv">${k.v}</div><div class="kpil">${k.l}</div>
    <div class="kpid ${k.c}">${k.d}</div></div>`).join('');
}

function renderBars() {
  const state = getState();
  const bars = document.getElementById('dbars'), ins = document.getElementById('dins');
  if (!state.checkins.length) {
    bars.innerHTML = '<div style="text-align:center;padding:1.5rem 0;font-size:13px;color:var(--ink3);line-height:1.7">No data yet.<br>Complete your first check-in to see your progress here.</div>';
    ins.textContent = 'Check in for the first time and AI will give you a personalised insight based on your real data.';
    return;
  }
  const avgScore = getAvg();
  bars.innerHTML = state.trackFields.slice(0,4).map(f => {
    const v = Math.min(100, Math.round(40 + (avgScore/100)*50 + Math.random()*15));
    const col = v>=80?'var(--green)':v>=60?'var(--purple)':'var(--amber)';
    return `<div class="br2"><span class="blbl">${sanitizeInput(f.label)}</span><span class="bvl">${v}%</span></div>
    <div class="btrack"><div class="bfill" style="width:${v}%;background:${col}"></div></div>`;
  }).join('');
  ins.textContent = `You have ${state.checkins.length} check-in${state.checkins.length>1?'s':''} logged. ${getStreak()>1?'Your '+getStreak()+'-day streak is building great momentum. ':''}${avgScore>70?'Your output scores are strong — keep the consistency.':'Keep logging every day and your insights will get sharper.'}`;
}

function renderStreakBanner() {
  const s = getStreak(), banner = document.getElementById('streak-banner');
  if (s>=3) {
    banner.style.display = 'flex';
    document.getElementById('streak-msg').textContent = `🔥 ${s}-day streak — you're on fire!`;
    document.getElementById('streak-sub').textContent = s>=7?'One full week of consistency. Incredible.':s>=5?'Over halfway to 7 days — keep going!':'Building momentum. Check in again tomorrow.';
  } else banner.style.display = 'none';
}

function renderSparkline() {
  const state = getState();
  const sl = document.getElementById('sparkline');
  if (!state.checkins.length) { sl.innerHTML = ''; return; }
  const last7 = state.checkins.slice(-7);
  const scores = last7.map(c=>parseInt(c._s||c.score||65));
  const mx = Math.max(...scores,1);
  sl.innerHTML = scores.map(v => {
    const pct = Math.round((v/mx)*100);
    const col = v>=75?'var(--green)':v>=55?'var(--purple)':'var(--amber)';
    return `<div class="spark-bar" style="height:${pct}%;background:${col}" title="Score: ${v}%"></div>`;
  }).join('');
}

function renderRecentCI() {
  const state = getState();
  const rec = document.getElementById('drec'), lbl = document.getElementById('ci-count-lbl');
  lbl.textContent = state.checkins.length + ' total';
  if (!state.checkins.length) { rec.innerHTML = '<div style="padding:1rem 0;font-size:13px;color:var(--ink3);text-align:center">No check-ins yet.</div>'; return; }
  const last5 = state.checkins.slice(-5).reverse();
  rec.innerHTML = last5.map(c => `
    <div class="ri">
      <span class="rlbl">${fmtDate(c.date)}</span>
      <span style="font-size:12px;color:var(--ink3)">${c._s||c.score||'—'}%</span>
      <span class="badge bg">Done ✓</span>
    </div>`).join('');
}

function renderGoalProgress() {
  const state = getState();
  const gp = document.getElementById('goal-progress');
  if (!state.checkins.length) { gp.innerHTML = ''; return; }
  const pct = Math.min(100, Math.round((state.checkins.length/30)*100));
  gp.innerHTML = `<div class="br2"><span class="blbl">Month progress</span><span class="bvl">${state.checkins.length}/30 check-ins</span></div>
  <div class="btrack"><div class="bfill" style="width:${pct}%;background:var(--purple)"></div></div>`;
}
