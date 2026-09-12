const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const adminApp = admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "gen-lang-client-0644295069"
});

console.log("App initialized");

try {
  const db = getFirestore(adminApp, 'ai-studio-a21c7121-7ddd-47be-83e6-84614dad9b6f');
  console.log("DB initialized", !!db);
} catch (e) {
  console.error("Error:", e);
}
