/**
 * Performance configuration and optimizations
 */

export const PERFORMANCE_CONFIG = {
  // Database optimizations
  DATABASE: {
    CACHE_SIZE: 10000,
    STATEMENT_CACHE_SIZE: 100,
    QUERY_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    MAX_CACHE_SIZE: 1000,
    WAL_MODE: true,
    MMAP_SIZE: 268435456, // 256MB
    PAGE_SIZE: 4096,
    AUTO_VACUUM: 'incremental'
  },
  
  // Image generation optimizations
  IMAGE_GENERATION: {
    CACHE_TTL: 10 * 60 * 1000, // 10 minutes
    MAX_CACHE_SIZE: 100,
    CLEANUP_THRESHOLD: 20,
    SVG_OPTIMIZATION: true,
    PNG_COMPRESSION: 9
  },
  
  // File service optimizations
  FILE_SERVICE: {
    CACHE_TTL: 30 * 60 * 1000, // 30 minutes
    MAX_CACHE_SIZE: 500,
    CLEANUP_THRESHOLD: 100
  },
  
  // API optimizations
  API: {
    REQUEST_TIMEOUT: 30000, // 30 seconds
    MAX_CONCURRENT_REQUESTS: 10,
    RATE_LIMIT_WINDOW: 60000, // 1 minute
    RATE_LIMIT_MAX: 100
  },
  
  // Logging optimizations
  LOGGING: {
    ENABLE_DEBUG_LOGS: false,
    ENABLE_PERFORMANCE_LOGS: true,
    LOG_LEVEL: 'warn' // error, warn, info, debug
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.startTimes = new Map()
  }

  startTimer(name) {
    this.startTimes.set(name, performance.now())
  }

  endTimer(name) {
    const startTime = this.startTimes.get(name)
    if (startTime) {
      const duration = performance.now() - startTime
      this.metrics.set(name, duration)
      this.startTimes.delete(name)
      
      if (PERFORMANCE_CONFIG.LOGGING.ENABLE_PERFORMANCE_LOGS) {
        console.warn(`⏱️  ${name}: ${duration.toFixed(2)}ms`)
      }
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics)
  }

  clearMetrics() {
    this.metrics.clear()
    this.startTimes.clear()
  }
}

/**
 * Cache management utilities
 */
export class CacheManager {
  constructor(maxSize = 1000, ttl = 60000) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key) {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  set(key, data) {
    // Cleanup if cache is too large
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      entries.slice(0, Math.floor(this.maxSize * 0.2)).forEach(([key]) => {
        this.cache.delete(key)
      })
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  clear() {
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Global cache manager instances
export const imageCache = new CacheManager(
  PERFORMANCE_CONFIG.IMAGE_GENERATION.MAX_CACHE_SIZE,
  PERFORMANCE_CONFIG.IMAGE_GENERATION.CACHE_TTL
)

export const queryCache = new CacheManager(
  PERFORMANCE_CONFIG.DATABASE.MAX_CACHE_SIZE,
  PERFORMANCE_CONFIG.DATABASE.QUERY_CACHE_TTL
) 