import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';


export default function Discounts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchDiscounts = async () => {
      try {
        // First get shop
        const shopQ = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
        const shopSnap = await getDocs(shopQ);
        
        if (shopSnap.empty) {
          setLoading(false);
          return;
        }
        
        const shopId = shopSnap.docs[0].id;

        // Then get discounts
        const q = query(collection(db, 'discounts'), where('shopId', '==', shopId));
        const snapshot = await getDocs(q);
        
        setDiscounts(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })));
      } catch (error) {
        console.error('Error fetching discounts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscounts();
  }, [user]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'discounts', id));
      setDiscounts(prev => prev.filter(d => d.id !== id));
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('Error deleting discount:', error);
      alert('Failed to delete discount.');
    } finally {
      setDeletingId(null);
    }
  };


  if (loading) {
    return (
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 min-w-[600px]">
            <thead className="bg-gray-50 text-xs text-gray-700 uppercase border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4">Valid Until</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded" /></td>
                  <td className="px-6 py-4 flex justify-end gap-3"><Skeleton className="h-5 w-10" /><Skeleton className="h-5 w-12" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }


  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Discounts</h1>
        <Button onClick={() => navigate('/shop/discounts/create')}>Create New</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {discounts.length > 0 ? (
          <table className="w-full text-left text-sm text-gray-500 min-w-[600px]">
            <thead className="bg-gray-50 text-xs text-gray-700 uppercase border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4">Valid Until</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.map(discount => (
                <tr key={discount.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{discount.title}</td>
                  <td className="px-6 py-4">
                    {discount.discountType === 'percentage' ? `${discount.discountValue}%` : `₹${discount.discountValue}`}
                  </td>
                  <td className="px-6 py-4">
                    {discount.validUntil?.toDate ? discount.validUntil.toDate().toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {discount.active ? (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Active</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {confirmDeleteId === discount.id ? (
                      <div className="inline-flex items-center justify-end gap-2">
                        <span className="text-xs font-semibold text-red-600">Delete offer?</span>
                        <button
                          type="button"
                          disabled={deletingId === discount.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(discount.id);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-md transition-colors shadow-sm"
                        >
                          {deletingId === discount.id ? 'Deleting...' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === discount.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="space-x-3">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/shop/discounts/edit/${discount.id}`);
                          }}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          Edit
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(discount.id);
                          }}
                          className="text-red-600 hover:underline font-medium text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-500">
            You haven't created any discounts yet.
          </div>
        )}
      </div>
    </div>
  );
}
