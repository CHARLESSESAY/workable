import { getState, sanitizeInput } from '../utils/helpers.js';
import { generateAIResponse } from '../services/ai.js';

export function initReports() {
  const hasData = getState().checkins.length >= 3;
  document.getElementById('rempty').style.display = hasData ? 'none' : 'block';
  document.getElementById('rdata').style.display = hasData ? 'block' : 'none';
}

async function genReport(type) {
  const out = document.getElementById('rout'), ttl = document.getElementById('rtitle'), body = document.getElementById('rbody');
  out.style.display = 'block';
  ttl.textContent = type === 'weekly' ? '📅 Weekly summary — generating…' : '📈 Monthly review — generating…';
  body.innerHTML = '<div style="display:flex;align-items:center;gap:10px;color:var(--purple);font-size:13px"><div style="width:16px;height:16px;border:2px solid var(--purple-light);border-top-color:var(--purple);border-radius:50%;animation:spin .7s linear infinite"></div>Writing your report…</div>';
  out.scrollIntoView({behavior:'smooth'});
  const state = getState();
  const recent = state.checkins.slice(-14);
  const pr = `Write a detailed ${type==='weekly'?'weekly':'monthly'} performance report for ${state.name}, a ${state.detectedRole||'professional'} at ${state.company}.\nGoal: "${state.goal}"\nRecent check-in data: ${JSON.stringify(recent)}\n\nWrite 4 sections with clear paragraph breaks:\n1. Performance summary\n2. Patterns identified\n3. Achievements\n4. Recommendations`;
  try {
    const d = await generateAIResponse(pr);
    ttl.textContent = type === 'weekly' ? '📅 Weekly summary' : '📈 Monthly review';
    body.innerHTML = sanitizeInput(d).split('\n').filter(Boolean).map(p => `<p style="margin-bottom:.85rem">${sanitizeInput(p)}</p>`).join('');
  } catch {
    ttl.textContent = type === 'weekly' ? '📅 Weekly summary' : '📈 Monthly review';
    body.innerHTML = `<p style="margin-bottom:.85rem"><strong>Performance summary:</strong> You have completed <strong>${state.checkins.length} check-ins</strong> with a current streak of <strong>${getState().getStreak()} days</strong>.</p><p style="margin-bottom:.85rem"><strong>Recommendation:</strong> Report generation relies on your configured API backend.</p>`;
  }
}

window.genReport = genReport;
