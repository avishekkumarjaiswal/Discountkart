import React, { useState } from 'react';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Phone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface CompleteProfileModalProps {
  onClose?: () => void;
  isOpen: boolean;
  forceComplete?: boolean;
}

export function CompleteProfileModal({ isOpen, onClose, forceComplete = false }: CompleteProfileModalProps) {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData(e.currentTarget);
      const name = (formData.get('name') as string || '').trim();
      const phone = (formData.get('phone') as string || '').trim();
      
      if (!name) {
        throw new Error("Full name is required.");
      }

      const digitsOnly = phone.replace(/\D/g, '');
      if (!phone || digitsOnly.length < 10) {
        throw new Error("Valid 10-digit mobile number is compulsory to claim discounts.");
      }

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name,
        phone,
        updatedAt: new Date()
      }, { merge: true });
      
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200 my-auto max-h-[calc(100vh-2rem)]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <Phone size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{forceComplete ? "Mobile Verification Required" : "Edit Profile"}</h2>
              {forceComplete && <p className="text-xs text-blue-600 font-semibold">Compulsory for claiming discounts</p>}
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-200/60 rounded-full transition-colors text-gray-400 hover:text-gray-700 font-bold text-xs flex items-center gap-1">
              <X size={18} />
            </button>
          )}
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {forceComplete && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-900 leading-relaxed">
                A valid 10-digit mobile phone number is required to generate and verify discount codes with local shops.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl leading-relaxed">
              {error}
            </div>
          )}
          
          <form id="complete-profile-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Email Address</label>
              <Input type="email" value={userData?.email || user.email || ''} disabled className="bg-gray-100 text-gray-500 font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <Input name="name" defaultValue={userData?.name || user.displayName || ''} required placeholder="Enter your full name" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Mobile Phone Number <span className="text-red-500">*</span></label>
              <Input name="phone" type="tel" defaultValue={userData?.phone || ''} required placeholder="10-digit mobile number (e.g. 9876543210)" />
            </div>
          </form>
        </div>
        
        <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50 shrink-0">
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl text-xs flex-1 sm:flex-none">
              Remind Me Later
            </Button>
          )}
          <Button type="submit" form="complete-profile-form" disabled={loading} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 px-6 shadow-sm">
            {loading ? 'Saving...' : 'Save & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
