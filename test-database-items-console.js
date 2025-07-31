import databaseService from './services/databaseService.js'

/**
 * Simple console test to display item data structure and sample items
 */
async function testDatabaseItems() {
  try {
    console.log('🔄 Initializing database...')
    await databaseService.init()
    
    console.log('📊 Loading all items from database...')
    const allItems = databaseService.getAllItems()
    console.log(`   ✅ Loaded ${allItems.length} items`)
    
    // Show first 10 items with details
    console.log('\n📋 Sample of first 10 items:')
    console.log('─'.repeat(80))
    
    allItems.slice(0, 10).forEach((item, index) => {
      console.log(`\n${index + 1}. Item ID: ${item.id}`)
      console.log(`   Name: "${item.name}"`)
      console.log(`   Examine: "${item.examine || 'N/A'}"`)
      console.log(`   Icon: ${item.icon_path ? '✅ Has icon path' : item.icon_data ? '✅ Has icon data' : '❌ No icon'}`)
      console.log(`   Members: ${item.members ? 'Yes' : 'No'}`)
      console.log(`   Tradeable: ${item.tradeable ? 'Yes' : 'No'}`)
      if (item.wiki_url) {
        console.log(`   Wiki: ${item.wiki_url}`)
      }
    })
    
    // Show some statistics
    console.log('\n📈 Database Statistics:')
    console.log('─'.repeat(40))
    
    const itemsWithIcons = allItems.filter(item => item.icon_path || item.icon_data)
    const itemsWithoutIcons = allItems.filter(item => !item.icon_path && !item.icon_data)
    const membersItems = allItems.filter(item => item.members)
    const f2pItems = allItems.filter(item => !item.members)
    const tradeableItems = allItems.filter(item => item.tradeable)
    
    console.log(`Total items: ${allItems.length}`)
    console.log(`Items with icons: ${itemsWithIcons.length} (${((itemsWithIcons.length / allItems.length) * 100).toFixed(1)}%)`)
    console.log(`Items without icons: ${itemsWithoutIcons.length} (${((itemsWithoutIcons.length / allItems.length) * 100).toFixed(1)}%)`)
    console.log(`Members items: ${membersItems.length} (${((membersItems.length / allItems.length) * 100).toFixed(1)}%)`)
    console.log(`F2P items: ${f2pItems.length} (${((f2pItems.length / allItems.length) * 100).toFixed(1)}%)`)
    console.log(`Tradeable items: ${tradeableItems.length} (${((tradeableItems.length / allItems.length) * 100).toFixed(1)}%)`)
    
    // Show items by ID ranges
    console.log('\n📊 Items by ID ranges:')
    const ranges = [
      { min: 1, max: 1000, name: '1-1000' },
      { min: 1001, max: 5000, name: '1001-5000' },
      { min: 5001, max: 10000, name: '5001-10000' },
      { min: 10001, max: 15000, name: '10001-15000' },
      { min: 15001, max: 20000, name: '15001-20000' },
      { min: 20001, max: Infinity, name: '20000+' }
    ]
    
    ranges.forEach(range => {
      const itemsInRange = allItems.filter(item => item.id >= range.min && item.id <= range.max)
      console.log(`   ${range.name}: ${itemsInRange.length} items`)
    })
    
    // Show some interesting items
    console.log('\n🎯 Some interesting items:')
    console.log('─'.repeat(40))
    
    const interestingItems = [
      'Abyssal whip',
      'Dragon scimitar',
      'Rune platebody',
      'Lobster',
      'Coins',
      'Fire rune',
      'Adamant arrow',
      'Prayer potion(4)'
    ]
    
    interestingItems.forEach(itemName => {
      const item = allItems.find(i => i.name === itemName)
      if (item) {
        console.log(`   ${item.name} (ID: ${item.id}) - ${item.icon_path || item.icon_data ? 'Has icon' : 'No icon'}`)
      }
    })
    
    console.log('\n✅ Database test completed!')
    console.log('💡 You can now open "all-items-display.html" in a browser to see all items with icons')
    
  } catch (error) {
    console.error('❌ Error testing database:', error)
    throw error
  }
}

// Run the test
testDatabaseItems().catch(console.error)
