import { useEffect, useState } from "react";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Button } from "../../components/ui/Button";
import { useSearchParams } from "react-router-dom";
import { getShopPlanStatus } from "../../lib/subscription";
import { EditShopModal } from "../../components/modals/EditShopModal";
import { Edit2, Search as SearchIcon, Store, ShieldCheck, Clock, Phone, MapPin } from "lucide-react";

export default function Shops() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingShop, setEditingShop] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";
  const planFilter = searchParams.get("plan") || "all";

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const q = query(collection(db, "shops"));
      const snapshot = await getDocs(q);
      let loadedShops: any[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Fetch active ads to determine isPromoted dynamically
      let activeAdShopIds = new Set();
      const adsQ = query(
        collection(db, "advertisements"),
        where("status", "==", "active"),
      );
      const adsSnap = await getDocs(adsQ);
      const now = new Date();

      const activeAdDocs: Record<string, any> = {};
      adsSnap.forEach((doc) => {
        const ad = doc.data();
        const startDate = ad.startDate?.toDate
          ? ad.startDate.toDate()
          : new Date(0);
        const endDate = ad.endDate?.toDate
          ? ad.endDate.toDate()
          : new Date(9999, 11, 31);
        if (startDate <= now && endDate >= now) {
          activeAdShopIds.add(ad.shopId);
          activeAdDocs[ad.shopId] = doc.id;
        }
      });

      loadedShops = loadedShops.map((shop: any) => ({
        ...shop,
        isPromoted: activeAdShopIds.has(shop.id),
        activeAdId: activeAdDocs[shop.id] || null,
      }));

      setShops(loadedShops);
    } catch (error) {
      console.error("Error fetching shops:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (shopId: string, newStatus: string) => {
    setUpdating(shopId);
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "approved") {
        const now = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(now.getDate() + 30);

        updateData.subscriptionPlan = "pro";
        updateData.subscriptionStatus = "trial";
        updateData.trialStartDate = now;
        updateData.trialEndDate = trialEnd;
      } else if (newStatus === "rejected") {
        updateData.subscriptionStatus = "free";
        updateData.subscriptionPlan = "free";
      }

      await updateDoc(doc(db, "shops", shopId), updateData);
      await fetchShops();
    } catch (error) {
      console.error("Error updating shop:", error);
    } finally {
      setUpdating(null);
    }
  };

  const handleTogglePromoted = async (
    shopId: string,
    currentStatus: boolean,
    adId?: string,
  ) => {
    setUpdating(shopId);
    try {
      if (currentStatus && adId) {
        await updateDoc(doc(db, "advertisements", adId), {
          status: "inactive",
        });
      } else if (!currentStatus) {
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);
        await addDoc(collection(db, "advertisements"), {
          shopId: shopId,
          status: "active",
          startDate: now,
          endDate: nextWeek,
        });
      }
      await fetchShops();
    } catch (error) {
      console.error("Error updating promotion status:", error);
    } finally {
      setUpdating(null);
    }
  };

  const filteredShops = shops.filter((shop) => {
    if (statusFilter !== "all" && shop.status !== statusFilter) return false;
    if (planFilter !== "all" && getShopPlanStatus(shop) !== planFilter) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = shop.shopName?.toLowerCase().includes(q);
      const matchCategory = shop.category?.toLowerCase().includes(q);
      const matchArea = shop.area?.toLowerCase().includes(q);
      const matchCity = shop.city?.toLowerCase().includes(q);
      const matchPhone = shop.phone?.toLowerCase().includes(q);
      const matchEmail = shop.email?.toLowerCase().includes(q);
      return matchName || matchCategory || matchArea || matchCity || matchPhone || matchEmail;
    }
    return true;
  });

  if (loading) return <div className="p-8">Loading shops...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage All Shops ({shops.length})</h1>
          <p className="text-gray-500 text-sm">
            View, approve, filter, and edit all registered shops across the platform.
          </p>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full">
          <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by shop name, category, phone, or area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {["all", "approved", "pending", "rejected"].map((st) => (
            <button
              key={st}
              onClick={() => setSearchParams({ status: st, plan: planFilter })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Shops Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Shop & Category</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Status & Plan</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredShops.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No matching shops found.
                </td>
              </tr>
            ) : (
              filteredShops.map((shop) => {
                const plan = getShopPlanStatus(shop);
                return (
                  <tr key={shop.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {shop.coverImageUrl ? (
                            <img src={shop.coverImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Store size={20} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 text-base">{shop.shopName}</span>
                            {shop.isPromoted && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                Sponsored
                              </span>
                            )}
                          </div>
                          <span className="inline-block mt-0.5 text-xs text-gray-500 font-semibold bg-gray-100 px-2 py-0.5 rounded">
                            {shop.category || "Others"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-900 font-semibold flex items-center gap-1">
                        <MapPin size={12} className="text-gray-400 shrink-0" />
                        <span>{shop.area}, {shop.city}</span>
                      </div>
                      {shop.address && (
                        <div className="text-[11px] text-gray-500 truncate max-w-[180px]" title={shop.address}>
                          {shop.address}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-900 font-semibold flex items-center gap-1">
                        <Phone size={12} className="text-gray-400 shrink-0" />
                        <span>{shop.phone || "No Phone"}</span>
                      </div>
                      {shop.email && <div className="text-[11px] text-gray-500">{shop.email}</div>}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          shop.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : shop.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                        }`}>
                          {shop.status}
                        </span>
                        
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          plan === "active" || plan === "trial"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          Plan: {plan.toUpperCase()}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {shop.status === "approved" && (
                          <Button
                            size="sm"
                            variant={shop.isPromoted ? "outline" : "default"}
                            className={shop.isPromoted ? "text-gray-600 text-xs" : "bg-blue-600 hover:bg-blue-700 text-xs"}
                            onClick={() => handleTogglePromoted(shop.id, !!shop.isPromoted, shop.activeAdId)}
                            disabled={updating === shop.id}
                          >
                            {shop.isPromoted ? "Remove Ad" : "Promote"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingShop(shop)}
                          title="Edit Shop Details"
                          className="px-2.5"
                        >
                          <Edit2 size={15} />
                        </Button>
                        {(shop.status === "pending" || shop.status === "rejected") && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(shop.id, "approved")}
                            disabled={updating === shop.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                          >
                            Approve
                          </Button>
                        )}
                        {shop.status === "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                            onClick={() => handleUpdateStatus(shop.id, "rejected")}
                            disabled={updating === shop.id}
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editingShop && (
        <EditShopModal
          shop={editingShop}
          onClose={() => setEditingShop(null)}
          onSave={() => {
            setEditingShop(null);
            fetchShops();
          }}
        />
      )}
    </div>
  );
}
