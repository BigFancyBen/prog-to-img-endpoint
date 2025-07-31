#!/usr/bin/env node

import puppeteer from 'puppeteer'
import databaseService from '../services/databaseService.js'
import WikiLookupService from '../services/wikiLookupService.js'

console.log('🚀 Comprehensive Data Fetcher - Item IDs, Database Update & Icon Scraping')

class ComprehensiveDataFetcher {
  constructor() {
    this.browser = null
    this.wikiService = new WikiLookupService()
    this.stats = {
      totalOfficialItems: 0,
      itemsInDatabase: 0,
      missingItems: 0,
      newItemsAdded: 0,
      iconsFixed: 0,
      iconsSkipped: 0,
      unauthorizedItemsRemoved: 0,
      errors: 0
    }
  }

  async init() {
    console.log('🔧 Initializing services...')
    
    // Initialize database
    await databaseService.init()
    console.log('✅ Database initialized')
    
    // Launch browser
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    this.page = await this.browser.newPage()
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    console.log('✅ Browser initialized')
  }

  async step1_FetchCurrentItemIDs() {
    console.log('\n📖 STEP 1: Fetching current Item IDs from OSRS Wiki...')
    
    await this.page.goto('https://oldschool.runescape.wiki/w/Item_IDs', {
      waitUntil: 'networkidle0',
      timeout: 60000
    })

    console.log('🔍 Extracting item mappings from live page...')

    const itemMappings = await this.page.evaluate(() => {
      const mappings = []
      const tables = document.querySelectorAll('table')
      
      let totalRows = 0
      
      for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
        const table = tables[tableIndex]
        const rows = table.querySelectorAll('tr')
        
        for (const row of rows) {
          const cells = row.querySelectorAll('td')
          if (cells.length >= 2) {
            const nameCell = cells[0]  // First column has the item name/link
            const idCell = cells[1]    // Second column has the item ID
            
            // Get the ID from the second column
            const idLink = idCell.querySelector('a')
            let id = null
            
            if (idLink) {
              // Extract ID from the link URL (e.g., "...&id=123")
              const href = idLink.getAttribute('href')
              const idMatch = href?.match(/[&]id=(\d+)/)
              if (idMatch) {
                id = parseInt(idMatch[1])
              }
            }
            
            if (id !== null && id >= 0) {
              // Get the name and wiki link from the first column
              const link = nameCell.querySelector('a')
              if (link) {
                const name = link.textContent?.trim()
                const href = link.getAttribute('href')
                
                if (name && href) {
                  // Extract page name from URL - handle both relative and absolute URLs
                  let wikiPage = href
                  if (href.startsWith('https://oldschool.runescape.wiki/w/')) {
                    wikiPage = href.replace('https://oldschool.runescape.wiki/w/', '')
                  } else if (href.startsWith('/w/')) {
                    wikiPage = href.replace('/w/', '')
                  }
                  
                  // Full URL for storage
                  const wikiUrl = href.startsWith('/') ? 
                    `https://oldschool.runescape.wiki${href}` : href
                  
                  mappings.push({
                    id: id,
                    name: name,
                    wikiPage: wikiPage,
                    wikiUrl: wikiUrl
                  })
                }
              }
            }
          }
          totalRows++
        }
      }
      
      return {
        mappings: mappings,
        totalRows: totalRows
      }
    })

    console.log(`📊 Processed ${itemMappings.totalRows} total rows`)
    console.log(`📊 Found ${itemMappings.mappings.length} valid item mappings`)
    
