import { g as config, c as defineEventHandler, e as createError } from '../_/nitro.mjs';
import { d as databaseService } from '../_/databaseService.mjs';
import winston from 'winston';
import { mkdir } from 'fs/promises';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:url';
import 'node:path';
import 'chokidar';
import 'anymatch';
import 'node:crypto';
import 'better-sqlite3';
import 'path';
import 'url';

mkdir("./logs", { recursive: true }).catch(() => {
});
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);
const transports = [];
if (config.logging.enableConsole) {
  transports.push(new winston.transports.Console({
    format: config.logging.format === "json" ? productionFormat : developmentFormat
  }));
}
if (config.logging.enableFile) {
  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: productionFormat
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      format: productionFormat
    })
  );
}
const logger = winston.createLogger({
  level: config.logging.level,
  format: productionFormat,
  transports,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: "logs/exceptions.log" })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: "logs/rejections.log" })
  ]
});
const log = {
  info: (message, meta) => logger.info(message, meta),
  warn: (message, meta) => logger.warn(message, meta),
  error: (message, meta) => logger.error(message, meta),
  debug: (message, meta) => logger.debug(message, meta),
  // Database operations
  db: {
    query: (query, duration, meta) => logger.info("Database query executed", { query, duration, ...meta }),
    error: (error, query, meta) => logger.error("Database error", { error: error.message, query, ...meta })
  },
  // API operations
  api: {
    request: (method, path, duration, meta) => logger.info("API request", { method, path, duration, ...meta }),
    error: (error, method, path, meta) => logger.error("API error", { error: error.message, method, path, ...meta })
  },
  // Image generation
  image: {
    generated: (type, duration, meta) => logger.info("Image generated", { type, duration, ...meta }),
    error: (error, type, meta) => logger.error("Image generation error", { error: error.message, type, ...meta })
  }
};

const health_get = defineEventHandler(async (event) => {
  const startTime = performance.now();
  try {
    await databaseService.init();
    let dbStats = { items: 0, equipment: 0, weapons: 0, prayers: 0, monsters: 0 };
    try {
      const itemCount = databaseService.db.prepare("SELECT COUNT(*) as count FROM items").get().count;
      const equipmentCount = databaseService.db.prepare("SELECT COUNT(*) as count FROM equipment").get().count;
      const weaponCount = databaseService.db.prepare("SELECT COUNT(*) as count FROM weapons").get().count;
      const prayerCount = databaseService.db.prepare("SELECT COUNT(*) as count FROM prayers").get().count;
      const monsterCount = databaseService.db.prepare("SELECT COUNT(*) as count FROM monsters").get().count;
      dbStats = {
        items: itemCount,
        equipment: equipmentCount,
        weapons: weaponCount,
        prayers: prayerCount,
        monsters: monsterCount
      };
    } catch (error) {
      log.warn("Could not get database statistics", { error: error.message });
    }
    const memoryUsage = process.memoryUsage();
    const memoryStats = {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      // MB
      external: Math.round(memoryUsage.external / 1024 / 1024),
      // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024)
      // MB
    };
    const responseTime = performance.now() - startTime;
    log.info("Health check completed", {
      responseTime: Math.round(responseTime),
      memoryUsage: memoryStats,
      databaseStats: dbStats
    });
    return {
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: "production",
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
    };
  } catch (error) {
    const responseTime = performance.now() - startTime;
    log.error("Health check failed", {
      error: error.message,
      responseTime: Math.round(responseTime)
    });
    throw createError({
      statusCode: 503,
      statusMessage: "Service Unavailable",
      data: {
        status: "unhealthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: error.message,
        responseTime: Math.round(responseTime)
      }
    });
  }
});

export { health_get as default };
//# sourceMappingURL=health.get.mjs.map
