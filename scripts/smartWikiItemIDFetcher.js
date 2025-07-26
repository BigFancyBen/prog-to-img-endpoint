import puppeteer from 'puppeteer'
import databaseService from '../services/databaseService.js'
import WikiLookupService from '../services/wikiLookupService.js'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

console.log('📄 Smart WikiItemIDFetcher script loaded successfully')

class SmartWikiItemIDFetcher {
  constructor() {
    this.browser = null
    this.page = null
    this.foundItems = 0
    this.notFoundItems = 0
    this.errors = 0
    this.totalProcessed = 0
    this.wikiLookupService = new WikiLookupService()
  }

  async init() {
    console.log('🚀 Initializing SmartWikiItemIDFetcher...')
    
    try {
      // Initialize database
      console.log('📊 Initializing database...')
      await databaseService.init()
      console.log('✅ Database initialized')
      
      // Launch browser
      console.log('🌐 Launching browser...')
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
      })
      console.log('✅ Browser launched')
      
      this.page = await this.browser.newPage()
      console.log('✅ New page created')
      
      // Set user agent to avoid being blocked
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
      console.log('✅ User agent set')
      
      console.log('✅ SmartWikiItemIDFetcher initialized')
    } catch (error) {
      console.error('❌ Error initializing SmartWikiItemIDFetcher:', error)
      throw error
    }
  }

  async scrapeItemIDsFromWiki() {
    console.log('📖 Scraping complete item ID list from wiki...')
    
    try {
      await this.page.goto('https://oldschool.runescape.wiki/w/Item_IDs', {
        waitUntil: 'networkidle0',
        timeout: 30000
      })

      // Extract all item data from the table
      const itemData = await this.page.evaluate(() => {
        const items = []
        
        // Find all table rows with item data
        const rows = document.querySelectorAll('table tr')
        
        for (const row of rows) {
          const cells = row.querySelectorAll('td')
          if (cells.length >= 2) {
            const nameCell = cells[0]
            const idCell = cells[1]
            
            if (nameCell && idCell) {
              const rawName = nameCell.textContent?.trim()
              const id = parseInt(idCell.textContent?.trim())
              
              if (rawName && !isNaN(id) && id > 0) {
                // Clean up the name - remove the variant info after #
                const name = rawName.split('#')[0].trim()
                items.push({ id, name, rawName })
              }
            }
          }
        }
        
        return items
      })

      console.log(`🎯 Found ${itemData.length} items in the wiki Item IDs page`)
      return itemData
      
    } catch (error) {
      console.error('❌ Error scraping wiki item IDs:', error)
      return []
    }
  }

  async getExistingItemIDs() {
    console.log('🔍 Getting existing item IDs from database...')
    
    const db = databaseService.db
    const existingItems = db.prepare('SELECT id FROM items').all()
    const existingIDs = new Set(existingItems.map(item => item.id))
    
    console.log(`📊 Found ${existingIDs.size} existing items in database`)
    return existingIDs
  }

  async findMissingItems(wikiItems, existingIDs) {
    console.log('🔍 Identifying missing items...')
    
    const missingItems = wikiItems.filter(item => !existingIDs.has(item.id))
    
    console.log(`🎯 Found ${missingItems.length} missing items out of ${wikiItems.length} total wiki items`)
    console.log(`📈 Current database coverage: ${((existingIDs.size / wikiItems.length) * 100).toFixed(1)}%`)
    
    // Sort by ID for logical processing
    missingItems.sort((a, b) => a.id - b.id)
    
    return missingItems
  }

  async fetchMissingItems(missingItems) {
    console.log(`🚀 Starting to fetch ${missingItems.length} missing items...`)
    
    const batchSize = 5 // Smaller batches for better rate limiting
    const delayBetweenBatches = 10000 // 10 seconds
    const maxRetries = 2
    
    for (let i = 0; i < missingItems.length; i += batchSize) {
      const batch = missingItems.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(missingItems.length / batchSize)
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (items ${i + 1}-${Math.min(i + batchSize, missingItems.length)})`)
      
      // Process batch sequentially to avoid overwhelming the wiki
      for (const item of batch) {
        let retries = 0
        
        while (retries < maxRetries) {
          try {
            console.log(`  🔍 Fetching item ${item.id}: ${item.name}`)
            
            // Use name-based lookup instead of ID-based lookup
            const result = await this.wikiLookupService.lookupItemByName(item.name)
            
            if (result && result.id) {
              this.foundItems++
              console.log(`    ✅ Found and saved: ${item.name} (ID: ${result.id})`)
            } else {
              this.notFoundItems++
              console.log(`    ❌ Not found: ${item.name}`)
            }
            
            this.totalProcessed++
            break
            
          } catch (error) {
            retries++
            this.errors++
            
            if (error.message?.includes('429')) {
              console.log(`    ⏸️  Rate limited on ${item.name}, waiting longer...`)
              await this.sleep(30000) // 30 second penalty for 429
            } else {
              console.log(`    ⚠️  Error fetching ${item.name} (attempt ${retries}): ${error.message}`)
            }
            
            if (retries >= maxRetries) {
              console.log(`    💀 Max retries exceeded for ${item.name}`)
              this.totalProcessed++
            } else {
              await this.sleep(5000) // Wait before retry
            }
          }
        }
        
        // Small delay between items within batch
        await this.sleep(3000)
      }
      
      // Progress update
      const progress = ((this.totalProcessed / missingItems.length) * 100).toFixed(1)
      console.log(`\n📊 Progress: ${this.totalProcessed}/${missingItems.length} (${progress}%)`)
      console.log(`✅ Found: ${this.foundItems} | ❌ Not found: ${this.notFoundItems} | 💥 Errors: ${this.errors}`)
      
      // Delay between batches (except for the last batch)
      if (i + batchSize < missingItems.length) {
        console.log(`⏳ Waiting ${delayBetweenBatches/1000}s before next batch...`)
        await this.sleep(delayBetweenBatches)
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async run() {
    try {
      await this.init()
      
      // Step 1: Scrape complete item list from wiki
      const wikiItems = await this.scrapeItemIDsFromWiki()
      if (wikiItems.length === 0) {
        throw new Error('Failed to scrape items from wiki')
      }
      
      // Step 2: Get existing items from database
      const existingIDs = await this.getExistingItemIDs()
      
      // Step 3: Find missing items
      const missingItems = await this.findMissingItems(wikiItems, existingIDs)
      
      if (missingItems.length === 0) {
        console.log('🎉 No missing items found! Database is complete.')
        return
      }
      
      // Step 4: Fetch missing items
      await this.fetchMissingItems(missingItems)
      
      console.log('\n🏁 SmartWikiItemIDFetcher completed!')
      console.log(`📊 Final Results:`)
      console.log(`  ✅ Items found and added: ${this.foundItems}`)
      console.log(`  ❌ Items not found: ${this.notFoundItems}`)
      console.log(`  💥 Errors encountered: ${this.errors}`)
      console.log(`  📈 Total processed: ${this.totalProcessed}`)
      
    } catch (error) {
      console.error('💥 SmartWikiItemIDFetcher failed:', error)
    } finally {
      if (this.browser) {
        await this.browser.close()
      }
      await databaseService.close()
    }
  }
}

// Run if called directly
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🔍 Checking if running as main script...')
console.log('Current file:', __filename)
console.log('process.argv[1]:', process.argv[1])

if (__filename === process.argv[1]) {
  console.log('🎬 Starting SmartWikiItemIDFetcher as main script...')
  const fetcher = new SmartWikiItemIDFetcher()
  fetcher.run().catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
} else {
  console.log('📦 SmartWikiItemIDFetcher loaded as module')
}

export default SmartWikiItemIDFetcher
