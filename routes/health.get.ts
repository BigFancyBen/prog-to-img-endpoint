/**
 * Health check endpoint for monitoring application status
 * Provides database connectivity, memory usage, and system information
 */

import databaseService from '../services/databaseService.js'
import { log } from '../utils/logger.ts'

export default defineEventHandler(async (event) => {
  const startTime = performance.now()
  
  try {
    // Check database connection
    await databaseService.init()
    
    // Get database statistics
    let dbStats = { items: 0, equipment: 0, weapons: 0, prayers: 0, monsters: 0 }
    try {
      const itemCount = databaseService.db.prepare('SELECT COUNT(*) as count FROM items').get().count
      const equipmentCount = databaseService.db.prepare('SELECT COUNT(*) as count FROM equipment').get().count
      const weaponCount = databaseService.db.prepare('SELECT COUNT(*) as count FROM weapons').get().count
      const prayerCount = databaseService.db.prepare('SELECT COUNT(*) as count FROM prayers').get().count
      const monsterCount = databaseService.db.prepare('SELECT COUNT(*) as count FROM monsters').get().count
      
      dbStats = {
        items: itemCount,
        equipment: equipmentCount,
        weapons: weaponCount,
        prayers: prayerCount,
        monsters: monsterCount
      }
    } catch (error) {
      log.warn('Could not get database statistics', { error: error.message })
    }
    
    // Get memory usage
    const memoryUsage = process.memoryUsage()
    const memoryStats = {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
    }
    
    // Calculate response time
    const responseTime = performance.now() - startTime
    
    // Log health check
    log.info('Health check completed', { 
      responseTime: Math.round(responseTime),
      memoryUsage: memoryStats,
      databaseStats: dbStats
    })
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: Math.round(responseTime),
      database: {
        connected: true,
        stats: dbStats
      },
      memory: memoryStats,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
      }
    }
    
  } catch (error) {
    const responseTime = performance.now() - startTime
    
    log.error('Health check failed', { 
      error: error.message,
      responseTime: Math.round(responseTime)
    })
    
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        responseTime: Math.round(responseTime)
      }
    })
  }
}) 