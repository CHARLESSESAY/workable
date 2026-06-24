import { getState, sanitizeInput, renderSkeleton, computeAvg } from '../utils/helpers.js';
import { loadTeam, loadTeamCheckins } from '../firebase/firestore.js';

export async function renderTeamDashboard() {
  const container = document.querySelector('#page-team .main-content');
  if (!container) return;
  renderSkeleton(container, 'card', 5);

  try {
    const team = await loadTeam();
    const allCheckins = await loadTeamCheckins();
    const healthScore = computeHealth(allCheckins);
    const participation = computeParticipation(team, allCheckins);
    const burnout = detectBurnout(allCheckins, team);
    const moodAvg = computeAvg(allCheckins, 'mood');
    const prodAvg = computeAvg(allCheckins, 'prod');

    container.innerHTML = `
      <div class="phead">
        <h1 class="ptitle">Team Health</h1>
        <span class="badge bg">${healthScore}%</span>
      </div>
      <div class="kgrid">
        <div class="kpi"><div class="kpic" style="background:var(--green-light)">✅</div><div class="kpiv">${participation}%</div><div class="kpil">Participation</div></div>
        <div class="kpi"><div class="kpic" style="background:var(--purple-light)">📊</div><div class="kpiv">${prodAvg}/5</div><div class="kpil">Avg Productivity</div></div>
        <div class="kpi"><div class="kpic" style="background:var(--amber-light)">😊</div><div class="kpiv">${moodAvg}/5</div><div class="kpil">Avg Mood</div></div>
        <div class="kpi"><div class="kpic" style="background:var(--red-light)">🔥</div><div class="kpiv">${burnout.length}</div><div class="kpil">Burnout Risks</div></div>
      </div>
      <div class="card">
        <h3>⚠️ Attention Needed</h3>
        ${burnout.length ? burnout.map(e => `<div class="ri"><span>${sanitizeInput(e.name)}</span><span class="badge ba">Low mood</span></div>`).join('') : '<p>All clear ✨</p>'}
      </div>
    `;
  } catch (error) {
    container.innerHTML = '<p>Unable to load team data.</p>';
  }
}

function computeHealth(checkins) {
  if (!checkins.length) return 0;
  const today = new Date().toISOString().slice(0,10);
  const todayCheckins = checkins.filter(c => c.date === today);
  const partRate = (todayCheckins.length / checkins.length) * 100;
  const avgMood = computeAvg(checkins, 'mood');
  const avgProd = computeAvg(checkins, 'prod');
  return Math.round((partRate * 0.3 + avgMood * 20 + avgProd * 20) / 0.7);
}

function computeParticipation(team, checkins) {
  if (!team.length) return 0;
  const today = new Date().toISOString().slice(0,10);
  const todayIds = new Set(checkins.filter(c => c.date === today).map(c => c.uid));
  const count = team.filter(m => todayIds.has(m.uid)).length;
  return Math.round((count / team.length) * 100);
}

function detectBurnout(checkins, team) {
  const empCheckins = {};
  checkins.forEach(c => {
    if (!empCheckins[c.uid]) empCheckins[c.uid] = [];
    empCheckins[c.uid].push(c);
  });
  const atRisk = [];
  for (const [uid, cList] of Object.entries(empCheckins)) {
    const last3 = cList.slice(-3);
    if (last3.length === 3 && last3.every(c => (c.mood||0) < 3 && (c.prod||0) < 3)) {
      const member = team.find(m => m.uid === uid);
      atRisk.push({ uid, name: member?.name || 'Unknown' });
    }
  }
  return atRisk;
}
