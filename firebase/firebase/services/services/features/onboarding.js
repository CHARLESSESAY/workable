import { saveProfile, loadProfile, loadCheckins, loadTrackFields, saveTrackFields, upsertCompany } from '../firebase/firestore.js';
import { signUpWithEmail, signInWithGoogle } from '../firebase/auth.js';
import { generateAIResponse } from '../services/ai.js';
import { goTo, showToast, getState, setState, initials, getStreak, getAvg, fmtDate, delay } from '../utils/helpers.js';
import { validateEmail, validateName, validatePassword } from '../utils/validation.js';
import { sanitizeInput } from '../utils/sanitization.js';
import { handleError } from '../utils/errorHandler.js';
import { saveState, loadState } from '../utils/localStorage.js';

const DFIELDS = [
  {id:'d1',label:'High-priority tasks completed',type:'Number'},
  {id:'d2',label:'Output quality (self-assessment)',type:'Rating 1-5'},
  {id:'d3',label:'Critical blocker or dependency today',type:'Text'},
  {id:'d4',label:'Stakeholder or team collaboration',type:'Rating 1-5'},
  {id:'d5',label:'Most significant achievement today',type:'Text'},
];

const INDUSTRY_DELIVERABLES = {
  'Mining & Natural Resources': ['Zero LTI days','Safety inspection rate','Equipment uptime %','Shift compliance reports','Hazard observations logged','PPE adherence rate'],
  'Agriculture & Food Systems': ['Hectares monitored','Yield vs target','Irrigation compliance','Pest/disease reports filed','Harvest quality score','Input cost per unit'],
  'Healthcare & Medicine': ['Patients seen','Clinical notes completed','Medication error rate','Handover completion','Patient satisfaction score','Incident reports filed'],
  'Education & Training': ['Lessons delivered','Curriculum coverage %','Student engagement score','Assessment marking rate','Attendance tracking','Professional development hours'],
  'Technology & Engineering': ['Tickets resolved','Code reviews completed','Deployment success rate','Bug fix turnaround','Sprint velocity','System uptime %'],
  'Human Resources & People Ops': ['Candidates screened','Interviews conducted','Onboarding completions','Policy queries resolved','Training sessions delivered','Retention conversations held'],
  'Finance & Banking': ['Transactions processed','Compliance checks completed','Client calls made','Reports filed on time','Error/variance rate','Regulatory items actioned'],
  'Construction & Real Estate': ['Milestones hit','Safety checks completed','Subcontractor coordination','Material delivery tracking','Quality inspections','Rework rate'],
  'Logistics & Supply Chain': ['Deliveries completed','On-time delivery rate','Route adherence','Vehicle inspections done','Inventory discrepancies flagged','Supplier communications'],
  'Non-profit & International Development': ['Beneficiaries reached','Programme activities delivered','Donor reports submitted','Field visits completed','Data collection quality','Budget utilisation rate'],
  'Government & Public Sector': ['Cases/applications processed','Public enquiries resolved','Compliance audits completed','Policy reviews actioned','Stakeholder meetings held','Service delivery rate'],
  'default': ['Key deliverables completed','Stakeholder satisfaction','Quality of output','Strategic tasks progressed','Learning & development','Process improvements made'],
};

const INDUSTRY_GOALS = {
  'Mining & Natural Resources': ['Achieve zero LTIs across all shifts this month','Maintain 98%+ safety inspection completion rate','Reduce equipment downtime by 15% through proactive checks'],
  'Healthcare & Medicine': ['Complete 100% of clinical documentation on the same day as patient contact','Reduce medication error rate to zero for the quarter','Improve patient handover completeness score above 95%'],
  'Technology & Engineering': ['Close 95% of sprint tickets on time with zero critical defects','Reduce average bug resolution time from 3 days to 1','Achieve 99.9% system uptime through proactive monitoring'],
  'Human Resources & People Ops': ['Reduce time-to-hire by 20% while maintaining candidate quality scores above 4.2','Complete all onboarding checklists within 5 days of start date','Conduct monthly 1:1s with all 15 direct reports without exception'],
  'Agriculture & Food Systems': ['Achieve target yield within 5% of projection across all monitored plots','Reduce input cost per hectare by 10% through precision scheduling','File daily field reports with zero missed submissions this season'],
  'default': ['Deliver all key responsibilities at or above target with zero critical misses','Reduce my top blocker by 50% through proactive communication','Build a daily check-in streak of 20+ consecutive working days'],
};

