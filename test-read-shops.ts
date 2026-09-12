import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0644295069",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-a21c7121-7ddd-47be-83e6-84614dad9b6f");

async function run() {
  const dSnap = await getDocs(collection(db, 'shops'));
  dSnap.forEach(d => {
    const data = d.data();
    console.log(d.id, data.shopName, "Status:", data.subscriptionStatus);
  });
  process.exit(0);
}
run();
