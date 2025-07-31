#!/usr/bin/env node

import databaseService from './services/databaseService.js'

console.log('🧪 Testing categorization of Hex edit detected items...')

async function testHexEditItems() {
  try {
    await databaseService.init()
    const db = databaseService.db

    // Find all hex edit detected items
    const hexEditItems = db.prepare(`
      SELECT i.id, i.name, m.wiki_page 
      FROM items i
      LEFT JOIN item_wiki_mapping m ON i.id = m.id
      WHERE i.name LIKE '%hex edit detected%'
      ORDER BY i.id
    `).all()

    console.log(`\n📊 Found ${hexEditItems.length} "Hex edit detected" items:`)
    
    hexEditItems.forEach(item => {
      console.log(`  ID ${item.id}: ${item.name} → ${item.wiki_page || 'NO MAPPING'}`)
    })

    // Test the categorization logic from the comprehensive fetcher
    function isDeprecatedItem(name) {
      const deprecatedPatterns = [
        'hex edit detected',
        'debug',
        'test item',
        'placeholder'
      ]
      
      const lowerName = name.toLowerCase()
      return deprecatedPatterns.some(pattern => lowerName.includes(pattern))
    }

    console.log('\n🔍 Testing categorization logic:')
    hexEditItems.forEach(item => {
      const isDeprecated = isDeprecatedItem(item.name)
      console.log(`  ${item.name}: ${isDeprecated ? '✅ WILL BE SKIPPED' : '❌ NOT DETECTED AS DEPRECATED'}`)
    })

    // Check current icon status of these items
    console.log('\n🎨 Current icon status:')
    hexEditItems.forEach(item => {
      const iconData = db.prepare('SELECT length(icon_data) as size FROM items WHERE id = ?').get(item.id)
      const iconSize = iconData ? iconData.size || 0 : 0
      console.log(`  ID ${item.id}: ${iconSize} bytes ${iconSize === 0 ? '(no icon - expected)' : '(has icon - unexpected)'}`)
    })

    // Summary
    const totalHexItems = hexEditItems.length
    const itemsWithIcons = hexEditItems.filter(item => {
      const iconData = db.prepare('SELECT length(icon_data) as size FROM items WHERE id = ?').get(item.id)
      return iconData && iconData.size > 0
    }).length

    console.log('\n📊 Summary:')
    console.log(`  Total hex edit items: ${totalHexItems}`)
    console.log(`  Items with icons: ${itemsWithIcons}`)
    console.log(`  Items without icons: ${totalHexItems - itemsWithIcons}`)
    console.log(`  Expected result: All should be without icons (these are debug items)`)

    if (itemsWithIcons === 0) {
      console.log('✅ GOOD: No hex edit items have icons (as expected)')
    } else {
      console.log('⚠️  WARNING: Some hex edit items have icons (unexpected)')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testHexEditItems()
