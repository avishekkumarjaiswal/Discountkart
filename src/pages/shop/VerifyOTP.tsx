import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, getDoc, runTransaction } from 'firebase/firestore';

export default function VerifyOTP() {
  const { user } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedData, setVerifiedData] = useState<any>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    // Handle pasting 6 digits
    if (value.length > 1) {
       const digits = value.slice(0,6).split('');
       for(let i=0; i<digits.length; i++) {
           newOtp[i] = digits[i];
       }
       setOtp(newOtp);
       inputs.current[5]?.focus();
       return;
    }

    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    if (!user) return;

    setLoading(true);
    setError('');
    setVerifiedData(null);
    setSuccess(null);

    try {
      // Find active redemption with this OTP
      const q = query(
        collection(db, 'redemptions'),
        where('otp', '==', fullOtp),
        where('shopOwnerId', '==', user.uid),
        where('status', '==', 'active')
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
         throw new Error('Invalid or expired code');
      }

      // Check if it belongs to one of the user's shops
      let validDoc = null;
      let shopId = '';
      for (const redDoc of querySnapshot.docs) {
        const data = redDoc.data();
        const shopDoc = await getDoc(doc(db, 'shops', data.shopId));
        if (shopDoc.exists() && shopDoc.data()?.ownerId === user.uid) {
          validDoc = redDoc;
          shopId = data.shopId;
          break;
        }
      }

      if (!validDoc) {
        throw new Error('Code not found for your shops');
      }

      const data = validDoc.data();
      if (data.expiresAt.toDate() < new Date()) {
        await updateDoc(validDoc.ref, { status: 'expired' });
        throw new Error('Code has expired');
      }

      const discountDoc = await getDoc(doc(db, 'discounts', data.discountId));
      
      setVerifiedData({
        redemptionId: validDoc.id,
        userId: data.userId,
        discount: discountDoc.exists() ? discountDoc.data() : null
      });
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!verifiedData?.redemptionId) return;
    
    setRedeeming(true);
    setError('');

    try {
      const redemptionRef = doc(db, 'redemptions', verifiedData.redemptionId);
      
      const array = new Uint32Array(2);
      window.crypto.getRandomValues(array);
      const transactionId = 'DM-' + array[0].toString(36).toUpperCase() + array[1].toString(36).toUpperCase();
      
      await runTransaction(db, async (transaction) => {
        const redemptionDoc = await transaction.get(redemptionRef);
        if (!redemptionDoc.exists()) {
          throw new Error("Redemption document does not exist!");
        }
        
        const data = redemptionDoc.data();
        if (data.status !== 'active') {
          throw new Error("This code has already been redeemed or is expired.");
        }
        
        if (data.expiresAt.toDate() < new Date()) {
          throw new Error("This Code has expired.");
        }
        
        transaction.update(redemptionRef, {
          status: 'redeemed',
          redeemedAt: serverTimestamp(),
          transactionId
        });
      });
      
      setSuccess({
        transactionId,
        time: new Date().toLocaleTimeString()
      });
    } catch (err: any) {
      setError(err.message || 'Failed to redeem discount');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Verify Discount</h1>

      {success ? (
        <div className="bg-white rounded-2xl shadow-sm border border-blue-200 p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Discount Redeemed Successfully</h2>
          
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-8">
            <div className="flex justify-between">
              <span className="text-gray-500">Transaction ID</span>
              <span className="font-mono font-bold text-gray-900">{success.transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Time</span>
              <span className="font-medium text-gray-900">{success.time}</span>
            </div>
            {verifiedData?.discount && (
              <div className="flex justify-between border-t border-gray-200 pt-3 mt-3">
                <span className="text-gray-500">Offer</span>
                <span className="font-bold text-blue-700">{verifiedData.discount.title}</span>
              </div>
            )}
          </div>
          
          <Button onClick={() => {
            setSuccess(null);
            setVerifiedData(null);
            setOtp(['', '', '', '', '', '']);
            inputs.current[0]?.focus();
          }} className="w-full h-12">
            DONE
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <p className="text-gray-600 mb-6 font-medium text-center">Enter Customer Code</p>
          
          <div className="flex justify-center gap-2 sm:gap-4 mb-8">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength={6}
                value={digit}
                ref={(el) => (inputs.current[index] = el)}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-10 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:ring-0"
              />
            ))}
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}

          {!verifiedData ? (
            <Button 
              onClick={handleVerify} 
              disabled={loading || otp.join('').length < 6} 
              className="w-full h-12 text-lg"
            >
              {loading ? 'Verifying...' : 'VERIFY'}
            </Button>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-200 flex items-start">
                <span className="text-lg mr-2">✓</span>
                <div>
                  <p className="font-bold">CODE VALID</p>
                  <div className="mt-2 text-sm space-y-1">
                    <p><span className="text-blue-700 opacity-75">Customer UID:</span> {verifiedData.userId.substring(0,8)}...</p>
                    <p><span className="text-blue-700 opacity-75">Offer:</span> {verifiedData.discount?.title}</p>
                    {verifiedData.discount?.maximumDiscount && (
                      <p><span className="text-blue-700 opacity-75">Maximum Discount:</span> ₹{verifiedData.discount.maximumDiscount}</p>
                    )}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleRedeem} 
                disabled={redeeming}
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
              >
                {redeeming ? 'REDEEMING...' : 'REDEEM DISCOUNT'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
