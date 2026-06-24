import { initFirebase, onAuthStateChanged } from './firebase/auth.js';
import { initServices } from './services/ai.js';
import { launch, restoreState } from './features/onboarding.js';
import { goTo, getState } from './utils/helpers.js';
import { loadState } from './utils/localStorage.js';
import { handleError } from './utils/errorHandler.js';

async function initializeApp() {
  try {
    await initFirebase();
    onAuthStateChanged(async (user) => {
      if (user) {
        const ok = await restoreState(user);
        if (ok && document.getElementById('landing').classList.contains('active')) {
          launch(user);
        }
      } else {
        const local = loadState();
        if (local && local.name) {
          launch(null);
        } else {
          goTo('landing');
        }
      }
    });
    initServices();
  } catch (error) {
    handleError(error, 'App initialization');
  }
}
import { signInWithEmail, signInWithGoogle, signOut } from './firebase/auth.js';

window.doLogin = async function() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  if (!email || !pass) { showToast('⚠️', 'Enter your email and password.'); return; }
  try {
    await signInWithEmail(email, pass);
    // After successful login, restore state and launch
    const ok = await restoreState(firebase.auth().currentUser);
    if (ok) launch();
    else showToast('⚠️', 'No profile found. Please sign up.');
  } catch(e) { showToast('⚠️', e.message); }
};

window.signInWithGoogle = async function() {
  try {
    await signInWithGoogle();
    const ok = await restoreState(firebase.auth().currentUser);
    if (ok) launch();
    else showToast('⚠️', 'No profile found. Please sign up.');
  } catch(e) { showToast('⚠️', e.message); }
};

window.sbSignOut = async function() {
  await signOut();
  setState({...DEFAULT_STATE});
  saveState();
  goTo('landing');
  showToast('👋', 'Signed out successfully.');
};
window.addEventListener('DOMContentLoaded', initializeApp);

// Global navigation handler
window.nav = async function(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');

  document.querySelectorAll('.sbi,.mni').forEach(b => b.classList.remove('active'));
  if (id === 'dashboard') import('./features/dashboard.js').then(m => m.refreshDashboard());
  if (id === 'checkin') import('./features/checkin.js').then(m => m.initCheckin());
  if (id === 'mytrack') import('./features/onboarding.js'); // handled by editTrack
  if (id === 'community') import('./features/feed.js').then(m => m.loadAndRenderFeed());
  if (id === 'reports') import('./features/reports.js').then(m => m.initReports());
  if (id === 'profile') import('./features/profile.js').then(m => m.renderProfile());
  if (id === 'settings') import('./features/settings.js').then(m => m.initSettings());
  if (id === 'team') import('./features/team.js').then(m => m.renderTeamDashboard());
  if (id === 'insights') import('./features/insights.js').then(m => m.renderInsights());
  if (id === 'ai') import('./features/onboarding.js'); // handled by buildGreet/renderSugg
  // hide mobile menu
  const menu = document.getElementById('mobnav');
  if (menu && menu.classList.contains('open')) {
    menu.classList.remove('open');
    document.querySelector('.hamburger').textContent = '☰';
  }
};

window.toggleMenu = function() {
  const menu = document.getElementById('mobnav');
  const btn = document.querySelector('.hamburger');
  menu.classList.toggle('open');
  btn.textContent = menu.classList.contains('open') ? '✕' : '☰';
};
