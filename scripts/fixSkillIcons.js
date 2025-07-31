#!/usr/bin/env node

import databaseService from '../services/databaseService.js'
import WikiLookupService from '../services/wikiLookupService.js'

console.log('🎯 Skill Icon Fixer for Complex Progress Report')

class SkillIconFixer {
  constructor() {
    this.wikiService = new WikiLookupService()
  }

  async init() {
    await databaseService.init()
    console.log('✅ Database initialized')
  }

  async checkAndFixSkillIcons() {
    const db = databaseService.db
    
    // List of all OSRS skills that need icons
    const skills = [
      'Attack', 'Strength', 'Defence', 'Ranged', 'Prayer', 'Magic',
      'Runecraft', 'Construction', 'Hitpoints', 'Agility', 'Herblore',
      'Thieving', 'Crafting', 'Fletching', 'Slayer', 'Hunter',
      'Mining', 'Smithing', 'Fishing', 'Cooking', 'Firemaking',
      'Woodcutting', 'Farming', 'Overall'
    ]
    
    console.log(`\n🔍 Checking skill icons for ${skills.length} skills...`)
    
    for (const skill of skills) {
      console.log(`\n📊 Checking ${skill} skill icon...`)
      
      // Look for skill-related items in database
      const skillItems = db.prepare(`
        SELECT id, name, length(icon_data) as icon_size 
        FROM items 
        WHERE name LIKE ? OR name LIKE ? OR name LIKE ?
        ORDER BY id
      `).all(`%${skill}%`, `${skill}%`, `%${skill} icon%`)
      
      if (skillItems.length > 0) {
        console.log(`  Found ${skillItems.length} ${skill}-related items:`)
        skillItems.forEach(item => {
          const status = item.icon_size > 0 ? `✅ ${item.icon_size} bytes` : '❌ No icon'
          console.log(`    ID ${item.id}: ${item.name} - ${status}`)
        })
        
        // Fix any items without icons
        const itemsNeedingIcons = skillItems.filter(item => item.icon_size === 0)
        if (itemsNeedingIcons.length > 0) {
          await this.fixSkillItems(itemsNeedingIcons)
        }
      } else {
        console.log(`  ⚠️  No ${skill}-related items found in database`)
        
        // Try to find and add skill icon directly from wiki
        await this.addSkillIconDirectly(skill)
      }
    }
    
    // Also check for generic skill-related items
    await this.checkGenericSkillItems()
  }

