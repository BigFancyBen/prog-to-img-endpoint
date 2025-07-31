import fs from 'fs'
import path from 'path'

/**
 * Comprehensive codebase cleanup - removes temporary AI-generated test files
 * while preserving essential application files
 */

// Core files that must be kept (essential for the application)
const ESSENTIAL_FILES = [
  // Package and config files
  'package.json',
  'package-lock.json', 
  'nitro.config.ts',
  'Procfile',
  'README.md',
  'README-new.md',
  
  // Database
  'database.db',
  
  // Core application scripts that are actually used
  'scripts/comprehensiveDataFetcher.js', // npm run fetch-data
  'fix-missing-icons-enhanced-clean.js', // npm run fix-icons
  
  // Generated files we want to keep
  'all-items-display.html',
  'icon-fix-report.json',
  
  // Image files we want to keep
  'collection-log-background.png',
  'test-background.png'
]

// Essential directories that should be preserved entirely
const ESSENTIAL_DIRECTORIES = [
  'services/',      // Core services
  'routes/',        // API routes
  'utils/',         // Utility functions (if exists)
  'public/',        // Public assets (if exists)
  '.output/',       // Nitro build output
  'node_modules/',  // Dependencies
  '.git/',          // Git repository
  '.vscode/',       // VS Code settings (if exists)
]

// Patterns for files that should be removed (AI-generated test files)
const CLEANUP_PATTERNS = [
  /^analyze-.*\.js$/,
  /^check-.*\.js$/,
  /^create-.*\.js$/,
  /^debug-.*\.js$/,
  /^delete-.*\.js$/,
  /^download-.*\.js$/,
  /^fix-(?!missing-icons-enhanced-clean).*\.js$/,  // Keep the clean version
  /^load-.*\.js$/,
  /^quick.*\.js$/,
  /^test-(?!all-items-display).*\.js$/,  // Keep the main test display
  /^curl-.*\.js$/,
  /^direct-.*\.js$/,
  /^force-.*\.js$/,
  /^try-.*\.js$/,
  /^find-.*\.js$/,
  /.*-test-.*\.png$/,
  /.*-test-.*\.svg$/,
  /debug-.*\.png$/,
  /debug-.*\.svg$/,
  /collection-log-test.*\.png$/,
  /test-collection.*\.png$/,
  /test-collection.*\.svg$/,
  /test-file-ref.*\.png$/,
  /test-fixed.*\.png$/
]

async function cleanupCodebase() {
  const rootDir = process.cwd()
  console.log('🧹 Starting codebase cleanup...')
  console.log(`📁 Working directory: ${rootDir}`)
  
  // Get all files in root directory
  const files = fs.readdirSync(rootDir)
  
  let removedCount = 0
  let keptCount = 0
  const removedFiles = []
  
  for (const file of files) {
    const filePath = path.join(rootDir, file)
    const stat = fs.statSync(filePath)
    
    // Skip directories in root (we'll handle them separately)
    if (stat.isDirectory()) {
      continue
    }
    
    // Check if it's an essential file
    if (ESSENTIAL_FILES.includes(file)) {
      console.log(`✅ Keeping essential file: ${file}`)
      keptCount++
      continue
    }
    
    // Check if it matches cleanup patterns
    const shouldRemove = CLEANUP_PATTERNS.some(pattern => pattern.test(file))
    
    if (shouldRemove) {
      try {
        fs.unlinkSync(filePath)
        console.log(`🗑️  Removed: ${file}`)
        removedFiles.push(file)
        removedCount++
      } catch (error) {
        console.log(`❌ Failed to remove ${file}: ${error.message}`)
      }
    } else {
      console.log(`🤔 Keeping (not matching cleanup pattern): ${file}`)
      keptCount++
    }
  }
  
  // Clean up scripts directory
  const scriptsDir = path.join(rootDir, 'scripts')
  if (fs.existsSync(scriptsDir)) {
    console.log('\n📁 Cleaning scripts directory...')
    const scriptFiles = fs.readdirSync(scriptsDir)
    
    // Keep only the essential fetch-data script
    const essentialScripts = ['comprehensiveDataFetcher.js']
    
    for (const file of scriptFiles) {
      const filePath = path.join(scriptsDir, file)
      
      if (essentialScripts.includes(file)) {
        console.log(`✅ Keeping essential script: scripts/${file}`)
        keptCount++
      } else {
        try {
          fs.unlinkSync(filePath)
          console.log(`🗑️  Removed: scripts/${file}`)
          removedFiles.push(`scripts/${file}`)
          removedCount++
        } catch (error) {
          console.log(`❌ Failed to remove scripts/${file}: ${error.message}`)
        }
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('🧹 CLEANUP COMPLETE')
  console.log('='.repeat(50))
  console.log(`📊 Files removed: ${removedCount}`)
  console.log(`📊 Files kept: ${keptCount}`)
  
  if (removedFiles.length > 0) {
    console.log('\n🗑️  Removed files:')
    removedFiles.forEach(file => console.log(`   ${file}`))
  }
  
  console.log('\n✅ Essential files preserved:')
  console.log('   📦 package.json (npm scripts)')
  console.log('   ⚙️  nitro.config.ts (dev server)')
  console.log('   🗄️  services/ directory (core services)')
  console.log('   🛣️  routes/ directory (API endpoints)')
  console.log('   📊 scripts/comprehensiveDataFetcher.js (fetch-data)')
  console.log('   🔧 fix-missing-icons-enhanced-clean.js (fix-icons)')
  console.log('   🗃️  database.db (data)')
  
  console.log('\n💡 Core npm commands still work:')
  console.log('   npm run dev      - Start development server')
  console.log('   npm run fetch-data - Fetch OSRS data')
  console.log('   npm run fix-icons  - Fix missing icons')
}

cleanupCodebase().catch(console.error)
