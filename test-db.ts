import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
const app = admin.initializeApp({ projectId: "gen-lang-client-0644295069" });
const db = getFirestore(app, 'ai-studio-a21c7121-7ddd-47be-83e6-84614dad9b6f');
db.collection('test').doc('test').set({ test: true })
  .then(() => console.log('success'))
  .catch(e => console.error(e));