  async fixSkillItems(items) {
    const db = databaseService.db
    
    for (const item of items) {
      console.log(`    🔧 Fixing: ${item.name} (ID: ${item.id})`)
      
      try {
        // Get wiki mapping
        const mapping = db.prepare('SELECT wiki_page FROM item_wiki_mapping WHERE id = ?').get(item.id)
        
        if (mapping) {
          const result = await this.wikiService.lookupItemByWikiPage(mapping.wiki_page, item.id)
          if (result) {
            const iconCheck = db.prepare('SELECT length(icon_data) as size FROM items WHERE id = ?').get(item.id)
            if (iconCheck && iconCheck.size > 0) {
              console.log(`      ✅ Fixed: ${iconCheck.size} bytes`)
            } else {
              console.log(`      ⚠️  Lookup succeeded but no icon saved`)
            }
          } else {
            console.log(`      ❌ Wiki lookup failed`)
          }
        } else {
          console.log(`      ⚠️  No wiki mapping found`)
        }
      } catch (error) {
        console.log(`      💥 Error: ${error.message}`)
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  async addSkillIconDirectly(skillName) {
    try {
      console.log(`    🎨 Attempting to download ${skillName} skill icon directly...`)
      
      // Try common skill icon URLs
      const iconUrls = [
        `https://oldschool.runescape.wiki/images/${skillName}_icon.png`,
        `https://oldschool.runescape.wiki/images/${skillName.toLowerCase()}_icon.png`,
        `https://oldschool.runescape.wiki/images/${skillName}.png`,
        `https://oldschool.runescape.wiki/images/${skillName.toLowerCase()}.png`
      ]
      
      for (const iconUrl of iconUrls) {
        try {
          const response = await fetch(iconUrl)
          if (response.ok && response.headers.get('content-type')?.includes('image')) {
            const iconBuffer = Buffer.from(await response.arrayBuffer())
            if (iconBuffer.length > 100) { // Valid image should be more than 100 bytes
              console.log(`      ✅ Found skill icon: ${iconUrl} (${iconBuffer.length} bytes)`)
              
              // Create a pseudo-item for this skill icon (negative ID to avoid conflicts)
              const skillId = -Math.abs(skillName.toLowerCase().charCodeAt(0) * 100)
              const db = databaseService.db
              
              // Insert or update the skill icon
              const insertStmt = db.prepare(`
                INSERT OR REPLACE INTO items (id, name, icon_data) 
                VALUES (?, ?, ?)
              `)
              insertStmt.run(skillId, `${skillName} icon`, iconBuffer)
              
              console.log(`      💾 Stored ${skillName} icon with ID ${skillId}`)
              return true
            }
          }
        } catch (err) {
          // Continue to next URL
        }
      }
      
      console.log(`      ❌ Could not find ${skillName} skill icon`)
      return false
      
    } catch (error) {
      console.log(`      💥 Error downloading ${skillName} icon: ${error.message}`)
      return false
    }
  }

  async checkGenericSkillItems() {
    console.log(`\n🔍 Checking for generic skill-related items...`)
    
    const db = databaseService.db
    const skillRelatedTerms = [
      'skill', 'experience', 'xp', 'level', 'cape', 'hood', 'trimmed'
    ]
    
    for (const term of skillRelatedTerms) {
      const items = db.prepare(`
        SELECT id, name, length(icon_data) as icon_size 
        FROM items 
        WHERE name LIKE ?
        AND (icon_data IS NULL OR length(icon_data) = 0)
        ORDER BY id
        LIMIT 10
      `).all(`%${term}%`)
      
      if (items.length > 0) {
        console.log(`\n📋 Found ${items.length} ${term}-related items without icons:`)
        items.forEach(item => {
          console.log(`  ID ${item.id}: ${item.name}`)
        })
        
        // Fix a few of these items
        const itemsToFix = items.slice(0, 5)
        if (itemsToFix.length > 0) {
          await this.fixSkillItems(itemsToFix)
        }
      }
    }
  }

  async generateSkillIconReport() {
    console.log(`\n📊 Skill Icon Status Report`)
    console.log('=' .repeat(50))
    
    const db = databaseService.db
    
    // Check for skill-related items with icons
    const skillItems = db.prepare(`
      SELECT name, length(icon_data) as icon_size 
      FROM items 
      WHERE (
        name LIKE '%attack%' OR name LIKE '%strength%' OR name LIKE '%defence%' OR 
        name LIKE '%ranged%' OR name LIKE '%prayer%' OR name LIKE '%magic%' OR
        name LIKE '%runecraft%' OR name LIKE '%construction%' OR name LIKE '%hitpoints%' OR
        name LIKE '%agility%' OR name LIKE '%herblore%' OR name LIKE '%thieving%' OR
        name LIKE '%crafting%' OR name LIKE '%fletching%' OR name LIKE '%slayer%' OR
        name LIKE '%hunter%' OR name LIKE '%mining%' OR name LIKE '%smithing%' OR
        name LIKE '%fishing%' OR name LIKE '%cooking%' OR name LIKE '%firemaking%' OR
        name LIKE '%woodcutting%' OR name LIKE '%farming%' OR name LIKE '%overall%' OR
        name LIKE '%skill%' OR name LIKE '%cape%' OR name LIKE '%hood%'
      )
      AND icon_data IS NOT NULL 
      AND length(icon_data) > 0
      ORDER BY name
    `).all()
    
    console.log(`✅ Found ${skillItems.length} skill-related items with icons:`)
    skillItems.forEach(item => {
      console.log(`  ${item.name} - ${item.icon_size} bytes`)
    })
    
    // Summary for Complex Progress Report
    console.log(`\n💡 For Complex Progress Report:`)
    console.log(`   - Total skill-related items with icons: ${skillItems.length}`)
    console.log(`   - These icons should now be available for the XP section`)
    console.log(`   - If icons still don't show, check the frontend code for proper icon references`)
  }

  async run() {
    try {
      await this.init()
      await this.checkAndFixSkillIcons()
      await this.generateSkillIconReport()
      
      console.log('\n🎉 Skill icon fixing complete!')
      console.log('💡 Complex Progress Report XP section should now have skill icons')
      
    } catch (error) {
      console.error('❌ Error:', error.message)
      console.error(error.stack)
    }
  }
}

const fixer = new SkillIconFixer()
fixer.run()