    this.stats.totalOfficialItems = itemMappings.mappings.length
    return itemMappings.mappings
  }

  async step2_UpdateWikiMappingTable(mappings) {
    console.log('\n💾 STEP 2: Updating item_wiki_mapping table...')
    
    const db = databaseService.db
    
    // Recreate the table
    db.exec(`
      DROP TABLE IF EXISTS item_wiki_mapping
    `)
    db.exec(`
      CREATE TABLE item_wiki_mapping (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        wiki_page TEXT NOT NULL,
        wiki_url TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Get existing IDs to avoid duplicates
    const existingIds = new Set(
      db.prepare('SELECT id FROM item_wiki_mapping').all().map(row => row.id)
    )
    
    console.log(`📊 Found ${existingIds.size} existing mappings in database`)
    
    // Filter to only new mappings and remove duplicates
    const newMappings = mappings
      .filter(mapping => !existingIds.has(mapping.id))
      .filter((mapping, index, self) => 
        index === self.findIndex(m => m.id === mapping.id)
      )
    
    console.log(`📊 Found ${newMappings.length} new unique mappings to add`)
    
    if (newMappings.length === 0) {
      console.log('✅ No new mappings to add - database is up to date')
      return
    }
    
    // Insert only new mappings
    const insertStmt = db.prepare(`
      INSERT INTO item_wiki_mapping (id, name, wiki_page, wiki_url)
      VALUES (?, ?, ?, ?)
    `)

    const insertMany = db.transaction((mappings) => {
      for (const mapping of mappings) {
        insertStmt.run(mapping.id, mapping.name, mapping.wikiPage, mapping.wikiUrl)
      }
    })

    insertMany(newMappings)
    
    console.log(`✅ Added ${newMappings.length} new mappings to database`)
    
    // Show total count
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM item_wiki_mapping').get().count
    console.log(`📊 Total mappings in database: ${totalCount}`)
    
    // Show some examples
    console.log('\n📋 Sample mappings:')
    const samples = db.prepare('SELECT * FROM item_wiki_mapping ORDER BY id LIMIT 5').all()
    samples.forEach(item => {
      console.log(`  ID ${item.id}: ${item.name} → ${item.wiki_page}`)
    })
  }

  async step3_CleanupUnauthorizedItems() {
    console.log('\n🧹 STEP 3: Removing items not in official Item IDs list...')
    
    const db = databaseService.db
    
    // Get all official item IDs from our mapping table
    const officialItems = db.prepare('SELECT id FROM item_wiki_mapping').all()
    const officialItemIds = new Set(officialItems.map(item => item.id))
    
    // Get all items currently in our database
    const currentItems = db.prepare('SELECT id, name FROM items').all()
    
    // Find items that are NOT in the official list
    const unauthorizedItems = currentItems.filter(item => !officialItemIds.has(item.id))
    
    console.log(`📊 Items in our database: ${currentItems.length}`)
    console.log(`📊 Official items: ${officialItems.length}`)
    console.log(`📊 Unauthorized items to remove: ${unauthorizedItems.length}`)
    
    if (unauthorizedItems.length === 0) {
      console.log('✅ No unauthorized items found - database is clean!')
      return
    }
    
    console.log('\n📋 Sample unauthorized items to be removed:')
    unauthorizedItems.slice(0, 10).forEach(item => {
      console.log(`  ID ${item.id}: ${item.name}`)
    })
    
    if (unauthorizedItems.length > 10) {
      console.log(`  ... and ${unauthorizedItems.length - 10} more`)
    }
    
    // Remove unauthorized items
    console.log(`\n🗑️ Removing ${unauthorizedItems.length} unauthorized items...`)
    
    const deleteStmt = db.prepare('DELETE FROM items WHERE id = ?')
    const deleteMany = db.transaction((items) => {
      for (const item of items) {
        deleteStmt.run(item.id)
      }
    })
    
    deleteMany(unauthorizedItems)
    
    console.log(`✅ Removed ${unauthorizedItems.length} unauthorized items from database`)
    
    // Show final counts
    const finalCount = db.prepare('SELECT COUNT(*) as count FROM items').get().count
    console.log(`📊 Items remaining in database: ${finalCount}`)
    
    this.stats.unauthorizedItemsRemoved = unauthorizedItems.length
  }

  async step4_FindMissingItems() {
    console.log('\n🔍 STEP 4: Finding items missing from our database...')
    
    const db = databaseService.db
    
    // Get current items in our database
    const currentItems = db.prepare('SELECT id FROM items').all()
    const currentItemIds = new Set(currentItems.map(item => item.id))
    
    // Get all official items
    const officialItems = db.prepare('SELECT id, name, wiki_page FROM item_wiki_mapping ORDER BY id').all()
    
    // Find missing items
    const missingItems = officialItems.filter(item => !currentItemIds.has(item.id))
    
    console.log(`📊 Items in our database: ${currentItems.length}`)
    console.log(`📊 Official items: ${officialItems.length}`)
    console.log(`📊 Missing items: ${missingItems.length}`)
    
    this.stats.itemsInDatabase = currentItems.length
    this.stats.missingItems = missingItems.length
    
    if (missingItems.length > 0) {
      console.log('\n📋 Sample missing items:')
      missingItems.slice(0, 10).forEach(item => {
        console.log(`  ID ${item.id}: ${item.name}`)
      })
    }
    
    return missingItems
  }

  async step5_ScrapeMissingItems(missingItems) {
    console.log('\n🤖 STEP 5: Intelligently scraping missing items...')
    
    if (missingItems.length === 0) {
      console.log('🎉 No missing items to scrape!')
      return
    }
    
    const batchSize = 5
    const delay = 3000 // 3 second delay between items
    
    console.log(`📦 Processing ${missingItems.length} missing items in batches of ${batchSize}`)
    
    for (let i = 0; i < missingItems.length; i += batchSize) {
      const batch = missingItems.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(missingItems.length / batchSize)
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches}`)
      
      for (const item of batch) {
        try {
          console.log(`🔍 Scraping: ${item.name} (ID: ${item.id})`)
          
          // Use our authoritative wiki page lookup
          const result = await this.wikiService.lookupItemByWikiPage(item.wiki_page, item.id)
          
          if (result) {
            this.stats.newItemsAdded++
            console.log(`  ✅ Added: ${item.name}`)
            
            // Check if icon was also downloaded
            const db = databaseService.db
            const iconCheck = db.prepare('SELECT length(icon_data) as size FROM items WHERE id = ?').get(item.id)
            if (iconCheck && iconCheck.size > 0) {
              this.stats.iconsFixed++
              console.log(`  🎨 Icon downloaded: ${iconCheck.size} bytes`)
            }
          } else {
            this.stats.errors++
            console.log(`  ❌ Failed: ${item.name}`)
          }
          
          // Progress update
          const processed = i + batch.indexOf(item) + 1
          const progress = ((processed / missingItems.length) * 100).toFixed(1)
          console.log(`📊 Progress: ${processed}/${missingItems.length} (${progress}%) | ✅ ${this.stats.newItemsAdded} | 🎨 ${this.stats.iconsFixed} | ❌ ${this.stats.errors}`)
          
          // Delay between items
          if (processed < missingItems.length) {
            await this.sleep(delay)
          }
          
        } catch (error) {
          this.stats.errors++
          console.log(`  💥 Error processing ${item.name}: ${error.message}`)
        }
      }
    }
  }

  async step6_FixExistingIcons() {
    console.log('\n🎨 STEP 6: Ensuring ALL items have icon data...')
    console.log('🚨 AGGRESSIVE MODE: Will attempt to fix ALL items - no skipping!')
    
    const db = databaseService.db
    
    // Find ALL items without icons (not just first 100)
    const itemsNeedingIcons = db.prepare(`
      SELECT i.id, i.name, m.wiki_page 
      FROM items i
      JOIN item_wiki_mapping m ON i.id = m.id
      WHERE (i.icon_data IS NULL OR length(i.icon_data) = 0)
      ORDER BY i.id
    `).all()
    
    console.log(`🎯 Found ${itemsNeedingIcons.length} items needing icons`)
    
    if (itemsNeedingIcons.length === 0) {
      console.log('🎉 All items already have icons!')
      return
    }
    
    // Process ALL items - no filtering or skipping
    const itemsToProcess = itemsNeedingIcons
    
    console.log(`📋 Sample items needing icons:`)
    itemsToProcess.slice(0, 10).forEach(item => {
      console.log(`  ID ${item.id}: ${item.name}`)
    })
    
    const delay = 1000 // 1 second delay
    const batchSize = 5
    let processed = 0
    let successCount = 0
    let failCount = 0
    
    console.log(`🔄 Processing ALL ${itemsToProcess.length} items...`)
    
    for (let i = 0; i < itemsToProcess.length; i += batchSize) {
      const batch = itemsToProcess.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(itemsToProcess.length / batchSize)
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches}`)
      
      for (const item of batch) {
        try {
          processed++
          console.log(`🎨 [${processed}/${itemsToProcess.length}] Fixing: ${item.name} (ID: ${item.id})`)
          
          // Use wiki lookup to get the item with icon
          const result = await this.wikiService.lookupItemByWikiPage(item.wiki_page, item.id)
          
          if (result) {
            // Check if icon was downloaded
            const iconCheck = db.prepare('SELECT length(icon_data) as size FROM items WHERE id = ?').get(item.id)
            if (iconCheck && iconCheck.size > 0) {
              this.stats.iconsFixed++
              successCount++
              console.log(`  ✅ Icon fixed: ${iconCheck.size} bytes`)
            } else {
              failCount++
              console.log(`  ⚠️  No icon data after lookup`)
            }
          } else {
            failCount++
            console.log(`  ❌ Lookup failed`)
          }
          
          // Progress update every 10 items
          if (processed % 10 === 0 || processed === itemsToProcess.length) {
            const progress = ((processed / itemsToProcess.length) * 100).toFixed(1)
            console.log(`📊 Progress: ${processed}/${itemsToProcess.length} (${progress}%) | ✅ ${successCount} | ❌ ${failCount}`)
          }
          
          // Delay between items
          if (processed < itemsToProcess.length) {
            await this.sleep(delay)
          }
          
        } catch (error) {
          failCount++
          console.log(`  💥 Error: ${error.message}`)
        }
      }
    }
    
    console.log(`\n✅ Icon fixing complete: ${successCount} success, ${failCount} failed`)
  }

  categorizeProblematicItems(items) {
    const categories = {
      variants: [],
      specialCharacters: [],
      questItems: [],
      deprecated: [],
      other: []
    }

    for (const item of items) {
      if (this.isDeprecatedItem(item.name)) {
        categories.deprecated.push(item)
      } else if (item.name.includes('???') || (item.wiki_page && item.wiki_page.includes('%3F'))) {
        categories.specialCharacters.push(item)
      } else if (item.name.includes('(') && (item.name.includes(')') || item.name.includes('p+') || item.name.includes('kp'))) {
        categories.variants.push(item)
      } else if (this.isQuestItem(item.name)) {
        categories.questItems.push(item)
      } else {
        categories.other.push(item)
      }
    }

    return categories
  }

  isDeprecatedItem(name) {
    const deprecatedPatterns = [
      'hex edit detected',
      'debug',
      'test item',
      'placeholder'
    ]
    
    const lowerName = name.toLowerCase()
    return deprecatedPatterns.some(pattern => lowerName.includes(pattern))
  }

  isQuestItem(name) {
    const questPatterns = [
      'map piece',
      'sliding piece',
      'fractured crystal',
      'quest item'
    ]
    
    const lowerName = name.toLowerCase()
    return questPatterns.some(pattern => lowerName.includes(pattern))
  }

  async intelligentIconLookup(item) {
    try {
      // Skip items that definitely shouldn't have icons
      if (this.isDeprecatedItem(item.name)) {
        return 'skipped'
      }

      // Use the standard lookup with enhanced error handling
      const result = await this.wikiService.lookupItemByWikiPage(item.wiki_page, item.id)
      return result
      
    } catch (error) {
      console.log(`    ⚠️  Lookup error: ${error.message}`)
      return null
    }
  }

  async tryAlternativeIconMethods(item) {
    try {
      // For special character items, try direct icon URL construction
      if (item.name.includes('???')) {
        return await this.tryDirectIconDownload(item)
      }
      
      // For variants, try to find the base item icon
      if (item.name.includes('(') && item.name.includes(')')) {
        return await this.tryVariantIconFallback(item)
      }
      
      return null
    } catch (error) {
      console.log(`    ⚠️  Alternative method error: ${error.message}`)
      return null
    }
  }

  async tryDirectIconDownload(item) {
    try {
      // For ??? mixture, try the basic filename
      if (item.name.includes('??? mixture')) {
        const iconUrl = 'https://oldschool.runescape.wiki/images/???_mixture.png'
        const iconData = await this.downloadIconDirectly(iconUrl, item.id)
        return iconData ? iconData.length : null
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  async tryVariantIconFallback(item) {
    try {
      // Extract base name without variant suffix
      const baseName = item.name.replace(/\([^)]*\)$/, '').trim()
      const iconUrl = `https://oldschool.runescape.wiki/images/${baseName}.png`
      const iconData = await this.downloadIconDirectly(iconUrl, item.id)
      return iconData ? iconData.length : null
    } catch (error) {
      return null
    }
  }

  async downloadIconDirectly(iconUrl, itemId) {
    try {
      // Use the wiki service's direct download method if available
      if (this.wikiService.downloadIconFromUrl) {
        const iconBuffer = await this.wikiService.downloadIconFromUrl(iconUrl)
        if (iconBuffer && iconBuffer.length > 0) {
          // Store in database
          const db = databaseService.db
          const updateStmt = db.prepare('UPDATE items SET icon_data = ? WHERE id = ?')
          updateStmt.run(iconBuffer, itemId)
          return iconBuffer
        }
      }
      return null
    } catch (error) {
      return null
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
    }
  }

  async run() {
    try {
      await this.init()
      
      // Step 1: Fetch current Item IDs
      const mappings = await this.step1_FetchCurrentItemIDs()
      
      // Step 2: Update wiki mapping table
      await this.step2_UpdateWikiMappingTable(mappings)
      
      // Step 3: Remove unauthorized items
      await this.step3_CleanupUnauthorizedItems()
      
      // Step 4: Find missing items
      const missingItems = await this.step4_FindMissingItems()
      
      // Step 5: Scrape missing items
      await this.step5_ScrapeMissingItems(missingItems)
      
      // Step 6: Fix existing icons
      await this.step6_FixExistingIcons()
      
      // Step 7: Final validation
      await this.step7_ValidateAllItemsHaveIcons()
      
      // Final report
      console.log('\n🎉 COMPREHENSIVE DATA FETCH COMPLETE!')
      console.log('📊 Final Statistics:')
      console.log(`  Official items: ${this.stats.totalOfficialItems}`)
      console.log(`  Items in database: ${this.stats.itemsInDatabase}`)
      console.log(`  Unauthorized items removed: ${this.stats.unauthorizedItemsRemoved}`)
      console.log(`  Missing items found: ${this.stats.missingItems}`)
      console.log(`  New items added: ${this.stats.newItemsAdded}`)
      console.log(`  Icons fixed: ${this.stats.iconsFixed}`)
      console.log(`  Items skipped (no icon expected): ${this.stats.iconsSkipped}`)
      console.log(`  Errors: ${this.stats.errors}`)
      
    } catch (error) {
      console.error('❌ Error during comprehensive fetch:', error.message)
      console.error(error.stack)
    } finally {
      await this.cleanup()
    }
  }

  async step7_ValidateAllItemsHaveIcons() {
    console.log('\n✅ STEP 7: Final validation - checking all items have icons...')
    
    const db = databaseService.db
    
    const total = db.prepare('SELECT COUNT(*) as count FROM items').get().count
    const withIcons = db.prepare('SELECT COUNT(*) as count FROM items WHERE icon_data IS NOT NULL AND length(icon_data) > 0').get().count
    const withoutIcons = total - withIcons
    
    console.log(`📊 Total items: ${total}`)
    console.log(`📊 Items with icons: ${withIcons}`)
    console.log(`📊 Items without icons: ${withoutIcons}`)
    
    // Calculate success rate excluding deprecated items
    const deprecatedItems = db.prepare(`
      SELECT COUNT(*) as count 
      FROM items 
      WHERE name LIKE '%hex edit detected%' 
         OR name LIKE '%debug%' 
         OR name LIKE '%test item%'
    `).get().count
    
    const nonDeprecatedTotal = total - deprecatedItems
    const successRate = ((withIcons / nonDeprecatedTotal) * 100).toFixed(2)
    
    console.log(`📊 Success rate (excluding deprecated): ${successRate}% (${withIcons}/${nonDeprecatedTotal})`)
    
    if (withoutIcons === 0) {
      console.log('🎉 SUCCESS: All items have icon data!')
    } else {
      console.log(`⚠️  WARNING: ${withoutIcons} items still missing icons`)
      
      // Categorize remaining items without icons
      const missingIcons = db.prepare(`
        SELECT i.id, i.name, m.wiki_page
        FROM items i
        LEFT JOIN item_wiki_mapping m ON i.id = m.id
        WHERE i.icon_data IS NULL OR length(i.icon_data) = 0
        ORDER BY i.id
        LIMIT 20
      `).all()
      
      const categorized = {
        deprecated: missingIcons.filter(item => 
          item.name.toLowerCase().includes('hex edit detected') ||
          item.name.toLowerCase().includes('debug')
        ),
        variants: missingIcons.filter(item => 
          item.name.includes('(') && item.name.includes(')')
        ),
        special: missingIcons.filter(item => 
          item.name.includes('???') || item.name.includes('piece')
        ),
        other: []
      }
      
      // Items not in other categories go to 'other'
      categorized.other = missingIcons.filter(item => 
        !categorized.deprecated.includes(item) &&
        !categorized.variants.includes(item) &&
        !categorized.special.includes(item)
      )
      
      console.log('\n📋 Breakdown of remaining items without icons:')
      if (categorized.deprecated.length > 0) {
        console.log(`🗑️  Deprecated/Debug items: ${categorized.deprecated.length}`)
        categorized.deprecated.slice(0, 3).forEach(item => {
          console.log(`    ID ${item.id}: ${item.name}`)
        })
      }
      
      if (categorized.variants.length > 0) {
        console.log(`� Item variants: ${categorized.variants.length}`)
        categorized.variants.slice(0, 3).forEach(item => {
          console.log(`    ID ${item.id}: ${item.name}`)
        })
      }
      
      if (categorized.special.length > 0) {
        console.log(`❓ Special/Quest items: ${categorized.special.length}`)
        categorized.special.slice(0, 3).forEach(item => {
          console.log(`    ID ${item.id}: ${item.name}`)
        })
      }
      
      if (categorized.other.length > 0) {
        console.log(`❔ Other items: ${categorized.other.length}`)
        categorized.other.slice(0, 3).forEach(item => {
          console.log(`    ID ${item.id}: ${item.name}`)
        })
      }
      
      console.log('\n💡 Next steps:')
      if (categorized.deprecated.length > 0) {
        console.log('   - Deprecated items can be safely ignored (they don\'t have real icons)')
      }
      if (categorized.variants.length > 0 || categorized.special.length > 0) {
        console.log('   - Re-run the fixer to retry variant and special items')
      }
      if (categorized.other.length > 0) {
        console.log('   - Manual investigation needed for remaining items')
      }
    }
  }
}

const fetcher = new ComprehensiveDataFetcher()
fetcher.run()
