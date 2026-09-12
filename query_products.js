import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0644295069",
  appId: "1:398668682192:web:1f453f58c69af99333dfd5",
  apiKey: "AIzaSyC-8qChxglcMAidF-cQe8ZOro6CU-1kfpU",
  authDomain: "gen-lang-client-0644295069.firebaseapp.com",
  storageBucket: "gen-lang-client-0644295069.firebasestorage.app",
  messagingSenderId: "398668682192"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-a21c7121-7ddd-47be-83e6-84614dad9b6f");

async function run() {
  const snapshot = await getDocs(collection(db, 'products'));
  snapshot.docs.forEach(doc => console.log(doc.data().name, " - ", doc.data().description));
  process.exit(0);
}
run();
