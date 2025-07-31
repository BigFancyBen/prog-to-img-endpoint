#!/usr/bin/env node

import databaseService from './services/databaseService.js'

console.log('🔍 Analyzing items that still need icons...')

async function analyzeUnfixedItems() {
  try {
    await databaseService.init()
    const db = databaseService.db

    // Get items still missing icons
    const itemsWithoutIcons = db.prepare(`
      SELECT i.id, i.name, m.wiki_page 
      FROM items i
      LEFT JOIN item_wiki_mapping m ON i.id = m.id
      WHERE (i.icon_data IS NULL OR length(i.icon_data) = 0)
      ORDER BY i.id
    `).all()

    console.log(`\n=== ITEMS STILL MISSING ICONS (${itemsWithoutIcons.length} total) ===`)
    
    // Categorize the problematic items
    const categories = {
      noMapping: [],
      specialCharacters: [],
      variants: [],
      questItems: [],
      deprecated: [],
      other: []
    }

    for (const item of itemsWithoutIcons) {
      if (!item.wiki_page) {
        categories.noMapping.push(item)
      } else if (item.name.includes('???') || item.wiki_page.includes('%3F')) {
        categories.specialCharacters.push(item)
      } else if (item.name.includes('(') && (item.name.includes(')') || item.name.includes('p+') || item.name.includes('kp'))) {
        categories.variants.push(item)
      } else if (item.name.toLowerCase().includes('hex edit') || item.name.toLowerCase().includes('detected')) {
        categories.deprecated.push(item)
      } else if (item.name.toLowerCase().includes('quest') || item.name.toLowerCase().includes('key') || item.name.toLowerCase().includes('piece')) {
        categories.questItems.push(item)
      } else {
        categories.other.push(item)
      }
    }

    // Report categories
    console.log('\n📊 BREAKDOWN BY CATEGORY:')
    console.log(`🚫 No Wiki Mapping: ${categories.noMapping.length}`)
    console.log(`❓ Special Characters: ${categories.specialCharacters.length}`)
    console.log(`🔄 Item Variants: ${categories.variants.length}`)
    console.log(`📜 Quest/Special Items: ${categories.questItems.length}`)
    console.log(`🗑️  Deprecated/Debug Items: ${categories.deprecated.length}`)
    console.log(`❔ Other: ${categories.other.length}`)

    // Show samples from each category
    console.log('\n=== SAMPLES FROM EACH CATEGORY ===')

    if (categories.specialCharacters.length > 0) {
      console.log('\n❓ SPECIAL CHARACTERS (URL encoding issues):')
      categories.specialCharacters.slice(0, 10).forEach(item => {
        console.log(`  ID ${item.id}: ${item.name} → ${item.wiki_page || 'NO MAPPING'}`)
      })
    }

    if (categories.variants.length > 0) {
      console.log('\n🔄 ITEM VARIANTS (poisoned, enchanted, etc.):')
      categories.variants.slice(0, 10).forEach(item => {
        console.log(`  ID ${item.id}: ${item.name} → ${item.wiki_page || 'NO MAPPING'}`)
      })
    }

    if (categories.deprecated.length > 0) {
      console.log('\n🗑️  DEPRECATED/DEBUG ITEMS:')
      categories.deprecated.slice(0, 10).forEach(item => {
        console.log(`  ID ${item.id}: ${item.name} → ${item.wiki_page || 'NO MAPPING'}`)
      })
    }

    if (categories.questItems.length > 0) {
      console.log('\n📜 QUEST/SPECIAL ITEMS:')
      categories.questItems.slice(0, 10).forEach(item => {
        console.log(`  ID ${item.id}: ${item.name} → ${item.wiki_page || 'NO MAPPING'}`)
      })
    }

    if (categories.noMapping.length > 0) {
      console.log('\n🚫 NO WIKI MAPPING:')
      categories.noMapping.slice(0, 10).forEach(item => {
        console.log(`  ID ${item.id}: ${item.name} → NO MAPPING`)
      })
    }

    if (categories.other.length > 0) {
      console.log('\n❔ OTHER PROBLEMATIC ITEMS:')
      categories.other.slice(0, 15).forEach(item => {
        console.log(`  ID ${item.id}: ${item.name} → ${item.wiki_page || 'NO MAPPING'}`)
      })
    }

    // Check 0-byte icons specifically
    console.log('\n=== 0-BYTE ICON ANALYSIS ===')
    const zeroByteIcons = db.prepare(`
      SELECT i.id, i.name, m.wiki_page 
      FROM items i
      LEFT JOIN item_wiki_mapping m ON i.id = m.id
      WHERE i.icon_data IS NOT NULL AND length(i.icon_data) = 0
      ORDER BY i.id
    `).all()

    console.log(`Found ${zeroByteIcons.length} items with 0-byte icon data:`)
    zeroByteIcons.forEach(item => {
      console.log(`  ID ${item.id}: ${item.name} → ${item.wiki_page || 'NO MAPPING'}`)
    })

    // Show some high-ID items that might be newer
    console.log('\n=== HIGHEST ID ITEMS MISSING ICONS (newest items) ===')
    const highIdItems = itemsWithoutIcons
      .filter(item => item.id > 20000)
      .sort((a, b) => b.id - a.id)
      .slice(0, 10)

    highIdItems.forEach(item => {
      console.log(`  ID ${item.id}: ${item.name} → ${item.wiki_page || 'NO MAPPING'}`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

analyzeUnfixedItems()
