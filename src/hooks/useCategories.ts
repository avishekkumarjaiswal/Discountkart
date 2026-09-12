import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useCategories() {
  const [categories, setCategories] = useState<string[]>([
    'Fashion', 'Footwear', 'Food & Beverages', 'Electronics', 'Beauty', 
    'Books', 'Accessories', 'Home & Lifestyle', 'Services', 'Sports', 'Toys & Kids', 'Others'
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'categories'), (snap) => {
      const cats: string[] = [];
      snap.docs.forEach(doc => {
        if (doc.data().isActive !== false) {
           cats.push(doc.data().name);
        }
      });
      
      if (cats.length > 0) {
        cats.sort((a, b) => a.localeCompare(b));
        setCategories(cats);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching categories:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { categories, loading };
}
