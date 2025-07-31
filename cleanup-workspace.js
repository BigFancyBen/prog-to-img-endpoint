import fs from 'fs'
import path from 'path'

/**
 * Comprehensive cleanup script to remove temporary test files
 */

// Files that should be kept (core application files)
const ESSENTIAL_FILES = new Set([
  // Core application files
  'nitro.config.ts',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'Procfile',
  '.gitignore',
  '.gcloudignore',
  'README.md',
  'WIKI_SCRAPER.md',
  
  // Database and core data
  'database.db',
  
  // Current working scripts (based on actual usage patterns)
  'fix-missing-icons-enhanced-clean.js',  // Current fix-icons script
  'test-all-items-display.js',           // Main test display
  
  // Core generated files we want to keep
  'all-items-display.html',
  'icon-fix-report.json'
])

// Directories that should be kept entirely
const ESSENTIAL_DIRECTORIES = new Set([
  'routes',
  'services', 
  'src',
  'types',
  'utils',
  'config',
  'data',
  'public',
  'icons',
  'font',
  '.git',
  '.nitro',
  'node_modules'
])

// Files that should be kept in scripts directory (actual production scripts)
const ESSENTIAL_SCRIPTS = new Set([
  'comprehensiveDataFetcher.js',    // Main data fetcher
  'runDataFetch.js',               // Fast data fetch
  'smartItemFetcher.js',           // Smart fetching
  'runComprehensiveFetch.js',      // Comprehensive fetch
  'wikiItemIDFetcher.js',          // Wiki ID fetcher
  'smartWikiItemIDFetcher.js',     // Smart wiki fetcher
  'runIncrementalUpdate.js',       // Incremental updates
  'setup.js'                       // Setup script
])

function shouldKeepFile(filePath, fileName) {
  // Keep essential files
  if (ESSENTIAL_FILES.has(fileName)) {
    return true
  }
  
  // Keep files that don't match test/debug/temp patterns
  const tempPatterns = [
    /^test-/,
    /^debug-/,
    /^check-/,
    /^analyze-/,
    /^fix-(?!missing-icons-enhanced-clean\.js$)/,  // Keep only the clean version
    /^create-/,
    /^verify-/,
    /^force-/,
    /^try-/,
    /^delete-/,
    /^clean-/,
    /^load-/,
    /^quick/,
    /^direct-/,
    /^curl-/,
    /^generate-icon-report/,
    /test.*\.png$/,
    /test.*\.svg$/,
    /test.*\.html$/,
    /collection-log.*\.png$/,
    /collection-log.*\.svg$/,
    /debug.*\.png$/,
    /debug.*\.svg$/
  ]
  
  return !tempPatterns.some(pattern => pattern.test(fileName))
}

function shouldKeepScriptFile(fileName) {
  // Keep essential scripts
  if (ESSENTIAL_SCRIPTS.has(fileName)) {
    return true
  }
  
  // Remove test/debug scripts
  const tempPatterns = [
    /^test/,
    /^debug/,
    /^check/,
    /^analyze/,
    /^fix(?!BarrowsIcons\.js$)/,  // Keep only fixBarrowsIcons.js if it exists
    /^enhanced/,
    /^extended/,
    /^final/,
    /^simple/,
    /^migrate/,
    /^update/,
    /^import/,
    /^incremental/,
    /^production/
  ]
  
  return !tempPatterns.some(pattern => pattern.test(fileName))
}

async function cleanupWorkspace() {
  const rootDir = process.cwd()
  console.log('🧹 Starting comprehensive workspace cleanup...')
  
  let deletedCount = 0
  let keptCount = 0
  const deletedFiles = []
  
  // Clean up root directory
  console.log('\n📂 Cleaning root directory...')
  const rootFiles = fs.readdirSync(rootDir)
  
  for (const file of rootFiles) {
    const filePath = path.join(rootDir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      if (ESSENTIAL_DIRECTORIES.has(file)) {
        console.log(`✅ Keeping directory: ${file}`)
        keptCount++
      } else {
        console.log(`🗑️ Would remove directory: ${file} (skipping for safety)`)
        // Don't auto-delete directories for safety
      }
    } else {
      if (shouldKeepFile(filePath, file)) {
        console.log(`✅ Keeping: ${file}`)
        keptCount++
      } else {
        console.log(`🗑️ Removing: ${file}`)
        try {
          fs.unlinkSync(filePath)
          deletedFiles.push(file)
          deletedCount++
        } catch (error) {
          console.error(`❌ Error deleting ${file}:`, error.message)
        }
      }
    }
  }
  
  // Clean up scripts directory
  console.log('\n📂 Cleaning scripts directory...')
  const scriptsDir = path.join(rootDir, 'scripts')
  if (fs.existsSync(scriptsDir)) {
    const scriptFiles = fs.readdirSync(scriptsDir)
    
    for (const file of scriptFiles) {
      const filePath = path.join(scriptsDir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isFile()) {
        if (shouldKeepScriptFile(file)) {
          console.log(`✅ Keeping script: ${file}`)
          keptCount++
        } else {
          console.log(`🗑️ Removing script: ${file}`)
          try {
            fs.unlinkSync(filePath)
            deletedFiles.push(`scripts/${file}`)
            deletedCount++
          } catch (error) {
            console.error(`❌ Error deleting scripts/${file}:`, error.message)
          }
        }
      }
    }
  }
  
  console.log('\n📊 Cleanup Summary:')
  console.log(`   🗑️ Files deleted: ${deletedCount}`)
  console.log(`   ✅ Files kept: ${keptCount}`)
  
  if (deletedFiles.length > 0) {
    console.log('\n📋 Deleted files:')
    deletedFiles.forEach(file => console.log(`   - ${file}`))
  }
  
  console.log('\n🎉 Cleanup complete!')
  console.log('💡 Core application files and essential scripts have been preserved.')
}

cleanupWorkspace().catch(console.error)
