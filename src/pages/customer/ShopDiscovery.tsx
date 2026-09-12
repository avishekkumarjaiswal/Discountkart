import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from '../../context/LocationContext';
import { collection, query, where, getDocs , limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { fetchWithSWR } from '../../lib/cache';
import { getShopPlanStatus } from '../../lib/subscription';
import { ShopCard } from '../../components/cards/ShopCard';
import { ShopCardSkeleton } from '../../components/ui/Skeleton';
import { useCategories } from '../../hooks/useCategories';

import { Search as SearchIcon, X } from 'lucide-react';

interface Shop {
  isPromoted?: boolean;
  id: string;
  shopName: string;
  category?: string;
  area: string;
  coverImageUrl?: string;
  openingTime?: string;
  closingTime?: string;
}

export default function ShopDiscovery() {
  const { location } = useLocation();
  const { categories } = useCategories();
  const CATEGORIES = ['All', ...categories];
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!location) {
      navigate('/location');
      return;
    }

    const fetchShops = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'shops'), 
          where('area', '==', location),
          where('status', '==', 'approved'), limit(20)
        );
        const snapshot = await getDocs(q);
        const allShops = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Shop[];

        // Fetch discounts
        const shopIds = allShops.map(s => s.id);
        const chunks = [];
        for (let i = 0; i < shopIds.length; i += 30) {
          chunks.push(shopIds.slice(i, i + 30));
        }
        let allDiscounts: any[] = [];
        const now = new Date();
        for (const chunk of chunks) {
          const discQ = query(collection(db, 'discounts'), where('shopId', 'in', chunk), where('active', '==', true));
          const discSnap = await getDocs(discQ);
          allDiscounts = allDiscounts.concat(discSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        const validDiscounts = allDiscounts.filter(d => {
          if (d.validUntil && d.validUntil.toDate() < now) return false;
          if (d.validFrom && d.validFrom.toDate() > now) return false;
          return true;
        });
        
        // Dynamically compute Sponsored status from advertisements collection
        let activeAdShopIds = new Set();
        try {
          const adsQ = query(
            collection(db, 'advertisements'),
            where('status', '==', 'active')
          );
          const adsSnap = await getDocs(adsQ);
          const now = new Date();
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

        let loadedShops = allShops.map(shop => {
          const shopDiscounts = validDiscounts.filter(d => d.shopId === shop.id);
          if (shopDiscounts.length > 0) {
            shopDiscounts.sort((a, b) => b.discountValue - a.discountValue);
          }
          return {
          ...shop,
          isPromoted: activeAdShopIds.has(shop.id),
            mainDiscount: shopDiscounts.length > 0 ? shopDiscounts[0] : null
          };
        });

        loadedShops.sort((a, b) => {
          // Ads logic
          const isAdA = a.isPromoted; // we might want to check actual ads later, but leaving this for now
          const isAdB = b.isPromoted;
          if (isAdA && !isAdB) return -1;
          if (!isAdA && isAdB) return 1;
          
          const planA = getShopPlanStatus(a as any);
          const planB = getShopPlanStatus(b as any);
          
          const isPremiumA = planA === 'active' || planA === 'trial';
          const isPremiumB = planB === 'active' || planB === 'trial';
          
          if (isPremiumA && !isPremiumB) return -1;
          if (!isPremiumA && isPremiumB) return 1;
          
          return 0;
        });
        return loadedShops;
      } catch (error) {
        console.error('Error fetching shops:', error);
        return [];
      }
    };

    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchWithSWR(`shops_${location}`, fetchShops, (fresh) => setShops(fresh));
        setShops(result);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [location, navigate]);

  useEffect(() => {
    // Scroll active category into view
    if (scrollContainerRef.current) {
      const activeBtn = scrollContainerRef.current.querySelector('button.border-blue-600');
      if (activeBtn) {
        setTimeout(() => {
          activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 100);
      }
    }
  }, [activeCategory]);

  const filteredShops = shops.filter(shop => {
    const matchesCategory = activeCategory === 'All' || shop.category === activeCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || 
      shop.shopName.toLowerCase().includes(q) ||
      (shop.category && shop.category.toLowerCase().includes(q)) ||
      (shop.area && shop.area.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto p-4 py-6 pb-20 md:pb-12 space-y-6">
      <header className="flex flex-col mb-6 space-y-3">
        <div className="flex items-center space-x-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Shops in {location}</h1>
            <p className="text-sm text-gray-500">{filteredShops.length} shops available</p>
          </div>
        </div>

        <div className="relative w-full">
          <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shops by name or category..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="flex overflow-x-auto pb-2 gap-3 hide-scrollbar" ref={scrollContainerRef}>
          {CATEGORIES.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex flex-shrink-0 items-center px-4 py-2 bg-white border ${activeCategory === cat ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/90 shadow-sm' : 'border-gray-200 text-gray-700'} rounded-full text-sm font-medium hover:border-blue-600 hover:text-blue-600 transition-all active:scale-95`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ShopCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredShops.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShops.map(shop => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      ) : (
        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 font-medium">No shops found in this location yet.</p>
          <button onClick={() => navigate('/')} className="mt-4 text-blue-600 font-medium hover:underline">
            Go Back
          </button>
        </div>
      )}
    </div>
  );
}
