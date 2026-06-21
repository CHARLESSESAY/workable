import { getDb } from './auth.js';

// Profiles
export async function saveProfile(profileData) {
  const db = getDb();
  const uid = firebase.auth().currentUser.uid;
  await db.collection('profiles').doc(uid).set({
    ...profileData,
    updated_at: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

export async function loadProfile(uid) {
  const db = getDb();
  const doc = await db.collection('profiles').doc(uid || firebase.auth().currentUser.uid).get();
  return doc.exists ? doc.data() : null;
}

// Check‑ins
export async function saveCheckin(checkin) {
  const db = getDb();
  const uid = firebase.auth().currentUser.uid;
  const docId = `${uid}_${checkin.date}`;
  await db.collection('checkins').doc(docId).set({
    uid,
    date: checkin.date,
    score: checkin.score,
    flag_text: checkin.flag || '',
    field_data: checkin.fields || {},
    created_at: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

export async function loadCheckins(uid) {
  const db = getDb();
  const snap = await db.collection('checkins')
    .where('uid', '==', uid || firebase.auth().currentUser.uid)
    .orderBy('date', 'asc')
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Community
export async function loadPosts(limit = 20) {
  const db = getDb();
  const snap = await db.collection('community_posts')
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createPost(postData) {
  const db = getDb();
  const uid = firebase.auth().currentUser.uid;
  await db.collection('community_posts').add({
    uid,
    author_name: postData.author,
    body: postData.text,
    tags: postData.tags || [],
    created_at: firebase.firestore.FieldValue.serverTimestamp()
  });
}
