// Lightweight high-performance client-side SWR cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 3 * 60 * 1000; // 3 minutes TTL

export const shopCache = {
  location: null as string | null,
  shops: [] as any[],
  categories: {} as Record<string, any[]>
};

export const clearCache = () => {
  shopCache.location = null;
  shopCache.shops = [];
  shopCache.categories = {};
  memoryCache.clear();
};

export const getCachedData = <T>(key: string, maxAgeMs = DEFAULT_TTL): T | null => {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > maxAgeMs) return null;
  return entry.data;
};

export const setCachedData = <T>(key: string, data: T): void => {
  memoryCache.set(key, { data, timestamp: Date.now() });
};

/**
 * Executes a data fetcher with SWR semantics:
 * Returns cached data immediately if available, while refreshing asynchronously in background.
 */
export const fetchWithSWR = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  onUpdate?: (freshData: T) => void,
  ttlMs = DEFAULT_TTL
): Promise<T> => {
  const cached = getCachedData<T>(key, ttlMs);
  
  if (cached !== null) {
    // Background revalidation
    fetcher().then(freshData => {
      setCachedData(key, freshData);
      if (onUpdate) onUpdate(freshData);
    }).catch(err => console.warn('SWR revalidation failed silently:', err));
    
    return cached;
  }

  const fresh = await fetcher();
  setCachedData(key, fresh);
  return fresh;
};
