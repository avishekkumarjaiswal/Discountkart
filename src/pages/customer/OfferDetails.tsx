import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, setDoc, serverTimestamp, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Clock, CheckCircle, Share2, Check, Zap, Gift, Layers, Package, Plus, Minus, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { CompleteProfileModal } from '../../components/modals/CompleteProfileModal';
import { 
  getOfferBadgeText, 
  getTimeRemaining, 
  calculateQuantityPricing,
  isOfferCurrentlyActive,
  QuantityTier,
  BundleItem
} from '../../utils/discountEngine';

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

  // Flash Sale Countdown State
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean; formatted: string }>({
    hours: 0, minutes: 0, seconds: 0, isExpired: false, formatted: ''
  });

  // Quantity Calculator State
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const baseUnitPrice = 800; // Default reference price for demonstration calculation

  const handleShareOffer = async () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    const shareData = {
      title: discount?.title || 'DiscountKart Offer',
      text: `Get ${getOfferBadgeText(discount || {})} at ${shop?.shopName || 'DiscountKart'}!`,
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

          if (discData.offerType === 'quantity_pricing' && discData.quantityTiers?.length > 0) {
            setSelectedQty(discData.quantityTiers[0].quantity || 1);
          }
          
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

  // Flash Sale Timer Effect
  useEffect(() => {
    if (!discount || discount.offerType !== 'flash_sale' || !discount.validUntil) return;

    const updateTimer = () => {
      const remaining = getTimeRemaining(discount.validUntil);
      setCountdown(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [discount]);

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
       setError('You already have an active code for this offer.');
       return;
    }

    setGenerating(true);
    setError('');

    try {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      const otp = (array[0] % 900000 + 100000).toString();
      const expiresAtDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
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

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Loading offer details...</div>;
  if (!discount || !shop) return <div className="p-12 text-center text-gray-500 font-medium">Offer not found.</div>;

  const badgeText = getOfferBadgeText(discount);
  const offerType = discount.offerType || 'percentage_flat';
  const activeCheck = isOfferCurrentlyActive(discount.validFrom, discount.validUntil, discount.active);

  // Quantity Pricing Calculations
  const qtyCalc = offerType === 'quantity_pricing' 
    ? calculateQuantityPricing(selectedQty, discount.quantityTiers || [], baseUnitPrice)
    : null;

  return (
    <div className="max-w-xl mx-auto p-4 py-8 space-y-6">
      
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm text-center relative overflow-hidden">
        {/* Flash Sale Header Banner */}
        {offerType === 'flash_sale' && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-2 px-4 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-6 flex items-center justify-between font-bold text-xs sm:text-sm shadow-sm">
            <span className="flex items-center gap-1.5">
              <Zap size={16} className="fill-white animate-bounce" /> FLASH SALE DEAL
            </span>
            <span>{countdown.isExpired ? 'SALE ENDED' : `ENDS IN: ${countdown.formatted}`}</span>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-800 font-extrabold text-sm rounded-full border border-blue-100 shadow-2xs">
            {offerType === 'bxgy' && <Gift size={16} className="text-blue-600" />}
            {offerType === 'quantity_pricing' && <Layers size={16} className="text-purple-600" />}
            {offerType === 'bundle' && <Package size={16} className="text-indigo-600" />}
            {offerType === 'flash_sale' && <Zap size={16} className="text-amber-600 fill-amber-500" />}
            <span>{badgeText}</span>
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

        {/* 1. FLASH SALE COUNTDOWN DISPLAY CARD */}
        {offerType === 'flash_sale' && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-center mb-6">
            <div className="flex items-center justify-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider mb-2">
              <Clock size={16} className="text-amber-600" /> Live Countdown Timer
            </div>
            {countdown.isExpired ? (
              <p className="text-red-600 font-bold text-lg">This Flash Sale has expired!</p>
            ) : (
              <div className="flex justify-center gap-3 text-center">
                <div className="bg-white rounded-xl p-2.5 min-w-[60px] border border-amber-200 shadow-2xs">
                  <span className="block text-2xl font-black text-amber-700">{countdown.hours.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Hours</span>
                </div>
                <span className="text-2xl font-bold text-amber-600 mt-2">:</span>
                <div className="bg-white rounded-xl p-2.5 min-w-[60px] border border-amber-200 shadow-2xs">
                  <span className="block text-2xl font-black text-amber-700">{countdown.minutes.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Mins</span>
                </div>
                <span className="text-2xl font-bold text-amber-600 mt-2">:</span>
                <div className="bg-white rounded-xl p-2.5 min-w-[60px] border border-amber-200 shadow-2xs">
                  <span className="block text-2xl font-black text-amber-700">{countdown.seconds.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Secs</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. BUY MORE SAVE MORE (QUANTITY PRICING) CALCULATOR CARD */}
        {offerType === 'quantity_pricing' && discount.quantityTiers?.length > 0 && (
          <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-5 text-left mb-6 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-200 pb-2">
              <h3 className="font-bold text-purple-950 text-sm flex items-center gap-1.5">
                <Layers size={16} className="text-purple-600" /> Quantity Tier Calculator
              </h3>
              <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                {discount.quantityMatchRule === 'mix_match' ? 'Mix & Match' : 'Same Product'}
              </span>
            </div>

            {/* Interactive Quantity Selector */}
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-purple-100">
              <span className="text-sm font-bold text-gray-800">Select Quantity:</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))}
                  className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center hover:bg-purple-200"
                >
                  <Minus size={16} />
                </button>
                <span className="font-extrabold text-lg w-8 text-center">{selectedQty}</span>
                <button
                  onClick={() => setSelectedQty(selectedQty + 1)}
                  className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center hover:bg-purple-200"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Price Savings Breakdown */}
            {qtyCalc && (
              <div className="bg-white p-4 rounded-xl border border-purple-100 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Effective Total Price:</span>
                  <span className="text-xl font-extrabold text-purple-900">₹{qtyCalc.totalPrice}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Price per unit:</span>
                  <span className="font-bold text-gray-800">₹{qtyCalc.effectiveUnitPrice} / item</span>
                </div>
                {qtyCalc.savings > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    <span>🎉 Total Savings:</span>
                    <span>You save ₹{qtyCalc.savings}!</span>
                  </div>
                )}
              </div>
            )}

            {/* Tier Table preview */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block mb-1">Available Quantity Slabs:</span>
              <div className="grid grid-cols-3 gap-2">
                {discount.quantityTiers.map((tier: QuantityTier, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedQty(tier.quantity)}
                    className={`p-2 rounded-xl text-center border text-xs transition ${
                      selectedQty === tier.quantity 
                        ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-xs' 
                        : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100 font-medium'
                    }`}
                  >
                    <div className="font-bold text-xs">{tier.label || `${tier.quantity} Units`}</div>
                    <div className="text-[11px] opacity-90 font-black">₹{tier.totalPrice}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. BUY X GET Y RULE CARD */}
        {offerType === 'bxgy' && (
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 text-left mb-6 space-y-3">
            <h3 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5 border-b border-emerald-200 pb-2">
              <Gift size={16} className="text-emerald-600" /> Buy X Get Y Offer Rules
            </h3>
            <div className="text-xs text-emerald-900 space-y-2">
              <p className="font-semibold text-sm">
                • Add <span className="font-black underline">{discount.bxgyBuyQty || 1} eligible item(s)</span> to your order and get <span className="font-black underline">{discount.bxgyGetQty || 1} item(s)</span> {discount.bxgyRewardType === 'free' ? 'FREE' : discount.bxgyRewardType === 'percentage' ? `@ ${discount.bxgyRewardValue}% OFF` : `@ ₹${discount.bxgyRewardValue} OFF`}!
              </p>
              <p className="text-emerald-800">
                • <strong>Selection Rule:</strong> {discount.bxgyMatchRule === 'mix_match' ? 'Mix & match any products in eligible category' : 'Valid on same product purchase'}.
              </p>
              <p className="text-emerald-800">
                • Lowest-priced item automatically receives the reward discount.
              </p>
            </div>
          </div>
        )}

        {/* 4. COMBO BUNDLE ITEM CHECKLIST CARD */}
        {offerType === 'bundle' && (
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 text-left mb-6 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
              <h3 className="font-bold text-indigo-950 text-sm flex items-center gap-1.5">
                <Package size={16} className="text-indigo-600" /> Combo Bundle Package
              </h3>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                Combo Price: ₹{discount.bundlePrice || discount.discountValue}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-indigo-900 uppercase">Included Items in this Bundle:</span>
              {discount.bundleItems?.map((item: BundleItem, idx: number) => (
                <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-indigo-100 text-xs">
                  <div className="flex items-center gap-2 font-medium text-gray-800">
                    <CheckCircle size={14} className="text-indigo-600" />
                    <span>{item.name} (x{item.quantity})</span>
                  </div>
                  {item.originalPrice && (
                    <span className="text-gray-400 line-through font-semibold">₹{item.originalPrice}</span>
                  )}
                </div>
              ))}
            </div>

            {discount.bundleOriginalPrice && (
              <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-indigo-100 text-xs font-bold mt-2">
                <span className="text-gray-500">Original Total: <span className="line-through">₹{discount.bundleOriginalPrice}</span></span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">Save ₹{Math.max(0, discount.bundleOriginalPrice - (discount.bundlePrice || 0))}!</span>
              </div>
            )}
          </div>
        )}

        {/* Standard Terms & Details Section */}
        <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-4 mb-8">
          {discount.validFrom && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Valid From</span>
              <span className="font-medium text-gray-900">
                {discount.validFrom?.toDate ? discount.validFrom.toDate().toLocaleString() : new Date(discount.validFrom).toLocaleString()}
              </span>
            </div>
          )}
          {discount.minimumPurchase > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Minimum Purchase</span>
              <span className="font-medium text-gray-900">₹{discount.minimumPurchase}</span>
            </div>
          )}
          {discount.maximumDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Maximum Discount Cap</span>
              <span className="font-medium text-gray-900">₹{discount.maximumDiscount}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 flex items-center"><Clock size={16} className="mr-1"/> Valid Until</span>
            <span className="font-medium text-gray-900">
              {discount.validUntil?.toDate ? discount.validUntil.toDate().toLocaleString() : new Date(discount.validUntil).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="text-left mb-8">
          <h3 className="font-bold text-gray-900 mb-2">Terms & Conditions</h3>
          <p className="text-sm text-gray-500 whitespace-pre-wrap">{discount.terms || '• Valid on selected products\n• Cannot be combined with other offers\n• One redemption per user per offer'}</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm">{error}</div>}

        {!activeCheck.isActive ? (
          <div className="w-full h-14 rounded-full bg-gray-100 text-gray-500 font-bold flex items-center justify-center text-base sm:text-lg">
            Offer Status: {activeCheck.statusLabel}
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
            {generating ? 'GENERATING...' : 'GET DISCOUNT CODE'}
          </Button>
        )}
      </div>

      {copiedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-bounce">
          <Check size={16} className="text-emerald-400" />
          <span>Offer link copied to clipboard!</span>
        </div>
      )}

      {showPhoneModal && (
        <CompleteProfileModal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)} />
      )}
    </div>
  );
}
