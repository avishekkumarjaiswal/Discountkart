const admin = require('firebase-admin');
const app = admin.initializeApp({ projectId: 'gen-lang-client-0644295069' });
const db = admin.firestore();

async function run() {
  const locs = await db.collection('locations').get();
  locs.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}
run().catch(console.error);
