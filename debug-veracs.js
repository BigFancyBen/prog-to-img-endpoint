import { WikiApiClient }       console.log('All infobox data with text extraction:')
      for (const [key, value] of Object.entries(data)) {
        const text = value && value.text ? value.text() : value
        console.log(`  ${key}: ${text}`)
      }ki/wikiApiClient.js'
import wtf from 'wtf_wikipedia'

async function debugVeracsBrassard() {
  try {
    console.log('Debugging Verac\'s brassard extraction...')
    const client = new WikiApiClient()
    
    // Get the wikitext
    const wikitext = await client.getPageWikitext("Verac's_brassard")
    console.log('Got wikitext, length:', wikitext.length)
    
    // Try parsing with wtf_wikipedia
    console.log('\nParsing with wtf_wikipedia...')
    const doc = wtf(wikitext)
    console.log('Document created:', !!doc)
    
    const infoboxes = doc.infoboxes()
    console.log('Found infoboxes:', infoboxes.length)
    
    if (infoboxes.length > 0) {
      const infobox = infoboxes[0]
      console.log('First infobox template:', infobox.template)
      console.log('Data keys:', Object.keys(infobox.data || {}))
      
      // Check for ID and name with different variations
      const data = infobox.data || {}
      console.log('Looking for name and ID fields:')
      for (const [key, value] of Object.entries(data)) {
        if (key.includes('name') || key.includes('id')) {
          // Try to extract text from Sentence objects
          const text = value && value.text ? value.text() : value
          console.log(`  ${key}:`, text)
        }
      }
      
      // Let's also check all fields with .text() extraction
      console.log('\nFirst few fields with text extraction:')
      const entries = Object.entries(data).slice(0, 5)
      for (const [key, value] of entries) {
        const text = value && value.text ? value.text() : value
        console.log(`  ${key}:`, text)
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

debugVeracsBrassard()
