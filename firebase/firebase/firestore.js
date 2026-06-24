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

export async function toggleLike(postId) {
  const db = getDb();
  const uid = firebase.auth().currentUser.uid;
  const likeRef = db.collection('post_likes').doc(`${uid}_${postId}`);
  const likeDoc = await likeRef.get();
  const postRef = db.collection('community_posts').doc(postId);
  if (likeDoc.exists) {
    await likeRef.delete();
    await postRef.update({ likes: firebase.firestore.FieldValue.increment(-1) });
    return { liked: false };
  } else {
    await likeRef.set({ uid, post_id: postId, created_at: firebase.firestore.FieldValue.serverTimestamp() });
    await postRef.update({ likes: firebase.firestore.FieldValue.increment(1) });
    return { liked: true };
  }
}

// Track fields
export async function saveTrackFields(fields) {
  const db = getDb();
  const uid = firebase.auth().currentUser.uid;
  await db.collection('profiles').doc(uid).set({
    track_fields: fields.map((f, i) => ({ id: f.id, label: f.label, type: f.type, why: f.why || '', position: i }))
  }, { merge: true });
}

export async function loadTrackFields(uid) {
  const db = getDb();
  const doc = await db.collection('profiles').doc(uid || firebase.auth().currentUser.uid).get();
  return doc.exists ? (doc.data().track_fields || []) : [];
}

// Companies
export async function upsertCompany(name) {
  const db = getDb();
  const uid = firebase.auth().currentUser.uid;
  const existing = await db.collection('companies')
    .where('owner_uid', '==', uid).limit(1).get();
  if (!existing.empty) {
    return existing.docs[0].id;
  }
  const code = Math.random().toString(36).slice(2,8).toUpperCase();
  const ref = await db.collection('companies').add({
    name: name || "My Team",
    code,
    owner_uid: uid,
    created_at: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

// Team data (new)
export async function loadTeam() {
  const db = getDb();
  const profile = await loadProfile();
  if (!profile?.company_id) return [];
  const snap = await db.collection('profiles')
    .where('company_id', '==', profile.company_id)
    .where('role', '==', 'employee')
    .get();
  return snap.docs.map(d => ({ uid: d.id, name: d.data().full_name, ...d.data() }));
}

export async function loadTeamCheckins() {
  const db = getDb();
  const team = await loadTeam();
  if (!team.length) return [];
  const uids = team.map(m => m.uid).slice(0, 10);
  const snap = await db.collection('checkins')
    .where('uid', 'in', uids)
    .get();
  return snap.docs.map(d => d.data());
}
