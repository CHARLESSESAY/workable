import { saveProfile, loadProfile, loadCheckins, saveTrackFields } from '../firebase/firestore.js';
import { signUpWithEmail, signInWithGoogle } from '../firebase/auth.js';
import { generateAIResponse } from '../services/ai.js';
import { goTo, showToast, getState, setState } from '../utils/helpers.js';
import { validateEmail, validateName } from '../utils/validation.js';
import { sanitizeInput } from '../utils/sanitization.js';
import { handleError } from '../utils/errorHandler.js';

export function launch(user) {
  // Set UI elements, navigate to app
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
  const state = getState();
  state.name = profile.full_name || '';
  state.role = profile.role || 'employee';
  state.company = profile.company_name || '';
  state.detectedRole = profile.detected_role || '';
  state.goal = profile.goal || '';
  state.trackFields = fields.length ? fields : [];
  state.checkins = checkins;
  setState(state);
  return true;
}

// More functions: obStep, genTrack, etc. – you can copy from the old monolithic file later
// For now just export the essential ones used in app.js
