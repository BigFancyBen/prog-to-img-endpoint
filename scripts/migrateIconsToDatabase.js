import { readFile, readdir, stat } from 'fs/promises'
import { join } from 'path'
import databaseService from '../services/databaseService.js'

const ICONS_DIR = join(process.cwd(), 'icons/items')

/**
 * Migrate all existing PNG icons from filesystem to database BLOBs
 */
async function migrateIconsToDatabase() {
  try {
    console.log('🚀 Starting icon migration to database...')
    
    // Initialize database
    await databaseService.init()
    
    // Get all PNG files in icons directory
    const files = await readdir(ICONS_DIR)
    const pngFiles = files.filter(file => file.endsWith('.png'))
    
    console.log(`📁 Found ${pngFiles.length} PNG files to migrate`)
    
    let successCount = 0
    let failCount = 0
    let skipCount = 0
    
    for (const file of pngFiles) {
      try {
        // Extract item ID from filename (e.g., "2438.png" -> 2438)
        const itemId = parseInt(file.replace('.png', ''))
        
        if (isNaN(itemId)) {
          console.log(`⚠️  Skipping invalid filename: ${file}`)
          skipCount++
          continue
        }
        
        // Check if this item exists in database
        const item = databaseService.getItemById(itemId)
        if (!item) {
          console.log(`⚠️  Item ${itemId} not found in database, skipping`)
          skipCount++
          continue
        }
        
        // Check if icon already exists in database
        if (databaseService.hasIconData(itemId)) {
          console.log(`📁 Icon already in database for item ${itemId}, skipping`)
          skipCount++
          continue
        }
        
        // Read the PNG file
        const iconPath = join(ICONS_DIR, file)
        const stats = await stat(iconPath)
        
        if (stats.size === 0) {
          console.log(`⚠️  Skipping empty file: ${file}`)
          skipCount++
          continue
        }
        
        const iconBuffer = await readFile(iconPath)
        
        // Store in database
        const success = databaseService.storeIconData(itemId, iconBuffer)
        
        if (success) {
          console.log(`✅ Migrated ${file} (${stats.size} bytes) for item: ${item.name}`)
          successCount++
        } else {
          console.log(`❌ Failed to store ${file} in database`)
          failCount++
        }
        
        // Small delay to avoid overwhelming the database
        if (successCount % 100 === 0) {
          console.log(`📊 Progress: ${successCount} migrated, ${failCount} failed, ${skipCount} skipped`)
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
      } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message)
        failCount++
      }
    }
    
    // Final stats
    console.log('\\n🎉 Migration complete!')
    console.log(`✅ Successfully migrated: ${successCount}`)
    console.log(`❌ Failed: ${failCount}`)
    console.log(`⚠️  Skipped: ${skipCount}`)
    console.log(`📊 Total processed: ${successCount + failCount + skipCount}`)
    
    // Show database stats
    const dbStats = databaseService.getStats()
    console.log(`\\n📈 Database Stats:`)
    console.log(`  Items: ${dbStats.items}`)
    console.log(`  Items with icons: ${dbStats.itemsWithIcons}`)
    console.log(`  Icon coverage: ${dbStats.iconCoverage}`)
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
  } finally {
    await databaseService.close()
  }
}

// Run migration
migrateIconsToDatabase()
