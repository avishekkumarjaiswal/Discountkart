import React, { useState, useEffect } from 'react';
import { updateDoc, doc, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../ui/Button';
import { useCategories } from '../../hooks/useCategories';
import { Input } from '../ui/Input';
import { X, ImagePlus, Loader2, Store, Tag, Package, Plus, Trash2, Edit3, Check } from 'lucide-react';

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

  // Discount Actions
  const handleSaveDiscount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const discountData = {
      shopId: shop.id,
      title: formData.get('title'),
      discountType: formData.get('discountType'),
      discountValue: Number(formData.get('discountValue')),
      minimumPurchase: Number(formData.get('minimumPurchase') || 0),
      terms: formData.get('terms'),
      active: formData.get('active') === 'true',
      updatedAt: new Date()
    };

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

  const handleToggleDiscountActive = async (discount: any) => {
    try {
      await updateDoc(doc(db, 'discounts', discount.id), {
        active: !discount.active
      });
      await fetchDiscounts();
    } catch (err) {
      console.error('Error toggling discount:', err);
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;
    try {
      await deleteDoc(doc(db, 'discounts', id));
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
    const productData = {
      shopId: shop.id,
      name: formData.get('name'),
      price: Number(formData.get('price')),
      category: formData.get('category') || 'General',
      quantity: formData.get('quantity'),
      unit: formData.get('unit'),
      description: formData.get('description'),
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

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      await fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col border border-gray-100 my-auto overflow-hidden">
        
        {/* Header with Navigation Tabs */}
        <div className="bg-gray-50/80 border-b border-gray-100 p-4 sm:p-5 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>Edit Shop:</span>
                <span className="text-blue-600 font-extrabold">{shop.shopName}</span>
              </h2>
              <p className="text-xs text-gray-500">{shop.area}, {shop.city}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200/60 rounded-full transition-colors text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>

          <div className="flex border-b border-gray-200 -mb-4 pt-1 gap-2 sm:gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 px-3 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Store size={16} />
              <span>Shop Details</span>
            </button>
            <button
              onClick={() => setActiveTab('discounts')}
              className={`pb-3 px-3 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'discounts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Tag size={16} />
              <span>Discounts ({discounts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`pb-3 px-3 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package size={16} />
              <span>Products / Menu ({products.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Shop Details */}
        {activeTab === 'details' && (
          <>
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <form id="edit-shop-form" onSubmit={handleSubmitDetails} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Shop Name <span className="text-red-500">*</span></label>
                    <Input name="shopName" defaultValue={shop.shopName} required />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                    <select name="category" required defaultValue={shop.category || 'Others'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      {!categories.includes(shop.category || 'Others') && (
                        <option value={shop.category || 'Others'}>{shop.category || 'Others'}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Approval Status</label>
                    <select name="status" defaultValue={shop.status || 'pending'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600">
                      <option value="approved">Approved</option>
                      <option value="pending">Pending Review</option>
                      <option value="rejected">Rejected / Blocked</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Subscription Status</label>
                    <select name="subscriptionStatus" defaultValue={shop.subscriptionStatus || 'free'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600">
                      <option value="trial">Pro Trial</option>
                      <option value="active">Pro Active</option>
                      <option value="free">Free Plan</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                    <Input name="phone" type="tel" defaultValue={shop.phone || ''} required />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                    <Input name="email" type="email" defaultValue={shop.email || ''} />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Full Address <span className="text-red-500">*</span></label>
                    <Input name="address" defaultValue={shop.address || ''} required />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                    <Input name="city" defaultValue={shop.city || ''} required />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Area / Locality <span className="text-red-500">*</span></label>
                    <Input name="area" defaultValue={shop.area || ''} required />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Opening Time</label>
                    <Input name="openingTime" type="time" defaultValue={shop.openingTime || '09:00'} required />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Closing Time</label>
                    <Input name="closingTime" type="time" defaultValue={shop.closingTime || '21:00'} required />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Description (About Shop)</label>
                    <textarea 
                      name="description" 
                      defaultValue={shop.description || ''} 
                      rows={3}
                      className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="md:col-span-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <label className="block text-xs font-bold text-gray-700 mb-2">Cover Image</label>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      {currentImageUrl && (
                        <img src={currentImageUrl} alt="Cover" className="w-20 h-20 object-cover rounded-lg shadow-sm border border-gray-200" />
                      )}
                      <div className="flex-1 space-y-2 w-full">
                        <div>
                          <label className="flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-gray-300 shadow-sm text-xs font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                            {uploadingImage ? <Loader2 size={15} className="animate-spin mr-2" /> : <ImagePlus size={15} className="mr-2" />}
                            {uploadingImage ? 'Uploading...' : 'Upload Image File'}
                            <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} disabled={uploadingImage} />
                          </label>
                        </div>
                        <div>
                          <Input name="coverImageUrl" defaultValue={currentImageUrl} placeholder="Paste Image Link (https://...)" className="text-xs" onChange={(e) => setCurrentImageUrl(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Google Maps URL (Optional)</label>
                    <Input name="googleMapsUrl" defaultValue={shop.googleMapsUrl || ''} placeholder="https://maps.google.com/..." />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-4 sm:p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 shrink-0">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" form="edit-shop-form" disabled={loading} className="bg-blue-600 hover:bg-blue-700 font-bold text-white">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>
        )}

        {/* Tab 2: Discounts */}
        {activeTab === 'discounts' && (
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Shop Discounts & Offers</h3>
              {!isAddingDiscount && !editingDiscount && (
                <Button size="sm" onClick={() => setIsAddingDiscount(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1">
                  <Plus size={14} /> Add Discount
                </Button>
              )}
            </div>

            {(isAddingDiscount || editingDiscount) && (
              <form onSubmit={handleSaveDiscount} className="bg-gray-50 p-4 rounded-xl border border-blue-100 space-y-3 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wider">{editingDiscount ? 'Edit Discount' : 'Create New Discount'}</h4>
                  <button type="button" onClick={() => { setIsAddingDiscount(false); setEditingDiscount(null); }} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Discount Title *</label>
                    <Input name="title" defaultValue={editingDiscount?.title || ''} required placeholder="e.g. 20% OFF on All Footwear" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Discount Type *</label>
                    <select name="discountType" defaultValue={editingDiscount?.discountType || 'percentage'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold">
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Discount Value *</label>
                    <Input name="discountValue" type="number" defaultValue={editingDiscount?.discountValue || ''} required placeholder="e.g. 20" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Minimum Purchase (₹)</label>
                    <Input name="minimumPurchase" type="number" defaultValue={editingDiscount?.minimumPurchase || 0} placeholder="0 for no minimum" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                    <select name="active" defaultValue={editingDiscount?.active !== false ? 'true' : 'false'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-semibold">
                      <option value="true">Active (Visible)</option>
                      <option value="false">Inactive (Hidden)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Terms & Conditions (Optional)</label>
                    <Input name="terms" defaultValue={editingDiscount?.terms || ''} placeholder="e.g. Valid on minimum bill of ₹500" />
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
                      <p className="text-xs text-gray-500 mt-0.5">
                        {disc.discountType === 'percentage' ? `${disc.discountValue}% OFF` : `₹${disc.discountValue} OFF`}
                        {disc.minimumPurchase ? ` • Min purchase: ₹${disc.minimumPurchase}` : ''}
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
