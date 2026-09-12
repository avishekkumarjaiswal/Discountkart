import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Check, Upload, Copy, AlertCircle } from 'lucide-react';

export default function Subscription() {
  const { user } = useAuth();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'overview' | 'payment_form'>('overview');
  
  // Payment data
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [rejectedRequest, setRejectedRequest] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [upiSettings, setUpiSettings] = useState<any>(null);

  // Form states
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // 1. Fetch Shop
      const shopQ = query(collection(db, 'shops'), where('ownerId', '==', user?.uid));
      const shopSnap = await getDocs(shopQ);
      if (shopSnap.empty) {
        setLoading(false);
        return;
      }
      const shopData = { id: shopSnap.docs[0].id, ...shopSnap.docs[0].data() };
      setShop(shopData);

      // 2. Fetch Payment Requests
      const reqQ = query(collection(db, 'paymentRequests'), where('ownerId', '==', user?.uid));
      const reqSnap = await getDocs(reqQ);
      
      let pending = null;
      let rejected = null;
      
      const shopRequests = reqSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(req => req.shopId === shopData.id)
        .sort((a, b) => {
          const aTime = a.submittedAt?.toMillis ? a.submittedAt.toMillis() : 0;
          const bTime = b.submittedAt?.toMillis ? b.submittedAt.toMillis() : 0;
          return bTime - aTime;
        });

      pending = shopRequests.find(req => req.status === 'pending') || null;
      
      if (!pending) {
        const latestApproved = shopRequests.find(req => req.status === 'approved');
        const latestRejected = shopRequests.find(req => req.status === 'rejected');
        
        if (latestRejected) {
          if (!latestApproved) {
            rejected = latestRejected;
          } else {
            const rejTime = latestRejected.submittedAt?.toMillis ? latestRejected.submittedAt.toMillis() : 0;
            const appTime = latestApproved.submittedAt?.toMillis ? latestApproved.submittedAt.toMillis() : 0;
            // Ignore rejections for duplicate submissions (within 1 hour of an approved request)
            if (rejTime > appTime + 3600000) {
              rejected = latestRejected;
            }
          }
        }
      }
      setPendingRequest(pending);
      setRejectedRequest(rejected);

      // 3. Fetch Payment History
      const histQ = query(collection(db, 'payments'), where('ownerId', '==', user?.uid));
      const histSnap = await getDocs(histQ);
      const history = histSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(p => p.shopId === shopData.id);
      history.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setPaymentHistory(history);

    } catch (err: any) {
      console.error('Error fetching subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPayment = async () => {
    try {
      const setDocSnap = await getDoc(doc(db, 'appSettings', 'payment'));
      if (setDocSnap.exists()) {
        setUpiSettings(setDocSnap.data());
      }
      setView('payment_form');
    } catch (err) {
      console.error('Error fetching payment settings:', err);
      alert('Could not fetch payment details. Please try again later.');
    }
  };

  const handleCopyUpi = () => {
    if (upiSettings?.upiId) {
      navigator.clipboard.writeText(upiSettings.upiId);
      alert('UPI ID copied to clipboard!');
    }
  };

  const applyPromoCode = async () => {
    setPromoError('');
    setSubmitting(true);
    try {
      const code = promoCode.trim().toUpperCase();
      const codeSnap = await getDoc(doc(db, 'promoCodes', code));
      if (codeSnap.exists()) {
        setPromoApplied(true);
      } else {
        setPromoError('Invalid promo code.');
      }
    } catch (err) {
      setPromoError('Error verifying code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (promoApplied) {
      setSubmitting(true);
      try {
        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setDate(now.getDate() + 30);
        
        // Auto-approve payment
        await addDoc(collection(db, 'paymentRequests'), {
          shopId: shop.id,
          ownerId: user?.uid,
          plan: "pro_monthly",
          amount: 0,
          currency: "INR",
          method: "promo_code",
          utrNumber: promoCode,
          paymentDate,
          screenshotUrl: null,
          status: "approved",
          submittedAt: serverTimestamp(),
          reviewedAt: serverTimestamp(),
          reviewedBy: 'system',
          rejectionReason: null
        });

        // Update shop
        await updateDoc(doc(db, 'shops', shop.id), {
          subscriptionStatus: 'active',
          subscriptionPlan: "pro_monthly",
          subscriptionStartDate: now,
          subscriptionEndDate: nextMonth
        });

        setPromoCode('');
        setPromoApplied(false);
        setView('overview');
        await fetchData();
        return;
      } catch(err: any) {
         alert('Error applying promo: ' + err.message);
         setSubmitting(false);
         return;
      }
    }

    if (!utrNumber.trim()) {
      alert('UTR Number is required.');
      return;
    }
    if (!paymentDate) {
      alert('Payment Date is required.');
      return;
    }

    setSubmitting(true);
    try {
      let screenshotUrl = null;

      if (screenshot) {
        screenshotUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const max = 800;
              if (width > height) {
                if (width > max) { height = Math.round(height * (max / width)); width = max; }
              } else {
                if (height > max) { width = Math.round(width * (max / height)); height = max; }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
              } else {
                resolve(event.target.result);
              }
            };
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = event.target?.result as string;
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(screenshot);
        });
      }

      await addDoc(collection(db, 'paymentRequests'), {
        shopId: shop.id,
        ownerId: user?.uid,
        plan: "pro_monthly",
        amount: 299,
        currency: "INR",
        method: "upi",
        utrNumber: utrNumber.trim(),
        paymentDate,
        screenshotUrl,
        status: "pending",
        submittedAt: serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null
      });

      // Clear form and return to overview
      setUtrNumber('');
      setScreenshot(null);
      setView('overview');
      await fetchData(); // Refresh data

    } catch (err) {
      console.error('Error submitting payment:', err);
      alert('Failed to submit payment request: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading subscription data...</div>;
  if (!shop) return <div className="p-8">Shop not found. Please create one on the dashboard.</div>;

  const isActive = shop.subscriptionStatus === 'active';
  const isExpired = shop.subscriptionStatus === 'expired';

  if (view === 'payment_form') {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center space-x-4 mb-6">
          <button onClick={() => setView('overview')} className="text-gray-500 hover:text-gray-900">
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Activate DiscountKart Pro</h1>
        </div>

        {!upiSettings?.upiId ? (
          <div className="bg-yellow-50 text-yellow-800 p-6 rounded-xl border border-yellow-200">
            <AlertCircle className="w-8 h-8 mb-2" />
            <h3 className="font-bold">UPI Details Unavailable</h3>
            <p className="mt-1">UPI payment details are currently unavailable. Please contact support.</p>
          </div>
        ) : (
          <>
            {/* Step 1: Payment Instructions */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Step 1: Make Payment</h2>
                <p className="text-gray-600 text-sm">Please pay exactly <strong className="text-gray-900 text-base">₹299</strong> to the UPI ID below using any UPI app (GPay, PhonePe, Paytm).</p>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-center bg-gray-50 p-6 rounded-xl border border-gray-100">
                {upiSettings.qrImageUrl && (
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                    <img src={upiSettings.qrImageUrl} alt="UPI QR Code" className="w-40 h-40 object-contain" />
                  </div>
                )}
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">UPI Name</p>
                    <p className="font-bold text-gray-900">{upiSettings.upiName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">UPI ID</p>
                    <div className="flex items-center justify-center md:justify-start space-x-2">
                      <p className="font-bold text-gray-900 text-lg">{upiSettings.upiId}</p>
                      <button onClick={handleCopyUpi} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Payment Submission Form */}
            <form onSubmit={handleSubmitPayment} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Step 2: Submit Payment Details</h2>
                <p className="text-gray-600 text-sm">After completing the payment, enter the details below for verification.</p>
              </div>

              <div className="space-y-4">
                
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <label className="block text-sm font-medium text-blue-900 mb-1">Have a Promo Code?</label>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setPromoApplied(false);
                        setPromoError('');
                      }}
                      disabled={promoApplied}
                      className="flex-1 px-4 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent uppercase"
                      placeholder="e.g. FREEPRO"
                    />
                    <Button type="button" onClick={applyPromoCode} disabled={!promoCode || promoApplied} className="bg-blue-600 hover:bg-blue-700">
                      {promoApplied ? 'Applied!' : 'Apply'}
                    </Button>
                  </div>
                  {promoError && <p className="text-red-600 text-xs mt-2">{promoError}</p>}
                  {promoApplied && <p className="text-blue-700 text-xs mt-2 font-bold">100% off applied! Submit to activate.</p>}
                </div>

                {!promoApplied && (
                  <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input type="text" disabled value="₹299" className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UTR / Transaction ID *</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    placeholder="Enter 12-digit UTR number"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
                  <input 
                    type="date" 
                    required 
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Screenshot (Recommended)</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Upload a file</span>
                          <input type="file" className="sr-only" accept="image/*" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                      {screenshot && <p className="text-sm font-bold text-blue-600 mt-2">{screenshot.name}</p>}
                    </div>
                  </div>
                </div>
                                </>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                  {submitting ? 'Submitting...' : 'Submit for Verification'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Subscription & Billing</h1>

      {isActive && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
              <Check size={20} /> Active Subscription
            </h2>
            <p className="text-blue-700 mt-1">Your shop is currently visible to customers.</p>
            {shop.subscriptionEndDate && (
              <p className="text-blue-800 text-sm mt-2 font-medium">
                Valid until: {shop.subscriptionEndDate.toDate().toLocaleDateString()}
              </p>
            )}
          </div>
          <Button variant="outline" className="border-blue-600 text-blue-700 hover:bg-blue-100" onClick={handleStartPayment}>
            Renew Subscription
          </Button>
        </div>
      )}

      {isExpired && !pendingRequest && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-red-800">Subscription Expired</h2>
            <p className="text-red-700 mt-1">Your shop is no longer visible to customers.</p>
          </div>
          <Button className="bg-red-600 hover:bg-red-700" onClick={handleStartPayment}>
            Renew for ₹299/month
          </Button>
        </div>
      )}

      {pendingRequest && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-yellow-800">Payment Verification Pending</h2>
          <p className="text-yellow-700 mt-1 mb-4">We have received your payment details. Your subscription will be activated after the payment is verified by DiscountKart.</p>
          <div className="bg-white p-4 rounded-lg border border-yellow-100 flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm">
            <div>
              <p className="text-gray-500">Amount</p>
              <p className="font-bold text-gray-900">₹{pendingRequest.amount}</p>
            </div>
            <div>
              <p className="text-gray-500">UTR / Transaction ID</p>
              <p className="font-bold text-gray-900">{pendingRequest.utrNumber}</p>
            </div>
            <div>
              <p className="text-gray-500">Submitted On</p>
              <p className="font-bold text-gray-900">
                {pendingRequest.submittedAt?.toDate ? pendingRequest.submittedAt.toDate().toLocaleDateString() : 'Just now'}
              </p>
            </div>
          </div>
        </div>
      )}

      {rejectedRequest && !pendingRequest && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl">
          <h2 className="text-lg font-bold text-red-800">Payment Verification Rejected</h2>
          <p className="text-red-700 mt-1 mb-2">Your recent payment submission could not be verified.</p>
          <div className="bg-white p-3 rounded-lg border border-red-100 text-sm text-red-800 font-medium mb-4">
            Reason: {rejectedRequest.rejectionReason || 'No reason provided.'}
          </div>
          <Button onClick={handleStartPayment}>Submit Payment Again</Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-xl rounded-tr-3xl text-xs font-bold">
            RECOMMENDED
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">DiscountKart Pro</h3>
          <p className="text-gray-500 mb-6">Everything you need to grow your local customer base.</p>
          
          <div className="flex items-baseline mb-8">
            <span className="text-4xl font-extrabold text-gray-900">₹299</span>
            <span className="text-gray-500 ml-2">/ month</span>
          </div>

          <ul className="space-y-4 mb-8">
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

          {!isActive && !pendingRequest && (
            <Button 
              className="w-full h-12 text-lg" 
              onClick={handleStartPayment}
            >
              Activate Subscription
            </Button>
          )}
        </div>

        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Billing History</h3>
          
          {paymentHistory.length > 0 ? (
            <div className="space-y-4">
              {paymentHistory.map(payment => (
                <div key={payment.id} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">Pro Plan - Monthly</p>
                    <p className="text-xs text-gray-500">
                      Paid on {payment.paidAt?.toDate ? payment.paidAt.toDate().toLocaleDateString() : 'Recently'}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">UTR: {payment.utrNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900 block">₹{payment.amount}</span>
                    <span className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">Paid</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No payments yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
