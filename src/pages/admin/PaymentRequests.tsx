import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export default function PaymentRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const q = query(collection(db, 'paymentRequests'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      // Sort pending first, then by date descending
      data.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        const aTime = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : 0;
        const bTime = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : 0;
        return bTime - aTime;
      });
      setRequests(data);
    } catch (err) {
      console.error('Error fetching payment requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: any) => {
    if (!user) return;
    setProcessing(request.id);
    try {
      // Re-fetch to ensure it's still pending
      const reqSnap = await getDoc(doc(db, 'paymentRequests', request.id));
      if (!reqSnap.exists() || reqSnap.data().status !== 'pending') {
        alert('Request is no longer pending.');
        await fetchRequests();
        return;
      }

      const batch = writeBatch(db);
      
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setDate(now.getDate() + 30);

      // 1. Update Payment Request
      const reqRef = doc(db, 'paymentRequests', request.id);
      batch.update(reqRef, {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user.uid
      });

      // 2. Create Payment Record
      const paymentRef = doc(collection(db, 'payments'));
      batch.set(paymentRef, {
        paymentRequestId: request.id,
        shopId: request.shopId,
        ownerId: request.ownerId,
        amount: request.amount,
        currency: request.currency,
        method: request.method,
        utrNumber: request.utrNumber,
        status: 'paid',
        paidAt: serverTimestamp(),
        verifiedBy: user.uid,
        createdAt: serverTimestamp()
      });

      // 3. Update Shop Subscription
      const shopRef = doc(db, 'shops', request.shopId);
      batch.update(shopRef, {
        subscriptionStatus: 'active',
        subscriptionPlan: request.plan,
        subscriptionStartDate: now,
        subscriptionEndDate: nextMonth
      });

      await batch.commit();
      await fetchRequests();
    } catch (err) {
      console.error('Error approving payment:', err);
      alert('Error approving payment.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }
    
    setProcessing(requestId);
    try {
      const reqRef = doc(db, 'paymentRequests', requestId);
      await updateDoc(reqRef, {
        status: 'rejected',
        rejectionReason,
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid
      });
      setRejectingId(null);
      setRejectionReason('');
      await fetchRequests();
    } catch (err) {
      console.error('Error rejecting payment:', err);
      alert('Error rejecting payment.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="p-8">Loading requests...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Payment Requests</h1>
      <p className="text-gray-500 text-sm">Verify manual UPI payments to activate shop subscriptions.</p>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
            No payment requests found.
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-6">
              
              {/* Header Info */}
              <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between">
                  <span className="font-bold text-gray-900 text-sm">Shop ID:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    req.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {req.status}
                  </span>
                </div>
                <span className="font-bold text-gray-900 break-all text-lg">{req.shopId}</span>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="font-medium text-lg">₹{req.amount}</p>
                </div>
                <div>
                  <p className="text-gray-500">Method</p>
                  <p className="font-medium uppercase">{req.method}</p>
                </div>
                <div>
                  <p className="text-gray-500">UTR / Transaction ID</p>
                  <p className="font-medium font-mono break-all">{req.utrNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500">Payment Date</p>
                  <p className="font-medium">{req.paymentDate}</p>
                </div>
              </div>

              {req.rejectionReason && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                  <strong className="block mb-1">Rejection Reason:</strong>
                  {req.rejectionReason}
                </div>
              )}

              {/* Actions & Screenshot */}
              <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
                {req.screenshotUrl ? (
                  <button onClick={() => setViewingScreenshot(req.screenshotUrl)} className="text-blue-600 hover:text-blue-800 text-sm font-medium w-full text-center p-3 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                    View Payment Screenshot
                  </button>
                ) : (
                  <span className="text-sm text-gray-400 italic text-center w-full block p-3">No screenshot provided</span>
                )}
                
                {req.status === 'pending' && (
                  <div className="w-full mt-2">
                    {rejectingId === req.id ? (
                      <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <input
                          type="text"
                          placeholder="Rejection reason..."
                          className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                        />
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => handleReject(req.id)} disabled={processing === req.id} className="w-full bg-red-600 hover:bg-red-700 text-white">
                            Confirm Reject
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectingId(null)} className="w-full">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button 
                          onClick={() => handleApprove(req)} 
                          disabled={processing === req.id}
                          className="w-full sm:w-1/2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Approve Payment
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setRejectingId(req.id)}
                          disabled={processing === req.id}
                          className="w-full sm:w-1/2 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Reject Payment
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {viewingScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewingScreenshot(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img src={viewingScreenshot} alt="Payment Screenshot" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain bg-white" />
            <button 
              onClick={() => setViewingScreenshot(null)}
              className="absolute -top-4 -right-4 bg-white text-gray-900 rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
