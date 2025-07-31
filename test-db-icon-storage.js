import databaseService from './services/databaseService.js'

console.log('Testing database icon storage...')

try {
  await databaseService.init()
  
  // Test storing some dummy icon data
  const testItemId = 99999
  const testIconBuffer = Buffer.from('test icon data')
  
  // First, insert a test item
  const itemData = {
    id: testItemId,
    name: 'Test Item',
    examine: 'A test item',
    wiki_name: 'Test Item',
    wiki_url: 'https://test.com',
    icon_path: 'test.png',
    icon_url: null,
    icon_data: testIconBuffer,
    members: false,
    tradeable: false,
    tradeable_on_ge: false,
    stackable: false,
    noted: false,
    noteable: false,
    weight: 0,
    buy_limit: 0,
    quest_item: false,
    release_date: null,
    duplicate: false,
    equipable: false,
    equipable_by_player: false,
    equipable_weapon: false,
    cost: 0,
    lowalch: 0,
    highalch: 0,
    destruction: null,
    last_updated: new Date().toISOString()
  }
  
  console.log('Inserting test item with icon data...')
  const result = databaseService.insertItem(itemData)
  console.log('Insert result:', result)
  
  // Test retrieving the icon data
  console.log('Checking if icon data exists...')
  const hasIcon = await databaseService.hasIconData(testItemId)
  console.log('Has icon data:', hasIcon)
  
  if (hasIcon) {
    const iconData = databaseService.getIconData(testItemId)
    console.log('Retrieved icon data length:', iconData ? iconData.length : 'null')
    console.log('✅ Icon storage test passed!')
  } else {
    console.log('❌ Icon storage test failed - no icon data found')
  }
  
  // Clean up
  databaseService.db.prepare('DELETE FROM items WHERE id = ?').run(testItemId)
  console.log('Test item cleaned up')
  
} catch (error) {
  console.error('❌ Test error:', error.message)
  console.error(error.stack)
}
