#!/usr/bin/env node

import { WikiApiClient } from './scripts/wiki/wikiApiClient.js'
import { WikitextParser } from './scripts/wiki/wikitextParser.js'

async function debugPlainPizzaInfobox() {
  console.log('🔍 Debugging Plain pizza infobox...')
  
  const wikiClient = new WikiApiClient()
  
  try {
    // Get the wikitext for Plain pizza
    const wikitext = await wikiClient.getPageWikitext('Plain pizza')
    
    if (!wikitext) {
      console.log('❌ No wikitext found for Plain pizza')
      return
    }
    
    console.log('\n📝 Raw wikitext (first 800 chars):')
    console.log(wikitext.substring(0, 800) + '...')
    
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
    console.error('❌ Error:', error)
  }
}

debugPlainPizzaInfobox()
