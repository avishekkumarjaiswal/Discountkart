import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { getShopPlanStatus, hasFeature, FEATURES } from '../../lib/subscription';
import { Crown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

import { Input } from '../../components/ui/Input';
import { useCategories } from '../../hooks/useCategories';



export default function CreateDiscount() {
  const { user } = useAuth();
  const { categories: CATEGORIES } = useCategories();
  const navigate = useNavigate();
  const [shop, setShop] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchShop = async () => {
      const q = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const shopData: any = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        
        // Also fetch active discounts count
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
    const validUntil = new Date(formData.get('validUntil') as string);
    // Add time to end of day
    validUntil.setHours(23, 59, 59, 999);

    try {
      await addDoc(collection(db, 'discounts'), {
        shopId: shop.id,
        title: formData.get('title'),
        categoryId: formData.get('categoryId'),
        discountType: formData.get('discountType'),
        discountValue: Number(formData.get('discountValue')),
        minimumPurchase: Number(formData.get('minimumPurchase')),
        maximumDiscount: Number(formData.get('maximumDiscount')),
        validFrom: new Date(formData.get('validFrom') as string),
        validUntil,
        terms: formData.get('terms'),
        active: formData.get('active') === 'true',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      navigate('/shop/discounts');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  if (!shop) {
    return (
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <div>
            <Skeleton className="h-5 w-24 mb-1" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }


  const planStatus = getShopPlanStatus(shop);
  const isPro = planStatus === 'active';
  const hasReachedLimit = !isPro && (shop.activeDiscountsCount >= 1);

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Create New Discount</h1>
      
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
      
      {(

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Offer Title</label>
            <Input name="title" required placeholder="e.g. 20% OFF Footwear" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
              <select name="discountType" required className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
              <Input name="discountValue" type="number" required placeholder="20" min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Purchase (₹)</label>
              <Input name="minimumPurchase" type="number" required placeholder="1000" min="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
              <Input name="maximumDiscount" type="number" required placeholder="500" min="0" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
              <Input name="validFrom" type="date" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
              <Input name="validUntil" type="date" required />
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
              rows={4}
              defaultValue="• Valid on selected products&#10;• Cannot be combined with other offers&#10;• One redemption per user per offer"
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent"
            ></textarea>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'CREATE DISCOUNT'}
          </Button>
        </form>
      )}
    </div>
  );
}
