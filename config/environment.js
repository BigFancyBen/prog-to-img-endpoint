/**
 * Environment configuration for the OSRS Image Generation API
 * Centralizes all configuration values with environment variable support
 */

export const config = {
  database: {
    // Database path - same for all environments since it's static game data
    path: process.env.DB_PATH || './data/osrs.db',
    cacheSize: parseInt(process.env.DB_CACHE_SIZE) || 10000,
    walMode: process.env.DB_WAL_MODE !== 'false',
    mmapSize: parseInt(process.env.DB_MMAP_SIZE) || 268435456,
    pageSize: parseInt(process.env.DB_PAGE_SIZE) || 4096,
    autoVacuum: process.env.DB_AUTO_VACUUM || 'incremental'
  },
  api: {
    port: parseInt(process.env.PORT) || 3000,
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: process.env.CORS_CREDENTIALS === 'true'
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100
    },
    requestSizeLimit: parseInt(process.env.REQUEST_SIZE_LIMIT) || 1024 * 1024 // 1MB
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE !== 'false'
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 300000, // 5 minutes
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
    imageTtl: parseInt(process.env.IMAGE_CACHE_TTL) || 600000 // 10 minutes
  },
  performance: {
    enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
    enableCaching: process.env.ENABLE_CACHING !== 'false',
    enableTiming: process.env.ENABLE_TIMING === 'true'
  }
} 