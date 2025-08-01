import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  srcDir: ".",
  compatibilityDate: '2025-07-31',
  
  // Performance optimizations
  experimental: {
    wasm: false
  },
  
  // Compression and caching
  compressPublicAssets: process.env.ENABLE_COMPRESSION !== 'false',
  
  // Route rules for performance
  routeRules: {
    '/api/**': {
      cors: true,
      headers: {
        'Cache-Control': 'public, max-age=300' // 5 minutes cache for API responses
      }
    },
    '/icons/**': {
      headers: {
        'Cache-Control': 'public, max-age=86400' // 24 hours cache for icons
      }
    },
    '/font/**': {
      headers: {
        'Cache-Control': 'public, max-age=31536000' // 1 year cache for fonts
      }
    },
    '/data/**': {
      headers: {
        'Cache-Control': 'public, max-age=3600' // 1 hour cache for data files
      }
    }
  },
  
  // Storage configuration
  storage: {
    fs: {
      driver: 'fs',
      base: './data'
    }
  },
  
  // Runtime configuration
  runtimeConfig: {
    nitro: {
      preset: 'node-server'
    },
    // Environment variables
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  
  // Performance settings
  timing: process.env.ENABLE_TIMING === 'true', // Enable timing based on environment
  
  // Public assets configuration
  publicAssets: [
    {
      baseURL: '/test',
      dir: './test'
    },
    {
      baseURL: '/icons',
      dir: './icons'
    },
    {
      baseURL: '/font',
      dir: './font'
    },
    {
      baseURL: '/data',
      dir: './data'
    },
    {
      baseURL: '/',
      dir: './public'
    }
  ]
}) 