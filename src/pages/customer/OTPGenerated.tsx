import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Copy, Check, Star, CheckCircle } from 'lucide-react';

export default function OTPGenerated() {
  const { state } = useLocation();
  const { redemptionId } = useParams<{ redemptionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isRedeemed, setIsRedeemed] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  
  // Rating states
  const [userRating, setUserRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    if (!state?.otp || !state?.expiresAt) {
      navigate('/my-offers');
      return;
    }
    
    // Timer logic
    const expiryTime = new Date(state.expiresAt).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = expiryTime - now;
      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
      } else {
        setTimeLeft(Math.floor(difference / 1000));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [state, navigate]);

  useEffect(() => {
    if (!redemptionId) return;

    // Listen to redemption document for status changes
    const unsubscribe = onSnapshot(doc(db, 'redemptions', redemptionId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'redeemed') {
          setIsRedeemed(true);
          setShopId(data.shopId);
        }
      }
    });

    return () => unsubscribe();
  }, [redemptionId]);

  const handleCopy = () => {
    if (state?.otp) {
      if ('vibrate' in navigator) navigator.vibrate(10);
      navigator.clipboard.writeText(state.otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleRateShop = async (ratingValue: number) => {
    if (!user || !shopId || isSubmittingRating) return;

    setIsSubmittingRating(true);
    setUserRating(ratingValue);
    
    try {
      const ratingId = `${shopId}_${user.uid}`;
      await setDoc(doc(db, 'shop_ratings', ratingId), {
        shopId,
        userId: user.uid,
        ratingValue,
        updatedAt: new Date()
      });

      // Recalculate average
      const allQ = query(collection(db, 'shop_ratings'), where('shopId', '==', shopId));
      const allSnap = await getDocs(allQ);
      let total = 0;
      allSnap.docs.forEach(d => total += d.data().ratingValue);
      const avg = total / allSnap.size;
      const roundedAvg = Math.round(avg * 10) / 10;

      await updateDoc(doc(db, 'shops', shopId), {
        rating: roundedAvg,
        ratingCount: allSnap.size
      });
      
      setRatingSubmitted(true);
    } catch (err) {
      console.error('Error rating shop:', err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (isRedeemed) {
    return (
      <div className="max-w-md mx-auto p-4 py-12 text-center">
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
          <div className="w-20 h-20 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Offer Redeemed!</h1>
          <p className="text-gray-500 mb-8">Your discount was successfully applied.</p>
          
          <div className="border-t border-gray-100 pt-8 mt-2">
            {!ratingSubmitted ? (
              <>
                <h3 className="font-bold text-gray-900 mb-2">Rate your experience</h3>
                <p className="text-sm text-gray-500 mb-6">How was the shop and service?</p>
                <div className="flex justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRateShop(star)}
                      disabled={isSubmittingRating}
                      className={`p-2 transition ${userRating >= star ? 'text-yellow-400' : 'text-gray-200'} hover:scale-110`}
                    >
                      <Star size={36} className={userRating >= star ? 'fill-current' : ''} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-4">
                <p className="text-blue-600 font-bold mb-1">Thanks for your rating!</p>
                <p className="text-sm text-gray-500">Your feedback helps others.</p>
              </div>
            )}
          </div>
          
          <div className="mt-8">
            <Button onClick={() => navigate('/my-offers')} className="w-full rounded-full h-12">
              Back to My Offers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 py-12 text-center">
      <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Discount Code</h1>
        <p className="text-gray-500 mb-8">Show this code to the shop owner.</p>

        {timeLeft > 0 ? (
          <>
            <div className="text-5xl font-mono font-extrabold tracking-[0.25em] text-blue-600 mb-4 bg-blue-50 py-6 rounded-2xl">
              {state?.otp}
            </div>
            
            <button 
              onClick={handleCopy}
              className="flex items-center justify-center mx-auto space-x-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-8 bg-gray-50 hover:bg-blue-50 px-4 py-2 rounded-full cursor-pointer"
            >
              {copied ? <Check size={16} className="text-blue-500" /> : <Copy size={16} />}
              <span>{copied ? 'Copied to clipboard!' : 'Copy Code'}</span>
            </button>

            <div className="flex flex-col items-center justify-center mb-8">
              <span className="text-sm text-gray-500 mb-1">Valid for</span>
              <span className="text-3xl font-bold text-gray-900">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>

            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm font-medium text-left flex items-start">
              <span className="text-xl mr-3">⚠</span>
              <p>Do not share this code with anyone except the shop owner at the time of billing.</p>
            </div>
          </>
        ) : (
          <div className="py-8">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">!</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Code Expired</h2>
            <p className="text-gray-500 mb-8">This discount code is no longer valid.</p>
            <Button onClick={() => window.history.state?.idx > 0 ? navigate(-1) : navigate('/')} className="w-full h-12 rounded-full">
              Generate New Code
            </Button>
          </div>
        )}
      </div>
      
      <div className="mt-8">
        <Button variant="outline" onClick={() => navigate('/my-offers')} className="rounded-full">
          View My Offers
        </Button>
      </div>
    </div>
  );
}
