import { useNavigate } from 'react-router-dom';
import { useLocation } from '../../context/LocationContext';
import { MapPin, Search, Check } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';

export default function LocationSelect() {
  const { setLocation, location: currentLocation } = useLocation();
  const navigate = useNavigate();
  const [locations, setLocations] = useState<{city: string, area: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocs = async () => {
      try {
        const snap = await getDocs(collection(db, 'locations'));
        const locs: {city: string, area: string}[] = [];
        snap.docs.forEach(doc => {
          locs.push(doc.data() as {city: string, area: string});
        });
        setLocations(locs.sort((a,b) => a.area.localeCompare(b.area)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLocs();
  }, []);

  const handleSelect = (loc: string) => {
    setLocation(loc);
    navigate('/');
  };

  const filteredLocations = locations.filter(loc => 
    loc.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const popularAreas = ['Kamla Nagar', 'Connaught Place', 'Lajpat Nagar', 'Karol Bagh'];

  return (
    <div className="max-w-md mx-auto p-4 py-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2 text-center tracking-tight">Select Your Area</h1>
      <p className="text-sm text-gray-500 text-center mb-6">Choose an area to see exclusive local shop discounts</p>

      {/* Mobile Search Filter */}
      <div className="relative mb-5">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          type="text"
          placeholder="Search area or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
        />
      </div>

      {/* Popular Quick Chips */}
      {!searchQuery && (
        <div className="mb-6">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Popular Areas</span>
          <div className="flex flex-wrap gap-2">
            {popularAreas.map((area) => (
              <button
                key={area}
                onClick={() => handleSelect(area)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all min-h-[38px] active:scale-95 ${
                  currentLocation === area
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Locations List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="text-center p-8 text-sm text-gray-500">Loading locations...</div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center p-8 text-sm text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
            No areas matching "{searchQuery}"
          </div>
        ) : (
          filteredLocations.map((loc) => {
            const isSelected = currentLocation === loc.area;
            return (
              <button
                key={loc.area + loc.city}
                onClick={() => handleSelect(loc.area)}
                className={`w-full flex items-center justify-between p-3.5 min-h-[52px] rounded-xl border transition-all active:scale-[0.99] ${
                  isSelected 
                    ? 'border-blue-600 bg-blue-50/80 text-blue-700 font-semibold shadow-xs' 
                    : 'border-gray-200/80 bg-white hover:border-blue-300 hover:bg-gray-50 text-gray-800'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <MapPin size={18} className={isSelected ? 'text-blue-600 shrink-0' : 'text-gray-400 shrink-0'} />
                  <span className="text-sm truncate">
                    {loc.area} <span className="text-xs text-gray-500 font-normal">({loc.city})</span>
                  </span>
                </div>
                {isSelected && (
                  <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                    <Check size={12} />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {currentLocation && (
        <div className="mt-8">
          <Button className="w-full h-12 text-base rounded-xl" onClick={() => navigate('/')}>Continue</Button>
        </div>
      )}
    </div>
  );
}

