const fs = require('fs');
let file = 'src/components/modals/EditShopModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update imports
content = content.replace(
  /import \{ X \} from 'lucide-react';/,
  "import { X, ImagePlus, Loader2 } from 'lucide-react';"
);

// Add state for uploading
content = content.replace(
  /const \[loading, setLoading\] = useState\(false\);/,
  "const [loading, setLoading] = useState(false);\n  const [uploadingImage, setUploadingImage] = useState(false);\n  const [currentImageUrl, setCurrentImageUrl] = useState(shop.coverImageUrl || '');"
);

// Add handleImageUpload
content = content.replace(
  /const handleSubmit = async/,
  `const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = async`
);

// Add coverImageUrl and googleMapsUrl to updates
content = content.replace(
  /description: formData.get\('description'\),/,
  "description: formData.get('description'),\n        coverImageUrl: currentImageUrl || formData.get('coverImageUrl'),\n        googleMapsUrl: formData.get('googleMapsUrl'),"
);

// Add new fields to the form
content = content.replace(
  /<\/form>/,
  `
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
          </form>`
);

fs.writeFileSync(file, content);
