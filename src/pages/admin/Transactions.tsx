import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function Transactions() {
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const q = query(
          collection(db, 'redemptions'), 
          where('status', '==', 'redeemed')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort client-side to avoid requiring composite indexes
        data.sort((a: any, b: any) => {
          const dateA = a.redeemedAt?.toMillis ? a.redeemedAt.toMillis() : 0;
          const dateB = b.redeemedAt?.toMillis ? b.redeemedAt.toMillis() : 0;
          return dateB - dateA;
        });
        setRedemptions(data);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
      <p className="text-gray-500 text-sm">Showing successful discount redemptions across all shops.</p>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading transactions...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm">
                <th className="p-4 font-medium text-gray-500">Txn ID</th>
                <th className="p-4 font-medium text-gray-500">Shop ID</th>
                <th className="p-4 font-medium text-gray-500">Customer ID</th>
                <th className="p-4 font-medium text-gray-500">Redeemed At</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.length > 0 ? (
                redemptions.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4 text-sm font-medium text-gray-900">{r.transactionId || r.id}</td>
                    <td className="p-4 text-sm text-gray-500 max-w-[150px] truncate">{r.shopId}</td>
                    <td className="p-4 text-sm text-gray-500 max-w-[150px] truncate">{r.userId}</td>
                    <td className="p-4 text-sm text-gray-500">
                      {r.redeemedAt?.toDate ? r.redeemedAt.toDate().toLocaleString() : 'Unknown'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">No transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
