import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Clock, Copy, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';

let CACHED_OFFERS: any[] = [];
let CACHED_UID: string | null = null;

export default function MyOffers() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const isCached = user?.uid === CACHED_UID;
  const [redemptions, setRedemptions] = useState<any[]>(isCached ? CACHED_OFFERS : []);
  const [loading, setLoading] = useState(!isCached);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'redeemed' | 'expired'>('active');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchRedemptions = async () => {
      let timeoutId = setTimeout(() => {
        if (loading) {
           setError('Request timed out after 5 seconds.');
           setLoading(false);
        }
      }, 5000);
      if (user.uid !== CACHED_UID) {
        setLoading(true);
      }
      try {
        const q = query(
          collection(db, 'redemptions'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        
        const redemptionsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let discount = null;
          let shop = null;
          
          try {
            if (data.discountId && typeof data.discountId === 'string' && data.discountId.trim() !== '') {
              const discDoc = await getDoc(doc(db, 'discounts', data.discountId));
              if (discDoc.exists()) {
                discount = discDoc.data();
                if (discount && discount.shopId && typeof discount.shopId === 'string' && discount.shopId.trim() !== '') {
                  const shopDoc = await getDoc(doc(db, 'shops', discount.shopId));
                  if (shopDoc.exists()) shop = shopDoc.data();
                }
              }
            }
          } catch (e) {
            console.error('Error fetching nested docs:', e);
          }
          
          return {
            id: docSnap.id,
            ...data,
            discount,
            shop
          };
        }));
        
        // Sort client-side to avoid requiring composite indexes
        redemptionsData.sort((a: any, b: any) => {
          const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return dateB - dateA;
        });
        
        CACHED_OFFERS = redemptionsData;
        CACHED_UID = user.uid;
        setRedemptions(redemptionsData);
      } catch (err: any) {
        console.error('Error fetching offers:', err);
        setError(err.message || 'Failed to fetch offers');
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    fetchRedemptions();
  }, [user, authLoading, navigate]);

  const handleCopy = (otp: string, id: string) => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    navigator.clipboard.writeText(otp);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };




  const now = new Date();
  
  const filteredOffers = redemptions.filter(r => {
    const expiryDate = r.expiresAt?.toDate ? r.expiresAt.toDate() : new Date(r.expiresAt);
    const isExpired = (r.status === 'active' || r.status === 'pending') && expiryDate < now;
    const isRedeemed = r.status === 'redeemed';
    const isActive = r.status === 'active' && !isExpired;
    
    if (activeTab === 'active') return isActive;
    if (activeTab === 'redeemed') return isRedeemed;
    if (activeTab === 'expired') return isExpired;
    return false;
  });

  return (
    <div className="max-w-5xl mx-auto p-4 py-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4">My Offers</h2>
      
      <div className="flex border-b border-gray-200 mb-6 w-full">
        <button
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('active')}
        >
          Active
        </button>
        <button
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'redeemed' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('redeemed')}
        >
          Redeemed
        </button>
        <button
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'expired' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('expired')}
        >
          Expired
        </button>
      </div>

      <div className="space-y-4 w-full">
        {error ? (
          <div className="p-12 text-center text-red-500 bg-red-50 rounded-xl border border-red-200">Error: {error}</div>
        ) : loading ? (
          <div className="p-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            Loading your offers...
          </div>
        ) : filteredOffers.length > 0 ? (
          filteredOffers.map(r => {
            const expiryDate = r.expiresAt?.toDate ? r.expiresAt.toDate() : new Date(r.expiresAt);
            const isExpired = (r.status === 'active' || r.status === 'pending') && expiryDate < new Date();
            const isRedeemed = r.status === 'redeemed';
            const isActive = r.status === 'active' && !isExpired;
            const redeemedDate = r.redeemedAt?.toDate ? r.redeemedAt.toDate() : r.redeemedAt ? new Date(r.redeemedAt) : null;

            return (
              <div key={r.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {isRedeemed && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Redeemed</span>}
                    {isExpired && <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded">Expired</span>}
                    {isActive && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">Active Code</span>}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{r.discount?.title || 'Unknown Offer'}</h3>
                  <p className="text-gray-500 text-sm">{r.shop?.shopName}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isActive ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(r.otp, r.id);
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                        title="Copy Code"
                      >
                        {copiedId === r.id ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                      </button>
                      <Button onClick={() => navigate(`/otp/${r.id}`, { state: { otp: r.otp, expiresAt: expiryDate.toISOString() } })}>
                        View Code
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 flex items-center">
                      <Clock size={14} className="mr-1"/> 
                      {isRedeemed ? `Redeemed on ${redeemedDate?.toLocaleDateString()}` : `Expired on ${expiryDate.toLocaleDateString()}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500 font-medium mb-4">No {activeTab} offers found.</p>
            {activeTab === 'active' && (
              <Button onClick={() => navigate('/')}>Find Discounts</Button>
            )}
          </div>
        )}
        {/* End of content */}
      </div>
    </div>
  );
}
