/**
 * Integration tests for health check endpoint
 */

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals')

describe('Health Check Integration Tests', () => {
  let baseURL = 'http://localhost:3000'
  
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000))
  })
  
  test('GET /health should return healthy status', async () => {
    const response = await fetch(`${baseURL}/health`)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    
    expect(data).toHaveProperty('status')
    expect(data.status).toBe('healthy')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('uptime')
    expect(data).toHaveProperty('database')
    expect(data.database).toHaveProperty('connected')
    expect(data.database.connected).toBe(true)
    expect(data).toHaveProperty('memory')
    expect(data).toHaveProperty('system')
  })
  
  test('Health check should include database statistics', async () => {
    const response = await fetch(`${baseURL}/health`)
    const data = await response.json()
    
    expect(data.database).toHaveProperty('stats')
    expect(data.database.stats).toHaveProperty('items')
    expect(data.database.stats).toHaveProperty('equipment')
    expect(data.database.stats).toHaveProperty('weapons')
    expect(data.database.stats).toHaveProperty('prayers')
    expect(data.database.stats).toHaveProperty('monsters')
    
    // Should have reasonable values
    expect(typeof data.database.stats.items).toBe('number')
    expect(data.database.stats.items).toBeGreaterThan(0)
  })
  
  test('Health check should include memory information', async () => {
    const response = await fetch(`${baseURL}/health`)
    const data = await response.json()
    
    expect(data.memory).toHaveProperty('heapUsed')
    expect(data.memory).toHaveProperty('heapTotal')
    expect(data.memory).toHaveProperty('external')
    expect(data.memory).toHaveProperty('rss')
    
    // Should have reasonable values
    expect(typeof data.memory.heapUsed).toBe('number')
    expect(data.memory.heapUsed).toBeGreaterThan(0)
    expect(data.memory.heapTotal).toBeGreaterThan(data.memory.heapUsed)
  })
  
  test('Health check should include system information', async () => {
    const response = await fetch(`${baseURL}/health`)
    const data = await response.json()
    
    expect(data.system).toHaveProperty('platform')
    expect(data.system).toHaveProperty('nodeVersion')
    expect(data.system).toHaveProperty('pid')
    
    expect(typeof data.system.platform).toBe('string')
    expect(typeof data.system.nodeVersion).toBe('string')
    expect(typeof data.system.pid).toBe('number')
  })
  
  test('Health check should have reasonable response time', async () => {
    const startTime = Date.now()
    const response = await fetch(`${baseURL}/health`)
    const endTime = Date.now()
    
    expect(response.status).toBe(200)
    const data = await response.json()
    
    const responseTime = endTime - startTime
    expect(responseTime).toBeLessThan(5000) // Should respond within 5 seconds
    
    expect(data).toHaveProperty('responseTime')
    expect(typeof data.responseTime).toBe('number')
    expect(data.responseTime).toBeGreaterThan(0)
  })
}) 