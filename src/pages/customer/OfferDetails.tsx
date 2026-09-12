import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, setDoc, serverTimestamp, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Clock, CheckCircle, Share2, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { CompleteProfileModal } from '../../components/modals/CompleteProfileModal';

export default function OfferDetails() {
  const { discountId } = useParams<{ discountId: string }>();
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [discount, setDiscount] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [existingRedemption, setExistingRedemption] = useState<'active' | 'redeemed' | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const handleShareOffer = async () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    const shareData = {
      title: discount?.title || 'DiscountKart Offer',
      text: `Get ${discount?.discountType === 'percentage' ? `${discount?.discountValue}% OFF` : `₹${discount?.discountValue} OFF`} at ${shop?.shopName || 'DiscountKart'}!`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {}
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (!discountId) return;
    const fetchDetails = async () => {
      try {
        const discountDoc = await getDoc(doc(db, 'discounts', discountId));
        if (discountDoc.exists() && !existingRedemption) {
          // Record offer_view silently
          try {
            await addDoc(collection(db, 'analyticsEvents'), {
              eventType: 'offer_view',
              shopId: discountDoc.data().shopId,
              discountId: discountDoc.id,
              userId: user?.uid || 'anonymous',
              timestamp: serverTimestamp()
            });
          } catch(e) {}
        }
        if (discountDoc.exists()) {
          const discData = discountDoc.data();
          setDiscount({ id: discountDoc.id, ...discData });
          
          const shopDoc = await getDoc(doc(db, 'shops', discData.shopId));
          if (shopDoc.exists()) {
            const shopData = shopDoc.data();
            if (shopData.status === 'approved') {
              setShop(shopData);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching offer:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [discountId]);

  useEffect(() => {
    if (!user || !discountId) return;
    
    const checkRedemption = async () => {
      try {
        const existingQuery = query(
          collection(db, 'redemptions'),
          where('userId', '==', user.uid),
          where('discountId', '==', discountId)
        );
        const existingDocs = await getDocs(existingQuery);
        
        const now = new Date();
        let status: 'active' | 'redeemed' | null = null;
        existingDocs.docs.forEach(doc => {
          const data = doc.data();
          const s = data.status;
          const expiryDate = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(0);
          
          if (s === 'redeemed') {
            status = 'redeemed';
          } else if (s === 'active' && status !== 'redeemed') {
            if (expiryDate > now) {
               status = 'active';
            }
          }
        });
        setExistingRedemption(status);
      } catch(err) {
        console.error('Error checking redemption:', err);
      }
    };
    
    checkRedemption();
  }, [user, discountId]);

  const handleGetDiscount = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!userData?.phone) {
      setShowPhoneModal(true);
      return;
    }
    if (!discount || !shop) return;

    if (existingRedemption) {
       setError('You already have an offer for this discount.');
       return;
    }

    setGenerating(true);
    setError('');

    try {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      const otp = (array[0] % 900000 + 100000).toString();
      const expiresAtDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Hash logic would go here if backend functions were available.
      // For MVP, we securely generate the OTP using crypto.getRandomValues.
      
      const redemptionId = `${user.uid}_${discountId}`;
      const newRedemptionRef = doc(db, 'redemptions', redemptionId);
      
      await setDoc(newRedemptionRef, {
        userId: user.uid,
        shopId: discount.shopId,
        shopOwnerId: shop.ownerId || '',
        discountId: discountId,
        otp: otp,
        status: 'active',
        expiresAt: Timestamp.fromDate(expiresAtDate),
        createdAt: serverTimestamp()
      });

      navigate(`/otp/${redemptionId}`, { state: { otp: otp, expiresAt: expiresAtDate.toISOString() } });
    } catch (err: any) {
      setError(err.message || 'Failed to generate discount');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-12 text-center">Loading offer...</div>;
  if (!discount || !shop) return <div className="p-12 text-center">Offer not found.</div>;

  return (
    <div className="max-w-xl mx-auto p-4 py-8">
      

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm text-center relative">
        <div className="flex items-center justify-between mb-6">
          <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 font-bold text-sm rounded-full">
            {discount.discountType === 'percentage' ? `${discount.discountValue}% OFF` : `₹${discount.discountValue} OFF`}
          </div>
          <button
            onClick={handleShareOffer}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold text-xs rounded-full transition border border-gray-200"
            title="Share Offer"
          >
            <Share2 size={14} />
            <span>Share</span>
          </button>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">{discount.title}</h1>
        <p className="text-base sm:text-lg text-gray-600 mb-6">on {discount.categoryId} at <span className="font-bold text-gray-900">{shop.shopName}</span></p>

        <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-4 mb-8">
          {discount.validFrom && (
            <div className="flex justify-between">
              <span className="text-gray-500">Valid From</span>
              <span className="font-medium text-gray-900">
                {discount.validFrom?.toDate ? discount.validFrom.toDate().toLocaleDateString() : 'N/A'}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Minimum Purchase</span>
            <span className="font-medium text-gray-900">₹{discount.minimumPurchase}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Maximum Discount</span>
            <span className="font-medium text-gray-900">₹{discount.maximumDiscount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 flex items-center"><Clock size={16} className="mr-1"/> Valid Until</span>
            <span className="font-medium text-gray-900">
              {discount.validUntil?.toDate ? discount.validUntil.toDate().toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>

        <div className="text-left mb-8">
          <h3 className="font-bold text-gray-900 mb-2">Terms & Conditions</h3>
          <p className="text-sm text-gray-500 whitespace-pre-wrap">{discount.terms || '• Valid on selected products\n• Cannot be combined with other offers\n• One redemption per user per offer'}</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">{error}</div>}

        {(discount.validFrom?.toDate && discount.validFrom.toDate() > new Date()) ? (
          <div className="w-full h-14 rounded-full bg-gray-100 text-gray-500 font-bold flex items-center justify-center text-lg">
            Offer starts on {discount.validFrom.toDate().toLocaleDateString()}
          </div>
        ) : existingRedemption === 'redeemed' ? (
          <div className="w-full h-14 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-lg">
            <CheckCircle size={20} className="mr-2" /> Already Redeemed
          </div>
        ) : existingRedemption === 'active' ? (
          <Button 
            size="lg" 
            className="w-full h-14 text-lg rounded-full bg-orange-500 hover:bg-orange-600" 
            onClick={() => navigate('/my-offers')}
          >
            VIEW ACTIVE CODE
          </Button>
        ) : (
          <Button 
            size="lg" 
            className="w-full h-14 text-lg rounded-full" 
            onClick={handleGetDiscount}
            disabled={generating}
          >
            {generating ? 'GENERATING...' : 'GET DISCOUNT'}
          </Button>
        )}
      </div>

      {copiedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-bounce">
          <Check size={16} className="text-emerald-400" />
          <span>Offer link copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}

