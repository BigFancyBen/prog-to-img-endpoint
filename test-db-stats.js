import databaseService from './services/databaseService.js'

async function testStats() {
  try {
    await databaseService.init()
    const stats = await databaseService.getStats()
    
    console.log('📊 Database Stats:')
    console.log('  Items:', stats.items)
    console.log('  Items with icons:', stats.itemsWithIcons)
    console.log('  Icon coverage:', stats.iconCoverage + '%')
    
    // Test icon retrieval for a few items
    console.log('\n🖼️  Testing icon retrieval:')
    const testItems = [1, 10016, 101]
    
    for (const itemId of testItems) {
      const hasIcon = await databaseService.hasIconData(itemId)
      if (hasIcon) {
        const iconData = await databaseService.getIconData(itemId)
        console.log(`  ✅ Item ${itemId}: Icon exists (${iconData.length} bytes)`)
      } else {
        console.log(`  ❌ Item ${itemId}: No icon found`)
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
  
  process.exit(0)
}

testStats()
