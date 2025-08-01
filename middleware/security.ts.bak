/**
 * Security middleware for the OSRS Image Generation API
 * Handles rate limiting, CORS, and request validation
 */

import { config } from '../config/environment.js'

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, number[]>()

/**
 * Get client IP address from request
 */
function getClientIP(event: any): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = getHeader(event, 'x-real-ip')
  if (realIP) {
    return realIP
  }
  
  return event.node.req.socket?.remoteAddress || 'unknown'
}

/**
 * Rate limiting middleware
 */
function applyRateLimit(event: any): void {
  const clientIP = getClientIP(event)
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
  
  // Cleanup old entries (prevent memory leaks)
  if (rateLimitStore.size > 1000) {
    const entries = Array.from(rateLimitStore.entries())
    entries.slice(0, 100).forEach(([key]) => rateLimitStore.delete(key))
  }
}

/**
 * CORS middleware
 */
function applyCORS(event: any): void {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': config.api.cors.origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': config.api.cors.credentials.toString(),
    'Access-Control-Max-Age': '86400' // 24 hours
  })
  
  // Handle preflight requests
  if (getMethod(event) === 'OPTIONS') {
    throw createError({
      statusCode: 200,
      statusMessage: 'OK'
    })
  }
}

/**
 * Request validation middleware
 */
async function validateRequest(event: any): Promise<void> {
  const method = getMethod(event)
  const path = getRequestURL(event).pathname
  
  // Check request size for POST requests
  if (method === 'POST') {
    const contentLength = getHeader(event, 'content-length')
    if (contentLength && parseInt(contentLength) > config.api.requestSizeLimit) {
      throw createError({
        statusCode: 413,
        statusMessage: 'Payload Too Large',
        data: { 
          message: 'Request body too large',
          maxSize: config.api.requestSizeLimit,
          receivedSize: parseInt(contentLength)
        }
      })
    }
  }
  
  // Basic validation for API routes
  if (path.startsWith('/api/')) {
    // Ensure proper content type for POST requests
    if (method === 'POST') {
      const contentType = getHeader(event, 'content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Bad Request',
          data: { message: 'Content-Type must be application/json' }
        })
      }
    }
  }
}

/**
 * Main security middleware
 */
export default defineEventHandler(async (event) => {
  try {
    // Apply CORS first
    applyCORS(event)
    
    // Apply rate limiting for API routes
    if (getRequestURL(event).pathname.startsWith('/api/')) {
      applyRateLimit(event)
    }
    
    // Validate request
    await validateRequest(event)
    
  } catch (error) {
    // Re-throw validation errors
    if (error.statusCode) {
      throw error
    }
    
    // Log unexpected errors
    console.error('Security middleware error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error'
    })
  }
}) 