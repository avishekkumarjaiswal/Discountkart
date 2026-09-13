import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { getShopPlanStatus } from '../../lib/subscription';
import { Crown, Percent, Gift, Layers, Package, Zap, Plus, Trash2, Wand2, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import { useCategories } from '../../hooks/useCategories';
import { OfferType, QuantityTier, BundleItem } from '../../utils/discountEngine';

export default function CreateDiscount() {
  const { user } = useAuth();
  const { categories: CATEGORIES } = useCategories();
  const navigate = useNavigate();
  const [shop, setShop] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [offerType, setOfferType] = useState<OfferType>('percentage_flat');

  // Percentage / Flat fields
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [minimumPurchase, setMinimumPurchase] = useState<number>(0);
  const [maximumDiscount, setMaximumDiscount] = useState<number>(0);

  // Buy X Get Y fields
  const [bxgyBuyQty, setBxgyBuyQty] = useState<number>(2);
  const [bxgyGetQty, setBxgyGetQty] = useState<number>(1);
  const [bxgyRewardType, setBxgyRewardType] = useState<'free' | 'percentage' | 'flat' | 'fixed_price'>('free');
  const [bxgyRewardValue, setBxgyRewardValue] = useState<number>(0);
  const [bxgyMatchRule, setBxgyMatchRule] = useState<'same_product' | 'mix_match'>('same_product');

  // Quantity Pricing Tiers State
  const [quantityPricingMethod, setQuantityPricingMethod] = useState<'fixed_total' | 'percentage_discount' | 'flat_discount'>('fixed_total');
  const [quantityMatchRule, setQuantityMatchRule] = useState<'same_product' | 'mix_match'>('same_product');
  const [quantityRepeatRule, setQuantityRepeatRule] = useState<'repeat_highest' | 'stop_at_highest'>('repeat_highest');
  const [quantityTiers, setQuantityTiers] = useState<QuantityTier[]>([
    { quantity: 1, totalPrice: 800, label: '1 Pair' },
    { quantity: 2, totalPrice: 1500, label: '2 Pairs' },
    { quantity: 3, totalPrice: 2100, label: '3 Pairs' }
  ]);

  // Bundle Items State
  const [bundleType, setBundleType] = useState<'fixed_bundle' | 'mix_match_bundle'>('fixed_bundle');
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([
    { name: 'Item 1 (e.g. Shoes)', quantity: 1, originalPrice: 1200 },
    { name: 'Item 2 (e.g. Socks)', quantity: 1, originalPrice: 300 }
  ]);
  const [bundlePrice, setBundlePrice] = useState<number>(999);
  const [bundleOriginalPrice, setBundleOriginalPrice] = useState<number>(1500);

  // Flash Sale fields
  const [flashSaleOfferType, setFlashSaleOfferType] = useState<'percentage' | 'flat' | 'fixed_price'>('percentage');
  const [flashSaleValue, setFlashSaleValue] = useState<number>(30);
  const [stockLimit, setStockLimit] = useState<number>(0);
  const [maxPerCustomer, setMaxPerCustomer] = useState<number>(0);

  useEffect(() => {
    if (!user) return;

    const fetchShop = async () => {
      const q = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const shopData: any = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        const discQ = query(collection(db, 'discounts'), where('shopId', '==', shopData.id), where('active', '==', true));
        const discSnap = await getDocs(discQ);
        shopData.activeDiscountsCount = discSnap.size;
        
        setShop(shopData);
        if (shopData.category) {
          setSelectedCategory(shopData.category);
        }
      }
    };
    fetchShop();
  }, [user]);

  // ⚡ Presets to fill form in 1-click
  const applyPreset = (presetKey: string) => {
    const categoryName = selectedCategory || shop?.category || 'Collection';
    if (presetKey === '20_percent') {
      setOfferType('percentage_flat');
      setDiscountType('percentage');
      setDiscountValue(20);
      setTitle(`20% OFF ${categoryName}`);
    } else if (presetKey === 'flat_200') {
      setOfferType('percentage_flat');
      setDiscountType('flat');
      setDiscountValue(200);
      setMinimumPurchase(999);
      setTitle(`₹200 OFF on Orders Above ₹999`);
    } else if (presetKey === 'b2g1') {
      setOfferType('bxgy');
      setBxgyBuyQty(2);
      setBxgyGetQty(1);
      setBxgyRewardType('free');
      setTitle(`Buy 2 Get 1 FREE on ${categoryName}`);
    } else if (presetKey === 'quantity_tier') {
      setOfferType('quantity_pricing');
      setQuantityPricingMethod('fixed_total');
      setQuantityTiers([
        { quantity: 1, totalPrice: 800, label: '1 Item' },
        { quantity: 2, totalPrice: 1500, label: '2 Items' },
        { quantity: 3, totalPrice: 2100, label: '3 Items' }
      ]);
      setTitle(`Buy More Save More - 2 for ₹1,500`);
    } else if (presetKey === 'combo_999') {
      setOfferType('bundle');
      setBundlePrice(999);
      setBundleOriginalPrice(1500);
      setBundleItems([
        { name: 'Primary Item', quantity: 1, originalPrice: 1000 },
        { name: 'Accessory', quantity: 1, originalPrice: 500 }
      ]);
      setTitle(`Combo Bundle Offer @ ₹999`);
    } else if (presetKey === 'flash_30') {
      setOfferType('flash_sale');
      setFlashSaleOfferType('percentage');
      setFlashSaleValue(30);
      setTitle(`⚡ Flash Sale - 30% OFF Today Only`);
    }
  };

  const handleAutoGenerateTitle = () => {
    const categoryName = selectedCategory || shop?.category || 'Collection';
    if (offerType === 'percentage_flat') {
      if (discountType === 'percentage') {
        setTitle(`${discountValue}% OFF on ${categoryName}`);
      } else {
        setTitle(`₹${discountValue} OFF on ${categoryName}`);
      }
    } else if (offerType === 'bxgy') {
      if (bxgyRewardType === 'free') {
        setTitle(`Buy ${bxgyBuyQty} Get ${bxgyGetQty} FREE on ${categoryName}`);
      } else {
        setTitle(`Buy ${bxgyBuyQty} Get ${bxgyGetQty} at ${bxgyRewardValue}% OFF`);
      }
    } else if (offerType === 'quantity_pricing') {
      if (quantityTiers.length > 0) {
        const t = quantityTiers[Math.min(1, quantityTiers.length - 1)];
        setTitle(`Buy More Save More - ${t.quantity} for ₹${t.totalPrice}`);
      } else {
        setTitle(`Quantity Discount on ${categoryName}`);
      }
    } else if (offerType === 'bundle') {
      setTitle(`Special Combo Bundle @ ₹${bundlePrice}`);
    } else if (offerType === 'flash_sale') {
      setTitle(`⚡ Flash Sale ${flashSaleValue}% OFF - Today Only`);
    }
  };

  const handleAddTier = () => {
    const nextQty = quantityTiers.length > 0 ? quantityTiers[quantityTiers.length - 1].quantity + 1 : 1;
    setQuantityTiers([...quantityTiers, { quantity: nextQty, totalPrice: nextQty * 500, label: `${nextQty} Items` }]);
  };

  const handleRemoveTier = (index: number) => {
    if (quantityTiers.length <= 1) return;
    setQuantityTiers(quantityTiers.filter((_, i) => i !== index));
  };

  const handleUpdateTier = (index: number, field: keyof QuantityTier, value: any) => {
    const updated = [...quantityTiers];
    updated[index] = { ...updated[index], [field]: value };
    setQuantityTiers(updated);
  };

  const handleAddBundleItem = () => {
    setBundleItems([...bundleItems, { name: `Item ${bundleItems.length + 1}`, quantity: 1, originalPrice: 500 }]);
  };

  const handleRemoveBundleItem = (index: number) => {
    if (bundleItems.length <= 1) return;
    setBundleItems(bundleItems.filter((_, i) => i !== index));
  };

  const handleUpdateBundleItem = (index: number, field: keyof BundleItem, value: any) => {
    const updated = [...bundleItems];
    updated[index] = { ...updated[index], [field]: value };
    setBundleItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!shop) return;
    
    const formData = new FormData(e.currentTarget);
    const planStatus = getShopPlanStatus(shop);
    const isPro = planStatus === 'active';
    const isActive = formData.get('active') === 'true';

    if (isActive && !isPro && shop.activeDiscountsCount >= 1) {
      setError('You can only have 1 active discount on the Basic plan.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const validFromVal = formData.get('validFrom') as string;
    const validUntilVal = formData.get('validUntil') as string;

    const validFromDate = validFromVal ? new Date(validFromVal) : new Date();
    const validUntilDate = validUntilVal ? new Date(validUntilVal) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    validUntilDate.setHours(23, 59, 59, 999);

    try {
      const payload: any = {
        shopId: shop.id,
        title: title || formData.get('title'),
        categoryId: formData.get('categoryId'),
        offerType: offerType,
        validFrom: validFromDate,
        validUntil: validUntilDate,
        terms: formData.get('terms'),
        active: formData.get('active') === 'true',
        usageLimit: Number(formData.get('usageLimit')) || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (offerType === 'percentage_flat') {
        payload.discountType = discountType;
        payload.discountValue = Number(discountValue) || Number(formData.get('discountValue')) || 0;
        payload.minimumPurchase = Number(minimumPurchase) || Number(formData.get('minimumPurchase')) || 0;
        payload.maximumDiscount = Number(maximumDiscount) || Number(formData.get('maximumDiscount')) || 0;
      } else if (offerType === 'bxgy') {
        payload.bxgyBuyQty = Number(bxgyBuyQty) || 1;
        payload.bxgyGetQty = Number(bxgyGetQty) || 1;
        payload.bxgyRewardType = bxgyRewardType;
        payload.bxgyRewardValue = Number(bxgyRewardValue) || 0;
        payload.bxgyMatchRule = bxgyMatchRule;
        payload.minimumPurchase = Number(minimumPurchase) || Number(formData.get('minimumPurchase')) || 0;
        payload.discountType = bxgyRewardType === 'percentage' ? 'percentage' : 'flat';
        payload.discountValue = bxgyRewardType === 'free' ? 100 : Number(bxgyRewardValue) || 0;
      } else if (offerType === 'quantity_pricing') {
        payload.quantityPricingMethod = quantityPricingMethod;
        payload.quantityMatchRule = quantityMatchRule;
        payload.quantityRepeatRule = quantityRepeatRule;
        payload.quantityTiers = quantityTiers;
        payload.discountType = 'flat';
        payload.discountValue = quantityTiers.length > 0 ? quantityTiers[quantityTiers.length - 1].totalPrice : 0;
      } else if (offerType === 'bundle') {
        payload.bundleType = bundleType;
        payload.bundleItems = bundleItems;
        payload.bundlePrice = Number(bundlePrice) || 0;
        payload.bundleOriginalPrice = Number(bundleOriginalPrice) || 0;
        payload.discountType = 'flat';
        payload.discountValue = Math.max(0, bundleOriginalPrice - bundlePrice);
      } else if (offerType === 'flash_sale') {
        payload.flashSaleOfferType = flashSaleOfferType;
        payload.flashSaleValue = Number(flashSaleValue) || 0;
        payload.stockLimit = Number(stockLimit) || 0;
        payload.maxPerCustomer = Number(maxPerCustomer) || 0;
        payload.minimumPurchase = Number(minimumPurchase) || Number(formData.get('minimumPurchase')) || 0;
        payload.discountType = flashSaleOfferType === 'percentage' ? 'percentage' : 'flat';
        payload.discountValue = Number(flashSaleValue) || 0;
      }

      await addDoc(collection(db, 'discounts'), payload);
      navigate('/shop/discounts');
    } catch (err: any) {
      setError(err.message || 'Failed to create discount');
    } finally {
      setLoading(false);
    }
  };

  if (!shop) {
    return (
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const planStatus = getShopPlanStatus(shop);
  const isPro = planStatus === 'active';
  const hasReachedLimit = !isPro && (shop.activeDiscountsCount >= 1);

  const offerTypeTabs = [
    { id: 'percentage_flat', name: 'Percentage / Flat', icon: Percent, desc: 'e.g. 20% OFF or ₹200 OFF' },
    { id: 'bxgy', name: 'Buy X Get Y', icon: Gift, desc: 'e.g. Buy 2 Get 1 Free' },
    { id: 'quantity_pricing', name: 'Buy More Save More', icon: Layers, desc: 'e.g. 1 pair ₹800, 2 pairs ₹1,500' },
    { id: 'bundle', name: 'Combo / Bundle', icon: Package, desc: 'e.g. Shirt + Jeans = ₹1,499' },
    { id: 'flash_sale', name: 'Flash Sale', icon: Zap, desc: 'Time-limited deal with countdown' },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Create New Offer</h1>
      </div>

      {hasReachedLimit && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-xl flex items-start gap-3">
          <Crown className="text-blue-600 flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h2 className="text-sm font-bold mb-1">Limit of 1 Active Discount Reached</h2>
            <p className="text-xs text-blue-800 mb-2">You can create this discount, but it will be saved as <strong>Inactive</strong>. Upgrade to Pro to have unlimited active discounts simultaneously.</p>
            <Button onClick={() => navigate('/shop/subscription')} size="sm" className="bg-blue-600 hover:bg-blue-700">
              Upgrade to Pro
            </Button>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

      {/* ⚡ 1-CLICK POPULAR OFFER PRESETS BAR */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 rounded-2xl shadow-md space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-amber-400 fill-amber-400" />
          <span className="font-extrabold text-xs sm:text-sm uppercase tracking-wider">Fast Listing: 1-Click Offer Templates</span>
        </div>
        <p className="text-xs text-blue-200">Click any preset below to instantly pre-fill the offer form in less than 1 second!</p>
        
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => applyPreset('20_percent')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-1 transition">
            🏷️ 20% OFF Sale
          </button>
          <button type="button" onClick={() => applyPreset('flat_200')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-1 transition">
            💵 ₹200 OFF Above ₹999
          </button>
          <button type="button" onClick={() => applyPreset('b2g1')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-1 transition">
            🎁 Buy 2 Get 1 Free
          </button>
          <button type="button" onClick={() => applyPreset('quantity_tier')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-1 transition">
            🥞 1 for ₹800, 2 for ₹1,500
          </button>
          <button type="button" onClick={() => applyPreset('combo_999')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-1 transition">
            📦 Combo Pack @ ₹999
          </button>
          <button type="button" onClick={() => applyPreset('flash_30')} className="px-3 py-1.5 bg-amber-500/80 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs rounded-xl border border-amber-400 flex items-center gap-1 transition">
            ⚡ Flash Sale 30% OFF
          </button>
        </div>
      </div>

      {/* Offer Type Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {offerTypeTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = offerType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setOfferType(tab.id as OfferType)}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                isSelected 
                  ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600 text-blue-900' 
                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={20} className={isSelected ? 'text-blue-600' : 'text-gray-400'} />
                {isSelected && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
              </div>
              <div>
                <p className="font-bold text-xs sm:text-sm">{tab.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{tab.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">Offer Title</label>
            <button
              type="button"
              onClick={handleAutoGenerateTitle}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
            >
              <Wand2 size={13} />
              <span>Auto-Fill Title</span>
            </button>
          </div>
          <Input 
            name="title" 
            required 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 20% OFF Footwear / Buy 2 Get 1 Free" 
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Eligible Category</label>
            <select 
              name="categoryId" 
              required 
              value={selectedCategory || (shop?.category ? shop.category : CATEGORIES[0] || '')}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 font-medium text-gray-900"
            >
              {(() => {
                const shopCat = shop?.category;
                const catList = shopCat 
                  ? [shopCat, ...CATEGORIES.filter(c => c.toLowerCase() !== shopCat.toLowerCase())]
                  : CATEGORIES;
                return catList.map(cat => (
                  <option key={cat} value={cat}>
                    {cat} {shopCat && cat.toLowerCase() === shopCat.toLowerCase() ? ' (Shop Category)' : ''}
                  </option>
                ));
              })()}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit per Customer (Optional)</label>
            <Input name="usageLimit" type="number" min="0" placeholder="0 for unlimited" />
          </div>
        </div>

        {/* 1. PERCENTAGE / FLAT DYNAMIC FIELDS */}
        {offerType === 'percentage_flat' && (
          <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2">Percentage / Flat Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select 
                  value={discountType} 
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                <Input name="discountValue" type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} required placeholder={discountType === 'percentage' ? '20' : '200'} min="1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Value (₹)</label>
                <Input name="minimumPurchase" type="number" value={minimumPurchase} onChange={(e) => setMinimumPurchase(Number(e.target.value))} placeholder="1000" min="0" />
              </div>
            </div>
            {discountType === 'percentage' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Discount Cap (₹) (Optional)</label>
                <Input name="maximumDiscount" type="number" value={maximumDiscount} onChange={(e) => setMaximumDiscount(Number(e.target.value))} placeholder="500" min="0" />
              </div>
            )}
          </div>
        )}

        {/* 2. BUY X GET Y DYNAMIC FIELDS */}
        {offerType === 'bxgy' && (
          <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2">Buy X Get Y Rules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buy Quantity (X)</label>
                <Input type="number" value={bxgyBuyQty} onChange={(e) => setBxgyBuyQty(Number(e.target.value))} min="1" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Get Quantity (Y)</label>
                <Input type="number" value={bxgyGetQty} onChange={(e) => setBxgyGetQty(Number(e.target.value))} min="1" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reward Type</label>
                <select 
                  value={bxgyRewardType}
                  onChange={(e) => setBxgyRewardType(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <option value="free">100% Free</option>
                  <option value="percentage">Percentage OFF on Y</option>
                  <option value="flat">Flat ₹ OFF on Y</option>
                </select>
              </div>
            </div>

            {bxgyRewardType !== 'free' && (
              <div className="w-full sm:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {bxgyRewardType === 'percentage' ? 'Reward Discount %' : 'Reward Flat Discount ₹'}
                </label>
                <Input type="number" value={bxgyRewardValue} onChange={(e) => setBxgyRewardValue(Number(e.target.value))} min="1" placeholder="50" required />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Selection Rule</label>
                <select 
                  value={bxgyMatchRule}
                  onChange={(e) => setBxgyMatchRule(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <option value="same_product">Same Product Only</option>
                  <option value="mix_match">Mix & Match Eligible Category</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Value (₹) (Optional)</label>
                <Input name="minimumPurchase" type="number" value={minimumPurchase} onChange={(e) => setMinimumPurchase(Number(e.target.value))} placeholder="0" min="0" />
              </div>
            </div>
          </div>
        )}

        {/* 3. QUANTITY PRICING DYNAMIC FIELDS */}
        {offerType === 'quantity_pricing' && (
          <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h3 className="text-sm font-bold text-gray-900">Quantity Slabs / Tiers (Buy More Save More)</h3>
              <Button type="button" onClick={handleAddTier} size="sm" variant="outline" className="flex items-center gap-1">
                <Plus size={14} /> Add Tier
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Method</label>
                <select 
                  value={quantityPricingMethod}
                  onChange={(e) => setQuantityPricingMethod(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <option value="fixed_total">Fixed Total Price by Quantity</option>
                  <option value="percentage_discount">Percentage Discount by Quantity</option>
                  <option value="flat_discount">Flat Discount by Quantity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Selection Rule</label>
                <select 
                  value={quantityMatchRule}
                  onChange={(e) => setQuantityMatchRule(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <option value="same_product">Same Product Only</option>
                  <option value="mix_match">Mix & Match Eligible Category</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {quantityTiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200">
                  <div className="w-1/4">
                    <label className="block text-[11px] font-bold text-gray-500 mb-0.5">Quantity</label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={tier.quantity} 
                      onChange={(e) => handleUpdateTier(idx, 'quantity', Number(e.target.value))} 
                    />
                  </div>
                  <div className="w-2/4">
                    <label className="block text-[11px] font-bold text-gray-500 mb-0.5">
                      {quantityPricingMethod === 'fixed_total' ? 'Total Price (₹)' : 'Discount Amount'}
                    </label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={tier.totalPrice} 
                      onChange={(e) => handleUpdateTier(idx, 'totalPrice', Number(e.target.value))} 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-gray-500 mb-0.5">Label (e.g. 1 Pair)</label>
                    <Input 
                      type="text" 
                      value={tier.label || ''} 
                      onChange={(e) => handleUpdateTier(idx, 'label', e.target.value)} 
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveTier(idx)} 
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition mt-4"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. COMBO / BUNDLE DYNAMIC FIELDS */}
        {offerType === 'bundle' && (
          <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h3 className="text-sm font-bold text-gray-900">Combo / Bundle Items</h3>
              <Button type="button" onClick={handleAddBundleItem} size="sm" variant="outline" className="flex items-center gap-1">
                <Plus size={14} /> Add Item
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bundle Type</label>
                <select 
                  value={bundleType}
                  onChange={(e) => setBundleType(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <option value="fixed_bundle">Fixed Product Bundle</option>
                  <option value="mix_match_bundle">Mix & Match Category Bundle</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bundle Offer Price (₹)</label>
                <Input type="number" min="1" value={bundlePrice} onChange={(e) => setBundlePrice(Number(e.target.value))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Combined Original Price (₹)</label>
                <Input type="number" min="1" value={bundleOriginalPrice} onChange={(e) => setBundleOriginalPrice(Number(e.target.value))} required />
              </div>
            </div>

            <div className="space-y-3">
              {bundleItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-gray-500 mb-0.5">Item Name</label>
                    <Input 
                      type="text" 
                      value={item.name} 
                      onChange={(e) => handleUpdateBundleItem(idx, 'name', e.target.value)} 
                    />
                  </div>
                  <div className="w-1/4">
                    <label className="block text-[11px] font-bold text-gray-500 mb-0.5">Qty</label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={item.quantity} 
                      onChange={(e) => handleUpdateBundleItem(idx, 'quantity', Number(e.target.value))} 
                    />
                  </div>
                  <div className="w-1/3">
                    <label className="block text-[11px] font-bold text-gray-500 mb-0.5">Original Price (₹)</label>
                    <Input 
                      type="number" 
                      min="0" 
                      value={item.originalPrice || 0} 
                      onChange={(e) => handleUpdateBundleItem(idx, 'originalPrice', Number(e.target.value))} 
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveBundleItem(idx)} 
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition mt-4"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. FLASH SALE DYNAMIC FIELDS */}
        {offerType === 'flash_sale' && (
          <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2">⚡ Flash Sale Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flash Deal Type</label>
                <select 
                  value={flashSaleOfferType}
                  onChange={(e) => setFlashSaleOfferType(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <option value="percentage">Percentage OFF (%)</option>
                  <option value="flat">Flat Amount OFF (₹)</option>
                  <option value="fixed_price">Fixed Flash Price (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value / Price</label>
                <Input type="number" min="1" value={flashSaleValue} onChange={(e) => setFlashSaleValue(Number(e.target.value))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock / Redemption Limit (Optional)</label>
                <Input type="number" min="0" value={stockLimit} onChange={(e) => setStockLimit(Number(e.target.value))} placeholder="0 for unlimited" />
              </div>
            </div>
          </div>
        )}

        {/* Start / End Dates & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
            <Input name="validFrom" type="datetime-local" required defaultValue={new Date().toISOString().slice(0, 16)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
            <Input name="validUntil" type="datetime-local" required defaultValue={new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0, 16)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="active" required defaultValue={!hasReachedLimit ? 'true' : 'false'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              <option value="true" disabled={hasReachedLimit}>Active {hasReachedLimit ? '(Pro Required)' : ''}</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
          <textarea 
            name="terms" 
            required 
            rows={3}
            defaultValue="• Valid on selected products&#10;• Cannot be combined with other offers&#10;• Limited stock available"
            className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent"
          ></textarea>
        </div>

        <Button type="submit" disabled={loading} className="w-full h-12 text-base font-bold">
          {loading ? 'Creating Offer...' : 'CREATE OFFER'}
        </Button>
      </form>
    </div>
  );
}
