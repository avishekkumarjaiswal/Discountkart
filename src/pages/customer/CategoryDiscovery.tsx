import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocation } from '../../context/LocationContext';
import { collection, query, where, getDocs , limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getShopPlanStatus } from '../../lib/subscription';
import { shopCache } from '../../lib/cache';
import { MapPin, Star, Shirt, Footprints, Coffee, Smartphone, Sparkles, Book, LayoutGrid, Crown } from 'lucide-react';
import { DiscountCard } from '../../components/cards/DiscountCard';
import { DiscountCardSkeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { useCategories } from '../../hooks/useCategories';

interface Discount {
  id: string;
  shopId: string;
  title: string;
  description: string;
  discountType: string;
  discountValue: number;
  validUntil?: any;
  validFrom?: any;
}

interface Shop {
  id: string;
  shopName: string;
  area: string;
  coverImageUrl?: string;
  openingTime?: string;
  closingTime?: string;
}

function getCategoryIcon(name: string, iconSize = 16) {
  switch (name) {
    case 'Fashion': return <Shirt size={iconSize} />;
    case 'Footwear': return <Footprints size={iconSize} />;
    case 'Food & Beverages': return <Coffee size={iconSize} />;
    case 'Electronics': return <Smartphone size={iconSize} />;
    case 'Beauty': return <Sparkles size={iconSize} />;
    case 'Books': return <Book size={iconSize} />;
    default: return <LayoutGrid size={iconSize} />;
  }
}

let CACHED_SHOPS_MAP: Record<string, Shop> = {};
let CACHED_DISCOUNTS: Discount[] = [];
let CACHED_CAT_LOC: string | null = null;
let CACHED_CAT_ID: string | null = null;

export default function CategoryDiscovery() {
  const { location } = useLocation();
  const { categories: CATEGORIES } = useCategories();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { categoryId } = useParams<{ categoryId?: string }>();
  const navigate = useNavigate();
  
  const isCached = location === CACHED_CAT_LOC && categoryId === CACHED_CAT_ID;
  const [shops, setShops] = useState<Record<string, Shop>>(isCached ? CACHED_SHOPS_MAP : {});
  const [discounts, setDiscounts] = useState<Discount[]>(isCached ? CACHED_DISCOUNTS : []);
  const [loading, setLoading] = useState(!isCached);



  useEffect(() => {
    // Scroll active category into view
    if (scrollContainerRef.current) {
      const activeBtn = scrollContainerRef.current.querySelector('button.border-blue-600');
      if (activeBtn) {
        // Use a slight timeout to ensure rendering is complete before scrolling
        setTimeout(() => {
          activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 100);
      }
    }
  }, [categoryId]);

  useEffect(() => {
    if (!location) {
      navigate('/location');
      return;
    }
    
    if (!categoryId) return;

    const fetchData = async () => {
      if (location !== CACHED_CAT_LOC || categoryId !== CACHED_CAT_ID) {
        setLoading(true);
      }
      try {
        let shopMap: Record<string, Shop> = {};
        if (shopCache.location === location && shopCache.shops.length > 0) {
          shopCache.shops.forEach(shop => {
            shopMap[shop.id] = shop;
          });
        } else {
          // Find shops in this area
          const shopQ = query(
            collection(db, 'shops'), 
            where('area', '==', location),
            where('status', '==', 'approved'), limit(20)
          );
          const shopSnap = await getDocs(shopQ);
          
          shopSnap.docs.forEach(doc => {
            shopMap[doc.id] = { id: doc.id, ...doc.data() } as Shop;
          });
          
          // Update cache
          shopCache.location = location;
          shopCache.shops = Object.values(shopMap);
        }
        
        CACHED_SHOPS_MAP = shopMap;
        setShops(shopMap);

        const shopIds = Object.keys(shopMap);
        
        if (shopIds.length > 0) {
          const chunks = [];
          for (let i = 0; i < shopIds.length; i += 30) {
            chunks.push(shopIds.slice(i, i + 30));
          }

          let allDiscounts: Discount[] = [];
          const now = new Date();

          for (const chunk of chunks) {
            const discQ = query(
              collection(db, 'discounts'),
              where('categoryId', '==', categoryId),
              where('shopId', 'in', chunk),
              where('active', '==', true)
            );
            const discSnap = await getDocs(discQ);
            
            const fetchedDiscounts = discSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as Discount));
            
            // Filter out expired or not yet valid discounts
            const validDiscounts = fetchedDiscounts.filter(d => {
              if (d.validUntil && (d.validUntil as any).toDate() < now) return false;
              if (d.validFrom && (d.validFrom as any).toDate() > now) return false;
              return true;
            });
            
            allDiscounts = allDiscounts.concat(validDiscounts);
          }
          
          allDiscounts.sort((a, b) => b.discountValue - a.discountValue);
          
          CACHED_DISCOUNTS = allDiscounts;
          setDiscounts(allDiscounts);
        } else {
          CACHED_DISCOUNTS = [];
          setDiscounts([]);
        }
        
        CACHED_CAT_LOC = location;
        CACHED_CAT_ID = categoryId;
      } catch (error) {
        console.error('Error fetching category data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location, categoryId, navigate]);

  return (
    <div className="max-w-5xl mx-auto p-4 py-6 space-y-6">
      <header className="mb-6">
        {categoryId && (
          <div className="flex items-center space-x-3 mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{categoryId} Offers</h1>
              <p className="text-sm text-gray-500">in {location}</p>
            </div>
          </div>
        )}

        {!categoryId && (
          <h2 className="text-lg font-bold text-gray-900 mb-4">All Categories</h2>
        )}
        
        {categoryId && (
          <div className="flex overflow-x-auto pb-4 gap-3 hide-scrollbar" ref={scrollContainerRef}>
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => navigate(`/categories/${encodeURIComponent(cat)}`)}
                className={`flex flex-shrink-0 items-center px-4 py-2 bg-white border ${categoryId === cat ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/90 shadow-sm' : 'border-gray-200 text-gray-700'} rounded-full text-sm font-medium hover:border-blue-600 hover:text-blue-600 transition-all active:scale-95`}
              >
                <span className="mr-2 opacity-70">{getCategoryIcon(cat)}</span>
                {cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {categoryId ? (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <DiscountCardSkeleton key={i} />
            ))}
          </div>
        ) : discounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discounts.map(discount => {
              const shop = shops[discount.shopId];
              if (!shop) return null;
              
              return (
                <DiscountCard key={discount.id} discount={discount} shop={shop} />
              );
            })}
          </div>
        ) : (
          <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 font-medium">No offers found for {categoryId} in {location}.</p>
            <button onClick={() => navigate('/categories')} className="mt-4 text-blue-600 font-medium hover:underline">
              Browse all categories
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {CATEGORIES.map(cat => (
            <button 
              key={cat} 
              onClick={() => navigate(`/categories/${encodeURIComponent(cat)}`)}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-blue-500 hover:shadow-md transition-all group active:scale-95"
            >
              <div className="h-14 w-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {getCategoryIcon(cat, 28)}
              </div>
              <span className="font-bold text-gray-900 text-sm text-center leading-tight">{cat}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
