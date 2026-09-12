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
  const [userData, setUserData] = useState<UserData | null>(() => {
    try {
      const cached = localStorage.getItem('discountkart_user_data');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(!userData);

  useEffect(() => {
    let unsubscribeSnapshot = () => {};
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribeSnapshot();
      setUser(firebaseUser);

      if (firebaseUser) {
        const fallbackName = firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User');
        setUserData((prev) => {
          const updated = prev || {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: fallbackName,
            photoURL: firebaseUser.photoURL || undefined,
            role: 'user',
          };
          try {
            localStorage.setItem('discountkart_user_data', JSON.stringify(updated));
          } catch (e) {
            console.warn('LocalStorage save error:', e);
          }
          return updated;
        });
        setLoading(false);

        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeSnapshot = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
              const freshData = docSnap.data() as UserData;
              setUserData(freshData);
              try {
                localStorage.setItem('discountkart_user_data', JSON.stringify(freshData));
              } catch (e) {}
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
              try {
                localStorage.setItem('discountkart_user_data', JSON.stringify(newUserData));
              } catch (e) {}
            }
          }, (err) => {
            console.warn('Firestore snapshot error, falling back to auth profile:', err);
          });
        } catch (err) {
          console.warn('Firestore subscription failed:', err);
        }
      } else {
        setUserData(null);
        try {
          localStorage.removeItem('discountkart_user_data');
        } catch (e) {}
        setLoading(false);
      }
    });

    return () => {
      unsubscribeSnapshot();
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      localStorage.removeItem('discountkart_user_data');
      sessionStorage.clear();
    } catch (e) {}
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
