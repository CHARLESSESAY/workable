import { initFirebase, getAuth, getDb, onAuthStateChanged } from './firebase/auth.js';
import { initServices } from './services/ai.js';
import { launch, restoreState } from './features/onboarding.js';
import { goTo, getState, setState } from './utils/helpers.js';
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

window.addEventListener('DOMContentLoaded', initializeApp);