let jdPath = 'title';

export function launch(user) {
  const state = getState();
  const ini = initials(state.name);
  document.getElementById('sbav').textContent = ini;
  document.getElementById('sbname').textContent = (state.name || 'User').split(' ')[0];
  document.getElementById('sbrole').textContent = state.role === 'employer' ? 'Manager' : 'Employee';
  document.getElementById('compav').textContent = ini;
  if (state.role === 'employer') {
    document.getElementById('mgrnav').style.display = 'block';
    const mobMgr = document.getElementById('mob-mgrnav');
    if (mobMgr) mobMgr.style.display = 'flex';
  }
  renderCIForm();
  renderMyTrack();
  renderSugg();
  renderCTags();
  buildGreet();
  goTo('app');
  import('./dashboard.js').then(m => m.refreshDashboard());
}

export async function restoreState(user) {
  if (!user) return false;
  const [profile, fields, checkins] = await Promise.all([
    loadProfile(user.uid),
    loadTrackFields(user.uid),
    loadCheckins(user.uid)
  ]);
  if (!profile) return false;
  setState({
    name: profile.full_name || '',
    role: profile.role || 'employee',
    company: profile.company_name || '',
    detectedRole: profile.detected_role || '',
    detectedIndustry: profile.detected_industry || '',
    goal: profile.goal || '',
    perfLevel: profile.perf_level || 'performing',
    trackFields: fields.length ? fields : DFIELDS.map(f => ({...f})),
    checkins,
    daysActive: new Set(checkins.map(c => c.date)).size,
    bestStreak: calculateMaxStreak(checkins),
    companyCode: profile.company_id ? (await loadCompanyCode(profile.company_id)) : ''
  });
  saveState(getState());
  return true;
}

function calculateMaxStreak(checkins) {
  if (!checkins.length) return 0;
  const dates = [...new Set(checkins.map(c => c.date))].sort();
  let max = 0, current = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i-1]);
    const curr = new Date(dates[i]);
    const diff = Math.round((curr - prev) / 86400000);
    if (diff === 1) { current++; } else { max = Math.max(max, current); current = 1; }
  }
  return Math.max(max, current);
}

async function loadCompanyCode(companyId) {
  const { getDb } = await import('../firebase/auth.js');
  const doc = await getDb().collection('companies').doc(companyId).get();
  return doc.exists ? doc.data().code : '';
}

export function setOB(n) {
  document.querySelectorAll('.obc').forEach(c => c.classList.remove('active'));
  const target = document.getElementById('ob' + n);
  if (target) target.classList.add('active');
  const ops = document.querySelectorAll('.ops');
  ops.forEach((op, idx) => {
    if (idx <= n) op.classList.add('done');
    else op.classList.remove('done');
  });
}

export function pickRole(r, el) {
  getState().role = r;
  document.querySelectorAll('.rgrid .rcard').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
}

export function pickPerf(level, el) {
  getState().perfLevel = level;
  el.closest('.fld').querySelectorAll('.rcard').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  document.getElementById('ob-perf-level').value = level;
}

