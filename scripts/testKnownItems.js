import WikiLookupService from '../services/wikiLookupService.js'
import databaseService from '../services/databaseService.js'

async function testKnownItems() {
  console.log('🧪 Testing WikiLookupService with known items...')
  
  try {
    await databaseService.init()
    const wikiService = new WikiLookupService()
    
    // Test with some known items from different ID ranges
    const testItems = [
      { id: 1277, name: 'Bronze sword' },      // Lower range
      { id: 4151, name: 'Abyssal whip' },     // Mid range  
      { id: 11802, name: 'Armadyl godsword' }, // Higher range
      { id: 2, name: 'Cannonball' },          // Very low range from our failing test
      { id: 4, name: 'Ammo mould' }           // Another failing one
    ]
    
    for (const item of testItems) {
      console.log(`\n🔍 Testing item ${item.id}: ${item.name}`)
      
      try {
        const result = await wikiService.lookupItemById(item.id)
        
        if (result && result.id) {
          console.log(`  ✅ SUCCESS: Found item`)
          console.log(`    - ID: ${result.id}`)
          console.log(`    - Name: ${result.name}`)
          console.log(`    - Icon: ${result.icon_path || 'N/A'}`)
        } else {
          console.log(`  ❌ FAILED: No result returned`)
          console.log(`    - Result:`, result)
        }
        
      } catch (error) {
        console.log(`  💥 ERROR: ${error.message}`)
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    console.log('\n🏁 Test completed')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  } finally {
    await databaseService.close()
  }
}

testKnownItems()
