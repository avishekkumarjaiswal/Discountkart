import React, { useEffect, useState } from 'react';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

import { Input } from '../../components/ui/Input';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';



const locations = [
  { id: '1', area: 'Connaught Place', city: 'Delhi' },
  { id: '2', area: 'Karol Bagh', city: 'Delhi' },
  { id: '3', area: 'Kamla Nagar', city: 'Delhi' },
  { id: '4', area: 'Koramangala', city: 'Bangalore' },
  { id: '5', area: 'Indiranagar', city: 'Bangalore' },
  { id: '6', area: 'Bandra', city: 'Mumbai' },
  { id: '7', area: 'Andheri', city: 'Mumbai' }
];

const compressImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function ShopProfile() {
  const { user } = useAuth();
  const { categories: CATEGORIES } = useCategories();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');

  useEffect(() => {
    if (!user) return;
    
    const fetchShop = async () => {
      try {
        const q = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const shopData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
          setShop(shopData);
          if (shopData.city) setSelectedCity(shopData.city);
          if (shopData.coverImageUrl) setCoverImageUrl(shopData.coverImageUrl);
        }
      } catch (err) {
        console.error('Error fetching shop:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!shop) return;

    setSaving(true);
    setMessage('');

    const formData = new FormData(e.currentTarget);
    const updates = {
      shopName: formData.get('shopName'),
      category: formData.get('category'),
      area: formData.get('area'),
      city: formData.get('city'),
      description: formData.get('description'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      address: formData.get('address'),
      openingTime: formData.get('openingTime') || '09:00',
      closingTime: formData.get('closingTime') || '21:00',
      coverImageUrl: coverImageUrl,
      googleMapsUrl: formData.get('googleMapsUrl'),
    };

    try {
      await updateDoc(doc(db, 'shops', shop.id), updates);
      setShop({ ...shop, ...updates });
      setMessage('Profile updated successfully!');
    } catch (err: any) {
      setMessage('Error updating profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shop) return;

    try {
      setUploadingImage(true);
      setMessage('');
      
      const compressedUrl = await compressImage(file);
      await updateDoc(doc(db, 'shops', shop.id), { coverImageUrl: compressedUrl });
      setCoverImageUrl(compressedUrl);
      setShop((prev: any) => ({ ...prev, coverImageUrl: compressedUrl }));
      setMessage('Cover image updated successfully!');
    } catch (err: any) {
      console.error(err);
      setMessage('Upload failed. Please try a different image file.');
    } finally {
      setUploadingImage(false);
    }
  };


  if (loading) {
    return (
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <Skeleton className="h-6 w-32 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (!shop) return <div className="p-8">Shop not found. Please create one on the dashboard.</div>;

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Shop Profile</h1>

      <div className="mb-8">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Account Status</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">Shop Status</p>
            {shop.status === 'approved' ? (
              <p className="font-bold text-blue-700 flex items-center">🟢 Approved</p>
            ) : shop.status === 'blocked' ? (
              <p className="font-bold text-red-700 flex items-center">🔴 Blocked</p>
            ) : (
              <div>
                <p className="font-bold text-orange-600 flex items-center">🟠 Pending Approval</p>
                <p className="text-xs text-gray-500 mt-1">Your shop is not visible to customers yet.</p>
              </div>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-500 mb-1">Subscription</p>
            {shop.subscriptionStatus === 'active' ? (
              <p className="font-bold text-blue-700 flex items-center">🟢 Active</p>
            ) : shop.subscriptionStatus === 'expired' ? (
              <p className="font-bold text-red-700 flex items-center">🔴 Expired</p>
            ) : (
              <p className="font-bold text-orange-600 flex items-center">🟠 Pending</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        {message && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${message.includes('Error') || message.includes('failed') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
            <Input name="shopName" defaultValue={shop.shopName} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select name="category" required defaultValue={shop.category || 'Others'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              {!CATEGORIES.includes(shop.category || 'Others') && (
                <option value={shop.category || 'Others'}>{shop.category || 'Others'}</option>
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <Input name="phone" type="tel" defaultValue={shop.phone || ''} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input name="email" type="email" defaultValue={shop.email || ''} required />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
          <Input name="address" defaultValue={shop.address || ''} required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Opening Time</label>
            <Input name="openingTime" type="time" defaultValue={shop.openingTime || '09:00'} required />
            <p className="text-[11px] text-gray-500 mt-1">Standard opening time (e.g. 09:00 AM)</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Closing Time</label>
            <Input name="closingTime" type="time" defaultValue={shop.closingTime || '21:00'} required />
            <p className="text-[11px] text-gray-500 mt-1">Standard closing time (e.g. 09:00 PM)</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <select 
              name="city" 
              required 
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <option value="">Select City</option>
              {Array.from(new Set(locations.map(l => l.city))).sort().map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area / Neighborhood</label>
            <select 
              name="area" 
              required 
              defaultValue={shop.area}
              disabled={!selectedCity}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
            >
              <option value="">Select Area</option>
              {locations.filter(l => l.city === selectedCity).sort((a,b) => a.area.localeCompare(b.area)).map(loc => (
                <option key={loc.id} value={loc.area}>{loc.area}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (About Shop)</label>
          <textarea 
            name="description" 
            defaultValue={shop.description || ''}
            rows={4}
            className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-transparent"
            placeholder="Tell customers what you offer..."
          />
        </div>

        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <label className="block text-sm font-medium text-gray-900 mb-2 font-bold">Cover Image</label>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {coverImageUrl && (
              <img src={coverImageUrl} alt="Cover Preview" className="w-24 h-24 object-cover rounded-lg shadow-sm border border-gray-200" />
            )}
            
            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                  {uploadingImage ? <Loader2 size={16} className="animate-spin mr-2" /> : <ImagePlus size={16} className="mr-2" />}
                  {uploadingImage ? 'Compressing & Uploading...' : 'Upload Image File'}
                  <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP (Auto-optimized & compressed)</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 uppercase font-bold">OR</span>
              </div>
              
              <div>
                <Input 
                  name="coverImageUrl" 
                  value={coverImageUrl} 
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="Paste Image Link (https://...)" 
                  className="text-sm" 
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps URL (Optional)</label>
          <Input name="googleMapsUrl" defaultValue={shop.googleMapsUrl || ''} placeholder="https://maps.google.com/..." />
        </div>

        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </form>
      </div>
    </div>
  );
}
