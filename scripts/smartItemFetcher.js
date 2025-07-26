import databaseService from '../services/databaseService.js'
import WikiLookupService from '../services/wikiLookupService.js'

/**
 * Gap-filling item fetcher that scans between lowest and highest existing IDs
 * Prioritizes dense ranges first for maximum efficiency
 */
class SmartItemFetcher {
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
    console.log('🔍 Smart Gap-Filling Item Fetcher')
    console.log('=================================')
    console.log('This scans for missing IDs, prioritizing dense ranges first')
    console.log('')

    await databaseService.init()

    // Get current database state
    const db = databaseService.db
    const existingItems = db.prepare('SELECT id FROM items ORDER BY id').all()
    const existingIds = new Set(existingItems.map(item => item.id))
    
    if (existingItems.length === 0) {
      console.log('❌ No items in database. Run the main scraper first.')
      await databaseService.close()
      return
    }
    
    // Get actual min and max from the database
    const stats = db.prepare('SELECT MIN(id) as min_id, MAX(id) as max_id, COUNT(*) as total FROM items').get()
    const minId = stats.min_id
    const maxId = stats.max_id
    
    console.log(`📊 Current database has ${stats.total} items`)
    console.log(`📊 ID range: ${minId} to ${maxId}`)
    console.log('🔍 Scanning for gaps between lowest and highest IDs...')

    // Find all missing IDs between min and max (excluding items we already have)
    const missingIds = []
    for (let id = minId; id <= maxId; id++) {
      if (!existingIds.has(id)) {
        missingIds.push(id)
      }
    }

    const totalPossible = maxId - minId + 1
    const coverage = ((totalPossible - missingIds.length) / totalPossible * 100).toFixed(1)
    console.log(`\n📊 Coverage analysis:`)
    console.log(`  - Total range: ${minId} to ${maxId} (${totalPossible} possible IDs)`)
    console.log(`  - Items in database: ${stats.total}`)
    console.log(`  - Missing IDs: ${missingIds.length}`)
    console.log(`  - Coverage: ${coverage}%`)

    if (missingIds.length === 0) {
      console.log('✅ No gaps found between lowest and highest IDs!')
      await databaseService.close()
      return
    }

    console.log(`\n📥 Processing missing IDs by density priority...`)
    console.log(`⚡ Conservative rate limiting (10 items per batch, 10s delays)`)
    console.log('')

    // Analyze density and prioritize ranges
    const prioritizedRanges = await this.analyzeDensityAndPrioritize(db, missingIds, minId, maxId)
    
    for (const range of prioritizedRanges) {
      console.log(`\n🎯 Processing ${range.name} (${range.missingIds.length} missing IDs)`)
      console.log(`📊 Range density: ${range.density}% | Priority: ${range.priority}`)
      
      await this.processRange(range.missingIds, range.name)
      
      // Show progress
      console.log(`✅ Completed ${range.name}`)
      
      // Longer delay between ranges to be respectful
      if (range !== prioritizedRanges[prioritizedRanges.length - 1]) {
        console.log('⏳ Waiting 30 seconds before next range...')
        await new Promise(resolve => setTimeout(resolve, 30000))
      }
    }

    console.log(`\n🎉 Smart gap filling complete!`)
    console.log(`📊 Final stats:`)
    console.log(`  - Items found: ${this.stats.found}`)
    console.log(`  - Items not found: ${this.stats.notFound}`)
    console.log(`  - Errors: ${this.stats.errors}`)
    console.log(`  - Total processed: ${this.stats.processed}`)

    await databaseService.close()
  }

  async analyzeDensityAndPrioritize(db, allMissingIds, minId, maxId) {
    console.log('📊 Analyzing density to prioritize ranges...')
    
    const chunkSize = 1000
    const missingSet = new Set(allMissingIds)
    const ranges = []
    
    for (let start = minId; start <= maxId; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, maxId)
      
      // Count existing items in this range
      const existingCount = db.prepare('SELECT COUNT(*) as count FROM items WHERE id BETWEEN ? AND ?').get(start, end).count
      
      // Count missing items in this range
      const rangeMissingIds = []
      for (let id = start; id <= end; id++) {
        if (missingSet.has(id)) {
          rangeMissingIds.push(id)
        }
      }
      
      if (rangeMissingIds.length > 0) {
        const totalPossible = end - start + 1
        const density = (existingCount / totalPossible * 100).toFixed(1)
        
        ranges.push({
          start,
          end,
          missingIds: rangeMissingIds,
          existingCount,
          density: parseFloat(density),
          name: `Range ${start}-${end}`,
          priority: density >= 20 ? 'high' : density >= 10 ? 'medium' : 'low'
        })
      }
    }
    
    // Sort by density (highest first) then by start ID
    ranges.sort((a, b) => {
      if (Math.abs(a.density - b.density) < 1) {
        return a.start - b.start // If similar density, prefer earlier IDs
      }
      return b.density - a.density // Higher density first
    })
    
    console.log(`\n📈 Found ${ranges.length} ranges with missing items:`)
    ranges.slice(0, 10).forEach((range, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${range.name}: ${range.missingIds.length} missing (${range.density}% density)`)
    })
    
    if (ranges.length > 10) {
      console.log(`  ... and ${ranges.length - 10} more ranges`)
    }
    
    return ranges
  }

  async processRange(missingIds, rangeName) {
    const batchSize = 10
    
    for (let i = 0; i < missingIds.length; i += batchSize) {
      const batch = missingIds.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(missingIds.length / batchSize)
      
      console.log(`  📦 Batch ${batchNum}/${totalBatches} (IDs ${batch[0]}-${batch[batch.length-1]})`)
      
      // Process items sequentially
      for (const id of batch) {
        await this.fetchItemById(id)
        // Small delay between items
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // Progress update
      const processed = Math.min(i + batchSize, missingIds.length)
      const progress = ((processed / missingIds.length) * 100).toFixed(1)
      console.log(`  📊 Progress: ${processed}/${missingIds.length} (${progress}%)`)
      console.log(`  📊 Found: ${this.stats.found}, Not Found: ${this.stats.notFound}, Errors: ${this.stats.errors}`)
      
      // Delay between batches
      if (i + batchSize < missingIds.length) {
        console.log('  ⏳ Waiting 10 seconds...')
        await new Promise(resolve => setTimeout(resolve, 10000))
      }
    }
  }

  async fetchItemById(id, retryCount = 0) {
    const maxRetries = 2
    
    try {
      this.stats.processed++
      
      // Try to lookup item by ID using WikiLookupService
      const item = await this.wikiLookup.lookupItemById(id.toString())
      
      if (item) {
        console.log(`    ✅ ${id}: ${item.name}`)
        this.stats.found++
      } else {
        // Silently not found - this is expected for many IDs
        this.stats.notFound++
      }
    } catch (error) {
      // Handle rate limits with exponential backoff
      if (error.message.includes('Rate limit') || error.message.includes('429')) {
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 10000 // 10s, 20s
          console.log(`    ⚠️  ${id}: Rate limited, waiting ${delay/1000}s before retry ${retryCount + 1}/${maxRetries}`)
          await new Promise(resolve => setTimeout(resolve, delay))
          return this.fetchItemById(id, retryCount + 1)
        } else {
          console.error(`    ❌ ${id}: Rate limit exceeded after ${maxRetries} retries`)
          this.stats.errors++
        }
      } else {
        console.error(`    ❌ ${id}: Error - ${error.message}`)
        this.stats.errors++
      }
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const fetcher = new SmartItemFetcher()
  await fetcher.run()
}

export default SmartItemFetcher
