# Implementation Guide: Critical Best Practices

## 🚀 **Phase 1: Environment Configuration (Priority: HIGH)**

### Step 1: Create Environment Configuration
```typescript
// config/environment.ts
export const config = {
  database: {
    path: process.env.DB_PATH || './data/osrs.db',
    cacheSize: parseInt(process.env.DB_CACHE_SIZE) || 10000,
    walMode: process.env.DB_WAL_MODE !== 'false',
    mmapSize: parseInt(process.env.DB_MMAP_SIZE) || 268435456
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
    }
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json'
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 300000, // 5 minutes
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000
  }
}
```

### Step 2: Update Database Service
```typescript
// services/databaseService.js
import { config } from '../config/environment.js'

// Replace hardcoded values with config
const DB_PATH = config.database.path
const CACHE_SIZE = config.database.cacheSize

// Update pragmas
this.db.pragma(`cache_size = ${config.database.cacheSize}`)
this.db.pragma(`mmap_size = ${config.database.mmapSize}`)
```

### Step 3: Create .env.example
```bash
# .env.example
DB_PATH=./data/osrs.db
DB_CACHE_SIZE=10000
DB_WAL_MODE=true
DB_MMAP_SIZE=268435456

PORT=3000
CORS_ORIGIN=*
CORS_CREDENTIALS=false

RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

LOG_LEVEL=info
LOG_FORMAT=json

CACHE_TTL=300000
CACHE_MAX_SIZE=1000
```

## 🔒 **Phase 2: Security Middleware (Priority: HIGH)**

### Step 1: Create Rate Limiting Middleware
```typescript
// middleware/rate-limit.ts
import { config } from '../config/environment.js'

const rateLimitStore = new Map()

export default defineEventHandler(async (event) => {
  const clientIP = getClientIP(event) || 'unknown'
  const now = Date.now()
  const windowStart = now - config.api.rateLimit.windowMs
  
  // Get client's request history
  const clientRequests = rateLimitStore.get(clientIP) || []
  const recentRequests = clientRequests.filter(time => time > windowStart)
  
  // Check if rate limit exceeded
  if (recentRequests.length >= config.api.rateLimit.max) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      data: {
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((recentRequests[0] + config.api.rateLimit.windowMs - now) / 1000)
      }
    })
  }
  
  // Add current request
  recentRequests.push(now)
  rateLimitStore.set(clientIP, recentRequests)
  
  // Cleanup old entries
  if (rateLimitStore.size > 1000) {
    const entries = Array.from(rateLimitStore.entries())
    entries.slice(0, 100).forEach(([key]) => rateLimitStore.delete(key))
  }
})
```

### Step 2: Create CORS Middleware
```typescript
// middleware/cors.ts
import { config } from '../config/environment.js'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': config.api.cors.origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': config.api.cors.credentials.toString()
  })
  
  if (getMethod(event) === 'OPTIONS') {
    return { statusCode: 200 }
  }
})
```

### Step 3: Create Request Validation Middleware
```typescript
// middleware/validation.ts
import { z } from 'zod'

const requestSizeLimit = 1024 * 1024 // 1MB

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const path = getRequestURL(event).pathname
  
  // Check request size
  const contentLength = getHeader(event, 'content-length')
  if (contentLength && parseInt(contentLength) > requestSizeLimit) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Payload Too Large',
      data: { message: 'Request body too large' }
    })
  }
  
  // Apply validation for POST requests
  if (method === 'POST' && path.startsWith('/api/')) {
    const body = await readBody(event)
    
    // Basic validation - ensure body is an object
    if (!body || typeof body !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        data: { message: 'Invalid request body' }
      })
    }
  }
})
```

## 📝 **Phase 3: Structured Logging (Priority: MEDIUM)**

### Step 1: Install Winston
```bash
npm install winston
```

### Step 2: Create Logger
```typescript
// utils/logger.ts
import winston from 'winston'
import { config } from '../config/environment.js'

const logFormat = config.logging.format === 'json' 
  ? winston.format.json()
  : winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
      })
    )

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
})

// Create logs directory
import { mkdir } from 'fs/promises'
mkdir('./logs', { recursive: true }).catch(() => {})
```

### Step 3: Update Services to Use Logger
```typescript
// services/databaseService.js
import { logger } from '../utils/logger.js'

// Replace console.log/console.error with logger
logger.info('Database initialized successfully', { itemCount })
logger.error('Failed to initialize database', { error: error.message })
```

## 🧪 **Phase 4: Integration Testing (Priority: MEDIUM)**

