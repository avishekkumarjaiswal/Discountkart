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
      const updates = {
        shopName: formData.get('shopName'),
        category: formData.get('category'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        address: formData.get('address'),
        city: formData.get('city'),
        area: formData.get('area'),
        description: formData.get('description'),
        coverImageUrl: currentImageUrl || formData.get('coverImageUrl'),
        googleMapsUrl: formData.get('googleMapsUrl'),
      };
      
      await updateDoc(doc(db, 'shops', shop.id), updates);
      onSave();
    } catch (error) {
      console.error('Error updating shop:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-xl font-bold text-gray-900">Edit Shop Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <form id="edit-shop-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                <Input name="shopName" defaultValue={shop.shopName} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select name="category" required defaultValue={shop.category || 'Others'} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {!categories.includes(shop.category || 'Others') && (
                    <option value={shop.category || 'Others'}>{shop.category || 'Others'}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <Input name="phone" type="tel" defaultValue={shop.phone || ''} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input name="email" type="email" defaultValue={shop.email || ''} required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                <Input name="address" defaultValue={shop.address || ''} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <Input name="city" defaultValue={shop.city || ''} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area/Locality</label>
                <Input name="area" defaultValue={shop.area || ''} required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  name="description" 
                  defaultValue={shop.description || ''} 
                  required 
                  rows={3}
                  className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                />
              </div>

              <div className="md:col-span-2 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3">Cover Image</label>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {currentImageUrl && (
                    <img src={currentImageUrl} alt="Cover" className="w-24 h-24 object-cover rounded-lg shadow-sm border border-gray-200" />
                  )}
                  <div className="flex-1 space-y-3 w-full">
                    <div>
                      <label className="flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                        {uploadingImage ? <Loader2 size={16} className="animate-spin mr-2" /> : <ImagePlus size={16} className="mr-2" />}
                        {uploadingImage ? 'Uploading...' : 'Upload Image File'}
                        <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} disabled={uploadingImage} />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 800KB</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 uppercase font-bold">OR</span>
                    </div>
                    <div>
                      <Input name="coverImageUrl" defaultValue={currentImageUrl} placeholder="Paste Image Link (https://...)" className="text-sm" onChange={(e) => setCurrentImageUrl(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps URL (Optional)</label>
                <Input name="googleMapsUrl" defaultValue={shop.googleMapsUrl || ''} placeholder="https://maps.google.com/..." />
              </div>

            </div>
          </form>
        </div>
        
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-xl z-10">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-shop-form" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