export function showJDPath(path, cardEl) {
  jdPath = path;
  document.querySelectorAll('#jd-path-select .rcard').forEach(c => c.classList.remove('sel'));
  cardEl.classList.add('sel');
  ['upload','guided','title'].forEach(p => {
    const r = document.getElementById('path-radio-'+p);
    if (r) r.style.background = p === path ? 'var(--purple)' : '';
  });
  document.getElementById('path-upload').style.display = path === 'upload' ? 'block' : 'none';
  document.getElementById('path-guided').style.display = path === 'guided' ? 'block' : 'none';
  document.getElementById('path-title').style.display = path === 'title' ? 'block' : 'none';
  document.getElementById('ob1btn').style.display = 'block';
}

export async function obStep(n) {
  if (n === 0) {
    const fname = document.getElementById('ob-fname').value.trim();
    const lname = document.getElementById('ob-lname').value.trim();
    if (!fname) { showToast('⚠️','Please enter your first name.'); return; }
    const state = getState();
    state.name = (fname + ' ' + lname).trim();
    state.company = document.getElementById('ob-company').value.trim();
    state.detectedIndustry = document.getElementById('ob-industry').value;
    if (!state.role) { showToast('⚠️','Please select your role type.'); return; }
    setState(state);
    setOB(1);
  } else if (n === 1) {
    const btn = document.getElementById('ob1btn');
    const pill = document.getElementById('aip');
    const pt = document.getElementById('aiptext');
    btn.disabled = true; btn.textContent = 'Building your track…';
    pill.classList.remove('donep'); pill.classList.add('show');
    let jdContent = '';
    if (jdPath === 'upload') {
      jdContent = document.getElementById('jd-text')?.value.trim() || '';
    } else if (jdPath === 'guided') {
      const t = document.getElementById('guide-title')?.value.trim() || '';
      const r = document.getElementById('guide-resp')?.value.trim() || '';
      const w = document.getElementById('guide-win')?.value.trim() || '';
      const m = document.getElementById('guide-metric')?.value.trim() || '';
      if (!t&&!r) { showToast('⚠️','Please answer at least the first two questions.'); btn.disabled=false; btn.textContent='Build My Track →'; pill.classList.remove('show'); return; }
      jdContent = `Job Title: ${t}\nKey Responsibilities: ${r}\nWhat a great week looks like: ${w}\nKey metric my manager tracks: ${m}\nIndustry: ${getState().detectedIndustry}`;
    } else if (jdPath === 'title') {
      const t = document.getElementById('jd-title')?.value.trim() || '';
      if (!t) { showToast('⚠️','Please enter your job title.'); btn.disabled=false; btn.textContent='Build My Track →'; pill.classList.remove('show'); return; }
      jdContent = `Job Title: ${t}\nIndustry: ${getState().detectedIndustry}\nPlease infer typical responsibilities, KPIs, and daily tasks for this role.`;
      getState().detectedRole = t;
    }
    if (jdContent.length > 20) {
      pt.textContent = 'Analysing your professional profile…';
      await genTrack(jdContent, pill, pt);
    } else {
      getState().trackFields = DFIELDS.map(f => ({...f}));
      await delay(800);
      pt.textContent = 'General track created — customise it on the next screen.';
      pill.classList.add('donep');
      await delay(700); btn.disabled=false; btn.textContent='Build My Track →'; setOB(2); renderTList();
    }
  } else if (n === 2) {
    renderGoalSuggestions();
    setOB(3);
  } else if (n === 3) {
    const goal = document.getElementById('ob-goal').value.trim();
    getState().goal = goal || suggestDefaultGoal();
    getState().perfLevel = document.getElementById('ob-perf-level')?.value || 'performing';
    setOB(4);
  }
}

