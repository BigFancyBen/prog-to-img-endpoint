import wtf from 'wtf_wikipedia'
import { WikiApiClient } from './scripts/wiki/wikiApiClient.js'

const client = new WikiApiClient()

async function testWikiparsing() {
  try {
    const wikitext = await client.getPageWikitext('Abyssal whip')
    const doc = wtf(wikitext)
    
    console.log('=== TEMPLATES ===')
    const templates = doc.templates()
    templates.forEach((t, i) => {
      console.log(`Template ${i}: ${t.data?.template || 'unnamed'}`)
    })
    
    console.log('\n=== INFOBOXES ===')
    const infoboxes = doc.infoboxes()
    infoboxes.forEach((box, i) => {
      console.log(`Infobox ${i}:`, Object.keys(box.data || {}))
      console.log(`  Template name: ${box.template}`)
      console.log(`  First few properties:`, Object.entries(box.data || {}).slice(0, 5))
    })
    
    console.log('\n=== SECTIONS ===')
    const sections = doc.sections()
    sections.forEach((section, i) => {
      if (section.templates && section.templates().length > 0) {
        console.log(`Section ${i} (${section.title()}): ${section.templates().length} templates`)
      }
    })
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testWikiparsing()
