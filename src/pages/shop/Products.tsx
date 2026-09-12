import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

import { Input } from '../../components/ui/Input';
import { getShopPlanStatus } from '../../lib/subscription';
import { Crown, Upload, Download, FileText, Sparkles, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';

const getRowValue = (row: Record<string, any>, possibleKeys: string[]) => {
  const keys = Object.keys(row);
  for (const pKey of possibleKeys) {
    const foundKey = keys.find(k => k.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === pKey.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
      return String(row[foundKey]).trim();
    }
  }
  return '';
};

export default function Products() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchShopAndProducts = async () => {
      try {
        const q = query(collection(db, 'shops'), where('ownerId', '==', user.uid));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const shopData: any = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
          setShop(shopData);
          if (shopData.category) {
            setCategory(shopData.category);
          }
          
          const prodQ = query(collection(db, 'products'), where('shopId', '==', shopData.id));
          const prodSnap = await getDocs(prodQ);
          setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchShopAndProducts();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!shop) return;
    
    const planStatus = getShopPlanStatus(shop);
    const isPro = planStatus === 'active';
    if (!isPro && products.length >= 5 && !editingId) {
      alert('You have reached the 5-item limit for the Basic plan.');
      return;
    }

    setAdding(true);

    const productData = {
      shopId: shop.id,
      name,
      category: category || '',
      price: Number(price),
      description,
      quantity: quantity ? Number(quantity) : null,
      unit: unit || null
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), {
          ...productData,
          updatedAt: serverTimestamp()
        });
        setProducts(products.map(p => p.id === editingId ? { ...p, ...productData } : p));
        setEditingId(null);
      } else {
        const newProduct = {
          ...productData,
          createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'products'), newProduct);
        setProducts([...products, { id: docRef.id, ...newProduct }]);
      }
      
      setName('');
      setCategory('');
      setPrice('');
      setDescription('');
      setQuantity('');
      setUnit('');
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Failed to save product.');
    } finally {
      setAdding(false);
    }
  };

  const handleEditClick = (product: any) => {
    setEditingId(product.id);
    setName(product.name);
    setCategory(product.category || '');
    setPrice(product.price.toString());
    setDescription(product.description || '');
    setQuantity(product.quantity?.toString() || '');
    setUnit(product.unit || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(prev => prev.filter(p => p.id !== id));
      setConfirmDeleteId(null);
      if (editingId === id) {
        setEditingId(null);
        setName('');
        setCategory('');
        setPrice('');
        setDescription('');
        setQuantity('');
        setUnit('');
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Failed to delete product.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shop) return;

    const planStatus = getShopPlanStatus(shop);
    const isPro = planStatus === 'active';

    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          let updatedCount = 0;
          let addedCount = 0;
          let currentProductsList = [...products];

          for (const row of data) {
            const nameVal = getRowValue(row, ['name', 'item', 'itemname', 'product', 'productname', 'title', 'dish']);
            let priceStr = getRowValue(row, ['price', 'rate', 'mrp', 'amount', 'cost', 'unitprice']);
            const categoryVal = getRowValue(row, ['category', 'cat', 'type', 'group']);
            const descriptionVal = getRowValue(row, ['description', 'desc', 'details', 'info']);
            const quantityVal = getRowValue(row, ['quantity', 'qty', 'stock']);
            const unitVal = getRowValue(row, ['unit', 'uom', 'pack']);

            // Clean price string
            priceStr = priceStr.replace(/[^0-9.]/g, '');
            const parsedPrice = Number(priceStr);

            if (!nameVal || isNaN(parsedPrice) || parsedPrice < 0) continue; // Skip invalid rows

            const existingIndex = currentProductsList.findIndex(
              p => p.name.trim().toLowerCase() === nameVal.trim().toLowerCase()
            );

            if (existingIndex !== -1) {
              // Update existing product in Firestore & local list
              const existingItem = currentProductsList[existingIndex];
              const updateData: any = {
                name: nameVal,
                price: parsedPrice,
                category: categoryVal || existingItem.category || shop.category || 'General',
                description: descriptionVal || existingItem.description || '',
                quantity: quantityVal !== '' && quantityVal !== null && quantityVal !== undefined ? Number(quantityVal) : (existingItem.quantity ?? null),
                unit: unitVal || existingItem.unit || null,
                updatedAt: serverTimestamp()
              };
              await updateDoc(doc(db, 'products', existingItem.id), updateData);
              currentProductsList[existingIndex] = { ...existingItem, ...updateData };
              updatedCount++;
            } else {
              // Check basic plan limit before adding brand new items
              if (!isPro && currentProductsList.length >= 5) {
                alert(`Basic plan limit of 5 items reached. Updated ${updatedCount} existing items, but could not add new item "${nameVal}". Upgrade to Pro for unlimited items.`);
                break;
              }

              const newProductData = {
                shopId: shop.id,
                name: nameVal,
                category: categoryVal || shop.category || 'General',
                price: parsedPrice,
                description: descriptionVal || '',
                quantity: quantityVal ? Number(quantityVal) : null,
                unit: unitVal || null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              };

              const docRef = await addDoc(collection(db, 'products'), newProductData);
              const createdItem = { id: docRef.id, ...newProductData };
              currentProductsList.push(createdItem);
              addedCount++;
            }
          }

          setProducts(currentProductsList);

          if (updatedCount === 0 && addedCount === 0) {
            alert('No valid items found in CSV. Ensure CSV has column headers for Item Name and Price.');
          } else {
            const summaryParts = [];
            if (updatedCount > 0) summaryParts.push(`Updated ${updatedCount} existing item${updatedCount > 1 ? 's' : ''}`);
            if (addedCount > 0) summaryParts.push(`Added ${addedCount} new item${addedCount > 1 ? 's' : ''}`);
            alert(`CSV Import Complete! ${summaryParts.join(' and ')}.`);
          }
        } catch (err) {
          console.error('Error importing CSV:', err);
          alert('Failed to import CSV.');
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file.');
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  const handleParseTextMenu = async () => {
    if (!pastedText.trim() || !shop) return;
    const lines = pastedText.split('\n');
    const planStatus = getShopPlanStatus(shop);
    const isPro = planStatus === 'active';
    
    let currentCategory = '';
    const parsedItems: any[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (!trimmed.match(/\d/) && (trimmed.endsWith(':') || trimmed.startsWith('[') || trimmed.length < 25)) {
        currentCategory = trimmed.replace(/[:\[\]]/g, '').trim();
        continue;
      }

      const priceMatch = trimmed.match(/(.*?)(?:[-:\s@₹Rs\.]+)??(\d+(?:\.\d+)?)\s*$/i);
      if (priceMatch) {
        const itemName = priceMatch[1].replace(/[-:\s@₹Rs\.]+$|^[-:\s@₹Rs\.]+/g, '').trim();
        const itemPrice = Number(priceMatch[2]);

        if (itemName && !isNaN(itemPrice) && itemPrice > 0) {
          parsedItems.push({
            name: itemName,
            category: currentCategory || shop.category || 'General',
            price: itemPrice,
          });
        }
      }
    }

    if (parsedItems.length === 0) {
      alert('No valid items recognized. Format example:\nPaneer Butter Masala - 240\nCold Coffee 120');
      return;
    }

    setImporting(true);
    try {
      let updatedCount = 0;
      let addedCount = 0;
      let currentProductsList = [...products];

      for (const item of parsedItems) {
        const existingIndex = currentProductsList.findIndex(
          p => p.name.trim().toLowerCase() === item.name.trim().toLowerCase()
        );

        if (existingIndex !== -1) {
          // Update existing item
          const existingItem = currentProductsList[existingIndex];
          const updateData: any = {
            name: item.name,
            price: item.price,
            category: item.category || existingItem.category || shop.category || 'General',
            updatedAt: serverTimestamp()
          };
          await updateDoc(doc(db, 'products', existingItem.id), updateData);
          currentProductsList[existingIndex] = { ...existingItem, ...updateData };
          updatedCount++;
        } else {
          // Check plan limit before adding new item
          if (!isPro && currentProductsList.length >= 5) {
            alert(`Basic plan limit of 5 items reached. Updated ${updatedCount} existing items, but could not add new item "${item.name}". Upgrade to Pro for unlimited items.`);
            break;
          }

          const newItemData = {
            shopId: shop.id,
            name: item.name,
            category: item.category || shop.category || 'General',
            price: item.price,
            description: '',
            quantity: null,
            unit: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          const docRef = await addDoc(collection(db, 'products'), newItemData);
          currentProductsList.push({ id: docRef.id, ...newItemData });
          addedCount++;
        }
      }

      setProducts(currentProductsList);
      const summaryParts = [];
      if (updatedCount > 0) summaryParts.push(`Updated ${updatedCount} existing item${updatedCount > 1 ? 's' : ''}`);
      if (addedCount > 0) summaryParts.push(`Added ${addedCount} new item${addedCount > 1 ? 's' : ''}`);
      alert(`Text Menu Import Complete! ${summaryParts.join(' and ')}.`);
      setShowTextModal(false);
      setPastedText('');
    } catch (err) {
      console.error('Error parsing text menu:', err);
      alert('Failed to save menu items.');
    } finally {
      setImporting(false);
    }
  };

  const downloadCSVTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,category,name,price,description,quantity,unit\nStarters,Paneer Tikka,240,Delicious spiced grilled paneer,10,plate\nMains,Butter Chicken,320,Rich creamy tomato gravy,15,bowl";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "menu_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  if (loading) {
    return (
      <div className="max-w-5xl mx-auto w-full space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Skeleton className="h-6 w-32" />
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-5 w-24 mb-1" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
                <Skeleton className="h-10 w-full mt-6" />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-6 w-32" />
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!shop) return <div className="p-8">Shop not found. Please create one on the dashboard.</div>;

  const planStatus = getShopPlanStatus(shop);
  const isPro = planStatus === 'active';
  const canAddMore = isPro || products.length < 5;
  const canManageProducts = true;

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Manage Products</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTextModal(true)} className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
            <FileText size={16} />
            Paste Text Menu
          </Button>

          <Button variant="outline" size="sm" onClick={downloadCSVTemplate} className="flex items-center gap-2">
            <Download size={16} />
            CSV Template
          </Button>
          
          <input 
            type="file" 
            accept=".csv,text/csv" 
            className="hidden"
            onChange={handleImportCSV}
            disabled={importing}
            ref={fileInputRef}
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2" 
            disabled={importing}
          >
            <Upload size={16} />
            {importing ? 'Importing...' : 'Import CSV'}
          </Button>
        </div>
      </div>

      {!canAddMore && !editingId && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Crown className="text-blue-600 flex-shrink-0" size={32} />
            <div className="text-left">
              <h2 className="text-lg font-bold mb-1">5-Item Limit Reached</h2>
              <p className="text-sm">Upgrade to DiscountKart Pro for unlimited products & services.</p>
            </div>
          </div>
          <Button onClick={() => navigate('/shop/subscription')} className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap">
            Upgrade to Pro
          </Button>
        </div>
      )}

      {(canAddMore || editingId) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {editingId ? 'Edit Product / Service' : 'Add New Product / Service'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-end">
            <div className="xl:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category (Optional)</label>
              <Input name="category" placeholder="e.g. Starters" value={category} onChange={e => setCategory(e.target.value)} />
            </div>
            <div className="xl:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <Input name="name" required placeholder="e.g. Haircut" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="xl:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <Input name="price" type="number" required placeholder="500" min="0" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div className="xl:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
              <Input name="quantity" type="number" placeholder="10" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="xl:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <Input name="unit" placeholder="pcs, kg" value={unit} onChange={e => setUnit(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Input name="description" placeholder="Brief details" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="flex gap-2 w-full lg:col-span-1">
              {editingId && (
                <Button type="button" variant="outline" className="flex-1" onClick={() => {
                  setEditingId(null);
                  setName('');
                  setCategory('');
                  setPrice('');
                  setDescription('');
                  setQuantity('');
                  setUnit('');
                }}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={adding} className="flex-1">
                {adding ? 'Saving...' : editingId ? 'Update' : 'Add Product'}
              </Button>
            </div>
          </div>
        </form>
      </div>

            )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left text-sm text-gray-500 min-w-[700px]">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4">Qty / Unit</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No products added yet.</td>
              </tr>
            ) : (
              products.map(product => (
                <tr key={product.id} className={`border-b border-gray-100 hover:bg-gray-50 ${editingId === product.id ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4">{product.category || '-'}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{product.name}</td>
                  <td className="px-6 py-4">{product.description || '-'}</td>
                  <td className="px-6 py-4">
                    {product.quantity !== null && product.quantity !== undefined 
                      ? `${product.quantity} ${product.unit || ''}`.trim() 
                      : '-'}
                  </td>
                  <td className="px-6 py-4">₹{product.price}</td>
                  <td className="px-6 py-4 text-right">
                    {canManageProducts && (
                      confirmDeleteId === product.id ? (
                        <div className="inline-flex items-center justify-end gap-2">
                          <span className="text-xs font-semibold text-red-600">Delete item?</span>
                          <button
                            type="button"
                            disabled={deletingId === product.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(product.id);
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-md transition-colors shadow-sm"
                          >
                            {deletingId === product.id ? 'Deleting...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === product.id}
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
                        <div className="space-x-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(product);
                            }}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(product.id);
                            }}
                            className="text-red-600 hover:underline font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      )
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showTextModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                <h3 className="font-bold text-gray-900">Paste & Import Menu Text</h3>
              </div>
              <button onClick={() => setShowTextModal(false)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200/50">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 leading-relaxed flex items-start gap-2">
                <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">How it works:</p>
                  <p>Paste menu text from WhatsApp, Word, or PDF. Format each item on a new line with item name and price, e.g.:</p>
                  <pre className="bg-white/80 p-2 rounded mt-1 font-mono text-[11px] text-blue-950">
                    Starters{"\n"}
                    Paneer Butter Masala - 240{"\n"}
                    Cold Coffee - 120
                  </pre>
                </div>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={8}
                placeholder="Paste your menu items here..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-mono"
              />
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTextModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleParseTextMenu} disabled={importing || !pastedText.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {importing ? 'Importing...' : 'Parse & Import Menu'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
