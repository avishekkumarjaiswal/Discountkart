import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../../lib/firebase';
import { Button } from '../../components/ui/Button';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await setDoc(userRef, { role: 'admin' }, { merge: true });
      } else {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName,
          role: 'admin',
          createdAt: new Date()
        });
      }

      navigate('/admin');
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setError('Unauthorized Domain: "localhost" is not authorized in Firebase Console. Go to Firebase Console -> Authentication -> Settings -> Authorized Domains and add "localhost".');
      } else if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
        setError('Popup Blocked: Your browser blocked the sign-in popup. Please allow popups for this site.');
      } else if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setError('Google Sign-In is currently disabled in your Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method -> Enable Google.');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Failed to sign in with Google');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Portal</h1>
        <p className="text-gray-500 mb-8">Secure login for Super Admins only.</p>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">{error}</div>}
        
        <Button onClick={handleLogin} disabled={loading} size="lg" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center">
          Login as Administrator
        </Button>
      </div>
    </div>
  );
}
