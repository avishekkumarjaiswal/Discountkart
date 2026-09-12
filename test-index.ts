import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0644295069",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-a21c7121-7ddd-47be-83e6-84614dad9b6f");

async function run() {
  try {
    const discQ = query(collection(db, 'discounts'), where('shopId', '==', 'pSjGAOeKvStjN60gWzMr'), where('active', '==', true));
    const discSnap = await getDocs(discQ);
    console.log("Size:", discSnap.size);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
  process.exit(0);
}
run();
