#!/usr/bin/env node

import WikiLookupService from './services/wikiLookupService.js'
import { WikiApiClient } from './scripts/wiki/wikiApiClient.js'
import { WikitextParser } from './scripts/wiki/wikitextParser.js'

async function debugVersionedIconExtraction() {
  console.log('🔍 Debugging versioned icon extraction...')
  
  const wikiClient = new WikiApiClient()
  const wikitext = await wikiClient.getPageWikitext('Plain pizza')
  const parser = new WikitextParser(wikitext)
  
  // Extract infobox
  parser.extractInfobox('Infobox Item')
  const template = parser.template
  
  console.log('\n📊 Template data for images:')
  console.log('image1:', template.image1)
  console.log('image2:', template.image2)
  
  // Create lookup service to use its method
  const lookupService = new WikiLookupService()
  
  // Test extractVersionedValue for both versions
  console.log('\n🔍 Testing extractVersionedValue:')
  const image1 = lookupService.extractVersionedValue(template, 'image', 1)
  const image2 = lookupService.extractVersionedValue(template, 'image', 2)
  
  console.log('Version 1 image:', image1)
  console.log('Version 2 image:', image2)
  
  // Test parser.extractIcon()
  console.log('\n🔍 Testing parser.extractIcon():')
  const defaultIcon = parser.extractIcon()
  console.log('Default icon:', defaultIcon)
  
  // Test the logic used in extractSingleItemData
  console.log('\n🔍 Testing extractSingleItemData logic:')
  for (const versionNum of [1, 2]) {
    const iconFilename = versionNum ? 
      lookupService.extractVersionedValue(template, 'image', versionNum) || parser.extractIcon() :
      parser.extractIcon()
    
    console.log(`Version ${versionNum} icon filename:`, iconFilename)
    
    // Test URL construction
    if (iconFilename) {
      const iconUrl = parser.getIconUrl(iconFilename)
      console.log(`Version ${versionNum} icon URL:`, iconUrl)
    }
  }
}

debugVersionedIconExtraction()
