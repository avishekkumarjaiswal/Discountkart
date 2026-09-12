import React from 'react';
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Trash2, Plus, Edit2, X, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface CategoryItem {
  id: string;
  name: string;
  isActive: boolean;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'categories'));
      const cats: CategoryItem[] = [];
      snap.docs.forEach(doc => {
        cats.push({ id: doc.id, ...doc.data() } as CategoryItem);
      });
      setCategories(cats.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsAdding(true);
    try {
      await addDoc(collection(db, 'categories'), {
        name: newName.trim(),
        isActive: true,
      });
      setNewName('');
      fetchCategories();
    } catch (e) {
      console.error('Error adding category:', e);
      alert('Failed to add category');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      setCategories(categories.filter(c => c.id !== id));
    } catch (e) {
      console.error('Error deleting category:', e);
      alert('Failed to delete category');
    }
  };

  const handleEditInit = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleEditSave = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateDoc(doc(db, 'categories', id), {
        name: editName.trim()
      });
      setCategories(categories.map(c => c.id === id ? { ...c, name: editName.trim() } : c));
      setEditingId(null);
    } catch (e) {
      console.error('Error updating category:', e);
      alert('Failed to update category');
    }
  };

  const handleSeed = async () => {
    const defaults = [
      'Fashion', 'Footwear', 'Food & Beverages', 'Electronics', 'Beauty', 
      'Books', 'Accessories', 'Home & Lifestyle', 'Services', 'Sports', 'Toys & Kids', 'Others'
    ];
    setLoading(true);
    for (const name of defaults) {
      await addDoc(collection(db, 'categories'), { name, isActive: true });
    }
    fetchCategories();
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading categories...</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Categories</h1>
          <p className="text-gray-500 mt-1">Add, edit, or remove shop categories</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Add New Category</h2>
        <form onSubmit={handleAddCategory} className="flex gap-4 items-end max-w-lg">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <Input 
              placeholder="e.g. Fashion, Electronics" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              required
            />
          </div>
          <Button type="submit" disabled={isAdding || !newName.trim()}>
            {isAdding ? 'Adding...' : <><Plus size={16} className="mr-1" /> Add</>}
          </Button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category Name</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                  <p className="mb-4">No categories found. Add some above, or seed defaults.</p>
                  <Button onClick={handleSeed} variant="outline">Seed Default Categories</Button>
                  </div>
                </td>
              </tr>
            ) : (
              categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === cat.id ? (
                      <Input 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <div className="font-medium text-gray-900">{cat.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingId === cat.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditSave(cat.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                          <Check size={18} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEditInit(cat)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(cat.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
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
