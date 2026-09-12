import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { getShopPlanStatus, hasFeature, FEATURES, getSubscriptionDaysLeft } from '../../lib/subscription';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

import { Input } from '../../components/ui/Input';
import { Crown, TrendingUp, Users, Tag, AlertCircle } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';

interface LocationItem {
  id: string;
  city: string;
  area: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { categories: CATEGORIES } = useCategories();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeDiscounts: 0,
    todayRedemptions: 0,
    totalRedemptions: 0
  });
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const snap = await getDocs(collection(db, 'locations'));
        const locs: LocationItem[] = [];
        snap.docs.forEach(doc => {
          locs.push({ id: doc.id, ...doc.data() } as LocationItem);
        });
        setLocations(locs);
      } catch (e) {
        console.error(e);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchShopAndStats = async () => {
      try {
        const q = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const shopData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          setShop(shopData);

                    // Fetch Active Discounts
          const discQ = query(collection(db, 'discounts'), where('shopId', '==', shopData.id));
          const discSnap = await getDocs(discQ);
          
          let activeDiscountsCount = 0;
          let totalOfferViews = 0;
          discSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.active) activeDiscountsCount++;
            totalOfferViews += (data.views || 0); // fallback if it was used
          });
          
          // Fetch analytics events for offer views
          try {
            const analyticsQ = query(collection(db, 'analyticsEvents'), where('shopId', '==', shopData.id), where('eventType', '==', 'offer_view'));
            const analyticsSnap = await getDocs(analyticsQ);
            totalOfferViews += analyticsSnap.size;
          } catch(e) {
            console.error("Could not fetch analytics", e);
          }
          
          // Fetch Redemptions
          const redQ = query(collection(db, 'redemptions'), where('shopId', '==', shopData.id));
          const redSnap = await getDocs(redQ);
          
          let todayCount = 0;
          let totalRedemptions = 0;
          const uniqueCustomers = new Set();
          const todayStr = new Date().toDateString();
          
          redSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.status === 'redeemed') {
              totalRedemptions++;
              if (data.userId) uniqueCustomers.add(data.userId);
              if (data.redeemedAt) {
                const dateObj = data.redeemedAt.toDate ? data.redeemedAt.toDate() : new Date(data.redeemedAt);
                if (dateObj.toDateString() === todayStr) {
                  todayCount++;
                }
              }
            }
          });

          setStats({
            activeDiscounts: activeDiscountsCount,
            totalRedemptions: totalRedemptions,
            todayRedemptions: todayCount,
            offerViews: totalOfferViews,
            offerClaims: redSnap.size,
            customersAcquired: uniqueCustomers.size
          } as any);
        }
      } catch (error) {
        console.error('Error fetching shop:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopAndStats();
  }, [user]);

  const handleCreateShop = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const newShopRef = doc(collection(db, 'shops'));
      const shopData = {
        ownerId: user?.uid,
        shopName: formData.get('shopName'),
        category: formData.get('category') || 'Others',
        phone: formData.get('phone') || '',
        email: user?.email || '',
        address: formData.get('address') || '',
        city: formData.get('city'),
        area: formData.get('area'),
        openingTime: formData.get('openingTime') || '09:00',
        closingTime: formData.get('closingTime') || '21:00',
        description: formData.get('description') || '',
        status: 'pending',
        subscriptionStatus: 'free',
        subscriptionPlan: 'free',
        createdAt: new Date()
      };
      
      await setDoc(newShopRef, shopData);
      setShop({ id: newShopRef.id, ...shopData });
    } catch (error) {
      console.error('Error creating shop:', error);
    }
  };


  if (loading) {
    return (
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-12 flex-1 sm:flex-none w-32" />
          <Skeleton className="h-12 flex-1 sm:flex-none w-40" />
        </div>
        <div className="mt-8">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-10 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-10 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }


  if (!shop) {
    return (
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div className="max-w-2xl bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Your Shop</h1>
          <p className="text-xs text-gray-500 mb-6">Enter complete details to showcase your shop to local customers.</p>
          
          <form onSubmit={handleCreateShop} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Shop Name <span className="text-red-500">*</span></label>
              <Input name="shopName" required placeholder="e.g. ABC Footwear" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                <select name="category" required defaultValue="Others" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                <Input name="phone" type="tel" required placeholder="10-digit phone number" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Full Address <span className="text-red-500">*</span></label>
              <Input name="address" required placeholder="Shop No., Street Name, Landmark" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                <select 
                  name="city" 
                  required 
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Select City</option>
                  {Array.from(new Set(locations.map(l => l.city))).sort().map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Area / Locality <span className="text-red-500">*</span></label>
                <select 
                  name="area" 
                  required 
                  disabled={!selectedCity}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                >
                  <option value="">Select Area</option>
                  {locations.filter(l => l.city === selectedCity).sort((a,b) => a.area.localeCompare(b.area)).map(loc => (
                    <option key={loc.id} value={loc.area}>{loc.area}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/80 p-4 rounded-xl border border-gray-100">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Opening Time</label>
                <Input name="openingTime" type="time" defaultValue="09:00" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Closing Time</label>
                <Input name="closingTime" type="time" defaultValue="21:00" required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Description (Optional)</label>
              <textarea 
                name="description" 
                rows={3} 
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" 
                placeholder="Short description of your products or services..."
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3">Create Shop</Button>
          </form>
        </div>
      </div>
    );
  }

  
  const planStatus = getShopPlanStatus(shop);
  const showAnalytics = hasFeature(shop, FEATURES.analytics);

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {shop.shopName}</h1>
        {planStatus === 'trial' && (
          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold flex flex-shrink-0 items-center gap-1">
            <Crown size={16} />
            Pro Trial Active
          </span>
        )}
        {planStatus === 'active' && (
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold flex flex-shrink-0 items-center gap-1">
            <Crown size={16} />
            Pro Active
          </span>
        )}
      </div>
      
      {shop.status === 'pending' && (
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200">
          <p className="font-bold">Pending Approval</p>
          <p className="text-sm">Your shop is under review by the administration. It will be visible to customers once approved.</p>

      {planStatus !== 'expired' && shop && getSubscriptionDaysLeft(shop) !== null && getSubscriptionDaysLeft(shop)! <= 7 && (
        <div className="bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <p className="font-bold text-lg">Subscription Ending Soon</p>
              <p className="text-sm">Your {planStatus === 'trial' ? 'Pro Trial' : 'Pro Subscription'} will expire in {getSubscriptionDaysLeft(shop)} days. Renew now to avoid losing access to premium features.</p>
            </div>
          </div>
          <Button onClick={() => navigate('/shop/subscription')} size="sm" className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap">Renew Subscription</Button>
        </div>
      )}
        </div>
      )}

      {planStatus === 'expired' && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 flex justify-between items-center">
          <div>
            <p className="font-bold">Pro Trial Expired</p>
            <p className="text-sm">Upgrade to Pro to unlock unlimited discounts and analytics.</p>
          </div>
          <Button onClick={() => navigate('/shop/subscription')} size="sm" className="bg-red-600 hover:bg-red-700">Upgrade Now</Button>
        </div>
      )}

      <div className="flex gap-4">
        <Button onClick={() => navigate('/shop/redemptions')} size="lg" className="flex-1 sm:flex-none">Verify Code</Button>
        <Button onClick={() => navigate('/shop/discounts/create')} variant="outline" size="lg" className="flex-1 sm:flex-none">Create Discount</Button>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-600" />
          Your DiscountKart Performance
        </h2>
        
        {!showAnalytics ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <Crown size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Know How Your Offers Perform</h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">Upgrade to Pro to see exactly how many people view, claim, and redeem your discounts.</p>
            <Button onClick={() => navigate('/shop/subscription')}>View Free Pro Access</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 font-medium mb-2">
                <TrendingUp size={18} />
                <span>Profile Views</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{shop.visitCount || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 font-medium mb-2">
                <Tag size={18} />
                <span>Offer Views</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{(stats as any).offerViews || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 font-medium mb-2">
                <Users size={18} />
                <span>Offer Claims</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{(stats as any).offerClaims || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 font-medium mb-2">
                <AlertCircle size={18} />
                <span>Redemptions</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">{stats.totalRedemptions}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm bg-gradient-to-br from-blue-50 to-white">
              <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                <Users size={18} />
                <span>Customers Acquired</span>
              </div>
              <p className="text-3xl font-bold text-blue-900">{(stats as any).customersAcquired || 0}</p>
              <p className="text-xs text-blue-600 mt-1">Unique redeeming users</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Active Discounts Listing</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeDiscounts}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 font-medium">Today's Redemptions</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayRedemptions}</p>
        </div>
      </div>
      
    </div>
  );
}

// Cache buster
