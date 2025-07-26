import { WikiApiClient } from './scripts/wiki/wikiApiClient.js'

async function testWikiClient() {
  try {
    console.log('Testing WikiApiClient...')
    const client = new WikiApiClient()
    
    // Test a simple API request
    const response = await client.makeRequest({
      action: 'query',
      titles: "Verac's_brassard",
      format: 'json'
    })
    
    console.log('Response status:', response.status)
    console.log('Response data:', JSON.stringify(response.data, null, 2))
    
    // Test getting page wikitext
    console.log('\nTesting getPageWikitext...')
    const wikitext = await client.getPageWikitext("Verac's_brassard")
    console.log('Wikitext length:', wikitext ? wikitext.length : 'null')
    console.log('First 200 chars:', wikitext ? wikitext.substring(0, 200) : 'null')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testWikiClient()
