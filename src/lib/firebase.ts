import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setLogLevel } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: "gen-lang-client-0644295069",
  appId: "1:398668682192:web:1f453f58c69af99333dfd5",
  apiKey: "AIzaSyC-8qChxglcMAidF-cQe8ZOro6CU-1kfpU",
  authDomain: "gen-lang-client-0644295069.firebaseapp.com",
  storageBucket: "gen-lang-client-0644295069.firebasestorage.app",
  messagingSenderId: "398668682192"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Failed to set auth local persistence:', err);
});
export const googleProvider = new GoogleAuthProvider();

export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  },
  "ai-studio-a21c7121-7ddd-47be-83e6-84614dad9b6f"
);

export const storage = getStorage(app);

setLogLevel('silent');
