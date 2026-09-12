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
import { Edit2 } from "lucide-react";

export default function Shops() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingShop, setEditingShop] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status");
  const planFilter = searchParams.get("plan");

  useEffect(() => {
    fetchShops();
  }, [searchParams]);

  const fetchShops = async () => {
    try {
      const q = query(collection(db, "shops"));
      const snapshot = await getDocs(q);
      let loadedShops: any[] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (statusFilter) {
        loadedShops = loadedShops.filter((s) => s.status === statusFilter);
      }

      if (planFilter) {
        loadedShops = loadedShops.filter(
          (s) => getShopPlanStatus(s as any) === planFilter,
        );
      }

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
        // Start 30-day Pro Trial
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
      await fetchShops(); // refresh list
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
        // Deactivate ad
        await updateDoc(doc(db, "advertisements", adId), {
          status: "inactive",
        });
      } else if (!currentStatus) {
        // Create new ad for 7 days
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

  if (loading) return <div className="p-8">Loading shops...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center w-full">
        <h1 className="text-2xl font-bold text-gray-900">Manage Shops</h1>
        {(statusFilter || planFilter) && (
          <Button variant="outline" onClick={() => setSearchParams({})}>
            Clear Filters
          </Button>
        )}
      </div>
      <p className="text-gray-500 text-sm">
        Approve listings and manage sponsored advertisements.
      </p>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Shop Name</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shops.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No shops registered yet.
                </td>
              </tr>
            ) : (
              shops.map((shop) => (
                <tr
                  key={shop.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {shop.shopName}
                      </span>
                      {shop.isPromoted && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          Sponsored
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {shop.area}, {shop.city}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        shop.status === "approved"
                          ? "bg-blue-100 text-blue-700"
                          : shop.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {shop.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {shop.status === "approved" && (
                        <Button
                          size="sm"
                          variant={shop.isPromoted ? "outline" : "default"}
                          className={
                            shop.isPromoted
                              ? "text-gray-600"
                              : "bg-blue-600 hover:bg-blue-700"
                          }
                          onClick={() =>
                            handleTogglePromoted(
                              shop.id,
                              !!shop.isPromoted,
                              shop.activeAdId,
                            )
                          }
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
                        >
                          <Edit2 size={16} />
                        </Button>
                      {(shop.status === "pending" ||
                        shop.status === "rejected") && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleUpdateStatus(shop.id, "approved")
                          }
                          disabled={updating === shop.id}
                        >
                          Approve
                        </Button>
                      )}
                      {shop.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() =>
                            handleUpdateStatus(shop.id, "rejected")
                          }
                          disabled={updating === shop.id}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
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
