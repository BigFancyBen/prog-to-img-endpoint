import databaseService from './services/databaseService.js'

async function testDbSearch() {
  await databaseService.init()
  console.log('Testing database search for "verac"...')
  const results = await databaseService.searchItemsByNameOnly('verac')
  console.log('Results:', results.length)
  results.forEach(item => console.log('- ID:', item.id, 'Name:', item.name))
  
  console.log('\nTesting database search for "brassard"...')
  const results2 = await databaseService.searchItemsByNameOnly('brassard')
  console.log('Results:', results2.length)
  results2.forEach(item => console.log('- ID:', item.id, 'Name:', item.name))
}

testDbSearch()
