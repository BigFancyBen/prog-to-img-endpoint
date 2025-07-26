import databaseService from '../services/databaseService.js'
import WikiLookupService from '../services/wikiLookupService.js'

/**
 * Comprehensive item fetcher that tries to get ALL items by ID
 * This ensures we don't miss any items that aren't in wiki categories
 */
class ComprehensiveItemFetcher {
  constructor() {
    this.wikiLookup = new WikiLookupService()
    this.stats = {
      found: 0,
      notFound: 0,
      errors: 0,
      processed: 0
    }
  }

  async run() {
    console.log('🔍 Comprehensive Item Fetcher')
    console.log('============================')
    console.log('This will attempt to fetch EVERY item by ID to ensure complete coverage')
    console.log('')

    await databaseService.init()

    // Get current database state
    const db = databaseService.db
    const existingItems = db.prepare('SELECT id FROM items').all()
    const existingIds = new Set(existingItems.map(item => item.id))
    
    console.log(`📊 Current database has ${existingItems.length} items`)
    console.log('🎯 Scanning for missing item IDs...')

    // OSRS item IDs typically range from 1 to around 30,000+
    // We'll scan in chunks to find gaps
    const maxId = Math.max(...existingIds, 30000)
    const missingIds = []

    // Find all missing IDs in common ranges
    const ranges = [
      { start: 1, end: 10000, name: 'Classic items (1-10K)' },
      { start: 10000, end: 20000, name: 'Extended items (10K-20K)' },
      { start: 20000, end: maxId + 1000, name: `Modern items (20K-${maxId + 1000})` }
    ]

    for (const range of ranges) {
      console.log(`\n🔍 Checking ${range.name}...`)
      let rangeCount = 0
      
      for (let id = range.start; id < range.end; id++) {
        if (!existingIds.has(id)) {
          missingIds.push(id)
          rangeCount++
        }
      }
      
      console.log(`  Found ${rangeCount} missing IDs in this range`)
    }

    console.log(`\n❌ Total missing IDs: ${missingIds.length}`)
    
    if (missingIds.length === 0) {
      console.log('✅ All items already cached!')
      await databaseService.close()
      return
    }

    // Process missing IDs in smaller batches with aggressive rate limiting
    console.log(`\n📥 Attempting to fetch missing items...`)
    console.log(`⚡ Processing in batches of 10 (conservative rate limiting)`)
    console.log(`⏰ Estimated time: ${Math.ceil(missingIds.length / 10 * 0.5)} minutes`)
    console.log('')

    const batchSize = 10
    for (let i = 0; i < missingIds.length; i += batchSize) {
      const batch = missingIds.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(missingIds.length / batchSize)
      
      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (IDs ${batch[0]}-${batch[batch.length-1]})`)
      
      await this.processBatch(batch)
      
      // Progress update
      const processed = Math.min(i + batchSize, missingIds.length)
      const progress = ((processed / missingIds.length) * 100).toFixed(1)
      console.log(`📊 Progress: ${processed}/${missingIds.length} (${progress}%)`)
      console.log(`📊 Found: ${this.stats.found}, Not Found: ${this.stats.notFound}, Errors: ${this.stats.errors}`)
      
      // Aggressive rate limiting
      if (i + batchSize < missingIds.length) {
        console.log('⏳ Waiting 10 seconds to respect rate limits...')
        await new Promise(resolve => setTimeout(resolve, 10000))
      }
    }

    console.log(`\n🎉 Comprehensive fetch complete!`)
    console.log(`📊 Final stats:`)
    console.log(`  - Items found: ${this.stats.found}`)
    console.log(`  - Items not found: ${this.stats.notFound}`)
    console.log(`  - Errors: ${this.stats.errors}`)
    console.log(`  - Total processed: ${this.stats.processed}`)

    await databaseService.close()
  }

  async processBatch(batch) {
    // Process items sequentially instead of in parallel to avoid rate limits
    for (const id of batch) {
      await this.fetchItemById(id)
      // Small delay between each item
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  async fetchItemById(id, retryCount = 0) {
    const maxRetries = 3
    
    try {
      this.stats.processed++
      
      // Try to lookup item by ID using WikiLookupService
      const item = await this.wikiLookup.lookupItemById(id.toString())
      
      if (item) {
        console.log(`✅ ${id}: ${item.name}`)
        this.stats.found++
      } else {
        // Silently not found - this is expected for many IDs
        this.stats.notFound++
      }
    } catch (error) {
      // Handle rate limits with exponential backoff
      if (error.message.includes('Rate limit') || error.message.includes('429')) {
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 5000 // 5s, 10s, 20s
          console.log(`⚠️  ${id}: Rate limited, waiting ${delay/1000}s before retry ${retryCount + 1}/${maxRetries}`)
          await new Promise(resolve => setTimeout(resolve, delay))
          return this.fetchItemById(id, retryCount + 1)
        } else {
          console.error(`❌ ${id}: Rate limit exceeded after ${maxRetries} retries`)
          this.stats.errors++
        }
      } else {
        console.error(`❌ ${id}: Error - ${error.message}`)
        this.stats.errors++
      }
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const fetcher = new ComprehensiveItemFetcher()
  await fetcher.run()
}

export default ComprehensiveItemFetcher
