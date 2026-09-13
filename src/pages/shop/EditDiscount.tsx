import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { getShopPlanStatus } from '../../lib/subscription';
import { Percent, Gift, Layers, Package, Zap, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import { useCategories } from '../../hooks/useCategories';
import { OfferType, QuantityTier, BundleItem } from '../../utils/discountEngine';

export default function EditDiscount() {
  const { categories: CATEGORIES } = useCategories();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { discountId } = useParams();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [discount, setDiscount] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);

  // 5 Main Offer Types State
  const [offerType, setOfferType] = useState<OfferType>('percentage_flat');

  // Percentage / Flat fields
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');

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
    { quantity: 1, totalPrice: 800, label: '1 Pair' }
  ]);

  // Bundle Items State
  const [bundleType, setBundleType] = useState<'fixed_bundle' | 'mix_match_bundle'>('fixed_bundle');
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([
    { name: 'Item 1', quantity: 1, originalPrice: 500 }
  ]);
  const [bundlePrice, setBundlePrice] = useState<number>(999);
  const [bundleOriginalPrice, setBundleOriginalPrice] = useState<number>(1500);

  // Flash Sale fields
  const [flashSaleOfferType, setFlashSaleOfferType] = useState<'percentage' | 'flat' | 'fixed_price'>('percentage');
  const [flashSaleValue, setFlashSaleValue] = useState<number>(30);
  const [stockLimit, setStockLimit] = useState<number>(0);

  useEffect(() => {
    if (!user || !discountId) return;
    const fetchDiscount = async () => {
      try {
        const shopQ = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
        const shopSnap = await getDocs(shopQ);
        if (!shopSnap.empty) {
          const shopData: any = { id: shopSnap.docs[0].id, ...shopSnap.docs[0].data() };
          const discQ = query(collection(db, 'discounts'), where('shopId', '==', shopData.id), where('active', '==', true));
          const discSnap = await getDocs(discQ);
          shopData.activeDiscountsCount = discSnap.size;
          setShop(shopData);
        }

        const docRef = doc(db, 'discounts', discountId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDiscount({ id: docSnap.id, ...data });

          if (data.offerType) setOfferType(data.offerType);
          if (data.discountType) setDiscountType(data.discountType);
          if (data.bxgyBuyQty) setBxgyBuyQty(data.bxgyBuyQty);
          if (data.bxgyGetQty) setBxgyGetQty(data.bxgyGetQty);
          if (data.bxgyRewardType) setBxgyRewardType(data.bxgyRewardType);
          if (data.bxgyRewardValue) setBxgyRewardValue(data.bxgyRewardValue);
          if (data.bxgyMatchRule) setBxgyMatchRule(data.bxgyMatchRule);

          if (data.quantityPricingMethod) setQuantityPricingMethod(data.quantityPricingMethod);
          if (data.quantityMatchRule) setQuantityMatchRule(data.quantityMatchRule);
          if (data.quantityRepeatRule) setQuantityRepeatRule(data.quantityRepeatRule);
          if (data.quantityTiers) setQuantityTiers(data.quantityTiers);

          if (data.bundleType) setBundleType(data.bundleType);
          if (data.bundleItems) setBundleItems(data.bundleItems);
          if (data.bundlePrice) setBundlePrice(data.bundlePrice);
          if (data.bundleOriginalPrice) setBundleOriginalPrice(data.bundleOriginalPrice);

          if (data.flashSaleOfferType) setFlashSaleOfferType(data.flashSaleOfferType);
          if (data.flashSaleValue) setFlashSaleValue(data.flashSaleValue);
          if (data.stockLimit) setStockLimit(data.stockLimit);
        } else {
          setError('Discount not found');
        }
      } catch (err) {
        console.error('Error fetching discount:', err);
        setError('Error fetching discount details');
      } finally {
        setFetching(false);
      }
    };
    fetchDiscount();
  }, [user, discountId]);

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
    if (!discountId) return;
    
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const validFromVal = formData.get('validFrom') as string;
    const validUntilVal = formData.get('validUntil') as string;

    const validFromDate = validFromVal ? new Date(validFromVal) : new Date();
    const validUntilDate = validUntilVal ? new Date(validUntilVal) : new Date();
    validUntilDate.setHours(23, 59, 59, 999);

    const isActive = formData.get('active') === 'true';
    if (isActive && discount && !discount.active && shop) {
      const planStatus = getShopPlanStatus(shop);
      const isPro = planStatus === 'active';
      if (!isPro && shop.activeDiscountsCount >= 1) {
        setError('You have reached the limit of 1 active discount on the Free plan. Upgrade to Pro to activate more.');
        setLoading(false);
        return;
      }
    }

    try {
      const payload: any = {
        title: formData.get('title'),
        categoryId: formData.get('categoryId'),
        offerType: offerType,
        validFrom: validFromDate,
        validUntil: validUntilDate,
        terms: formData.get('terms'),
        active: formData.get('active') === 'true',
        usageLimit: Number(formData.get('usageLimit')) || 0,
        updatedAt: serverTimestamp()
      };

      if (offerType === 'percentage_flat') {
        payload.discountType = discountType;
        payload.discountValue = Number(formData.get('discountValue')) || 0;
        payload.minimumPurchase = Number(formData.get('minimumPurchase')) || 0;
        payload.maximumDiscount = Number(formData.get('maximumDiscount')) || 0;
      } else if (offerType === 'bxgy') {
        payload.bxgyBuyQty = Number(bxgyBuyQty) || 1;
        payload.bxgyGetQty = Number(bxgyGetQty) || 1;
        payload.bxgyRewardType = bxgyRewardType;
        payload.bxgyRewardValue = Number(bxgyRewardValue) || 0;
        payload.bxgyMatchRule = bxgyMatchRule;
        payload.minimumPurchase = Number(formData.get('minimumPurchase')) || 0;
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
        payload.minimumPurchase = Number(formData.get('minimumPurchase')) || 0;
        payload.discountType = flashSaleOfferType === 'percentage' ? 'percentage' : 'flat';
        payload.discountValue = Number(flashSaleValue) || 0;
      }

      await updateDoc(doc(db, 'discounts', discountId), payload);
      navigate('/shop/discounts');
    } catch (err: any) {
      setError(err.message || 'Failed to update offer');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error && !discount) return <div className="p-8 text-red-600">{error}</div>;

  const validFromDateStr = discount?.validFrom?.toDate ? discount.validFrom.toDate().toISOString().slice(0, 16) : '';
  const validUntilDateStr = discount?.validUntil?.toDate ? discount.validUntil.toDate().toISOString().slice(0, 16) : '';

  const offerTypeTabs = [
    { id: 'percentage_flat', name: 'Percentage / Flat', icon: Percent },
    { id: 'bxgy', name: 'Buy X Get Y', icon: Gift },
    { id: 'quantity_pricing', name: 'Buy More Save More', icon: Layers },
    { id: 'bundle', name: 'Combo / Bundle', icon: Package },
    { id: 'flash_sale', name: 'Flash Sale', icon: Zap },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-gray-900">Edit Offer</h1>
      
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

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
              className={`p-3 rounded-xl border text-left transition flex items-center gap-2 ${
                isSelected 
                  ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600 text-blue-900 font-bold' 
                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700 font-medium'
              }`}
            >
              <Icon size={18} className={isSelected ? 'text-blue-600' : 'text-gray-400'} />
              <span className="text-xs sm:text-sm">{tab.name}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Offer Title</label>
          <Input name="title" required defaultValue={discount.title} placeholder="Offer title" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Eligible Category</label>
            <select name="categoryId" required defaultValue={discount.categoryId} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              {!CATEGORIES.includes(discount.categoryId) && (
                <option value={discount.categoryId}>{discount.categoryId}</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit per Customer (Optional)</label>
            <Input name="usageLimit" type="number" min="0" defaultValue={discount.usageLimit || 0} placeholder="0 for unlimited" />
          </div>
        </div>

        {/* 1. PERCENTAGE / FLAT FIELDS */}
        {offerType === 'percentage_flat' && (
          <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2">Percentage / Flat Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                <Input name="discountValue" type="number" required defaultValue={discount.discountValue} min="1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Value (₹)</label>
                <Input name="minimumPurchase" type="number" defaultValue={discount.minimumPurchase || 0} min="0" />
              </div>
            </div>
            {discountType === 'percentage' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount Cap (₹)</label>
                <Input name="maximumDiscount" type="number" defaultValue={discount.maximumDiscount || 0} min="0" />
              </div>
            )}
          </div>
        )}

        {/* 2. BXGY FIELDS */}
        {offerType === 'bxgy' && (
          <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2">Buy X Get Y Rules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buy Qty (X)</label>
                <Input type="number" value={bxgyBuyQty} onChange={(e) => setBxgyBuyQty(Number(e.target.value))} min="1" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Get Qty (Y)</label>
                <Input type="number" value={bxgyGetQty} onChange={(e) => setBxgyGetQty(Number(e.target.value))} min="1" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reward Type</label>
                <select value={bxgyRewardType} onChange={(e) => setBxgyRewardType(e.target.value as any)} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                  <option value="free">100% Free</option>
                  <option value="percentage">Percentage OFF</option>
                  <option value="flat">Flat ₹ OFF</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 3. QUANTITY PRICING FIELDS */}
        {offerType === 'quantity_pricing' && (
          <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h3 className="text-sm font-bold text-gray-900">Quantity Slabs / Tiers</h3>
              <Button type="button" onClick={handleAddTier} size="sm" variant="outline" className="flex items-center gap-1">
                <Plus size={14} /> Add Tier
              </Button>
            </div>
            <div className="space-y-3">
              {quantityTiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200">
                  <div className="w-1/4">
                    <label className="block text-[11px] font-bold text-gray-500 mb-0.5">Qty</label>
                    <Input type="number" min="1" value={tier.quantity} onChange={(e) => handleUpdateTier(idx, 'quantity', Number(e.target.value))} />
                  </div>
                  <div className="w-2/4">
                    <label className="block text-[11px] font-bold text-gray-500 mb-0.5">Total Price (₹)</label>
                    <Input type="number" min="1" value={tier.totalPrice} onChange={(e) => handleUpdateTier(idx, 'totalPrice', Number(e.target.value))} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-gray-500 mb-0.5">Label</label>
                    <Input type="text" value={tier.label || ''} onChange={(e) => handleUpdateTier(idx, 'label', e.target.value)} />
                  </div>
                  <button type="button" onClick={() => handleRemoveTier(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg mt-4">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. COMBO / BUNDLE FIELDS */}
        {offerType === 'bundle' && (
          <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <h3 className="text-sm font-bold text-gray-900">Bundle Items & Pricing</h3>
              <Button type="button" onClick={handleAddBundleItem} size="sm" variant="outline" className="flex items-center gap-1">
                <Plus size={14} /> Add Item
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bundle Offer Price (₹)</label>
                <Input type="number" min="1" value={bundlePrice} onChange={(e) => setBundlePrice(Number(e.target.value))} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (₹)</label>
                <Input type="number" min="1" value={bundleOriginalPrice} onChange={(e) => setBundleOriginalPrice(Number(e.target.value))} required />
              </div>
            </div>
            <div className="space-y-3">
              {bundleItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-gray-500 mb-0.5">Item Name</label>
                    <Input type="text" value={item.name} onChange={(e) => handleUpdateBundleItem(idx, 'name', e.target.value)} />
                  </div>
                  <div className="w-1/4">
                    <label className="block text-[11px] font-bold text-gray-500 mb-0.5">Qty</label>
                    <Input type="number" min="1" value={item.quantity} onChange={(e) => handleUpdateBundleItem(idx, 'quantity', Number(e.target.value))} />
                  </div>
                  <button type="button" onClick={() => handleRemoveBundleItem(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg mt-4">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. FLASH SALE FIELDS */}
        {offerType === 'flash_sale' && (
          <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-200 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2">⚡ Flash Sale Setup</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flash Deal Type</label>
                <select value={flashSaleOfferType} onChange={(e) => setFlashSaleOfferType(e.target.value as any)} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Limit (Optional)</label>
                <Input type="number" min="0" value={stockLimit} onChange={(e) => setStockLimit(Number(e.target.value))} placeholder="0 for unlimited" />
              </div>
            </div>
          </div>
        )}

        {/* Dates & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time</label>
            <Input name="validFrom" type="datetime-local" required defaultValue={validFromDateStr} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time</label>
            <Input name="validUntil" type="datetime-local" required defaultValue={validUntilDateStr} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="active" required defaultValue={discount.active ? 'true' : 'false'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="true">Active</option>
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
            defaultValue={discount.terms}
            className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent"
          ></textarea>
        </div>

        <div className="flex gap-4">
          <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/shop/discounts')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="w-full font-bold">
            {loading ? 'Saving Changes...' : 'SAVE CHANGES'}
          </Button>
        </div>
      </form>
    </div>
  );
}
