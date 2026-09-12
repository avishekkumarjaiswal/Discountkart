import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Check, Crown, Sparkles } from 'lucide-react';

export default function Subscription() {
  const { user } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const shopQ = query(collection(db, 'shops'), where('ownerId', '==', user?.uid));
      const shopSnap = await getDocs(shopQ);

      if (!shopSnap.empty) {
        setShop({ id: shopSnap.docs[0].id, ...shopSnap.docs[0].data() });
      }
    } catch (error) {
      console.error("Error fetching shop data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-500 font-medium">Please complete your shop profile first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Subscription & Billing</h1>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-10 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Crown size={120} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-6">
            <Sparkles size={16} /> Beta Access Active
          </div>
          <h2 className="text-3xl font-bold mb-4">Everything is Free for Now!</h2>
          <p className="text-blue-100 text-lg mb-8 leading-relaxed">
            We're currently rolling out DiscountKart and payments are coming soon. 
            To help you get started, we're giving all approved shops full access to our <strong>Pro Features</strong> completely free of charge. Your subscription is managed directly by our administration team.
          </p>
          <div className="flex items-center gap-2 font-medium bg-white/10 w-fit px-4 py-3 rounded-xl">
            <Check size={20} className="text-green-300" /> 
            No credit card required. No hidden fees.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
            <Crown size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Pro Features Unlocked</h3>
          <p className="text-gray-500 mb-6">You currently have access to all premium tools to grow your business.</p>
          
          <ul className="space-y-4">
            <li className="flex items-start">
              <Check size={20} className="text-blue-500 mr-3 flex-shrink-0" />
              <span className="text-gray-600">Unlimited Discount Listings</span>
            </li>
            <li className="flex items-start">
              <Check size={20} className="text-blue-500 mr-3 flex-shrink-0" />
              <span className="text-gray-600">Verified Shop Badge</span>
            </li>
            <li className="flex items-start">
              <Check size={20} className="text-blue-500 mr-3 flex-shrink-0" />
              <span className="text-gray-600">Customer Analytics & Insights</span>
            </li>
            <li className="flex items-start">
              <Check size={20} className="text-blue-500 mr-3 flex-shrink-0" />
              <span className="text-gray-600">Priority Placement in Search</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}