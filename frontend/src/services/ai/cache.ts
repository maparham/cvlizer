/**
 * Cache Manager for AI Service
 *
 * Provides shared caching utilities for all AI service modules.
 * Uses in-memory cache with 5-minute TTL for performance optimization.
 *
 * Key responsibilities:
 * - Cache validation and TTL management
 * - Cache storage and retrieval
 * - CV-specific and global cache clearing
 */

/**
 * Cache manager for AI service modules
 */
export class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if cached data is still valid
   */
  isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Get cached data if valid
   */
  getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cached data
   */
  setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache for a specific CV
   */
  clearCacheForCV(cvId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter((key) =>
      key.includes(cvId),
    );
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
