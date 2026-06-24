import { handleError } from '../utils/errorHandler.js';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCtYnisVl-LuEbNCAMjrsFBnWII-06ybh0",
  authDomain: "workable-ac89e.firebaseapp.com",
  projectId: "workable-ac89e",
  storageBucket: "workable-ac89e.firebasestorage.app",
  messagingSenderId: "599796161240",
  appId: "1:599796161240:web:8a22bbcd4c853a457a15ad"
};

let fbApp, fbAuth, fbDb;

export async function initFirebase() {
  if (typeof firebase === 'undefined') throw new Error('Firebase SDK not loaded');
  try {
    fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
    // Optional: fbDb.enablePersistence({ synchronizeTabs: true });
  } catch (e) {
    handleError(e, 'Firebase init');
    throw e;
  }
}

export function getAuth() { return fbAuth; }
export function getDb() { return fbDb; }

export function onAuthStateChanged(callback) {
  if (fbAuth) fbAuth.onAuthStateChanged(callback);
}

export async function signUpWithEmail(email, password) {
  const cred = await fbAuth.createUserWithEmailAndPassword(email, password);
  await cred.user.sendEmailVerification();
  return cred.user;
}

export async function signInWithEmail(email, password) {
  const cred = await fbAuth.signInWithEmailAndPassword(email, password);
  return cred.user;
}

export async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  const cred = await fbAuth.signInWithPopup(provider);
  return cred.user;
}

export async function signOut() {
  await fbAuth.signOut();
}

export async function getIdToken() {
  if (!fbAuth.currentUser) throw new Error('Not authenticated');
  return fbAuth.currentUser.getIdToken();
}
