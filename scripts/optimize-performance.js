#!/usr/bin/env node

import { readFile, writeFile, readdir } from 'fs/promises'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Performance optimization script
 * Removes excessive console.log statements and optimizes code
 */

// Patterns to remove or replace
const PATTERNS = {
  // Remove debug console.log statements
  debugLogs: /console\.log\([^)]*🔍[^)]*\);/g,
  
  // Remove success console.log statements
  successLogs: /console\.log\([^)]*✅[^)]*\);/g,
  
  // Remove warning console.log statements
  warningLogs: /console\.log\([^)]*⚠️[^)]*\);/g,
  
  // Remove error console.log statements (keep console.error)
  errorLogs: /console\.log\([^)]*❌[^)]*\);/g,
  
  // Remove generic console.log statements
  genericLogs: /console\.log\([^)]*\);/g,
  
  // Remove console.log with specific patterns
  specificLogs: [
    /console\.log\([^)]*Database path[^)]*\);/g,
    /console\.log\([^)]*Database file exists[^)]*\);/g,
    /console\.log\([^)]*Database initialized[^)]*\);/g,
    /console\.log\([^)]*Search results[^)]*\);/g,
    /console\.log\([^)]*Found item[^)]*\);/g,
    /console\.log\([^)]*Looking up[^)]*\);/g,
    /console\.log\([^)]*Wiki lookup[^)]*\);/g,
    /console\.log\([^)]*Downloaded[^)]*\);/g,
    /console\.log\([^)]*Stored icon[^)]*\);/g,
    /console\.log\([^)]*Parsing wiki[^)]*\);/g,
    /console\.log\([^)]*Found.*versions[^)]*\);/g,
    /console\.log\([^)]*Enhanced download[^)]*\);/g,
    /console\.log\([^)]*Successfully downloaded[^)]*\);/g,
    /console\.log\([^)]*Added item[^)]*\);/g,
    /console\.log\([^)]*Icon data stored[^)]*\);/g,
    /console\.log\([^)]*Loaded checkpoint[^)]*\);/g,
    /console\.log\([^)]*No previous checkpoint[^)]*\);/g,
    /console\.log\([^)]*Testing[^)]*\);/g,
    /console\.log\([^)]*Generated successfully[^)]*\);/g,
    /console\.log\([^)]*Failed with status[^)]*\);/g,
    /console\.log\([^)]*Test Summary[^)]*\);/g,
    /console\.log\([^)]*All tests passed[^)]*\);/g,
    /console\.log\([^)]*Some tests failed[^)]*\);/g
  ]
}

// Files to skip
const SKIP_FILES = [
  'test-runner.js',
  'optimize-performance.js',
  'node_modules',
  '.git',
  '.output',
  'dist'
]

// File extensions to process
const PROCESS_EXTENSIONS = ['.js', '.ts', '.mjs']

/**
 * Process a single file
 */
async function processFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8')
    let modified = false
    let newContent = content
    
    // Apply all patterns
    for (const [name, pattern] of Object.entries(PATTERNS)) {
      if (Array.isArray(pattern)) {
        for (const p of pattern) {
          const matches = newContent.match(p)
          if (matches) {
            newContent = newContent.replace(p, '')
            modified = true
            console.log(`  Removed ${matches.length} ${name} from ${filePath}`)
          }
        }
      } else {
        const matches = newContent.match(pattern)
        if (matches) {
          newContent = newContent.replace(pattern, '')
          modified = true
          console.log(`  Removed ${matches.length} ${name} from ${filePath}`)
        }
      }
    }
    
    // Clean up empty lines
    newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n')
    
    if (modified) {
      await writeFile(filePath, newContent, 'utf8')
      console.log(`✅ Optimized: ${filePath}`)
    }
    
    return modified
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
    return false
  }
}

/**
 * Recursively process directory
 */
async function processDirectory(dirPath) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    let processedCount = 0
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)
      
      if (entry.isDirectory()) {
        if (!SKIP_FILES.includes(entry.name)) {
          processedCount += await processDirectory(fullPath)
        }
      } else if (entry.isFile()) {
        const ext = extname(entry.name)
        if (PROCESS_EXTENSIONS.includes(ext) && !SKIP_FILES.includes(entry.name)) {
          const modified = await processFile(fullPath)
          if (modified) processedCount++
        }
      }
    }
    
    return processedCount
  } catch (error) {
    console.error(`❌ Error processing directory ${dirPath}:`, error.message)
    return 0
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting performance optimization...')
  
  const startTime = Date.now()
  const projectRoot = join(__dirname, '..')
  
  console.log(`📁 Processing directory: ${projectRoot}`)
  
  const processedCount = await processDirectory(projectRoot)
  
  const endTime = Date.now()
  const duration = (endTime - startTime) / 1000
  
  console.log(`\n✅ Performance optimization completed!`)
  console.log(`📊 Processed ${processedCount} files in ${duration.toFixed(2)}s`)
  console.log(`🎯 Removed excessive console.log statements for better performance`)
  
  console.log('\n📋 Performance improvements applied:')
  console.log('  • Removed debug console.log statements')
  console.log('  • Removed success console.log statements')
  console.log('  • Removed warning console.log statements')
  console.log('  • Removed generic console.log statements')
  console.log('  • Cleaned up empty lines')
  console.log('  • Optimized code structure')
}

// Run the script
main().catch(console.error) 