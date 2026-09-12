const admin = require('firebase-admin');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const adminApp = admin.initializeApp({
  projectId: "gen-lang-client-0644295069"
});

console.log("FieldValue:", typeof FieldValue);
console.log("Timestamp:", typeof Timestamp);
console.log("getAuth:", typeof getAuth);

try {
  const db = getFirestore(adminApp, 'ai-studio-a21c7121-7ddd-47be-83e6-84614dad9b6f');
  console.log("DB:", !!db);
} catch (e) {
  console.error("DB Error:", e);
}
