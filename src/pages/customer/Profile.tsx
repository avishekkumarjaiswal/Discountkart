import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { CompleteProfileModal } from '../../components/modals/CompleteProfileModal';
import { Edit2 } from 'lucide-react';

function UserProfileAvatar({ user, userData }: { user: any; userData: any }) {
  const [imgError, setImgError] = useState(false);
  const photo = userData?.photoURL || user?.photoURL;
  const rawName = (userData?.name && userData.name !== 'User') 
    ? userData.name 
    : (user?.displayName && user.displayName !== 'User')
      ? user.displayName 
      : (user?.email ? user.email.split('@')[0] : 'User');
  const initial = rawName.charAt(0).toUpperCase();

  if (photo && !imgError) {
    return (
      <img
        src={photo}
        alt=""
        onError={() => setImgError(true)}
        className="w-16 h-16 rounded-full object-cover shrink-0 border border-gray-200"
      />
    );
  }

  return (
    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 font-bold text-2xl flex items-center justify-center shrink-0">
      {initial}
    </div>
  );
}

export default function Profile() {
  const { user, userData, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const displayName = (userData?.name && userData.name !== 'User')
    ? userData.name
    : (user?.displayName && user.displayName !== 'User')
      ? user.displayName
      : (user?.email ? user.email.split('@')[0] : 'User');

  const handleBecomeShopPartner = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { role: 'shop' }, { merge: true });
      navigate('/shop');
    } catch (e) {
      console.error('Error updating role:', e);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) return <div className="max-w-md mx-auto p-8 mt-12 text-center text-gray-500">Loading profile...</div>;

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-8 mt-12 text-center bg-white rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Not Logged In</h2>
        <p className="text-gray-500 mb-8">Please login to view your profile and manage offers.</p>
        <Button onClick={() => navigate('/login')} className="w-full">
          Login
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-xl mx-auto p-4 py-8">
        <div className="w-full flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="flex items-center">
            <Edit2 size={14} className="mr-2" /> Edit
          </Button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6 w-full space-y-6">
          <div className="flex items-center space-x-4">
            <UserProfileAvatar user={user} userData={userData} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="space-y-3 border-t border-gray-100 pt-5 text-sm">
            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-gray-600 font-medium">Phone Number</span>
              <span className="text-gray-900 font-semibold">{userData?.phone || 'Not Set'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
              <span className="text-gray-600 font-medium">Account Role</span>
              <span className="bg-gray-100 px-2.5 py-0.5 rounded-full text-xs font-bold text-gray-700 capitalize">
                {userData?.role || 'Customer'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-gray-600 font-medium">Member Since</span>
              <span className="text-gray-500">
                {userData?.createdAt?.toDate ? userData.createdAt.toDate().toLocaleDateString() : 'Recently'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 w-full">
          {userData?.role === 'shop' ? (
            <Button onClick={() => navigate('/shop')} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold">
              Go to Shop Dashboard
            </Button>
          ) : userData?.role === 'admin' ? (
            <Button onClick={() => navigate('/admin')} className="w-full h-12 bg-blue-900 hover:bg-blue-800 text-white font-bold">
              Go to Admin Dashboard
            </Button>
          ) : (
            <>
              <Button onClick={() => navigate('/my-offers')} variant="outline" className="w-full h-12 bg-white font-bold">
                View My Offers
              </Button>
              <Button onClick={handleBecomeShopPartner} className="w-full h-12 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold">
                Register as Shop Partner
              </Button>
            </>
          )}

          <Button onClick={handleLogout} variant="outline" className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50 font-bold">
            Sign Out
          </Button>
        </div>
      </div>

      <CompleteProfileModal isOpen={isEditing} onClose={() => setIsEditing(false)} />
    </>
  );
}
