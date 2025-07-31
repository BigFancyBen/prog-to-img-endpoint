#!/usr/bin/env node

import puppeteer from 'puppeteer'
import fs from 'fs'
import databaseService from './services/databaseService.js'

console.log('🗂️ Creating Item ID to Wiki Page mapping table from local HTML...')

class ItemWikiMappingBuilder {
  constructor() {
    this.browser = null
    this.page = null
    this.htmlFilePath = 'c:\\Users\\Tango\\Downloads\\https___oldschool.runescape.wiki_w_Item_IDs.htm'
  }

  async init() {
    console.log('🚀 Initializing...')
    
    // Initialize database
    await databaseService.init()
    
    // Create the new table
    const db = databaseService.db
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
    
    console.log('✅ Database table created')
    
    // Launch browser
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    this.page = await this.browser.newPage()
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    console.log('✅ Browser initialized')
  }

  async parseLocalHTML() {
    console.log('📖 Reading local HTML file...')
    
    if (!fs.existsSync(this.htmlFilePath)) {
      throw new Error(`HTML file not found: ${this.htmlFilePath}`)
    }
    
    const htmlContent = fs.readFileSync(this.htmlFilePath, 'utf8')
    console.log(`✅ Loaded HTML file (${Math.round(htmlContent.length / 1024)}KB)`)
    
    console.log('🔍 Setting HTML content and extracting mappings...')
    
    // Set the HTML content directly
    await this.page.setContent(htmlContent, { waitUntil: 'domcontentloaded' })

    const itemMappings = await this.page.evaluate(() => {
      // Debug: check basic DOM structure
      console.log('Document title:', document.title)
      console.log('Document body exists:', !!document.body)
      console.log('Total elements:', document.querySelectorAll('*').length)
      
      const mappings = []
      const tables = document.querySelectorAll('table')
      
      console.log(`Found ${tables.length} tables`)
      
      // Debug: try alternative selectors
      const allTables = document.getElementsByTagName('table')
      console.log(`getElementsByTagName found ${allTables.length} tables`)
      
      // Debug: check for specific content
      const bodyText = document.body?.textContent || ''
      const hasItemText = bodyText.includes('Dwarf remains')
      const hasIdText = bodyText.includes('Item ID')
      console.log('Contains "Dwarf remains":', hasItemText)
      console.log('Contains "Item ID":', hasIdText)
      
      let totalRows = 0
      
      for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
        const table = tables[tableIndex]
        const rows = table.querySelectorAll('tr')
        
        console.log(`Table ${tableIndex + 1}: ${rows.length} rows`)
        
        for (const row of rows) {
          const cells = row.querySelectorAll('td')
          if (cells.length >= 2) {
            const nameCell = cells[0]  // First column has the item name/link
            const idCell = cells[1]    // Second column has the item ID
            
            // Debug first few rows
            if (totalRows < 5) {
              console.log(`Row ${totalRows}: "${nameCell.textContent?.trim()}" | "${idCell.textContent?.trim()}"`)
            }
            
            // Get the ID from the second column
            const idLink = idCell.querySelector('a')
            let id = null
            
            if (idLink) {
              // Extract ID from the link URL (e.g., "...&id=123")
              const href = idLink.getAttribute('href')
              const idMatch = href?.match(/[&?]id=(\d+)/)
              if (idMatch) {
                id = parseInt(idMatch[1])
              }
            }
            
            // Also try getting ID from text content as fallback
            if (!id) {
              const idText = idCell.textContent?.trim()
              const parsedId = parseInt(idText)
              if (!isNaN(parsedId)) {
                id = parsedId
              }
            }
            
            if (id !== null && id >= 0) {
              // Get the name and wiki link from the first column
              const link = nameCell.querySelector('a')
              if (link) {
                const name = link.textContent?.trim()
                const href = link.getAttribute('href')
                
                if (name && href) {
                  // Convert relative URL to absolute
                  const wikiUrl = href.startsWith('/') ? 
                    `https://oldschool.runescape.wiki${href}` : href
                  
                  // Extract page name from URL (remove /w/ prefix)
                  const wikiPage = href.replace('/w/', '')
                  
                  mappings.push({
                    id: id,
                    name: name,
                    wikiPage: wikiPage,
                    wikiUrl: wikiUrl
                  })
                }
              } else {
                // Handle cases where there might not be a link
                const name = nameCell.textContent?.trim()
                if (name && name !== '' && name !== '-') {
                  mappings.push({
                    id: id,
                    name: name,
                    wikiPage: name.replace(/ /g, '_'),
                    wikiUrl: `https://oldschool.runescape.wiki/w/${name.replace(/ /g, '_')}`
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
        totalRows: totalRows,
        tableCount: tables.length
      }
    })

    console.log(`📊 Processed ${itemMappings.totalRows} total rows from ${itemMappings.tableCount} tables`)
    console.log(`📊 Found ${itemMappings.mappings.length} valid item mappings`)
    
    return itemMappings.mappings
  }

  async insertMappings(mappings) {
    console.log('💾 Inserting mappings into database...')
    
    // Insert into database
    const db = databaseService.db
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO item_wiki_mapping (id, name, wiki_page, wiki_url)
      VALUES (?, ?, ?, ?)
    `)

    const insertMany = db.transaction((mappings) => {
      for (const mapping of mappings) {
        insertStmt.run(mapping.id, mapping.name, mapping.wikiPage, mapping.wikiUrl)
      }
    })

    insertMany(mappings)
    
    console.log(`✅ Inserted ${mappings.length} mappings into database`)
    
    // Show some examples
    console.log('\n📋 Sample mappings:')
    const samples = db.prepare('SELECT * FROM item_wiki_mapping ORDER BY id LIMIT 10').all()
    samples.forEach(item => {
      console.log(`  ID ${item.id}: ${item.name} → ${item.wiki_page}`)
    })
    
    // Show statistics
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        MIN(id) as min_id,
        MAX(id) as max_id
      FROM item_wiki_mapping
    `).get()
    
    console.log(`\n📊 Database statistics:`)
    console.log(`  Total entries: ${stats.total}`)
    console.log(`  ID range: ${stats.min_id} - ${stats.max_id}`)
    
    return mappings.length
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
    }
  }

  async run() {
    try {
      await this.init()
      const mappings = await this.parseLocalHTML()
      const count = await this.insertMappings(mappings)
      
      console.log(`\n🎉 Successfully created item wiki mapping table with ${count} entries`)
      
    } catch (error) {
      console.error('❌ Error:', error.message)
      console.error(error.stack)
    } finally {
      await this.cleanup()
    }
  }
}

const builder = new ItemWikiMappingBuilder()
builder.run()
