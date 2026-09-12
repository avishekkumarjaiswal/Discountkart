import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from '../../context/LocationContext';
import { MapPin, Search, Shirt, Footprints, Coffee, Smartphone, Sparkles, Book, LayoutGrid, Tag, Store, ArrowRight, ShieldCheck, Zap, Crosshair } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import { ShopCard } from '../../components/cards/ShopCard';
import { ShopCardSkeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { motion } from 'motion/react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { shopCache } from '../../lib/cache';

const POPULAR_AREAS = [
  'Kamla Nagar',
  'Connaught Place',
  'Lajpat Nagar',
  'Karol Bagh',
  'Saket',
  'Rajouri Garden'
];

export default function Home() {
  const { location, setLocation } = useLocation();
  const navigate = useNavigate();
  const { categories } = useCategories();
  const [shops, setShops] = useState<any[]>(location === shopCache.location ? shopCache.shops : []);
  const [heroSearchInput, setHeroSearchInput] = useState('');
  const [locating, setLocating] = useState(false);
  
  const [loading, setLoading] = useState(location !== shopCache.location);

  useEffect(() => {
    if (!location) return;
    const fetchShops = async () => {
      if (location !== shopCache.location) {
        setLoading(true);
      }
      try {
        const shopQ = query(
          collection(db, 'shops'), 
          where('area', '==', location),
          where('status', '==', 'approved'), limit(20)
        );
        const shopSnap = await getDocs(shopQ);
        const allShops = shopSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (allShops.length > 0) {
          const shopIds = allShops.map(s => s.id);
          const chunks = [];
          for (let i = 0; i < shopIds.length; i += 30) {
            chunks.push(shopIds.slice(i, i + 30));
          }
          
          let allDiscounts: any[] = [];
          const now = new Date();
          
          for (const chunk of chunks) {
            const discQ = query(
              collection(db, 'discounts'),
              where('shopId', 'in', chunk),
              where('active', '==', true)
            );
            const discSnap = await getDocs(discQ);
            allDiscounts = allDiscounts.concat(discSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
          
          const validDiscounts = allDiscounts.filter(d => {
            if (d.validUntil && d.validUntil.toDate() < now) return false;
            if (d.validFrom && d.validFrom.toDate() > now) return false;
            return true;
          });
          
          let activeAdShopIds = new Set();
          try {
            const adsQ = query(
              collection(db, 'advertisements'),
              where('status', '==', 'active')
            );
            const adsSnap = await getDocs(adsQ);
            adsSnap.forEach(doc => {
              const ad = doc.data();
              const startDate = ad.startDate?.toDate ? ad.startDate.toDate() : new Date(0);
              const endDate = ad.endDate?.toDate ? ad.endDate.toDate() : new Date(9999, 11, 31);
              if (startDate <= now && endDate >= now) {
                activeAdShopIds.add(ad.shopId);
              }
            });
          } catch(e) {
            console.error("Error fetching ads:", e);
          }
          
          const finalShops = [];
          for (const shop of allShops) {
            const shopDiscounts = validDiscounts.filter(d => d.shopId === shop.id);
            if (shopDiscounts.length > 0) {
              shopDiscounts.sort((a, b) => b.discountValue - a.discountValue);
            }
            finalShops.push({ 
              ...shop, 
              mainDiscount: shopDiscounts.length > 0 ? shopDiscounts[0] : null,
              isPromoted: activeAdShopIds.has(shop.id)
            });
          }
          
          finalShops.sort((a: any, b: any) => {
            if (a.isPromoted && !b.isPromoted) return -1;
            if (!a.isPromoted && b.isPromoted) return 1;
            return 0;
          });
          
          shopCache.shops = finalShops;
          shopCache.location = location;
          setShops(finalShops);
        } else {
          setShops([]);
          shopCache.shops = [];
        }
      } catch (err) {
        console.error('Error fetching shops:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchShops();
  }, [location]);

  const handleHeroLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearchInput.trim()) {
      setLocation(heroSearchInput.trim());
    } else {
      navigate('/location');
    }
  };

  const handleDetectLocation = () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    setLocating(true);
    if (!navigator.geolocation) {
      setTimeout(() => {
        setLocating(false);
        setLocation('Kamla Nagar');
      }, 500);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocating(false);
        setLocation('Kamla Nagar');
      },
      () => {
        setLocating(false);
        setLocation('Kamla Nagar');
      },
      { timeout: 4000 }
    );
  };

  if (location) {
    return (
      <div className="p-4 max-w-5xl mx-auto space-y-6">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Popular Categories</h2>
            <button onClick={() => navigate('/categories')} className="text-sm font-medium text-blue-600">See All</button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4">
            {categories.slice(0, 8).map(cat => (
              <motion.button 
                whileTap={{ scale: 0.95 }}
                key={cat} 
                onClick={() => navigate(`/categories/${encodeURIComponent(cat)}`)}
                className="flex flex-col items-center p-3 sm:p-4 bg-white rounded-xl shadow-sm border border-gray-100/80 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
                  <GridIcon name={cat} />
                </div>
                <span className="text-xs text-center font-medium text-gray-700 leading-tight">{cat}</span>
              </motion.button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Shops Near You</h2>
            <button onClick={() => navigate('/shops')} className="text-sm font-medium text-blue-600 hover:underline">See All</button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <>
                {Array.from({ length: 6 }).map((_, i) => <ShopCardSkeleton key={i} />)}
              </>
            ) : shops.length > 0 ? (
              shops.map(shop => (
                <ShopCard key={shop.id} shop={shop} />
              ))
            ) : (
              <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100 border-dashed col-span-full">
                <p>No shops found in {location} yet.</p>
                <button onClick={() => navigate('/location')} className="text-blue-600 mt-2 text-sm font-medium">Change location</button>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  // High-Impact Landing Page (No location selected)
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-white to-gray-50/50">
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-16 text-center relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100/80 text-blue-800 text-xs sm:text-sm font-bold rounded-full mb-6 border border-blue-200/60 shadow-sm animate-pulse">
          <Zap size={15} className="text-blue-600 fill-current" />
          <span>100% Free Beta Access • Save at Nearby Shops</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-tight max-w-4xl mx-auto">
          Find & Claim <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700">Local Discounts</span> Near You
        </h1>
        <p className="text-base sm:text-xl text-gray-600 mt-4 mb-8 max-w-2xl mx-auto leading-relaxed">
          Discover exclusive discounts from verified local clothing stores, cafes, electronics shops, and beauty salons in your area.
        </p>

        {/* Hero Interactive Location Bar */}
        <div className="max-w-xl mx-auto bg-white p-2 sm:p-2.5 rounded-2xl sm:rounded-full shadow-lg border border-gray-200/80 mb-6">
          <form onSubmit={handleHeroLocationSubmit} className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center flex-1 w-full pl-3 pr-2 py-1">
              <MapPin size={20} className="text-blue-600 shrink-0 mr-2" />
              <input
                type="text"
                placeholder="Enter area or city (e.g. Kamla Nagar)..."
                value={heroSearchInput}
                onChange={(e) => setHeroSearchInput(e.target.value)}
                className="w-full text-sm sm:text-base bg-transparent border-none text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locating}
                className="flex-1 sm:flex-initial px-3.5 py-3 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold text-xs rounded-xl sm:rounded-full transition flex items-center justify-center gap-1.5 border border-gray-200"
                title="Detect My Location"
              >
                <Crosshair size={15} className={`text-blue-600 ${locating ? 'animate-spin' : ''}`} />
                <span>{locating ? 'Locating...' : 'Near Me'}</span>
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-initial px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-xl sm:rounded-full shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Explore</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>

        {/* 1-Tap Popular Location Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
          <span className="text-xs font-bold text-gray-500 mr-1">Popular Areas:</span>
          {POPULAR_AREAS.map(area => (
            <button
              key={area}
              onClick={() => setLocation(area)}
              className="px-3 py-1.5 bg-white hover:bg-blue-50 active:scale-95 text-gray-700 hover:text-blue-700 text-xs font-semibold rounded-full border border-gray-200/80 hover:border-blue-300 shadow-sm transition-all"
            >
              📍 {area}
            </button>
          ))}
        </div>

        {/* High-Trust Social Proof Counters */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
            <span className="text-2xl sm:text-3xl font-black text-blue-600">50+</span>
            <p className="text-xs font-semibold text-gray-500 mt-1">Verified Local Shops</p>
          </div>
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">200+</span>
            <p className="text-xs font-semibold text-gray-500 mt-1">Active Discounts</p>
          </div>
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
            <span className="text-2xl sm:text-3xl font-black text-indigo-600">100%</span>
            <p className="text-xs font-semibold text-gray-500 mt-1">Free Redemptions</p>
          </div>
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
            <span className="text-2xl sm:text-3xl font-black text-amber-500">4.9 ★</span>
            <p className="text-xs font-semibold text-gray-500 mt-1">Customer Rating</p>
          </div>
        </div>
      </section>

      {/* Featured Categories Showcase */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Explore Top Categories</h2>
          <p className="text-sm text-gray-500 mt-1">Browse discounts across popular local business categories</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {categories.slice(0, 6).map(cat => (
            <motion.div
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.95 }}
              key={cat}
              onClick={() => navigate('/location')}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer text-center flex flex-col items-center"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
                <GridIcon name={cat} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">{cat}</h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-2 inline-block">Up to 50% Off</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works (Visual Stepper) */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">How DiscountKart Works</h2>
          <p className="text-sm text-gray-500 mt-1">Save money in 3 simple steps (no payment required)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center flex flex-col items-center hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-5 font-black text-xl shadow-inner">
              <MapPin size={26} />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-2">Step 1</span>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Select Your Location</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Choose your city or area to find verified shops offering active discounts nearby.</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center flex flex-col items-center hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-5 font-black text-xl shadow-inner">
              <Tag size={26} />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mb-2">Step 2</span>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Claim Free Discount Code</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Generate your instant 6-digit redemption code with 1 tap at zero cost.</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center flex flex-col items-center hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-5 font-black text-xl shadow-inner">
              <Store size={26} />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-2">Step 3</span>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Show at Store & Save</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Visit the local store, show your code at checkout, and enjoy instant savings.</p>
          </div>
        </div>
      </section>

      {/* For Businesses / Merchant Partner CTA */}
      <section className="max-w-5xl mx-auto px-4 py-12 pb-20">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-3 z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-white">
              <ShieldCheck size={14} />
              <span>Merchant Growth Partner</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Are You a Local Shop Owner?</h2>
            <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
              Reach thousands of nearby customers looking for deals. List your shop and discounts for 100% free during our launch beta with zero commissions.
            </p>
          </div>
          <div className="z-10 shrink-0">
            <button
              onClick={() => navigate('/shop/login')}
              className="px-8 py-4 bg-white hover:bg-gray-100 active:scale-95 text-blue-700 font-extrabold text-sm sm:text-base rounded-full shadow-lg transition-all"
            >
              List Your Shop Free →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function GridIcon({ name }: { name: string }) {
  switch (name) {
    case 'Fashion': return <Shirt size={20} />;
    case 'Footwear': return <Footprints size={20} />;
    case 'Food & Beverages': return <Coffee size={20} />;
    case 'Electronics': return <Smartphone size={20} />;
    case 'Beauty': return <Sparkles size={20} />;
    case 'Books': return <Book size={20} />;
    default: return <LayoutGrid size={20} />;
  }
}


