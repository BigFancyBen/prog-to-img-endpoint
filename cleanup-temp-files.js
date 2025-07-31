import fs from 'fs'
import path from 'path'

/**
 * Clean up temporary test files created during development
 */
async function cleanupTestFiles() {
  const rootDir = process.cwd()
  
  // Files that should be kept (used by npm scripts or core functionality)
  const keepFiles = new Set([
    'fix-missing-icons-enhanced-clean.js', // npm run fix-icons
    'test-all-items-display.js', // main test display
    // Core service files
    'services/databaseService.js',
    'services/iconService.js', 
    'services/wikiLookupService.js',
    // Main application files
    'index.js',
    'nitro.config.ts',
    'package.json',
    'README.md',
    'README-new.md',
    'Procfile'
  ])

  // Patterns of temporary files to remove
  const removePatterns = [
    /^fix-.*\.js$/,
    /^debug-.*\.js$/,
    /^test-.*\.js$/,
    /^check-.*\.js$/,
    /^analyze-.*\.js$/,
    /^create-.*\.js$/,
    /^force-.*\.js$/,
    /^try-.*\.js$/,
    /^find-.*\.js$/,
    /.*\.png$/,
    /.*\.svg$/,
    /.*\.html$/,
    /.*\.json$/ // Remove report files
  ]

  // Exception patterns (files to keep even if they match remove patterns)
  const keepPatterns = [
    /^package\.json$/,
    /^all-items-display\.html$/, // Keep the main display file
    /^collection-log-background\.png$/ // Keep background assets
  ]

  console.log('🧹 Starting cleanup of temporary test files...')
  
  let deletedCount = 0
  let skippedCount = 0

  try {
    const files = fs.readdirSync(rootDir)
    
    for (const file of files) {
      const filePath = path.join(rootDir, file)
      const stat = fs.statSync(filePath)
      
      // Skip directories and service folders
      if (stat.isDirectory()) {
        continue
      }

      // Skip files that should be kept
      if (keepFiles.has(file)) {
        console.log(`✅ Keeping: ${file} (in keep list)`)
        skippedCount++
        continue
      }

      // Check if file matches keep patterns
      const matchesKeepPattern = keepPatterns.some(pattern => pattern.test(file))
      if (matchesKeepPattern) {
        console.log(`✅ Keeping: ${file} (matches keep pattern)`)
        skippedCount++
        continue
      }

      // Check if file matches remove patterns
      const matchesRemovePattern = removePatterns.some(pattern => pattern.test(file))
      if (matchesRemovePattern) {
        try {
          fs.unlinkSync(filePath)
          console.log(`🗑️  Deleted: ${file}`)
          deletedCount++
        } catch (error) {
          console.log(`❌ Failed to delete ${file}: ${error.message}`)
        }
      } else {
        console.log(`⏩ Skipped: ${file} (no matching pattern)`)
        skippedCount++
      }
    }

    console.log(`\n📊 Cleanup Summary:`)
    console.log(`   🗑️  Files deleted: ${deletedCount}`)
    console.log(`   ✅ Files kept: ${skippedCount}`)
    console.log(`   🎉 Cleanup complete!`)

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}

cleanupTestFiles().catch(console.error)
