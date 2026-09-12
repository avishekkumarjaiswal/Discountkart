import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../../components/ui/Button';
import { Tag, Trash2, Plus } from 'lucide-react';

export default function PromoCodes() {
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('100');
  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      const q = query(collection(db, 'promoCodes'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPromoCodes(data);
    } catch (err) {
      console.error('Error fetching promo codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    setAdding(true);
    try {
      const code = newCode.trim().toUpperCase();
      await setDoc(doc(db, 'promoCodes', code), {
        code,
        discountPercent: parseInt(newDiscount, 10) || 100,
        createdAt: new Date()
      });
      setNewCode('');
      await fetchPromoCodes();
    } catch (err: any) {
      alert('Error adding promo code: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMsg("");
    try {
      await deleteDoc(doc(db, 'promoCodes', id));
      setDeletingId(null);
      await fetchPromoCodes();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error deleting: ' + err.message);
      setDeletingId(null);
    }
  };

  if (loading) return <div className="p-8">Loading promo codes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promo Codes</h1>
          <p className="text-gray-500 text-sm">Manage discount codes for shop subscriptions.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {errorMsg}
        </div>
      )}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Code</h2>
        <form onSubmit={handleAddCode} className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Code Name</label>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="e.g. SUMMER50"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent uppercase"
              required
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
            <input
              type="number"
              value={newDiscount}
              onChange={(e) => setNewDiscount(e.target.value)}
              min="1"
              max="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              required
            />
          </div>
          <Button type="submit" disabled={adding || !newCode.trim()} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            <Plus size={20} className="mr-2" />
            Add Code
          </Button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Promo Code</th>
              <th className="px-6 py-4">Discount</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {promoCodes.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-gray-500">No promo codes active.</td>
              </tr>
            ) : (
              promoCodes.map(code => (
                <tr key={code.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 font-mono">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-blue-600" />
                      {code.code}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">
                    {code.discountPercent}% OFF
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {deletingId === code.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-red-600 font-bold mr-2">Sure?</span>
                        <button onClick={() => handleDelete(code.id)} className="text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded text-xs font-bold transition-colors">No</button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeletingId(code.id)}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
