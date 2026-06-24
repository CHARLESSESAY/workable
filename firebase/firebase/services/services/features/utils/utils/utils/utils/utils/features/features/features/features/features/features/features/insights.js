import { getState, renderSkeleton, sanitizeInput, computeAvg } from '../utils/helpers.js';
import { generateAIResponse } from '../services/ai.js';

export async function renderInsights() {
  const container = document.getElementById('insights-content');
  if (!container) return;
  renderSkeleton(container, 'card', 3);

  const state = getState();
  const recent = state.checkins.slice(-14);
  let suggestion = '';
  try {
    suggestion = await generateAIResponse(`Based on these recent checkins: ${JSON.stringify(recent)}, give 2-3 actionable suggestions for the employee to improve productivity and wellbeing.`);
    suggestion = sanitizeInput(suggestion || '');
  } catch { suggestion = 'Keep up the consistency — insights will sharpen with more data.'; }

  container.innerHTML = `
    <h2 class="ptitle">Your Performance Insights</h2>
    <div class="card">
      <h3>Mood & Productivity Trend</h3>
      <div id="insight-sparkline" class="sparkline" style="height:36px;"></div>
    </div>
    <div class="card">
      <h3>Goal Progress</h3>
      <div class="btrack"><div class="bfill" style="width:${Math.min(100,(state.checkins.length/22)*100)}%"></div></div>
      <div class="br2"><span>${state.checkins.length}/22 days this month</span></div>
    </div>
    <div class="card">
      <h3>AI Suggestions</h3>
      <p>${sanitizeInput(suggestion)}</p>
    </div>
  `;

  const spark = document.getElementById('insight-sparkline');
  if (spark && recent.length) {
    const scores = recent.map(c => parseFloat(c.prod) || 0);
    spark.innerHTML = scores.map(v => `<div class="spark-bar" style="height:${v*20}%;background:var(--purple)"></div>`).join('');
  }
}
