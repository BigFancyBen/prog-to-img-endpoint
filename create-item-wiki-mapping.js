#!/usr/bin/env node

import fs from 'fs'
import { JSDOM } from 'jsdom'
import databaseService from './services/databaseService.js'

console.log('🗂️ Creating Item ID to Wiki Page mapping table from local HTML...')

class ItemWikiMappingBuilder {
  constructor() {
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
  }

  async parseLocalHTML() {
    console.log('📖 Reading local HTML file...')
    
    if (!fs.existsSync(this.htmlFilePath)) {
      throw new Error(`HTML file not found: ${this.htmlFilePath}`)
    }
    
    const htmlContent = fs.readFileSync(this.htmlFilePath, 'utf8')
    console.log(`✅ Loaded HTML file (${Math.round(htmlContent.length / 1024)}KB)`)
    
    console.log('� Parsing HTML with JSDOM...')
    const dom = new JSDOM(htmlContent)
    const document = dom.window.document
    
    console.log('� Extracting item mappings...')
    
    const mappings = []
    const tables = document.querySelectorAll('table')
    console.log(`Found ${tables.length} tables`)
    
    let totalRows = 0
    
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      const table = tables[tableIndex]
      const rows = table.querySelectorAll('tr')
      
      console.log(`  Processing table ${tableIndex + 1}/${tables.length} (${rows.length} rows)`)
      
      for (const row of rows) {
        const cells = row.querySelectorAll('td')
        if (cells.length >= 2) {
          const idCell = cells[0]
          const nameCell = cells[1]
          
          // Get the ID
          const idText = idCell.textContent?.trim()
          const id = parseInt(idText)
          
          if (!isNaN(id) && id > 0) {
            // Get the name and wiki link
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

    console.log(`📊 Processed ${totalRows} total rows`)
    console.log(`📊 Found ${mappings.length} valid item mappings`)
    
    return mappings
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
    
    return mappings.length
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
    }
  }
}

const builder = new ItemWikiMappingBuilder()
builder.run()