### Step 1: Create API Test Suite
```typescript
// tests/integration/api.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from 'http'
import { createNitro } from 'nitropack'

describe('API Integration Tests', () => {
  let server: any
  let baseURL: string
  
  beforeAll(async () => {
    const nitro = await createNitro()
    server = createServer(nitro.handler)
    await new Promise(resolve => server.listen(0, resolve))
    const port = server.address().port
    baseURL = `http://localhost:${port}`
  })
  
  afterAll(async () => {
    await new Promise(resolve => server.close(resolve))
  })
  
  test('POST /api/progress-image should generate image', async () => {
    const testData = {
      script_name: "Test Script",
      runtime: 60,
      xp_earned: [{ skill: "agility", xp: "1000" }]
    }
    
    const response = await fetch(`${baseURL}/api/progress-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    })
    
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result).toHaveProperty('body')
    expect(result.body).toMatch(/^data:image\/png;base64,/)
  })
  
  test('POST /api/progress-image should validate input', async () => {
    const invalidData = { script_name: "" } // Missing required fields
    
    const response = await fetch(`${baseURL}/api/progress-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData)
    })
    
    expect(response.status).toBe(400)
    const result = await response.json()
    expect(result).toHaveProperty('data')
  })
  
  test('Rate limiting should work', async () => {
    const testData = {
      script_name: "Test Script",
      runtime: 60,
      xp_earned: [{ skill: "agility", xp: "1000" }]
    }
    
    // Make 101 requests (exceeding rate limit of 100)
    const requests = Array(101).fill().map(() => 
      fetch(`${baseURL}/api/progress-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      })
    )
    
    const responses = await Promise.all(requests)
    const rateLimited = responses.filter(r => r.status === 429)
    
    expect(rateLimited.length).toBeGreaterThan(0)
  })
})
```

### Step 2: Create Database Test Suite
```typescript
// tests/integration/database.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import databaseService from '../../services/databaseService.js'
import { unlink, copyFile } from 'fs/promises'
import { existsSync } from 'fs'

describe('Database Integration Tests', () => {
  const testDbPath = './data/test-osrs.db'
  const originalDbPath = './data/osrs.db'
  
  beforeEach(async () => {
    // Create test database from original
    if (existsSync(originalDbPath)) {
      await copyFile(originalDbPath, testDbPath)
    }
    
    // Initialize test database
    await databaseService.init()
  })
  
  afterEach(async () => {
    // Cleanup test database
    try {
      await unlink(testDbPath)
    } catch (error) {
      // Ignore if file doesn't exist
    }
  })
  
  test('should insert and retrieve item', async () => {
    const testItem = {
      id: 999999,
      name: 'Test Item',
      examine: 'A test item for testing',
      wiki_name: 'Test_Item',
      members: false,
      tradeable: true,
      stackable: false
    }
    
    // Insert item
    await databaseService.insertItem(testItem)
    
    // Retrieve item
    const retrieved = await databaseService.getItemById(testItem.id)
    
    expect(retrieved).toBeDefined()
    expect(retrieved.name).toBe(testItem.name)
    expect(retrieved.examine).toBe(testItem.examine)
  })
  
  test('should search items by name', async () => {
    const results = await databaseService.searchItemsByNameOnly('Dragon')
    
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0]).toHaveProperty('name')
  })
})
```

## 📊 **Phase 5: Performance Monitoring (Priority: LOW)**

### Step 1: Add Performance Headers
```typescript
// middleware/performance.ts
export default defineEventHandler(async (event) => {
  const startTime = performance.now()
  
  // Add performance headers
  setResponseHeaders(event, {
    'X-Response-Time': '0ms',
    'X-Cache-Control': 'no-cache'
  })
  
  // Let request continue
  const response = await event.node.res.end()
  
  // Calculate and set response time
  const responseTime = performance.now() - startTime
  setResponseHeaders(event, {
    'X-Response-Time': `${responseTime.toFixed(2)}ms`
  })
  
  return response
})
```

### Step 2: Add Health Check Endpoint
```typescript
// routes/health.get.ts
import databaseService from '../services/databaseService.js'

export default defineEventHandler(async (event) => {
  try {
    // Check database connection
    await databaseService.init()
    const stats = databaseService.getStats()
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        items: stats.items,
        equipment: stats.equipment,
        weapons: stats.weapons
      },
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal
      }
    }
  } catch (error) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      data: {
        status: 'unhealthy',
        error: error.message
      }
    })
  }
})
```

## 🚀 **Quick Start Implementation**

### 1. Install Dependencies
```bash
npm install winston
```

### 2. Create Configuration Files
- Copy the environment configuration
- Create `.env` file from `.env.example`
- Update database service to use config

### 3. Add Middleware
- Add rate limiting middleware
- Add CORS middleware
- Add validation middleware

### 4. Update Logging
- Replace console.log with structured logging
- Create logs directory

### 5. Add Tests
- Create integration test files
- Update package.json scripts

### 6. Test Everything
```bash
npm run test
npm run build
npm run dev
```

## 📋 **Implementation Checklist**

- [ ] Environment configuration
- [ ] Rate limiting middleware
- [ ] CORS middleware
- [ ] Request validation
- [ ] Structured logging
- [ ] Integration tests
- [ ] Database tests
- [ ] Performance monitoring
- [ ] Health check endpoint
- [ ] Documentation updates

## 🎯 **Next Steps**

After implementing these critical improvements:

1. **Add API documentation** with OpenAPI/Swagger
2. **Implement database migrations** system
3. **Add repository pattern** for better code organization
4. **Set up monitoring** and alerting
5. **Add authentication** if needed
6. **Optimize database queries** and add indexes

This implementation guide focuses on the most critical improvements that will make your application production-ready while maintaining the excellent performance optimizations you've already implemented. 