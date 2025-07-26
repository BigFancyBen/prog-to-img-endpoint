import WikiLookupService from './services/wikiLookupService.js'
import databaseService from './services/databaseService.js'

async function testVeracsExtraction() {
  try {
    // Initialize database first
    await databaseService.init()
    
    const wikiLookup = new WikiLookupService()
    
    console.log('Testing extraction of all versions from Verac\'s brassard wiki page...')
    const versions = await wikiLookup.extractAllVersionsFromPage('Verac\'s brassard')
    
    console.log('\nFound versions:')
    versions.forEach((item, index) => {
      console.log(`${index + 1}. ID: ${item.id}, Name: ${item.name}, Version: ${item._version}`)
    })
    
    console.log('\nChecking what\'s currently in database:')
    const dbItems = await databaseService.searchItemsByNameOnly('verac')
    dbItems.forEach(item => {
      if (item.name.toLowerCase().includes('brassard')) {
        console.log(`DB: ID: ${item.id}, Name: ${item.name}`)
      }
    })
    
    // Test lookup by specific ID that should trigger wiki fetch
    console.log('\nTesting lookup by ID 4757 (should exist in wiki):')
    const item4757 = await wikiLookup.lookupItemById('4757')
    if (item4757) {
      console.log(`Found: ID: ${item4757.id}, Name: ${item4757.name}`)
    } else {
      console.log('Item 4757 not found')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testVeracsExtraction()
