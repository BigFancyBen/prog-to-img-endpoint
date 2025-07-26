import databaseService from '../services/databaseService.js'
import WikiLookupService from '../services/wikiLookupService.js'

async function fetchMissingBarrowsItems() {
  console.log('⚔️  Fetching Missing Barrows Items')
  console.log('==================================')
  
  await databaseService.init()
  const wikiLookup = new WikiLookupService()

  // Known Barrows item base names - each should have multiple damage states
  const barrowsItems = [
    'Ahrim\'s hood',
    'Ahrim\'s robe top', 
    'Ahrim\'s robe bottom',
    'Ahrim\'s staff',
    
    'Dharok\'s helm',
    'Dharok\'s platebody',
    'Dharok\'s platelegs', 
    'Dharok\'s greataxe',
    
    'Guthan\'s helm',
    'Guthan\'s platebody',
    'Guthan\'s chainskirt',
    'Guthan\'s warspear',
    
    'Karil\'s coif',
    'Karil\'s leathertop',
    'Karil\'s leatherskirt',
    'Karil\'s crossbow',
    
    'Torag\'s helm',
    'Torag\'s platebody', 
    'Torag\'s platelegs',
    'Torag\'s hammers',
    
    // Verac's items (we already have these but let's verify)
    'Verac\'s helm',
    'Verac\'s brassard',
    'Verac\'s plateskirt',
    'Verac\'s flail'
  ]

  console.log(`🎯 Attempting to fetch ${barrowsItems.length} Barrows items...`)
  console.log('📝 Each item should import all damage states (0, 25, 50, 75, 100, undamaged)')
  console.log('')

  let found = 0
  let notFound = 0

  for (const itemName of barrowsItems) {
    try {
      console.log(`\n🔍 Looking up: ${itemName}`)
      
      // Use WikiLookupService to fetch the item and all its versions
      const item = await wikiLookup.lookupItemByName(itemName)
      
      if (item) {
        console.log(`✅ Found: ${item.name} (ID: ${item.id})`)
        found++
      } else {
        console.log(`❌ Not found: ${itemName}`)
        notFound++
      }
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error(`❌ Error fetching ${itemName}:`, error.message)
      notFound++
    }
  }

  console.log(`\n🎉 Barrows fetch complete!`)
  console.log(`📊 Results:`)
  console.log(`  - Items found: ${found}`)
  console.log(`  - Items not found: ${notFound}`)

  // Check final state
  const db = databaseService.db
  const finalBarrowsItems = db.prepare(`
    SELECT id, name 
    FROM items 
    WHERE name LIKE '%Ahrim%' 
    OR name LIKE '%Dharok%' 
    OR name LIKE '%Guthan%' 
    OR name LIKE '%Karil%' 
    OR name LIKE '%Torag%' 
    OR name LIKE '%Verac%'
    ORDER BY name
  `).all()

  console.log(`\n📊 Final database state: ${finalBarrowsItems.length} Barrows items`)
  
  // Group by brother
  const brothers = {}
  finalBarrowsItems.forEach(item => {
    const brother = item.name.split("'s")[0] + "'s"
    if (!brothers[brother]) brothers[brother] = 0
    brothers[brother]++
  })

  for (const [brother, count] of Object.entries(brothers)) {
    console.log(`  - ${brother}: ${count} items`)
  }

  await databaseService.close()
}

fetchMissingBarrowsItems()