async function genTrack(jdContent, pill, pt) {
  const prompt = `You are Workable. A user has provided their role profile. Build a precise daily check-in track for them.\nROLE PROFILE:\n${jdContent.slice(0,3000)}\nUSER INDUSTRY: ${getState().detectedIndustry||'Not specified'}\nRESPOND ONLY with valid JSON — no markdown:\n{\n  "roleTitle": "Precise professional title",\n  "industry": "Industry sector",\n  "seniority": "junior|mid|senior|executive",\n  "deliverables": ["3-5 key professional deliverables typical for this role"],\n  "fields": [\n    {"label": "Concise field label", "type": "Number|Yes/No|Rating 1-5|Text", "why": "One sentence: why this matters"}\n  ]\n}`;
  try {
    const d = await generateAIResponse(prompt);
    const match = d.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found");
    const p = JSON.parse(match[0]);
    getState().trackFields = p.fields.map((f,i) => ({...f, id: 'f'+i}));
    getState().detectedRole = p.roleTitle || getState().detectedRole;
    getState().detectedIndustry = p.industry || getState().detectedIndustry;
    getState().seniority = p.seniority || 'mid';
    getState().deliverables = p.deliverables || [];
    pt.textContent = `✦ Track built for: ${p.roleTitle} — ${p.fields.length} precision fields generated`;
    pill.classList.add('donep');
    const btn = document.getElementById('ob1btn');
    await delay(1000); btn.disabled=false; btn.textContent='Build My Track →'; setOB(2); renderTList();
  } catch(e) {
    console.error(e);
    getState().trackFields = DFIELDS.map(f => ({...f}));
    pt.textContent = 'Track created — customise the fields on the next screen.';
    pill.classList.add('donep');
    const btn = document.getElementById('ob1btn');
    await delay(700); btn.disabled=false; btn.textContent='Build My Track →'; setOB(2); renderTList();
  }
}

function renderTList() {
  const state = getState();
  const det = document.getElementById('role-det');
  const detText = document.getElementById('role-det-text');
  const detSub = document.getElementById('role-det-sub');
  if (state.detectedRole && det) {
    det.style.display = 'block';
    detText.textContent = state.detectedRole;
    detSub.textContent = state.detectedIndustry || state.company || '';
  }
  const delBox = document.getElementById('deliverables-box');
  const delList = document.getElementById('deliverables-list');
  if (delBox && delList) {
    const industry = state.detectedIndustry || 'default';
    const dels = state.deliverables?.length ? state.deliverables : (INDUSTRY_DELIVERABLES[industry] || INDUSTRY_DELIVERABLES['default']);
    if (dels.length) {
      delBox.style.display = 'block';
      delList.innerHTML = dels.map(d => `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--gold-light);border:1px solid var(--gold);border-radius:99px;padding:4px 12px;font-size:11px;font-weight:600;color:var(--gold-dark);cursor:pointer" onclick="addDeliverable('${d.replace(/'/g,'')}')">+ ${d}</span>`).join('');
    }
  }
  document.getElementById('tlist').innerHTML = state.trackFields.map((f,i) => `
    <div class="titem" draggable="true">
      <span class="tihandle">⠿</span>
      <div style="flex:1;min-width:0">
        <div class="tilabel">${sanitizeInput(f.label)}</div>
        ${f.why?`<div style="font-size:11px;color:var(--ink4);margin-top:2px">${sanitizeInput(f.why)}</div>`:''}
      </div>
      <span class="titype">${sanitizeInput(f.type)}</span>
      <button class="tidel" onclick="delF('${f.id}')">×</button>
    </div>`).join('');
}

window.addDeliverable = function(label) {
  const types = ['Number','Yes/No','Text'];
  const t = label.toLowerCase().includes('rate')||label.toLowerCase().includes('%')||label.toLowerCase().includes('score')?'Rating 1-5':label.toLowerCase().includes('complet')||label.toLowerCase().includes('submit')||label.toLowerCase().includes('filed')?'Yes/No':'Number';
  getState().trackFields.push({label,type:t,id:'c'+Date.now()});
  renderTList();
  showToast('✅','Field added');
};
window.delF = function(id) {
  getState().trackFields = getState().trackFields.filter(f=>f.id!==id);
  renderTList();
};
window.addField = function() {
  const l = prompt('Professional field name:');
  if (!l) return;
  const types = ['Number','Yes/No','Rating 1-5','Text'];
  const t = types[Math.floor(Math.random()*2)];
  getState().trackFields.push({label:l,type:t,id:'c'+Date.now()});
  renderTList();
};

