import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Trash2, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface LocationItem {
  id: string;
  city: string;
  area: string;
}

export default function AdminLocations() {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCity, setNewCity] = useState('');
  const [newArea, setNewArea] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'locations'));
      const locs: LocationItem[] = [];
      snap.docs.forEach(doc => {
        locs.push({ id: doc.id, ...doc.data() } as LocationItem);
      });
      setLocations(locs.sort((a, b) => a.city.localeCompare(b.city) || a.area.localeCompare(b.area)));
    } catch (e: any) {
      console.error(e);
      alert('Error adding location: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAdd = async (e: any) => {
    e.preventDefault();
    if (!newCity.trim() || !newArea.trim()) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'locations'), {
        city: newCity.trim(),
        area: newArea.trim()
      });
      setNewCity('');
      setNewArea('');
      fetchLocations();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await deleteDoc(doc(db, 'locations', id));
      fetchLocations();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && locations.length === 0) return <div className="p-8 text-center">Loading locations...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manage Locations</h1>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-bold mb-4">Add New Location</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <Input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="e.g. Delhi" required />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
            <Input value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="e.g. Kamla Nagar" required />
          </div>
          <Button type="submit" disabled={isAdding}>
            <Plus size={20} className="mr-2" />
            Add Location
          </Button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-medium text-gray-600">City</th>
              <th className="p-4 font-medium text-gray-600">Area</th>
              <th className="p-4 font-medium text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {locations.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">No locations added yet.</td>
              </tr>
            ) : (
              locations.map(loc => (
                <tr key={loc.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">{loc.city}</td>
                  <td className="p-4">{loc.area}</td>
                  <td className="p-4 text-right">
                    <Button variant="outline" size="sm" onClick={() => handleDelete(loc.id)} className="text-red-600 hover:bg-red-50 hover:border-red-200">
                      <Trash2 size={16} />
                    </Button>
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
