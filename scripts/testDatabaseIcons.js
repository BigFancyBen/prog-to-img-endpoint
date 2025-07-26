#!/usr/bin/env node

import databaseService from '../services/databaseService.js'
import IconService from '../services/iconService.js'
import FileService from '../services/fileService.js'
import OSRSDataService from '../services/osrsDataService.js'

async function testDatabaseIcons() {
  console.log('🧪 Testing Database Icon System')
  console.log('=' .repeat(50))
  
  try {
    // Initialize database
    await databaseService.init()
    
    // Get database stats
    const stats = await databaseService.getStats()
    console.log('\n📊 Database Stats:')
    console.log(`   Items: ${stats.items}`)
    console.log(`   Items with icons: ${stats.itemsWithIcons}`)
    console.log(`   Icon coverage: ${stats.iconCoverage}`)
    
    // Test a few specific items
    const testItems = [1, 17, 91, 995, 4151] // Common items
    
    console.log('\n🔍 Testing Icon Retrieval:')
    for (const itemId of testItems) {
      console.log(`\nItem ${itemId}:`)
      
      // Test IconService directly
      const hasIcon = await IconService.hasItemIcon(itemId)
      console.log(`   IconService.hasItemIcon(): ${hasIcon ? '✅' : '❌'}`)
      
      if (hasIcon) {
        const iconDataUrl = await IconService.getItemIcon(itemId)
        const iconBuffer = await IconService.getItemIconBuffer(itemId)
        console.log(`   IconService.getItemIcon(): ${iconDataUrl ? '✅ Data URL returned' : '❌ No data URL'}`)
        console.log(`   IconService.getItemIconBuffer(): ${iconBuffer ? `✅ Buffer (${iconBuffer.length} bytes)` : '❌ No buffer'}`)
      }
      
      // Test FileService (should use IconService internally)
      const fileServiceIcon = await FileService.getItemIconUrl(itemId, false) // Disable wiki lookup
      console.log(`   FileService.getItemIconUrl(): ${fileServiceIcon ? '✅ Data URL returned' : '❌ No data URL'}`)
      
      // Test OSRSDataService (should use IconService internally)
      const osrsIcon = await OSRSDataService.getItemIconUrl(itemId)
      console.log(`   OSRSDataService.getItemIconUrl(): ${osrsIcon ? '✅ Data URL returned' : '❌ No data URL'}`)
    }
    
    // Test database vs filesystem comparison
    console.log('\n🆚 Database vs Filesystem Test:')
    const testItemId = 995 // Coins
    
    // Check if icon exists in database
    const dbHasIcon = await databaseService.hasIconData(testItemId)
    const dbIconData = await databaseService.getIconData(testItemId)
    
    console.log(`   Database has icon for item ${testItemId}: ${dbHasIcon ? '✅' : '❌'}`)
    if (dbIconData) {
      console.log(`   Database icon size: ${dbIconData.length} bytes`)
    }
    
    // Get through IconService
    const iconServiceResult = await IconService.getItemIcon(testItemId)
    console.log(`   IconService result: ${iconServiceResult ? '✅ Success' : '❌ Failed'}`)
    
    console.log('\n✅ Database icon system test complete!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    databaseService.close()
  }
}

// Run the test
testDatabaseIcons()