function renderGoalSuggestions() {
  const chips = document.getElementById('goal-chips');
  if (!chips) return;
  const industry = getState().detectedIndustry || 'default';
  const goals = INDUSTRY_GOALS[industry] || INDUSTRY_GOALS['default'];
  chips.innerHTML = goals.map(g => `
    <div onclick="useGoal(this,'${g.replace(/'/g,"\'")}')" style="background:var(--surface2);border:1.5px solid var(--surface3);border-radius:var(--r);padding:.6rem .9rem;font-size:12px;font-weight:500;color:var(--ink2);cursor:pointer;line-height:1.5;transition:all .18s;max-width:100%">
      ${sanitizeInput(g)}
    </div>`).join('');
}
window.useGoal = function(el, goal) {
  document.querySelectorAll('#goal-chips div').forEach(d => d.style.borderColor = 'var(--surface3)');
  el.style.borderColor = 'var(--gold)'; el.style.background = 'var(--gold-light)';
  document.getElementById('ob-goal').value = goal;
};

function suggestDefaultGoal() {
  const industry = getState().detectedIndustry || 'default';
  const goals = INDUSTRY_GOALS[industry] || INDUSTRY_GOALS['default'];
  return goals[0] || 'Perform consistently, grow measurably, and deliver excellence every day.';
}

export async function createAccount() {
  const email = document.getElementById('ob-email').value.trim();
  const pass = document.getElementById('ob-pass').value.trim();
  const btn = document.getElementById('ob4btn');
  if (!email || !pass) { showToast('⚠️','Please enter your email and password.'); return; }
  if (!validatePassword(pass)) { showToast('⚠️','Password needs at least 6 characters.'); return; }
  btn.disabled = true; btn.textContent = 'Creating account…';
  try {
    await signUpWithEmail(email, pass);
    await saveProfile(getState());
    await saveTrackFields(getState().trackFields);
    saveState(getState());
    launch();
    showToast('🎉','Account created! Welcome to Workable.');
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Create Account →';
    showToast('⚠️', e.message || 'Sign-up failed.');
  }
}

window.obSignUpWithGoogle = async function() {
  const btn = document.getElementById('ob-google-btn');
  btn.disabled = true; btn.textContent = 'Connecting...';
  try {
    await signInWithGoogle();
    await saveProfile(getState());
    await saveTrackFields(getState().trackFields);
    saveState(getState());
    launch();
    showToast('🎉','Account created with Google!');
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Sign up with Google';
    showToast('⚠️', e.message || 'Google sign-up failed.');
  }
};

