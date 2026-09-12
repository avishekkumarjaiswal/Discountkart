import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  projectId: "gen-lang-client-0644295069",
  apiKey: process.env.VITE_FIREBASE_API_KEY, // Note: I need the API key for auth!
};
// Wait, better to just test from UI since I am investigating why user can't delete.
