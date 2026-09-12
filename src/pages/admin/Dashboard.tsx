import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  Store,
  Users,
  CheckCircle,
  Crown,
  AlertCircle,
  ShoppingBag,
  IndianRupee,
} from "lucide-react";
import { getShopPlanStatus } from "../../lib/subscription";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    shops: 0,
    pendingShops: 0,
    approvedShops: 0,
    rejectedShops: 0,
    trialShops: 0,
    activeProShops: 0,
    expiredShops: 0,
    pendingPayments: 0,
    users: 0,
    claims: 0,
    redemptions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [shopsSnap, usersSnap, redemptionsSnap, paymentsSnap, analyticsSnap] = await Promise.all([
          getDocs(collection(db, "shops")),
          getDocs(query(collection(db, "users"), where("role", "==", "customer"))),
          getDocs(query(collection(db, "redemptions"), where("status", "==", "redeemed"))),
          getDocs(query(collection(db, "paymentRequests"), where("status", "==", "pending"))),
          getDocs(query(collection(db, "analyticsEvents"), where("eventType", "==", "offer_claim")))
        ]);

        let pendingShops = 0,
          approvedShops = 0,
          rejectedShops = 0;
        let trialShops = 0,
          activeProShops = 0,
          expiredShops = 0;

        shopsSnap.docs.forEach((doc) => {
          const s = doc.data();
          if (s.status === "pending") pendingShops++;
          if (s.status === "approved") approvedShops++;
          if (s.status === "rejected") rejectedShops++;

          const planStatus = getShopPlanStatus(s as any);
          if (planStatus === "trial") trialShops++;
          if (planStatus === "active") activeProShops++;
          if (planStatus === "expired") expiredShops++;
        });

        setStats({
          shops: shopsSnap.size,
          pendingShops,
          approvedShops,
          rejectedShops,
          trialShops,
          activeProShops,
          expiredShops,
          pendingPayments: paymentsSnap.size,
          users: usersSnap.size,
          claims: analyticsSnap.size,
          redemptions: redemptionsSnap.size,
        });
      } catch (error) {
        console.error("Error fetching admin stats", error);
        setErrorMsg(error.message || String(error));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (errorMsg) return <div className="p-12 text-center text-red-500">{errorMsg}</div>;
  if (loading) return <div className="p-12 text-center">Loading stats...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => navigate("/admin/shops")}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Store size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Shops</p>
              <p className="text-2xl font-bold text-gray-900">{stats.shops}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center items-stretch">
            <div
              className="flex flex-col justify-between h-full cursor-pointer hover:bg-gray-50 rounded p-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/admin/shops?status=approved");
              }}
            >
              <p className="text-xs text-gray-500 leading-tight">Approved</p>
              <p className="font-bold text-blue-600 mt-1">{stats.approvedShops}</p>
            </div>
            <div
              className="flex flex-col justify-between h-full cursor-pointer hover:bg-gray-50 rounded p-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/admin/shops?status=pending");
              }}
            >
              <p className="text-xs text-gray-500 leading-tight">Pending</p>
              <p className="font-bold text-yellow-600 mt-1">{stats.pendingShops}</p>
            </div>
            <div
              className="flex flex-col justify-between h-full cursor-pointer hover:bg-gray-50 rounded p-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/admin/shops?status=rejected");
              }}
            >
              <p className="text-xs text-gray-500 leading-tight">Rejected</p>
              <p className="font-bold text-red-600 mt-1">{stats.rejectedShops}</p>
            </div>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-purple-300 transition-colors"
          onClick={() => navigate("/admin/shops")}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <Crown size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.trialShops + stats.activeProShops}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center items-stretch">
            <div
              className="flex flex-col justify-between h-full cursor-pointer hover:bg-gray-50 rounded p-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/admin/shops?plan=trial");
              }}
            >
              <p className="text-xs text-gray-500 leading-tight">Pro Trials</p>
              <p className="font-bold text-purple-600 mt-1">{stats.trialShops}</p>
            </div>
            <div
              className="flex flex-col justify-between h-full cursor-pointer hover:bg-gray-50 rounded p-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/admin/shops?plan=active");
              }}
            >
              <p className="text-xs text-gray-500 leading-tight">Active Pro</p>
              <p className="font-bold text-blue-600 mt-1">{stats.activeProShops}</p>
            </div>
            <div
              className="flex flex-col justify-between h-full cursor-pointer hover:bg-gray-50 rounded p-1 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/admin/shops?plan=expired");
              }}
            >
              <p className="text-xs text-gray-500 leading-tight">Expired</p>
              <p className="font-bold text-red-600 mt-1">{stats.expiredShops}</p>
            </div>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between cursor-pointer hover:border-yellow-300 transition-colors"
          onClick={() => navigate("/admin/payment-requests")}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
              <IndianRupee size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Pending Payments
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.pendingPayments}
              </p>
            </div>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => navigate("/admin/transactions")}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Claims</p>
              <p className="text-2xl font-bold text-gray-900">{stats.claims}</p>
            </div>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => navigate("/admin/transactions")}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <ShoppingBag size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">
                Total Redemptions
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.redemptions}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
