import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { getShopPlanStatus } from '../../lib/subscription';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

import { Input } from '../../components/ui/Input';
import { useCategories } from '../../hooks/useCategories';



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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!discountId) return;
    
    setLoading(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const validUntil = new Date(formData.get('validUntil') as string);
    // Add time to end of day
    validUntil.setHours(23, 59, 59, 999);

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
      await updateDoc(doc(db, 'discounts', discountId), {
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
        updatedAt: serverTimestamp()
      });
      navigate('/shop/discounts');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  if (fetching) {
    return (
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <Skeleton className="h-8 w-48" />
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
          <div className="flex gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !discount) return <div className="p-8 text-red-600">{error}</div>;

  // Format dates for input type="date"
  const validFromDate = discount.validFrom?.toDate ? discount.validFrom.toDate().toISOString().split('T')[0] : '';
  const validUntilDate = discount.validUntil?.toDate ? discount.validUntil.toDate().toISOString().split('T')[0] : '';

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Discount</h1>
      
      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
      
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Offer Title</label>
          <Input name="title" required defaultValue={discount.title} placeholder="e.g. 20% OFF Footwear" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select name="categoryId" required defaultValue={discount.categoryId} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              {!CATEGORIES.includes(discount.categoryId) && (
                <option value={discount.categoryId}>{discount.categoryId}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
            <select name="discountType" required defaultValue={discount.discountType} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount (₹)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
            <Input name="discountValue" type="number" required defaultValue={discount.discountValue} placeholder="20" min="1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Purchase (₹)</label>
            <Input name="minimumPurchase" type="number" required defaultValue={discount.minimumPurchase} placeholder="1000" min="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
            <Input name="maximumDiscount" type="number" required defaultValue={discount.maximumDiscount} placeholder="500" min="0" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
            <Input name="validFrom" type="date" required defaultValue={validFromDate} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
            <Input name="validUntil" type="date" required defaultValue={validUntilDate} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="active" required defaultValue={discount.active ? 'true' : 'false'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
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
            rows={4}
            defaultValue={discount.terms}
            className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent"
          ></textarea>
        </div>

        <div className="flex gap-4">
          <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/shop/discounts')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'SAVE CHANGES'}
          </Button>
        </div>
      </form>
    </div>
  );
}
