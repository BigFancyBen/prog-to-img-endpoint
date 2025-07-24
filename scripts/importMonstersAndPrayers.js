#!/usr/bin/env node

import { readFile } from 'fs/promises'
import db from '../services/databaseService.js'

async function importMonstersAndPrayers() {
  console.log('🔄 Importing monsters and prayers to database...')
  
  try {
    await db.init()
    
    // Import monsters
    console.log('\n📁 Loading monsters data...')
    const monstersData = JSON.parse(await readFile('data/cache/monsters-complete.json', 'utf8'))
    console.log(`✅ Found ${Array.isArray(monstersData) ? monstersData.length : Object.keys(monstersData).length} monsters`)
    
    let monstersImported = 0
    const monsterInsert = db.db.prepare(`
      INSERT OR REPLACE INTO monsters (
        id, name, examine, wiki_name, wiki_url, icon_path, members, 
        release_date, combat_level, hitpoints, max_hit, attack_type, 
        attack_speed, aggressive, poisonous, immune_poison, immune_venom
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const monsters = Array.isArray(monstersData) ? monstersData : Object.values(monstersData)
    for (const monster of monsters) {
      try {
        monsterInsert.run(
          monster.id || null,
          monster.name || '',
          monster.examine || '',
          monster.wiki_name || monster.name,
          monster.wiki_url || '',
          null, // icon_path - not in JSON data
          monster.members ? 1 : 0,
          monster.release_date || null,
          monster.combat_level || null,
          monster.hitpoints || null,
          monster.max_hit || null,
          monster.attack_type ? JSON.stringify(monster.attack_type) : null,
          monster.attack_speed || null,
          monster.aggressive ? 1 : 0,
          monster.poisonous ? 1 : 0,
          monster.immune_poison ? 1 : 0,
          monster.immune_venom ? 1 : 0
        )
        monstersImported++
      } catch (error) {
        console.warn(`⚠️  Failed to import monster: ${monster.name}`, error.message)
      }
    }
    
    console.log(`✅ Imported ${monstersImported} monsters`)
    
    // Import prayers
    console.log('\n📁 Loading prayers data...')
    const prayersData = JSON.parse(await readFile('data/cache/prayers-complete.json', 'utf8'))
    console.log(`✅ Found ${Array.isArray(prayersData) ? prayersData.length : Object.keys(prayersData).length} prayers`)
    
    let prayersImported = 0
    const prayerInsert = db.db.prepare(`
      INSERT OR REPLACE INTO prayers (
        id, name, examine, wiki_name, wiki_url, icon_path, 
        members, level_required, drain_rate, book
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const prayers = Array.isArray(prayersData) ? prayersData : Object.values(prayersData)
    for (const prayer of prayers) {
      try {
        prayerInsert.run(
          prayer.id || null,
          prayer.name || '',
          prayer.examine || '',
          prayer.wiki_name || prayer.name,
          prayer.wiki_url || '',
          null, // icon_path - not in JSON data
          prayer.members ? 1 : 0,
          prayer.level || null,
          prayer.drain_rate || null,
          prayer.book || null
        )
        prayersImported++
      } catch (error) {
        console.warn(`⚠️  Failed to import prayer: ${prayer.name}`, error.message)
      }
    }
    
    console.log(`✅ Imported ${prayersImported} prayers`)
    
    // Final counts
    const finalCounts = {
      items: db.db.prepare('SELECT COUNT(*) as count FROM items').get().count,
      monsters: db.db.prepare('SELECT COUNT(*) as count FROM monsters').get().count,
      prayers: db.db.prepare('SELECT COUNT(*) as count FROM prayers').get().count
    }
    
    console.log('\n📊 Final database counts:')
    console.log(`  Items: ${finalCounts.items}`)
    console.log(`  Monsters: ${finalCounts.monsters}`)
    console.log(`  Prayers: ${finalCounts.prayers}`)
    console.log('\n🎉 Import completed successfully!')
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  }
}

importMonstersAndPrayers().catch(console.error)
