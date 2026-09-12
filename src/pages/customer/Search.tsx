import { generateShopSlug } from '../../utils/slug';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from '../../context/LocationContext';
import { useSearch } from '../../context/SearchContext';
import { Search as SearchIcon, MapPin, Store, Clock, Sparkles, ChevronRight } from 'lucide-react';
import { getShopHoursStatus } from '../../utils/shopHours';
import { Skeleton } from '../../components/ui/Skeleton';

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
        if (response.ok) {
          const results = await response.json();
          setFilteredShops(results);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          console.error('Search request failed');
        }
      } catch (err) {
        console.error('Error fetching search data:', err);
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
