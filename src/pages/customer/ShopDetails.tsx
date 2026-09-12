import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { extractIdFromSlug } from '../../utils/slug';

import { doc, getDoc, collection, query, where, getDocs, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MapPin, Navigation, Package, Tag, Star, Phone, Share2, Check, Clock, Search as SearchIcon, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DiscountCard } from '../../components/cards/DiscountCard';
import { ShopDetailsSkeleton } from '../../components/ui/ShopDetailsSkeleton';
import { Button } from '../../components/ui/Button';
import { getShopHoursStatus } from '../../utils/shopHours';

interface Shop {
  id: string;
  shopName: string;
  description: string;
  area: string;
  city: string;
  phone?: string;
  coverImageUrl?: string;
  rating?: number;
  ratingCount?: number;
  googleMapsUrl?: string;
  ownerId?: string;
  openingTime?: string;
  closingTime?: string;
}

interface Discount {
  id: string;
  title: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minimumPurchase: number;
  terms?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
}

export default function ShopDetails() {
  const { shopId: rawShopId } = useParams<{ shopId: string }>();
  const shopId = extractIdFromSlug(rawShopId);
  const { user } = useAuth();
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discounts' | 'products'>('discounts');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  
  const [canRate, setCanRate] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const handleShareShop = async () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    const shareData = {
      title: shop?.shopName || 'DiscountKart Shop',
      text: `Check out ${shop?.shopName} on DiscountKart for exclusive local discounts in ${shop?.area || 'your area'}!`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (!shopId) return;

    const fetchShopData = async () => {
      setLoading(true);
      try {
        const shopDoc = await getDoc(doc(db, 'shops', shopId));
        if (shopDoc.exists()) {
          const shopData = shopDoc.data();
          if (shopData.status !== 'approved') {
            setShop(null); // Pretend it doesn't exist
            return;
          }
          setShop({ id: shopDoc.id, ...shopData } as Shop);
          // Increment visit count
          try {
            const hasVisited = sessionStorage.getItem('visited_shop_' + shopId);
            if (!hasVisited) {
              await updateDoc(doc(db, 'shops', shopId), {
                visitCount: increment(1)
              });
              sessionStorage.setItem('visited_shop_' + shopId, 'true');
            }
          } catch (e) {
            console.error("Error updating visit count:", e);
          }

          
          if (user) {
            // Check if user has redeemed an offer here
            const claimsQ = query(
              collection(db, 'redemptions'),
              where('shopId', '==', shopId),
              where('userId', '==', user.uid),
              where('status', '==', 'redeemed')
            );
            const claimsSnap = await getDocs(claimsQ);
            
            if (!claimsSnap.empty) {
              setCanRate(true);
              
              // Check if they already rated
              const ratingQ = query(
                collection(db, 'shop_ratings'),
                where('shopId', '==', shopId),
                where('userId', '==', user.uid)
              );
              const ratingSnap = await getDocs(ratingQ);
              if (!ratingSnap.empty) {
                setUserRating(ratingSnap.docs[0].data().ratingValue);
              }
            }
          }

          // Fetch discounts
          const discQ = query(
            collection(db, 'discounts'),
            where('shopId', '==', shopId),
            where('active', '==', true)
          );
          const discSnapshot = await getDocs(discQ);
          const fetchedDiscounts = discSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Discount[];
          
          const now = new Date();
          const validDiscounts = fetchedDiscounts.filter(d => {
            if ((d as any).validUntil && (d as any).validUntil.toDate() < now) return false;
            if ((d as any).validFrom && (d as any).validFrom.toDate() > now) return false;
            return true;
          });
          
          validDiscounts.sort((a, b) => b.discountValue - a.discountValue);
          setDiscounts(validDiscounts);
          
          if (validDiscounts.length === 0) {
            setActiveTab('products');
          }

          // Fetch products
          const prodQ = query(
            collection(db, 'products'),
            where('shopId', '==', shopId)
          );
          const prodSnapshot = await getDocs(prodQ);
          setProducts(prodSnapshot.docs.map(p => ({ id: p.id, ...p.data() })) as Product[]);
        }
      } catch (error) {
        console.error('Error fetching shop details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, [shopId, user]);

  const handleRateShop = async (ratingValue: number) => {
    if (!user || !shopId || isSubmittingRating) return;

    setIsSubmittingRating(true);
    setUserRating(ratingValue);
    
    try {
      const ratingId = `${shopId}_${user.uid}`;
      await setDoc(doc(db, 'shop_ratings', ratingId), {
        shopId,
        userId: user.uid,
        ratingValue,
        updatedAt: new Date()
      });

      // Recalculate average
      const allQ = query(collection(db, 'shop_ratings'), where('shopId', '==', shopId));
      const allSnap = await getDocs(allQ);
      let total = 0;
      allSnap.docs.forEach(d => total += d.data().ratingValue);
      const avg = total / allSnap.size;
      const roundedAvg = Math.round(avg * 10) / 10;

      await updateDoc(doc(db, 'shops', shopId), {
        rating: roundedAvg,
        ratingCount: allSnap.size
      });
      
      setShop(prev => prev ? { ...prev, rating: roundedAvg } : null);
    } catch (err) {
      console.error('Error rating shop:', err);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (loading) return <ShopDetailsSkeleton />;

  if (!shop) {
    return <div className="p-12 text-center">Shop not found.</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-12">
      <div className={`relative w-full ${shop.coverImageUrl ? 'h-24 sm:h-64 bg-gray-800' : 'h-20 sm:h-48 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600'}`}>
        {shop.coverImageUrl && (
          <img src={shop.coverImageUrl} alt={shop.shopName} className="w-full h-full object-cover opacity-60" />
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-16 relative z-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="break-words">{shop.shopName}</span>
                {shop.rating && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs sm:text-sm px-2.5 py-1 rounded-full flex items-center gap-1 font-bold whitespace-nowrap flex-shrink-0">
                    <Star size={14} className="fill-current text-yellow-500" /> {shop.rating}
                  </span>
                )}
              </h1>
              <p className="text-gray-500 mt-2 flex items-center text-sm sm:text-base">
                <MapPin size={16} className="mr-1 flex-shrink-0 text-gray-400" /> <span className="truncate">{shop.area}, {shop.city}</span>
              </p>

              {/* Store Hours & Real-time Open/Closed Status */}
              {(() => {
                const hoursStatus = getShopHoursStatus(shop.openingTime, shop.closingTime);
                return (
                  <div className="flex flex-wrap items-center gap-2.5 mt-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm ${
                      hoursStatus.isOpen 
                        ? hoursStatus.isClosingSoon
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-gray-100 text-gray-800 border border-gray-300'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        hoursStatus.isOpen 
                          ? hoursStatus.isClosingSoon
                            ? 'bg-amber-600 animate-pulse'
                            : 'bg-emerald-600 animate-pulse'
                          : 'bg-gray-500'
                      }`} />
                      <span>{hoursStatus.badgeText}</span>
                    </div>

                    <div className="flex items-center text-xs text-gray-600 font-semibold gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                      <Clock size={14} className="text-gray-500" />
                      <span>{hoursStatus.formattedRange} ({hoursStatus.timeText})</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex gap-2.5">
            {shop.phone && (
              <a
                href={`tel:${shop.phone}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition"
              >
                <Phone size={18} />
                <span>Call Shop</span>
              </a>
            )}
            <a
              href={shop.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.shopName} ${shop.area} ${shop.city}`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition"
            >
              <Navigation size={18} />
              <span>Get Directions</span>
            </a>
            <button
              onClick={handleShareShop}
              className="flex items-center justify-center py-3 px-3 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 active:scale-[0.95] text-gray-700 rounded-xl font-bold text-xs sm:text-sm transition border border-gray-200"
              title="Share Shop"
            >
              <Share2 size={18} />
            </button>
          </div>
          
          {shop.description && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2">About</h2>
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{shop.description}</p>
            </div>
          )}
          
          {canRate && (
            <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Rate this shop</h3>
                <p className="text-xs text-gray-500">How was your experience here?</p>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRateShop(star)}
                    disabled={isSubmittingRating}
                    className={`p-1 transition ${userRating >= star ? 'text-yellow-400' : 'text-gray-200'} hover:scale-110`}
                  >
                    <Star size={24} className={userRating >= star ? 'fill-current' : ''} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {(discounts.length > 0 || products.length > 0) && (
          <div className="mt-8">
            <div className="flex border-b border-gray-200 mb-6">
              {discounts.length > 0 && (
                <button 
                  onClick={() => setActiveTab('discounts')}
                  className={`flex-1 pb-3 sm:pb-4 px-1 sm:px-4 font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border-b-2 transition-colors text-sm sm:text-base ${activeTab === 'discounts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  <Tag size={18} />
                  <span>Available Discounts</span>
                </button>
              )}
              {products.length > 0 && (
                <button 
                  onClick={() => setActiveTab('products')}
                  className={`flex-1 pb-3 sm:pb-4 px-1 sm:px-4 font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border-b-2 transition-colors text-sm sm:text-base ${activeTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  <Package size={18} />
                  <span>Products / Menu</span>
                </button>
              )}
            </div>

            {activeTab === 'discounts' && discounts.length > 0 && (
              <div className="space-y-4">
                {discounts.map(discount => (
                  <DiscountCard key={discount.id} discount={discount} />
                ))}
              </div>
            )}

            {activeTab === 'products' && products.length > 0 && (
              <div className="space-y-6">
                <div className="relative w-full">
                  <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    placeholder="Search menu or items in this shop..."
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
                  />
                  {menuSearchQuery && (
                    <button onClick={() => setMenuSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  )}
                </div>

                {(() => {
                  const q = menuSearchQuery.trim().toLowerCase();
                  const filteredProducts = products.filter(p => 
                    !q || 
                    p.name.toLowerCase().includes(q) ||
                    (p.category && p.category.toLowerCase().includes(q)) ||
                    (p.description && p.description.toLowerCase().includes(q))
                  );

                  if (filteredProducts.length === 0) {
                    return (
                      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-gray-500">
                        No items matching "{menuSearchQuery}".
                      </div>
                    );
                  }

                  const grouped = filteredProducts.reduce((acc, product) => {
                    const cat = product.category || 'Other Items';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(product);
                    return acc;
                  }, {} as Record<string, Product[]>);

                  return (
                    <div className="space-y-8">
                      {(Object.entries(grouped) as [string, Product[]][])
                        .sort(([a], [b]) => {
                          if (a === 'Other Items') return 1;
                          if (b === 'Other Items') return -1;
                          return a.localeCompare(b);
                        })
                        .map(([category, items]) => (
                          <div key={category}>
                            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100 flex items-center justify-between">
                              <span>{category}</span>
                              <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{items.length} items</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {items.map(product => (
                                <div key={product.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                                      {((product as any).quantity !== null && (product as any).quantity !== undefined && (product as any).quantity !== '') && (
                                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                                          {(product as any).quantity} {(product as any).unit || ''}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-bold text-blue-700 text-lg">₹{product.price}</span>
                                  </div>
                                  {product.description && (
                                    <p className="text-gray-500 text-sm mt-3 leading-relaxed">{product.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Toast Notification */}
      {copiedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-bounce">
          <Check size={16} className="text-emerald-400" />
          <span>Shop link copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}