import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0644295069",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-a21c7121-7ddd-47be-83e6-84614dad9b6f");

async function run() {
  try {
    await deleteDoc(doc(db, 'discounts', 'UxpbVdgP76t09cAAJASt'));
    console.log("Deleted");
  } catch(e) {
    console.error("Error", e);
  }
  process.exit(0);
}
run();
