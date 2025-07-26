import { WikiApiClient } from './scripts/wiki/wikiApiClient.js'
import { WikitextParser } from './scripts/wiki/wikitextParser.js'

async function testWikitextParser() {
  try {
    console.log('Testing WikitextParser...')
    const client = new WikiApiClient()
    
    // Get the wikitext for Verac's brassard
    const wikitext = await client.getPageWikitext("Verac's_brassard")
    console.log('Got wikitext, length:', wikitext.length)
    
    // Show first 1000 characters to see the structure
    console.log('\nFirst 1000 characters:')
    console.log(wikitext.substring(0, 1000))
    
    // Parse it
    const parser = new WikitextParser(wikitext)
    
    // Check what infoboxes are available
    if (parser.doc) {
      const infoboxes = parser.doc.infoboxes()
      console.log('\nFound infoboxes:', infoboxes.length)
      
      for (let i = 0; i < infoboxes.length; i++) {
        const infobox = infoboxes[i]
        console.log(`Infobox ${i + 1}:`, infobox.template)
        
        // Show some data
        const data = infobox.data || {}
        console.log('  Keys:', Object.keys(data).slice(0, 10))
      }
    } else {
      console.log('No parser.doc available')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testWikitextParser()
