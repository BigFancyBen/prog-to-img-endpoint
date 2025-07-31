#!/usr/bin/env node

import { WikiApiClient } from './scripts/wiki/wikiApiClient.js'
import { WikitextParser } from './scripts/wiki/wikitextParser.js'

async function debugMeatPieInfobox() {
  console.log('🔍 Debugging Meat pie infobox...')
  
  const wikiClient = new WikiApiClient()
  
  try {
    // Get the wikitext for Meat pie
    const wikitext = await wikiClient.getPageWikitext('Meat pie')
    
    if (!wikitext) {
      console.log('❌ No wikitext found for Meat pie')
      return
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
    
    // Also try other common template names
    const templateTypes = [
      'Infobox Item',
      'Infobox item',
      'Item',
      'ItemInfo',
      'Food',
      'FoodInfo'
    ]
    
    for (const templateType of templateTypes) {
      console.log(`\n🔍 Trying template type: ${templateType}`)
      const parser2 = new WikitextParser(wikitext)
      const found = parser2.extractInfobox(templateType)
      if (found) {
        console.log(`✅ Found with ${templateType}`)
        const icon = parser2.extractIcon()
        console.log(`🖼️  Icon: ${icon}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugMeatPieInfobox()
