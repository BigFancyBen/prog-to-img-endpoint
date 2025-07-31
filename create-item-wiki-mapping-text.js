#!/usr/bin/env node

import fs from 'fs'
import databaseService from './services/databaseService.js'

console.log('🗂️ Creating Item ID to Wiki Page mapping table by parsing HTML as text...')

class ItemWikiMappingBuilder {
  constructor() {
    this.htmlFilePath = 'c:\\Users\\Tango\\Downloads\\Item IDs - OSRS Wiki.htm'
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

  parseHTML() {
    console.log('📖 Reading and parsing HTML file as text...')
    
    if (!fs.existsSync(this.htmlFilePath)) {
      throw new Error(`HTML file not found: ${this.htmlFilePath}`)
    }
    
    const htmlContent = fs.readFileSync(this.htmlFilePath, 'utf8')
    console.log(`✅ Loaded HTML file (${Math.round(htmlContent.length / 1024)}KB)`)
    
    const mappings = []
    
    // Look for table rows with the pattern based on the actual HTML structure:
    // <td><a href="https://oldschool.runescape.wiki/w/ItemName" title="...">Item Name</a>
    // </td>
    // <td><a class="text" href="...Special:Lookup...&id=123">123</a>
    // </td></tr>
    
    // Since the rows span multiple lines, let's use a different approach
    // Look for the item name pattern and then find the associated ID
    const itemNamePattern = /<td><a href="https:\/\/oldschool\.runescape\.wiki\/w\/([^"]+)" title="[^"]*">([^<]+)<\/a>/g
    // Updated ID pattern to handle HTML entities (&amp; instead of &)
    const idPattern = /<td><a class="text" href="[^"]*[&]amp;id=(\d+)"[^>]*>(\d+)<\/a>/g
    
    // First pass: find all item names and their positions
    const itemMatches = []
    let match
    while ((match = itemNamePattern.exec(htmlContent)) !== null) {
      itemMatches.push({
        wikiPage: match[1],
        name: match[2],
        position: match.index
      })
    }
    
    console.log(`📊 Found ${itemMatches.length} item name entries`)
    
    // Second pass: find all IDs and their positions
    const idMatches = []
    while ((match = idPattern.exec(htmlContent)) !== null) {
      idMatches.push({
        id: parseInt(match[1]),
        displayId: parseInt(match[2]),
        position: match.index
      })
    }
    
    console.log(`📊 Found ${idMatches.length} ID entries`)
    
    // Match items to IDs based on proximity (ID should come after item name)
    for (const item of itemMatches) {
      // Find the next ID after this item
      const nextId = idMatches.find(id => 
        id.position > item.position && 
        id.position < item.position + 1000 && // Within reasonable distance
        id.id === id.displayId // IDs should match
      )
      
      if (nextId) {
        mappings.push({
          id: nextId.id,
          name: item.name,
          wikiPage: item.wikiPage,
          wikiUrl: `https://oldschool.runescape.wiki/w/${item.wikiPage}`
        })
      }
    }
    
    console.log(`📊 Found ${mappings.length} item mappings using regex parsing`)
    
    // If regex didn't work well, try a simpler line-by-line approach
    if (mappings.length < 100) {
      console.log('🔄 Regex found few results, trying line-by-line parsing...')
      
      const lines = htmlContent.split('\n')
      let currentItem = null
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        
        // Look for item name links - updated for full URLs
        const itemMatch = line.match(/<td><a href="https:\/\/oldschool\.runescape\.wiki\/w\/([^"]+)"[^>]*>([^<]+)<\/a><\/td>/)
        if (itemMatch) {
          currentItem = {
            wikiPage: itemMatch[1],
            name: itemMatch[2]
          }
        }
        
        // Look for ID links on the next few lines
        if (currentItem) {
          const idMatch = line.match(/<td><a[^>]*href="[^"]*[&?]id=(\d+)"[^>]*>(\d+)<\/a><\/td>/)
          if (idMatch) {
            const itemId = parseInt(idMatch[1])
            const displayId = parseInt(idMatch[2])
            
            if (itemId === displayId && !isNaN(itemId)) {
              mappings.push({
                id: itemId,
                name: currentItem.name,
                wikiPage: currentItem.wikiPage,
                wikiUrl: `https://oldschool.runescape.wiki/w/${currentItem.wikiPage}`
              })
            }
            
            currentItem = null // Reset
          }
        }
      }
      
      console.log(`📊 Line-by-line parsing found ${mappings.length} total mappings`)
    }
    
    // Remove duplicates by ID
    const uniqueMappings = mappings.filter((mapping, index, self) => 
      index === self.findIndex(m => m.id === mapping.id)
    )
    
    console.log(`📊 After deduplication: ${uniqueMappings.length} unique mappings`)
    
    return uniqueMappings
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

  async run() {
    try {
      await this.init()
      const mappings = this.parseHTML()
      
      if (mappings.length === 0) {
        console.log('❌ No mappings found - check HTML file format')
        return
      }
      
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
