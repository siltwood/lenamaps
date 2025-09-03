// Cache for Google Directions API results to reduce API calls
class DirectionsCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100; // Maximum number of cached routes
    this.ttl = 24 * 60 * 60 * 1000; // 24 hour TTL
    this.stats = {
      hits: 0,
      misses: 0,
      apiCallsSaved: 0
    };
  }

  // Generate a unique key for a route request
  generateKey(origin, destination, mode) {
    // Create a stable key based on coordinates and travel mode
    const originKey = `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}`;
    const destKey = `${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`;
    return `${originKey}_${destKey}_${mode}`;
  }

  // Get cached result if available and not expired
  get(origin, destination, mode) {
    const key = this.generateKey(origin, destination, mode);
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update access time for LRU
    cached.lastAccessed = Date.now();
    this.stats.hits++;
    this.stats.apiCallsSaved++;
    
    // Log cache efficiency every 10 operations
    if ((this.stats.hits + this.stats.misses) % 10 === 0) {
      const hitRate = ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1);
      console.log(`📊 Cache Stats: ${hitRate}% hit rate | ${this.stats.apiCallsSaved} API calls saved`);
    }
    
    return cached.result;
  }

  // Store a result in cache
  set(origin, destination, mode, result) {
    const key = this.generateKey(origin, destination, mode);
    
    // Enforce max size with LRU eviction
    if (this.cache.size >= this.maxSize) {
      // Find and remove least recently used
      let lruKey = null;
      let lruTime = Date.now();
      
      for (const [k, v] of this.cache) {
        if (v.lastAccessed < lruTime) {
          lruTime = v.lastAccessed;
          lruKey = k;
        }
      }
      
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }
    
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      lastAccessed: Date.now()
    });
  }

  // Clear all cached routes
  clear() {
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1) + '%'
        : '0%',
      apiCallsSaved: this.stats.apiCallsSaved
    };
  }
}

// Create singleton instance
const directionsCache = new DirectionsCache();

export default directionsCache;