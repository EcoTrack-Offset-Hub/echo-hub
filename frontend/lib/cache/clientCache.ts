// In-memory client-side cache for instant route navigation and stale-while-revalidate data loading.
// Survives client-side route transitions without requiring external dependencies.

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

export const clientCache = {
  get<T>(key: string): T | undefined {
    const entry = memoryCache.get(key);
    if (!entry) return undefined;
    return entry.data as T;
  },

  set<T>(key: string, data: T): void {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  },

  delete(key: string): void {
    memoryCache.delete(key);
  },

  /**
   * Invalidate entries matching a prefix or pattern.
   * If no prefix is provided, all entries are cleared.
   */
  invalidate(prefix?: string): void {
    if (!prefix) {
      memoryCache.clear();
      return;
    }
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix) || key.includes(prefix)) {
        memoryCache.delete(key);
      }
    }
  },

  has(key: string): boolean {
    return memoryCache.has(key);
  },
};
