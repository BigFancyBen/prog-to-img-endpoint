import databaseService from './services/databaseService.js'

/**
 * Debug script to investigate icon data issues
 */
async function debugIconIssues() {
  try {
    console.log('🔄 Initializing database...')
    await databaseService.init()
    
    console.log('🔍 Investigating specific items with icon issues...')
    
    const problemItems = [
      4858, // Ahrim's hood (50)
      4864, // Ahrim's staff (50)
      4894, // Verac's brassard (100)
      4892, // Verac's brassard (75)
      4890, // Verac's brassard (50)
      4888  // Verac's brassard (25)
    ]
    
    for (const itemId of problemItems) {
      console.log(`\n🔍 Checking item ID ${itemId}:`)
      
      // Get item data
      const item = databaseService.getItemById(itemId)
      if (item) {
        console.log(`   Name: "${item.name}"`)
        console.log(`   Icon path: ${item.icon_path || 'null'}`)
        console.log(`   Icon URL: ${item.icon_url || 'null'}`)
      } else {
        console.log(`   ❌ Item not found`)
        continue
      }
      
      // Check raw icon data
      const iconBuffer = databaseService.getIconData(itemId)
      if (iconBuffer) {
        console.log(`   Icon buffer length: ${iconBuffer.length} bytes`)
        
        // Check if it's actually valid image data
        const base64 = iconBuffer.toString('base64')
        console.log(`   Base64 length: ${base64.length} chars`)
        console.log(`   Base64 starts with: ${base64.substring(0, 50)}...`)
        
        // Check for PNG header
        const isPNG = iconBuffer[0] === 0x89 && iconBuffer[1] === 0x50 && iconBuffer[2] === 0x4E && iconBuffer[3] === 0x47
        console.log(`   Is PNG format: ${isPNG}`)
        
        if (!isPNG) {
          console.log(`   ⚠️  Icon data exists but is not valid PNG format`)
        }
      } else {
        console.log(`   ❌ No icon data found`)
      }
    }
    
    console.log('\n📊 Database-wide icon analysis:')
    
    // Get all items and analyze icon data
    const allItems = databaseService.getAllItems()
    let validIcons = 0
    let invalidIcons = 0
    let emptyIcons = 0
    let noIcons = 0
    
    for (const item of allItems) {
      const iconBuffer = databaseService.getIconData(item.id)
      
      if (!iconBuffer) {
        noIcons++
      } else if (iconBuffer.length === 0) {
        emptyIcons++
      } else {
        // Check if it's valid PNG
        const isPNG = iconBuffer[0] === 0x89 && iconBuffer[1] === 0x50 && iconBuffer[2] === 0x4E && iconBuffer[3] === 0x47
        if (isPNG) {
          validIcons++
        } else {
          invalidIcons++
          if (invalidIcons <= 10) { // Show first 10 invalid icons
            console.log(`   Invalid icon: ${item.name} (ID: ${item.id}) - ${iconBuffer.length} bytes`)
          }
        }
      }
    }
    
    console.log(`   Total items: ${allItems.length}`)
    console.log(`   Valid PNG icons: ${validIcons}`)
    console.log(`   Invalid icon data: ${invalidIcons}`)
    console.log(`   Empty icon buffers: ${emptyIcons}`)
    console.log(`   No icon data: ${noIcons}`)
    console.log(`   Actual icon coverage: ${((validIcons / allItems.length) * 100).toFixed(1)}%`)
    
  } catch (error) {
    console.error('❌ Error debugging icons:', error)
  }
}

// Run the debug
debugIconIssues().catch(console.error)
