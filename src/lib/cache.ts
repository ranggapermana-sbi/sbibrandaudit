/**
 * In-Memory & Session-Aware Caching Layer for Swiss-Belhotel Brand Audit
 * Optimizes network performance by caching static/infrequently changing reference data:
 * - Master Hotels list
 * - Audit Categories
 * - Audit Departments
 * - Audit Items
 * - Audit Batches & Batch-Hotel junctions
 * - Audit Users / Profiles
 * - Audit Checklist Groups & Junctions
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

class ApiCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTtlMs = 5 * 60 * 1000; // 5 minutes default TTL

  constructor() {
    // Attempt to restore cache snapshot from sessionStorage if available
    try {
      const raw = sessionStorage.getItem('sbi_api_cache_snapshot');
      if (raw) {
        const parsed = JSON.parse(raw);
        const now = Date.now();
        Object.keys(parsed).forEach(key => {
          const entry = parsed[key];
          if (entry && now - entry.timestamp < entry.ttlMs) {
            this.cache.set(key, entry);
          }
        });
      }
    } catch {
      // Ignore sessionStorage restore failures
    }
  }

  private persistSnapshot() {
    try {
      const snapshot: Record<string, CacheEntry<any>> = {};
      this.cache.forEach((entry, key) => {
        snapshot[key] = entry;
      });
      sessionStorage.setItem('sbi_api_cache_snapshot', JSON.stringify(snapshot));
    } catch {
      // Storage quota or parsing ignore
    }
  }

  /**
   * Retrieves cached data if valid, or calls the fetcher to load fresh data and caches it.
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttlMs?: number; forceRefresh?: boolean }
  ): Promise<T> {
    const ttlMs = options?.ttlMs ?? this.defaultTtlMs;
    const force = options?.forceRefresh ?? false;
    const now = Date.now();

    if (!force && this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      if (now - entry.timestamp < entry.ttlMs) {
        console.log(`[Cache HIT] ${key}`);
        return entry.data as T;
      }
    }

    console.log(`[Cache MISS/FETCH] ${key}`);
    const data = await fetcher();
    
    // Only cache valid data
    if (data !== undefined && data !== null) {
      this.cache.set(key, { data, timestamp: now, ttlMs });
      this.persistSnapshot();
    }

    return data;
  }

  /**
   * Gets synchronously from cache if present and unexpired.
   */
  getSync<T>(key: string): T | null {
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      if (Date.now() - entry.timestamp < entry.ttlMs) {
        return entry.data as T;
      }
    }
    return null;
  }

  /**
   * Manually sets or updates cache entry
   */
  set<T>(key: string, data: T, ttlMs?: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs: ttlMs ?? this.defaultTtlMs,
    });
    this.persistSnapshot();
  }

  /**
   * Invalidates specific cache key or matching pattern (e.g. 'hotels', 'categories')
   */
  invalidate(keyOrPattern?: string | RegExp) {
    if (!keyOrPattern) {
      this.cache.clear();
      sessionStorage.removeItem('sbi_api_cache_snapshot');
      console.log('[Cache CLEAR] Cleared all cache entries');
      return;
    }

    if (typeof keyOrPattern === 'string') {
      let count = 0;
      Array.from(this.cache.keys()).forEach(k => {
        if (k.includes(keyOrPattern)) {
          this.cache.delete(k);
          count++;
        }
      });
      this.persistSnapshot();
      console.log(`[Cache INVALIDATE] Removed ${count} entries matching "${keyOrPattern}"`);
    } else if (keyOrPattern instanceof RegExp) {
      let count = 0;
      Array.from(this.cache.keys()).forEach(k => {
        if (keyOrPattern.test(k)) {
          this.cache.delete(k);
          count++;
        }
      });
      this.persistSnapshot();
      console.log(`[Cache INVALIDATE] Removed ${count} entries matching regex ${keyOrPattern}`);
    }
  }
}

export const apiCache = new ApiCacheService();
