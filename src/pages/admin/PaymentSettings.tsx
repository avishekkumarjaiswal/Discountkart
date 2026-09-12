import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../../lib/firebase';
import { Button } from '../../components/ui/Button';

export default function PaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [upiName, setUpiName] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'appSettings', 'payment');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setUpiId(data.upiId || '');
        setUpiName(data.upiName || '');
        setQrImageUrl(data.qrImageUrl || '');
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      let finalQrUrl = qrImageUrl;

      if (qrFile) {
        finalQrUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
          reader.readAsDataURL(qrFile);
        });
        setQrImageUrl(finalQrUrl);
      }

      await setDoc(doc(db, 'appSettings', 'payment'), {
        upiId,
        upiName,
        qrImageUrl: finalQrUrl,
        updatedAt: new Date()
      }, { merge: true });

      setMessage('Payment settings saved successfully.');
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
      setQrFile(null);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
      <p className="text-gray-500 text-sm">Configure UPI details for manual subscription payments.</p>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
        {message && (
          <div className={`p-4 rounded-lg text-sm ${message.includes('success') ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
          <input
            type="text"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="e.g., discountkart@bank"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">UPI Display Name</label>
          <input
            type="text"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            value={upiName}
            onChange={(e) => setUpiName(e.target.value)}
            placeholder="e.g., DiscountKart"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">UPI QR Code</label>
          <input
            type="file"
            accept="image/*"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            onChange={(e) => setQrFile(e.target.files?.[0] || null)}
          />
          {qrImageUrl && !qrFile && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Current QR Code:</p>
              <img src={qrImageUrl} alt="UPI QR" className="w-32 h-32 object-contain border rounded-lg p-2" />
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
