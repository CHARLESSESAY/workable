import { getState, setState, showToast, initials } from '../utils/helpers.js';
import { saveProfile } from '../firebase/firestore.js';
import { saveState } from '../utils/localStorage.js';

export function initSettings() {
  const state = getState();
  document.getElementById('set-name').value = state.name;
  document.getElementById('set-company').value = state.company;
  document.getElementById('set-role').value = state.detectedRole || '';
  document.getElementById('set-goal').value = state.goal;
  document.getElementById('set-acct-type').value = state.role || 'employee';
}

export function saveSettings() {
  const state = getState();
  state.name = document.getElementById('set-name').value.trim() || state.name;
  state.company = document.getElementById('set-company').value.trim() || state.company;
  state.detectedRole = document.getElementById('set-role').value.trim() || state.detectedRole;
  state.goal = document.getElementById('set-goal').value.trim() || state.goal;
  state.role = document.getElementById('set-acct-type').value;
  setState(state);
  saveState(state);
  if (window.firebase?.auth().currentUser) {
    saveProfile(state).catch(e => console.warn(e));
  }
  showToast('✅', 'Settings saved!');
  document.getElementById('sbname').textContent = state.name.split(' ')[0];
  const ini = initials(state.name);
  document.getElementById('sbav').textContent = ini;
  document.getElementById('compav').textContent = ini;
  if (state.role === 'employer') {
    document.getElementById('mgrnav').style.display = 'block';
  }
  import('./dashboard.js').then(m => m.refreshDashboard());
}

export function exportData() {
  const state = getState();
  const blob = new Blob([JSON.stringify({ profile: { name: state.name, company: state.company, role: state.detectedRole, goal: state.goal }, checkins: state.checkins }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'workable-data.json';
  a.click();
}

export function resetData() {
  if (!confirm('Are you sure? This will delete all your check-in data. This cannot be undone.')) return;
  const state = getState();
  state.checkins = [];
  state.feedPosts = [];
  state.bestStreak = 0;
  state.daysActive = 0;
  setState(state);
  saveState(state);
  showToast('🗑️', 'All check-in data deleted.');
  import('./dashboard.js').then(m => m.refreshDashboard());
}
