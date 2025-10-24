/**
 * Cache Service
 * Handles caching strategies for improved performance
 */
export class CacheService {
  constructor() {
    this.memoryCache = new Map()
    this.maxMemorySize = 100 // Maximum number of items in memory cache
    this.cachePrefix = 'photo_album_'
    this.defaultTTL = 5 * 60 * 1000 // 5 minutes in milliseconds
  }

  /**
   * Set cache item
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    const cacheKey = this.cachePrefix + key
    const expiry = Date.now() + ttl
    
    const cacheItem = {
      value,
      expiry,
      created: Date.now()
    }

    // Store in memory cache
    this.memoryCache.set(cacheKey, cacheItem)
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cacheItem))
    } catch (error) {
      console.warn('Failed to store in localStorage:', error)
    }

    // Clean up if cache is too large
    this.cleanupMemoryCache()
  }

  /**
   * Get cache item
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found/expired
   */
  get(key) {
    const cacheKey = this.cachePrefix + key
    
    // Try memory cache first
    let cacheItem = this.memoryCache.get(cacheKey)
    
    if (!cacheItem) {
      // Try localStorage
      try {
        const stored = localStorage.getItem(cacheKey)
        if (stored) {
          cacheItem = JSON.parse(stored)
          // Restore to memory cache
          this.memoryCache.set(cacheKey, cacheItem)
        }
      } catch (error) {
        console.warn('Failed to read from localStorage:', error)
      }
    }

    if (!cacheItem) {
      return null
    }

    // Check if expired
    if (Date.now() > cacheItem.expiry) {
      this.delete(key)
      return null
    }

    return cacheItem.value
  }

  /**
   * Delete cache item
   * @param {string} key - Cache key
   */
  delete(key) {
    const cacheKey = this.cachePrefix + key
    
    // Remove from memory cache
    this.memoryCache.delete(cacheKey)
    
    // Remove from localStorage
    try {
      localStorage.removeItem(cacheKey)
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error)
    }
  }

  /**
   * Clear all cache
   * @param {string} pattern - Optional pattern to clear specific keys
   */
  clear(pattern = null) {
    if (pattern) {
      // Clear memory cache with pattern
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key)
        }
      }
      
      // Clear localStorage with pattern
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith(this.cachePrefix) && key.includes(pattern)) {
            localStorage.removeItem(key)
          }
        })
      } catch (error) {
        console.warn('Failed to clear localStorage pattern:', error)
      }
    } else {
      // Clear all cache
      this.memoryCache.clear()
      
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith(this.cachePrefix)) {
            localStorage.removeItem(key)
          }
        })
      } catch (error) {
        console.warn('Failed to clear localStorage:', error)
      }
    }
  }

  /**
   * Check if cache item exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if item exists and is valid
   */
  has(key) {
    return this.get(key) !== null
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const memorySize = this.memoryCache.size
    let localStorageSize = 0
    
    try {
      const keys = Object.keys(localStorage)
      localStorageSize = keys.filter(key => key.startsWith(this.cachePrefix)).length
    } catch (error) {
      console.warn('Failed to get localStorage stats:', error)
    }

    return {
      memorySize,
      localStorageSize,
      maxMemorySize: this.maxMemorySize,
      totalSize: memorySize + localStorageSize
    }
  }

  /**
   * Clean up expired items from memory cache
   */
  cleanupMemoryCache() {
    if (this.memoryCache.size <= this.maxMemorySize) {
      return
    }

    const now = Date.now()
    const expiredKeys = []
    const oldestKeys = []

    // Find expired and oldest items
    for (const [key, item] of this.memoryCache.entries()) {
      if (now > item.expiry) {
        expiredKeys.push(key)
      } else {
        oldestKeys.push({ key, created: item.created })
      }
    }

    // Remove expired items
    expiredKeys.forEach(key => this.memoryCache.delete(key))

    // If still too large, remove oldest items
    if (this.memoryCache.size > this.maxMemorySize) {
      oldestKeys.sort((a, b) => a.created - b.created)
      const toRemove = this.memoryCache.size - this.maxMemorySize
      
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(oldestKeys[i].key)
      }
    }
  }

  /**
   * Clean up expired items from localStorage
   */
  cleanupLocalStorage() {
    try {
      const keys = Object.keys(localStorage)
      const now = Date.now()
      
      keys.forEach(key => {
        if (key.startsWith(this.cachePrefix)) {
          try {
            const item = JSON.parse(localStorage.getItem(key))
            if (now > item.expiry) {
              localStorage.removeItem(key)
            }
          } catch (error) {
            // Remove corrupted items
            localStorage.removeItem(key)
          }
        }
      })
    } catch (error) {
      console.warn('Failed to cleanup localStorage:', error)
    }
  }

  /**
   * Preload cache with data
   * @param {Array} items - Array of {key, value, ttl} objects
   */
  preload(items) {
    items.forEach(item => {
      this.set(item.key, item.value, item.ttl)
    })
  }

  /**
   * Get multiple cache items
   * @param {Array} keys - Array of cache keys
   * @returns {Object} Object with key-value pairs
   */
  getMultiple(keys) {
    const result = {}
    keys.forEach(key => {
      const value = this.get(key)
      if (value !== null) {
        result[key] = value
      }
    })
    return result
  }

  /**
   * Set multiple cache items
   * @param {Object} items - Object with key-value pairs
   * @param {number} ttl - Time to live in milliseconds
   */
  setMultiple(items, ttl = this.defaultTTL) {
    Object.entries(items).forEach(([key, value]) => {
      this.set(key, value, ttl)
    })
  }
}

// Create singleton instance
export const cacheService = new CacheService()
