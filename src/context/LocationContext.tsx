import React, { createContext, useContext, useState, useEffect } from 'react';

interface LocationContextType {
  location: string | null;
  setLocation: (loc: string) => void;
}

const LocationContext = createContext<LocationContextType>({
  location: null,
  setLocation: () => {},
});

export const useLocation = () => useContext(LocationContext);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<string | null>(() => {
    return localStorage.getItem('userLocation') || null;
  });

  const setLocation = (loc: string) => {
    setLocationState(loc);
    localStorage.setItem('userLocation', loc);
  };

  return (
    <LocationContext.Provider value={{ location, setLocation }}>
      {children}
    </LocationContext.Provider>
  );
}
