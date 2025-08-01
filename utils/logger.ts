/**
 * Structured logging utility for the OSRS Image Generation API
 * Uses Winston for production-ready logging with environment configuration
 */

import winston from 'winston'
import { config } from '../config/environment.js'
import { mkdir } from 'fs/promises'

// Create logs directory if it doesn't exist
mkdir('./logs', { recursive: true }).catch(() => {
  // Ignore errors if directory already exists
})

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} [${level}]: ${message}${metaString}`
  })
)

// JSON format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Create transports array based on configuration
const transports: winston.transport[] = []

if (config.logging.enableConsole) {
  transports.push(new winston.transports.Console({
    format: config.logging.format === 'json' ? productionFormat : developmentFormat
  }))
}

if (config.logging.enableFile) {
  transports.push(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: productionFormat
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: productionFormat
    })
  )
}

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: productionFormat,
  transports,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
})

// Convenience methods for common logging patterns
export const log = {
  info: (message: string, meta?: any) => logger.info(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  error: (message: string, meta?: any) => logger.error(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  
  // Database operations
  db: {
    query: (query: string, duration?: number, meta?: any) => 
      logger.info('Database query executed', { query, duration, ...meta }),
    error: (error: any, query?: string, meta?: any) => 
      logger.error('Database error', { error: error.message, query, ...meta })
  },
  
  // API operations
  api: {
    request: (method: string, path: string, duration?: number, meta?: any) => 
      logger.info('API request', { method, path, duration, ...meta }),
    error: (error: any, method?: string, path?: string, meta?: any) => 
      logger.error('API error', { error: error.message, method, path, ...meta })
  },
  
  // Image generation
  image: {
    generated: (type: string, duration?: number, meta?: any) => 
      logger.info('Image generated', { type, duration, ...meta }),
    error: (error: any, type?: string, meta?: any) => 
      logger.error('Image generation error', { error: error.message, type, ...meta })
  }
}

// Export default logger for backward compatibility
export default logger 