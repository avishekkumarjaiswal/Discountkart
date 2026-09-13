import React, { useState, useEffect } from 'react';
import { updateDoc, doc, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../ui/Button';
import { useCategories } from '../../hooks/useCategories';
import { Input } from '../ui/Input';
import { X, ImagePlus, Loader2, Store, Tag, Package, Plus, Trash2, Edit3, Check, Percent, Gift, Layers, Zap } from 'lucide-react';
import { getOfferBadgeText, OfferType, QuantityTier, BundleItem } from '../../utils/discountEngine';

interface EditShopModalProps {
  shop: any;
  onClose: () => void;
  onSave: () => void;
}

export function EditShopModal({ shop, onClose, onSave }: EditShopModalProps) {
  const { categories } = useCategories();
  const [activeTab, setActiveTab] = useState<'details' | 'discounts' | 'products'>('details');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(shop.coverImageUrl || '');

  // Discounts state
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any | null>(null);
  const [isAddingDiscount, setIsAddingDiscount] = useState(false);

  // 5 Main Offer Types State for Admin Form
  const [offerType, setOfferType] = useState<OfferType>('percentage_flat');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');

  // BXGY fields
  const [bxgyBuyQty, setBxgyBuyQty] = useState<number>(2);
  const [bxgyGetQty, setBxgyGetQty] = useState<number>(1);
  const [bxgyRewardType, setBxgyRewardType] = useState<'free' | 'percentage' | 'flat' | 'fixed_price'>('free');
  const [bxgyRewardValue, setBxgyRewardValue] = useState<number>(0);
  const [bxgyMatchRule, setBxgyMatchRule] = useState<'same_product' | 'mix_match'>('same_product');

  // Quantity Pricing State
  const [quantityPricingMethod, setQuantityPricingMethod] = useState<'fixed_total' | 'percentage_discount' | 'flat_discount'>('fixed_total');
  const [quantityTiers, setQuantityTiers] = useState<QuantityTier[]>([
    { quantity: 1, totalPrice: 800, label: '1 Pair' },
    { quantity: 2, totalPrice: 1500, label: '2 Pairs' }
  ]);

  // Bundle Items State
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([
    { name: 'Item 1', quantity: 1, originalPrice: 500 }
  ]);
  const [bundlePrice, setBundlePrice] = useState<number>(999);
  const [bundleOriginalPrice, setBundleOriginalPrice] = useState<number>(1500);

  // Flash Sale fields
  const [flashSaleOfferType, setFlashSaleOfferType] = useState<'percentage' | 'flat' | 'fixed_price'>('percentage');
  const [flashSaleValue, setFlashSaleValue] = useState<number>(30);

  // Products state
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  useEffect(() => {
    if (activeTab === 'discounts') {
      fetchDiscounts();
    } else if (activeTab === 'products') {
      fetchProducts();
    }
  }, [activeTab, shop.id]);

  useEffect(() => {
    if (editingDiscount) {
      if (editingDiscount.offerType) setOfferType(editingDiscount.offerType);
      if (editingDiscount.discountType) setDiscountType(editingDiscount.discountType);
      if (editingDiscount.bxgyBuyQty) setBxgyBuyQty(editingDiscount.bxgyBuyQty);
      if (editingDiscount.bxgyGetQty) setBxgyGetQty(editingDiscount.bxgyGetQty);
      if (editingDiscount.bxgyRewardType) setBxgyRewardType(editingDiscount.bxgyRewardType);
      if (editingDiscount.bxgyRewardValue) setBxgyRewardValue(editingDiscount.bxgyRewardValue);
      if (editingDiscount.quantityTiers) setQuantityTiers(editingDiscount.quantityTiers);
      if (editingDiscount.bundleItems) setBundleItems(editingDiscount.bundleItems);
      if (editingDiscount.bundlePrice) setBundlePrice(editingDiscount.bundlePrice);
      if (editingDiscount.bundleOriginalPrice) setBundleOriginalPrice(editingDiscount.bundleOriginalPrice);
      if (editingDiscount.flashSaleOfferType) setFlashSaleOfferType(editingDiscount.flashSaleOfferType);
      if (editingDiscount.flashSaleValue) setFlashSaleValue(editingDiscount.flashSaleValue);
    }
  }, [editingDiscount]);

  const fetchDiscounts = async () => {
    setLoadingDiscounts(true);
    try {
      const q = query(collection(db, 'discounts'), where('shopId', '==', shop.id));
      const snap = await getDocs(q);
      setDiscounts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching discounts:', err);
    } finally {
      setLoadingDiscounts(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const q = query(collection(db, 'products'), where('shopId', '==', shop.id));
      const snap = await getDocs(q);
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert('Image size should be less than 800KB');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setCurrentImageUrl(base64String);
      setUploadingImage(false);
    };
    reader.onerror = () => {
      console.error('Error reading file');
      alert('Failed to read image file');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const updates: any = {
        shopName: formData.get('shopName'),
        category: formData.get('category'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        address: formData.get('address'),
        city: formData.get('city'),
        area: formData.get('area'),
        description: formData.get('description'),
        openingTime: formData.get('openingTime') || '09:00',
        closingTime: formData.get('closingTime') || '21:00',
        status: formData.get('status'),
        subscriptionStatus: formData.get('subscriptionStatus'),
        coverImageUrl: currentImageUrl || formData.get('coverImageUrl'),
        googleMapsUrl: formData.get('googleMapsUrl'),
      };

      if (formData.get('status') === 'approved' && shop.status !== 'approved') {
        const now = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(now.getDate() + 30);
        updates.subscriptionPlan = 'pro';
        updates.subscriptionStatus = 'trial';
        updates.trialStartDate = now;
        updates.trialEndDate = trialEnd;
      }
      
      await updateDoc(doc(db, 'shops', shop.id), updates);
      onSave();
    } catch (error) {
      console.error('Error updating shop:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (dateVal: any): string => {
    if (!dateVal) return '';
    try {
      const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const handleAddTier = () => {
    const nextQty = quantityTiers.length > 0 ? quantityTiers[quantityTiers.length - 1].quantity + 1 : 1;
    setQuantityTiers([...quantityTiers, { quantity: nextQty, totalPrice: nextQty * 500, label: `${nextQty} Items` }]);
  };

  const handleRemoveTier = (idx: number) => {
    if (quantityTiers.length <= 1) return;
    setQuantityTiers(quantityTiers.filter((_, i) => i !== idx));
  };

  const handleAddBundleItem = () => {
    setBundleItems([...bundleItems, { name: `Item ${bundleItems.length + 1}`, quantity: 1, originalPrice: 500 }]);
  };

  const handleRemoveBundleItem = (idx: number) => {
    if (bundleItems.length <= 1) return;
    setBundleItems(bundleItems.filter((_, i) => i !== idx));
  };

  // Discount Actions
  const handleSaveDiscount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const validFromRaw = formData.get('validFrom') as string;
    const validUntilRaw = formData.get('validUntil') as string;

    const validFrom = validFromRaw ? new Date(validFromRaw) : new Date();
    let validUntil: Date | null = null;
    if (validUntilRaw) {
      validUntil = new Date(validUntilRaw);
      validUntil.setHours(23, 59, 59, 999);
    }

    const discountData: any = {
      shopId: shop.id,
      title: formData.get('title'),
      categoryId: formData.get('categoryId') || shop.category || 'Others',
      offerType: offerType,
      validFrom,
      validUntil,
      terms: formData.get('terms') || '',
      active: formData.get('active') === 'true',
      updatedAt: new Date()
    };

    if (offerType === 'percentage_flat') {
      discountData.discountType = discountType;
      discountData.discountValue = Number(formData.get('discountValue') || 0);
      discountData.minimumPurchase = Number(formData.get('minimumPurchase') || 0);
      discountData.maximumDiscount = Number(formData.get('maximumDiscount') || 0);
    } else if (offerType === 'bxgy') {
      discountData.bxgyBuyQty = Number(bxgyBuyQty) || 1;
      discountData.bxgyGetQty = Number(bxgyGetQty) || 1;
      discountData.bxgyRewardType = bxgyRewardType;
      discountData.bxgyRewardValue = Number(bxgyRewardValue) || 0;
      discountData.bxgyMatchRule = bxgyMatchRule;
      discountData.minimumPurchase = Number(formData.get('minimumPurchase') || 0);
      discountData.discountType = bxgyRewardType === 'percentage' ? 'percentage' : 'flat';
      discountData.discountValue = bxgyRewardType === 'free' ? 100 : Number(bxgyRewardValue) || 0;
    } else if (offerType === 'quantity_pricing') {
      discountData.quantityPricingMethod = quantityPricingMethod;
      discountData.quantityTiers = quantityTiers;
      discountData.discountType = 'flat';
      discountData.discountValue = quantityTiers.length > 0 ? quantityTiers[quantityTiers.length - 1].totalPrice : 0;
    } else if (offerType === 'bundle') {
      discountData.bundleItems = bundleItems;
      discountData.bundlePrice = Number(bundlePrice) || 0;
      discountData.bundleOriginalPrice = Number(bundleOriginalPrice) || 0;
      discountData.discountType = 'flat';
      discountData.discountValue = Math.max(0, bundleOriginalPrice - bundlePrice);
    } else if (offerType === 'flash_sale') {
      discountData.flashSaleOfferType = flashSaleOfferType;
      discountData.flashSaleValue = Number(flashSaleValue) || 0;
      discountData.minimumPurchase = Number(formData.get('minimumPurchase') || 0);
      discountData.discountType = flashSaleOfferType === 'percentage' ? 'percentage' : 'flat';
      discountData.discountValue = Number(flashSaleValue) || 0;
    }

    try {
      if (editingDiscount) {
        await updateDoc(doc(db, 'discounts', editingDiscount.id), discountData);
      } else {
        await addDoc(collection(db, 'discounts'), {
          ...discountData,
          createdAt: new Date()
        });
      }
      setEditingDiscount(null);
      setIsAddingDiscount(false);
      await fetchDiscounts();
    } catch (err) {
      console.error('Error saving discount:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDiscountActive = async (disc: any) => {
    try {
      await updateDoc(doc(db, 'discounts', disc.id), {
        active: !disc.active
      });
      await fetchDiscounts();
    } catch (err) {
      console.error('Error toggling discount status:', err);
    }
  };

  const handleDeleteDiscount = async (discountId: string) => {
    if (!window.confirm('Are you sure you want to delete this discount?')) return;
    try {
      await deleteDoc(doc(db, 'discounts', discountId));
      await fetchDiscounts();
    } catch (err) {
      console.error('Error deleting discount:', err);
    }
  };

  // Product Actions
  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);

    const productData: any = {
      shopId: shop.id,
      name: formData.get('name'),
      price: Number(formData.get('price')),
      category: formData.get('category') || 'General',
      quantity: formData.get('quantity') || '',
      unit: formData.get('unit') || '',
      description: formData.get('description') || '',
      updatedAt: new Date()
    };

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: new Date()
        });
      }
      setEditingProduct(null);
      setIsAddingProduct(false);
      await fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      await fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>Edit Shop:</span>
              <span className="text-blue-600 font-extrabold">{shop.shopName}</span>
            </h2>
            <p className="text-xs text-gray-500">{shop.area}, {shop.city}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition">
            <X size={20} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 px-6 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Store size={16} />
            <span>Shop Details</span>
          </button>

          <button
            onClick={() => setActiveTab('discounts')}
            className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition ${
              activeTab === 'discounts'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Tag size={16} />
            <span>Discounts ({discounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition ${
              activeTab === 'products'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Package size={16} />
            <span>Products / Menu ({products.length})</span>
          </button>
        </div>

        {/* Tab 1: Shop Details */}
        {activeTab === 'details' && (
          <form onSubmit={handleSubmitDetails} className="p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* Cover Image Section */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Shop Cover Photo</label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-48 h-28 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden relative group flex items-center justify-center shrink-0">
                  {currentImageUrl ? (
                    <img src={currentImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="text-gray-400" size={32} />
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="animate-spin text-white" size={24} />
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1 w-full">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl cursor-pointer transition">
                    <ImagePlus size={16} />
                    <span>Choose New Photo</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <p className="text-[11px] text-gray-500">Supported formats: JPG, PNG, WEBP. Max size: 800KB.</p>
                  <Input name="coverImageUrl" value={currentImageUrl} onChange={(e) => setCurrentImageUrl(e.target.value)} placeholder="Or paste image URL here..." className="text-xs" />
                </div>
              </div>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Shop Name *</label>
                <Input name="shopName" defaultValue={shop.shopName} required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Category *</label>
                <select name="category" defaultValue={shop.category} required className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600">
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  {!categories.includes(shop.category) && <option value={shop.category}>{shop.category}</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                <Input name="phone" defaultValue={shop.phone} required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <Input name="email" type="email" defaultValue={shop.email} />
              </div>
            </div>

            {/* Location Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">Address *</label>
                <Input name="address" defaultValue={shop.address} required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Area / Locality *</label>
                <Input name="area" defaultValue={shop.area} required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">City *</label>
                <Input name="city" defaultValue={shop.city} required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Google Maps URL</label>
                <Input name="googleMapsUrl" defaultValue={shop.googleMapsUrl || ''} placeholder="https://maps.google.com/..." />
              </div>
            </div>

            {/* Timing & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Opening Time</label>
                <Input name="openingTime" type="time" defaultValue={shop.openingTime || '09:00'} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Closing Time</label>
                <Input name="closingTime" type="time" defaultValue={shop.closingTime || '21:00'} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Shop Status</label>
                <select name="status" defaultValue={shop.status} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option value="pending">Pending Approval</option>
                  <option value="approved">Approved (Live)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Subscription Status</label>
                <select name="subscriptionStatus" defaultValue={shop.subscriptionStatus || 'trial'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option value="trial">Trial (30 Days Active)</option>
                  <option value="active">Active (Paid Pro)</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Shop Description</label>
              <textarea name="description" defaultValue={shop.description || ''} rows={3} className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600" placeholder="Brief description of products/services..." />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 font-bold">{loading ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </form>
        )}

        {/* Tab 2: Discounts / Offers */}
        {activeTab === 'discounts' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Shop Discounts & Offers</h3>
              {!isAddingDiscount && !editingDiscount && (
                <Button size="sm" onClick={() => { setIsAddingDiscount(true); setEditingDiscount(null); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1">
                  <Plus size={14} /> Add Discount
                </Button>
              )}
            </div>

            {(isAddingDiscount || editingDiscount) && (
              <form onSubmit={handleSaveDiscount} className="bg-gray-50 p-4 rounded-xl border border-blue-100 space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wider">{editingDiscount ? 'Edit Discount' : 'Create New Discount'}</h4>
                  <button type="button" onClick={() => { setIsAddingDiscount(false); setEditingDiscount(null); }} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>

                {/* Offer Type Tabs Selector inside Admin Modal */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Select Offer Type *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                    {[
                      { id: 'percentage_flat', name: '% / Flat', icon: Percent },
                      { id: 'bxgy', name: 'Buy X Get Y', icon: Gift },
                      { id: 'quantity_pricing', name: 'Buy More Save More', icon: Layers },
                      { id: 'bundle', name: 'Combo Bundle', icon: Package },
                      { id: 'flash_sale', name: 'Flash Sale', icon: Zap },
                    ].map(tab => {
                      const Icon = tab.icon;
                      const isSel = offerType === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setOfferType(tab.id as OfferType)}
                          className={`p-2 rounded-lg text-left transition flex items-center gap-1.5 border text-xs ${
                            isSel ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-600' : 'border-gray-200 bg-white text-gray-700'
                          }`}
                        >
                          <Icon size={14} className={isSel ? 'text-blue-600' : 'text-gray-400'} />
                          <span className="truncate">{tab.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Offer Title *</label>
                    <Input name="title" defaultValue={editingDiscount?.title || ''} required placeholder="e.g. 20% OFF Footwear / Buy 2 Get 1 Free" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Category *</label>
                    <select 
                      name="categoryId" 
                      required 
                      defaultValue={editingDiscount?.categoryId || shop.category || 'Others'} 
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      {!categories.includes(shop.category || 'Others') && (
                        <option value={shop.category || 'Others'}>{shop.category || 'Others'}</option>
                      )}
                    </select>
                  </div>

                  {/* 1. PERCENTAGE / FLAT FIELDS */}
                  {offerType === 'percentage_flat' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Discount Type *</label>
                        <select value={discountType} onChange={(e) => setDiscountType(e.target.value as any)} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold">
                          <option value="percentage">Percentage (%)</option>
                          <option value="flat">Flat Amount (₹)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Discount Value *</label>
                        <Input name="discountValue" type="number" defaultValue={editingDiscount?.discountValue || ''} required placeholder="e.g. 20" min="1" />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Min Purchase (₹)</label>
                        <Input name="minimumPurchase" type="number" defaultValue={editingDiscount?.minimumPurchase ?? 0} placeholder="1000" min="0" />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Max Discount Cap (₹)</label>
                        <Input name="maximumDiscount" type="number" defaultValue={editingDiscount?.maximumDiscount ?? 0} placeholder="500" min="0" />
                      </div>
                    </>
                  )}

                  {/* 2. BUY X GET Y FIELDS */}
                  {offerType === 'bxgy' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Buy Qty (X)</label>
                        <Input type="number" value={bxgyBuyQty} onChange={(e) => setBxgyBuyQty(Number(e.target.value))} min="1" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Get Qty (Y)</label>
                        <Input type="number" value={bxgyGetQty} onChange={(e) => setBxgyGetQty(Number(e.target.value))} min="1" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Reward Type</label>
                        <select value={bxgyRewardType} onChange={(e) => setBxgyRewardType(e.target.value as any)} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold">
                          <option value="free">100% Free</option>
                          <option value="percentage">Percentage OFF on Y</option>
                          <option value="flat">Flat ₹ OFF on Y</option>
                        </select>
                      </div>
                      {bxgyRewardType !== 'free' && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Reward Discount Value</label>
                          <Input type="number" value={bxgyRewardValue} onChange={(e) => setBxgyRewardValue(Number(e.target.value))} min="1" required />
                        </div>
                      )}
                    </>
                  )}

                  {/* 3. QUANTITY PRICING FIELDS */}
                  {offerType === 'quantity_pricing' && (
                    <div className="sm:col-span-2 space-y-2 bg-white p-3 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-800">Quantity Slabs / Tiers</span>
                        <Button type="button" size="sm" variant="outline" onClick={handleAddTier} className="text-xs py-1 h-7">
                          + Add Tier
                        </Button>
                      </div>
                      {quantityTiers.map((t, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Input type="number" placeholder="Qty" value={t.quantity} onChange={(e) => {
                            const updated = [...quantityTiers];
                            updated[idx].quantity = Number(e.target.value);
                            setQuantityTiers(updated);
                          }} className="text-xs w-20" />
                          <Input type="number" placeholder="Total Price ₹" value={t.totalPrice} onChange={(e) => {
                            const updated = [...quantityTiers];
                            updated[idx].totalPrice = Number(e.target.value);
                            setQuantityTiers(updated);
                          }} className="text-xs flex-1" />
                          <Input type="text" placeholder="Label (e.g. 1 Pair)" value={t.label || ''} onChange={(e) => {
                            const updated = [...quantityTiers];
                            updated[idx].label = e.target.value;
                            setQuantityTiers(updated);
                          }} className="text-xs flex-1" />
                          <button type="button" onClick={() => handleRemoveTier(idx)} className="text-red-500 hover:text-red-700 p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 4. COMBO BUNDLE FIELDS */}
                  {offerType === 'bundle' && (
                    <div className="sm:col-span-2 space-y-2 bg-white p-3 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-800">Bundle Package Items</span>
                        <Button type="button" size="sm" variant="outline" onClick={handleAddBundleItem} className="text-xs py-1 h-7">
                          + Add Item
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500">Bundle Offer Price (₹)</label>
                          <Input type="number" value={bundlePrice} onChange={(e) => setBundlePrice(Number(e.target.value))} className="text-xs" required />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500">Original Total (₹)</label>
                          <Input type="number" value={bundleOriginalPrice} onChange={(e) => setBundleOriginalPrice(Number(e.target.value))} className="text-xs" required />
                        </div>
                      </div>
                      {bundleItems.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Input type="text" placeholder="Item name" value={item.name} onChange={(e) => {
                            const updated = [...bundleItems];
                            updated[idx].name = e.target.value;
                            setBundleItems(updated);
                          }} className="text-xs flex-1" />
                          <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => {
                            const updated = [...bundleItems];
                            updated[idx].quantity = Number(e.target.value);
                            setBundleItems(updated);
                          }} className="text-xs w-16" />
                          <button type="button" onClick={() => handleRemoveBundleItem(idx)} className="text-red-500 hover:text-red-700 p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 5. FLASH SALE FIELDS */}
                  {offerType === 'flash_sale' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Flash Deal Type</label>
                        <select value={flashSaleOfferType} onChange={(e) => setFlashSaleOfferType(e.target.value as any)} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold">
                          <option value="percentage">Percentage OFF (%)</option>
                          <option value="flat">Flat Amount OFF (₹)</option>
                          <option value="fixed_price">Fixed Flash Price (₹)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Flash Value / Price</label>
                        <Input type="number" value={flashSaleValue} onChange={(e) => setFlashSaleValue(Number(e.target.value))} className="text-xs" required />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Valid From</label>
                    <Input name="validFrom" type="date" defaultValue={formatDateForInput(editingDiscount?.validFrom)} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Valid Until</label>
                    <Input name="validUntil" type="date" defaultValue={formatDateForInput(editingDiscount?.validUntil)} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                    <select name="active" defaultValue={editingDiscount?.active !== false ? 'true' : 'false'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold">
                      <option value="true">Active (Visible)</option>
                      <option value="false">Inactive (Hidden)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Terms & Conditions</label>
                    <textarea 
                      name="terms" 
                      rows={2} 
                      defaultValue={editingDiscount?.terms || "• Valid on selected products\n• Cannot be combined with other offers\n• One redemption per user per offer"} 
                      className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600" 
                      placeholder="Enter offer rules or conditions..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setIsAddingDiscount(false); setEditingDiscount(null); }}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">{loading ? 'Saving...' : 'Save Offer'}</Button>
                </div>
              </form>
            )}

            {loadingDiscounts ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading discounts...</div>
            ) : discounts.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500">
                No discounts added for this shop yet. Click "+ Add Discount" above to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {discounts.map(disc => (
                  <div key={disc.id} className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm truncate">{disc.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${disc.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                          {disc.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-blue-700 mt-0.5">
                        {getOfferBadgeText(disc)}
                        {disc.minimumPurchase ? ` • Min spend: ₹${disc.minimumPurchase}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleDiscountActive(disc)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition ${disc.active ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                        title={disc.active ? 'Deactivate' : 'Activate'}
                      >
                        {disc.active ? 'Hide' : 'Activate'}
                      </button>
                      <button
                        onClick={() => { setEditingDiscount(disc); setIsAddingDiscount(false); }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                        title="Edit Discount"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteDiscount(disc.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"
                        title="Delete Discount"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Products / Menu */}
        {activeTab === 'products' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Shop Products & Menu Items</h3>
              {!isAddingProduct && !editingProduct && (
                <Button size="sm" onClick={() => setIsAddingProduct(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1">
                  <Plus size={14} /> Add Product
                </Button>
              )}
            </div>

            {(isAddingProduct || editingProduct) && (
              <form onSubmit={handleSaveProduct} className="bg-gray-50 p-4 rounded-xl border border-blue-100 space-y-3 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wider">{editingProduct ? 'Edit Product' : 'Create New Product'}</h4>
                  <button type="button" onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Item Name *</label>
                    <Input name="name" defaultValue={editingProduct?.name || ''} required placeholder="e.g. Leather Boots / Paneer Tikka" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Price (₹) *</label>
                    <Input name="price" type="number" defaultValue={editingProduct?.price || ''} required placeholder="e.g. 499" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Category / Group</label>
                    <Input name="category" defaultValue={editingProduct?.category || 'General'} placeholder="e.g. Starters, Shoes, Medicines" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Quantity</label>
                      <Input name="quantity" defaultValue={editingProduct?.quantity || ''} placeholder="e.g. 1 / 500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Unit</label>
                      <Input name="unit" defaultValue={editingProduct?.unit || ''} placeholder="e.g. Pair / ml / g" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Description (Optional)</label>
                    <Input name="description" defaultValue={editingProduct?.description || ''} placeholder="Product features or ingredients" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                  <Button type="button" variant="outline" size="sm" onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">{loading ? 'Saving...' : 'Save Product'}</Button>
                </div>
              </form>
            )}

            {loadingProducts ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500">
                No products added for this shop yet. Click "+ Add Product" above to list items.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.map(prod => (
                  <div key={prod.id} className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-900 text-sm truncate">{prod.name}</span>
                        <span className="font-extrabold text-blue-600 text-sm">₹{prod.price}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Category: <span className="font-semibold text-gray-700">{prod.category || 'General'}</span>
                        {prod.quantity && ` • ${prod.quantity} ${prod.unit || ''}`}
                      </p>
                      {prod.description && <p className="text-xs text-gray-400 mt-1 truncate">{prod.description}</p>}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingProduct(prod); setIsAddingProduct(false); }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                        title="Edit Product"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"
                        title="Delete Product"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
