import { generateShopSlug } from '../../utils/slug';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from '../../context/LocationContext';
import { useSearch } from '../../context/SearchContext';
import { Search as SearchIcon, MapPin, Store, Clock, Sparkles, ChevronRight } from 'lucide-react';
import { getShopHoursStatus } from '../../utils/shopHours';
import { Skeleton } from '../../components/ui/Skeleton';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

let cachedSearchData: {
  shops: any[];
  products: any[];
  discounts: any[];
  timestamp: number;
} | null = null;

async function getSearchData() {
  const now = Date.now();
  if (cachedSearchData && now - cachedSearchData.timestamp < 5 * 60 * 1000) {
    return cachedSearchData;
  }

  try {
    const [shopsSnap, prodSnap, discSnap] = await Promise.all([
      getDocs(query(collection(db, 'shops'), where('status', '==', 'approved'))),
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'discounts'))
    ]);

    const shops = shopsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const products = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const discounts = discSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    cachedSearchData = { shops, products, discounts, timestamp: now };
    return cachedSearchData;
  } catch (err) {
    console.error('Error fetching search data from Firestore:', err);
    return { shops: [], products: [], discounts: [], timestamp: 0 };
  }
}

function editDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function isFuzzyMatch(target: string | undefined, queryStr: string): boolean {
  if (!target) return false;
  const t = target.toLowerCase();
  const q = queryStr.toLowerCase();

  if (t.includes(q)) return true;

  const words = t.split(/[\s,.-]+/);
  for (const word of words) {
    if (!word) continue;
    if (word.startsWith(q)) return true;
    if (q.length >= 4) {
      const maxDistance = q.length > 6 ? 2 : 1;
      if (Math.abs(word.length - q.length) <= maxDistance && editDistance(word, q) <= maxDistance) return true;
    }
  }
  return false;
}

async function performClientSearch(searchTerm: string): Promise<any[]> {
  const q = searchTerm.trim().toLowerCase();
  if (!q) return [];

  const { shops, products, discounts } = await getSearchData();

  const matchingShopIds = new Map<string, string>();
  for (const p of products) {
    if (isFuzzyMatch(p.name, q) && p.shopId) {
      if (!matchingShopIds.has(p.shopId)) {
        matchingShopIds.set(p.shopId, 'Product: ' + p.name);
      }
    }
  }
  for (const d of discounts) {
    if (isFuzzyMatch(d.title, q) && d.shopId) {
      if (!matchingShopIds.has(d.shopId)) {
        matchingShopIds.set(d.shopId, 'Offer: ' + d.title);
      }
    }
  }

  const results = [];
  for (const shop of shops) {
    const matchName = isFuzzyMatch(shop.shopName, q);
    const matchCategory = isFuzzyMatch(shop.category, q);
    const matchArea = isFuzzyMatch(shop.area, q);
    const itemMatchReason = matchingShopIds.get(shop.id);

    if (matchName || matchCategory || matchArea || itemMatchReason) {
      results.push({
        id: shop.id,
        shopName: shop.shopName,
        category: shop.category,
        area: shop.area,
        city: shop.city,
        address: shop.address,
        phone: shop.phone,
        openingTime: shop.openingTime,
        closingTime: shop.closingTime,
        coverImageUrl: shop.coverImageUrl || shop.coverImage || shop.image,
        rating: shop.rating,
        ratingCount: shop.ratingCount || shop.reviewCount,
        isMatch: true,
        matchReason: matchName ? null : (matchCategory ? 'Category: ' + shop.category : (matchArea ? 'Area: ' + shop.area : itemMatchReason))
      });
    }

    if (results.length >= 25) break;
  }

  return results;
}

export default function Search() {
  const navigate = useNavigate();
  const { location } = useLocation();
  const { searchTerm } = useSearch();
  const [filteredShops, setFilteredShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchTerm.trim()) {
        setFilteredShops([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
        const contentType = response.headers.get('content-type') || '';
        
        if (response.ok && contentType.includes('application/json')) {
          const results = await response.json();
          setFilteredShops(results);
        } else {
          // Fallback to client-side Firestore search (e.g. on Vercel static deployment)
          const results = await performClientSearch(searchTerm);
          setFilteredShops(results);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.warn('API search failed, trying client-side Firestore search:', err);
        try {
          const results = await performClientSearch(searchTerm);
          setFilteredShops(results);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (clientErr) {
          console.error('Client search error:', clientErr);
        }
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchSearchResults();
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50/80 pb-16">
      <div className="max-w-5xl mx-auto p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center space-x-4">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : searchTerm.trim() && filteredShops.length > 0 ? (
          filteredShops.map(shop => {
            const status = getShopHoursStatus(shop.openingTime, shop.closingTime);
            return (
              <div 
                key={shop.id} 
                onClick={() => navigate(`/shops/${generateShopSlug(shop)}`)}
                className="group bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between space-x-4 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.99]"
              >
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-gray-100">
                    {shop.coverImageUrl ? (
                      <img src={shop.coverImageUrl} alt={shop.shopName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <Store className="text-blue-400" size={24} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition-colors truncate">
                        {shop.shopName}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        status.isOpen 
                          ? status.isClosingSoon 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-emerald-100 text-emerald-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {status.badgeText}
                      </span>
                    </div>

                    <div className="flex items-center text-xs text-gray-500 mt-1 flex-wrap gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate">{shop.area}, {shop.city || 'Delhi'}</span>
                      </span>

                      {location && shop.area === location && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          NEAR YOU
                        </span>
                      )}
                    </div>

                    {shop.matchReason && (
                      <div className="mt-2 text-[11px] font-semibold text-blue-700 bg-blue-50/80 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border border-blue-100">
                        <Sparkles size={11} className="text-blue-500" />
                        <span>Matches: {shop.matchReason}</span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
            );
          })
        ) : searchTerm.trim() && filteredShops.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-gray-200 space-y-2">
            <SearchIcon size={32} className="mx-auto text-gray-300" />
            <h3 className="font-bold text-gray-800">No shops found</h3>
            <p className="text-xs text-gray-500">No matching shops or offers found for "{searchTerm}". Try another keyword or area.</p>
          </div>
        ) : (
          <div className="text-center p-12 bg-white rounded-3xl border border-gray-100 space-y-2">
            <SearchIcon size={32} className="mx-auto text-blue-400" />
            <h3 className="font-bold text-gray-900">Search Shops & Discounts</h3>
            <p className="text-xs text-gray-500">Type a shop name, category (e.g. Fashion, Electronics), area, or product.</p>
          </div>
        )}
      </div>
    </div>
  );
}