export function renderCIForm() {
  const state = getState();
  let html = state.trackFields.map((f,i) => {
    let inp = '';
    if (f.type === 'Number') inp = `<input class="cinum" id="ci-${f.id}" type="number" min="0" placeholder="Enter a number...">`;
    else if (f.type === 'Yes/No') inp = `<div class="trow"><button class="tbtn" onclick="setTog(this,'yes','ci-${f.id}')">✅ Yes</button><button class="tbtn" onclick="setTog(this,'no','ci-${f.id}')">❌ No</button></div><input type="hidden" id="ci-${f.id}">`;
    else if (f.type.startsWith('Rating')) inp = `<div class="rrow">${[1,2,3,4,5].map(n => `<button class="rbtn" onclick="setRat(this,${n},'ci-${f.id}')">${n}</button>`).join('')}</div><input type="hidden" id="ci-${f.id}">`;
    else inp = `<textarea class="cita" id="ci-${f.id}" rows="2" placeholder="Your notes..."></textarea>`;
    return `<div class="cif"><div class="cilbl"><span class="cilbl-num">${i+1}</span>${sanitizeInput(f.label)}${f.why?'<span style="font-size:11px;color:var(--ink4);font-weight:400;margin-left:6px">— '+sanitizeInput(f.why)+'</span>':''}</div>${inp}</div>`;
  }).join('');
  html += `
    <div class="cif"><div class="cilbl"><span class="cilbl-num">⭐</span>Mood today</div><div class="rrow">${['😞','😐','🙂','😊','🤩'].map((e,i)=>`<button class="rbtn" onclick="setMood(this,'${i+1}')">${e}</button>`).join('')}</div><input type="hidden" id="ci-mood"></div>
    <div class="cif"><div class="cilbl"><span class="cilbl-num">📈</span>Productivity score</div><div class="rrow">${[1,2,3,4,5].map(n=>`<button class="rbtn" onclick="setRat(this,${n},'ci-prod')">${n}</button>`).join('')}</div><input type="hidden" id="ci-prod"></div>
    <div class="cif"><div class="cilbl"><span class="cilbl-num">🏆</span>Biggest win today</div><textarea class="cita" id="ci-win" rows="1" placeholder="What went well?"></textarea></div>
    <div class="cif"><div class="cilbl"><span class="cilbl-num">🧱</span>Biggest challenge</div><textarea class="cita" id="ci-challenge" rows="1" placeholder="What blocked you?"></textarea></div>
  `;
  document.getElementById('cifields').innerHTML = html;
}

window.setMood = function(btn, val) {
  btn.closest('.rrow').querySelectorAll('.rbtn').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
  document.getElementById('ci-mood').value = val;
};

export function renderMyTrack() {
  const state = getState();
  document.getElementById('mtrole').textContent = state.detectedRole || 'Your role';
  document.getElementById('mtind').textContent = state.detectedIndustry || state.company || 'Your organisation';
  document.getElementById('field-count').textContent = state.trackFields.length + ' fields';
  document.getElementById('mtfields').innerHTML = state.trackFields.map(f => `
    <div class="ri">
      <span class="rlbl">${sanitizeInput(f.label)}</span>
      <span class="badge bv">${sanitizeInput(f.type)}</span>
    </div>`).join('');
}

export function renderSugg() {
  const state = getState();
  const qs = state.role === 'employer' ? ['How is my team doing?','Who needs support?','Top blockers this week?'] : ['How am I doing this week?','What should I focus on?','Am I hitting my goal?','Analyse my streak','What\'s my biggest blocker?'];
  document.getElementById('chatsugg').innerHTML = qs.map(q => `<button class="schip" onclick="askS('${sanitizeInput(q)}')">${sanitizeInput(q)}</button>`).join('');
}

export function renderCTags() {
  const CTAGS = ['💪 Win','📚 Lesson','🚀 Milestone','🤝 Teamwork','💡 Insight','🔥 Streak'];
  document.getElementById('comptags').innerHTML = CTAGS.map(t => `<button class="tchip" onclick="this.classList.toggle('sel')">${sanitizeInput(t)}</button>`).join('');
}

export function buildGreet() {
  const state = getState();
  document.getElementById('aigreet').textContent = `Hi ${state.name.split(' ')[0]}! I'm your Workable — I have full context of your role${state.detectedRole?' ('+state.detectedRole+')':''}, your goal, and all ${state.checkins.length} check-in${state.checkins.length!==1?'s':''} you've logged. Ask me anything about your performance!`;
}

window.setTog = function(btn, v, id) {
  btn.closest('.trow').querySelectorAll('.tbtn').forEach(b=>{b.classList.remove('yes','no');});
  btn.classList.add(v);
  document.getElementById(id).value = v;
};
window.setRat = function(btn, v, id) {
  btn.closest('.rrow').querySelectorAll('.rbtn').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
  document.getElementById(id).value = v;
};
window.obStep = obStep;
window.pickRole = pickRole;
window.pickPerf = pickPerf;
window.showJDPath = showJDPath;
window.setOB = setOB;
window.createAccount = createAccount;
