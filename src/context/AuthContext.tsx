import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserData {
  uid: string;
  email: string;
  name: string;
  role: 'user' | 'shop' | 'admin';
  phone?: string;
  photoURL?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot = () => {};
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeSnapshot();
      setUser(firebaseUser);

      if (firebaseUser) {
        const fallbackName = firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User');
        // Set immediate user data from firebaseUser state so UI updates instantly
        setUserData((prev) => prev || {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: fallbackName,
          photoURL: firebaseUser.photoURL || undefined,
          role: 'user',
        });
        setLoading(false);

        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeSnapshot = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data() as UserData);
            } else {
              const newUserData: any = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: fallbackName,
                photoURL: firebaseUser.photoURL || null,
                role: 'user',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              };
              await setDoc(userRef, newUserData).catch((e) => console.warn('User doc set error:', e));
              setUserData(newUserData as UserData);
            }
          }, (err) => {
            console.warn('Firestore snapshot error, falling back to auth profile:', err);
          });
        } catch (err) {
          console.warn('Firestore subscription failed:', err);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeSnapshot();
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
