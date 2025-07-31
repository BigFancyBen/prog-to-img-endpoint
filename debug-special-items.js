#!/usr/bin/env node

import { WikiApiClient } from './scripts/wiki/wikiApiClient.js'
import { WikitextParser } from './scripts/wiki/wikitextParser.js'

async function debugSpecialItems() {
  console.log('🔍 Debugging special items...')
  
  const wikiClient = new WikiApiClient()
  
  const pages = [
    'Odd cocktail',
    'Unfinished batta (fruit, historical)'
  ]
  
  for (const pageTitle of pages) {
    console.log(`\n📄 === ${pageTitle} ===`)
    
    try {
      const wikitext = await wikiClient.getPageWikitext(pageTitle)
      
      if (!wikitext) {
        console.log('❌ No wikitext found')
        continue
      }
      
      console.log('\n📝 Raw wikitext (first 1000 chars):')
      console.log(wikitext.substring(0, 1000) + '...')
      
      // Parse it
      const parser = new WikitextParser(wikitext)
      
      // Try to extract infobox
      const foundInfobox = parser.extractInfobox('Infobox Item')
      console.log(`\n📋 Found infobox: ${foundInfobox}`)
      
      if (foundInfobox) {
        const templateData = parser.getTemplateData()
        console.log('\n📊 Template data:')
        console.log(JSON.stringify(templateData, null, 2))
        
        // Try to extract icon
        const icon = parser.extractIcon()
        console.log(`\n🖼️  Extracted icon: ${icon}`)
        
        // Get debug info
        const debugInfo = parser.getDebugInfo()
        console.log('\n🐛 Debug info:', debugInfo)
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message)
    }
  }
}

debugSpecialItems()
