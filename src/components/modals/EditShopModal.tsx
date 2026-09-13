import React, { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../ui/Button';
import { useCategories } from '../../hooks/useCategories';
import { Input } from '../ui/Input';
import { X, ImagePlus, Loader2 } from 'lucide-react';

interface EditShopModalProps {
  shop: any;
  onClose: () => void;
  onSave: () => void;
}

export function EditShopModal({ shop, onClose, onSave }: EditShopModalProps) {
  const { categories } = useCategories();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(shop.coverImageUrl || '');
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert('Image size should be less than 800KB');
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setCurrentImageUrl(base64String);
      setUploadingImage(false);
    };
    reader.onerror = () => {
      console.error('Error reading file');
      alert('Failed to read image file');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const updates: any = {
        shopName: formData.get('shopName'),
        category: formData.get('category'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        address: formData.get('address'),
        city: formData.get('city'),
        area: formData.get('area'),
        description: formData.get('description'),
        openingTime: formData.get('openingTime') || '09:00',
        closingTime: formData.get('closingTime') || '21:00',
        status: formData.get('status'),
        subscriptionStatus: formData.get('subscriptionStatus'),
        coverImageUrl: currentImageUrl || formData.get('coverImageUrl'),
        googleMapsUrl: formData.get('googleMapsUrl'),
      };

      if (formData.get('status') === 'approved' && shop.status !== 'approved') {
        const now = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(now.getDate() + 30);
        updates.subscriptionPlan = 'pro';
        updates.subscriptionStatus = 'trial';
        updates.trialStartDate = now;
        updates.trialEndDate = trialEnd;
      }
      
      await updateDoc(doc(db, 'shops', shop.id), updates);
      onSave();
    } catch (error) {
      console.error('Error updating shop:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col border border-gray-100 my-auto overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Edit Shop Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200/60 rounded-full transition-colors text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <form id="edit-shop-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Shop Name <span className="text-red-500">*</span></label>
                <Input name="shopName" defaultValue={shop.shopName} required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                <select name="category" required defaultValue={shop.category || 'Others'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {!categories.includes(shop.category || 'Others') && (
                    <option value={shop.category || 'Others'}>{shop.category || 'Others'}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Approval Status</label>
                <select name="status" defaultValue={shop.status || 'pending'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option value="approved">Approved</option>
                  <option value="pending">Pending Review</option>
                  <option value="rejected">Rejected / Blocked</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Subscription Status</label>
                <select name="subscriptionStatus" defaultValue={shop.subscriptionStatus || 'free'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option value="trial">Pro Trial</option>
                  <option value="active">Pro Active</option>
                  <option value="free">Free Plan</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                <Input name="phone" type="tel" defaultValue={shop.phone || ''} required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                <Input name="email" type="email" defaultValue={shop.email || ''} />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Address <span className="text-red-500">*</span></label>
                <Input name="address" defaultValue={shop.address || ''} required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                <Input name="city" defaultValue={shop.city || ''} required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Area / Locality <span className="text-red-500">*</span></label>
                <Input name="area" defaultValue={shop.area || ''} required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Opening Time</label>
                <Input name="openingTime" type="time" defaultValue={shop.openingTime || '09:00'} required />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Closing Time</label>
                <Input name="closingTime" type="time" defaultValue={shop.closingTime || '21:00'} required />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Description (About Shop)</label>
                <textarea 
                  name="description" 
                  defaultValue={shop.description || ''} 
                  rows={3}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="md:col-span-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-700 mb-2">Cover Image</label>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {currentImageUrl && (
                    <img src={currentImageUrl} alt="Cover" className="w-20 h-20 object-cover rounded-lg shadow-sm border border-gray-200" />
                  )}
                  <div className="flex-1 space-y-2 w-full">
                    <div>
                      <label className="flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-gray-300 shadow-sm text-xs font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                        {uploadingImage ? <Loader2 size={15} className="animate-spin mr-2" /> : <ImagePlus size={15} className="mr-2" />}
                        {uploadingImage ? 'Uploading...' : 'Upload Image File'}
                        <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} disabled={uploadingImage} />
                      </label>
                    </div>
                    <div>
                      <Input name="coverImageUrl" defaultValue={currentImageUrl} placeholder="Paste Image Link (https://...)" className="text-xs" onChange={(e) => setCurrentImageUrl(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Google Maps URL (Optional)</label>
                <Input name="googleMapsUrl" defaultValue={shop.googleMapsUrl || ''} placeholder="https://maps.google.com/..." />
              </div>
            </div>
          </form>
        </div>
        
        <div className="p-4 sm:p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-shop-form" disabled={loading} className="bg-blue-600 hover:bg-blue-700 font-bold text-white">
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
