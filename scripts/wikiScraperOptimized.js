import { WikiApiClient } from './wiki/wikiApiClient.js'
import { WikitextParser } from './wiki/wikitextParser.js'
import { InfoboxCleaner } from './wiki/infoboxCleaner.js'
import { readFile, writeFile, mkdir, access, appendFile } from 'fs/promises'
import { createWriteStream } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import databaseService from '../services/databaseService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, '../data')
const CACHE_DIR = join(DATA_DIR, 'cache')
const PROCESSED_DIR = join(DATA_DIR, 'processed')
const CHECKPOINT_FILE = join(DATA_DIR, 'wiki-checkpoint.json')
const STREAMING_DIR = join(DATA_DIR, 'streaming')
const ICONS_DIR = join(__dirname, '../icons/items')

/**
 * High-performance OSRS Wiki scraper with concurrency and streaming writes
 */
class OSRSWikiScraperOptimized {
  constructor(options = {}) {
    this.wikiClient = new WikiApiClient()
    this.concurrency = options.concurrency || 2 // Start conservative
    this.maxConcurrency = options.maxConcurrency || 5 // Maximum allowed
    this.minConcurrency = 1 // Minimum allowed
    this.batchSize = options.batchSize || 25 // Save progress every 25 items
    this.stats = {
      itemsProcessed: 0,
      monstersProcessed: 0,
      prayersProcessed: 0,
      totalProcessed: 0,
      rateLimitHits: 0,
      retries: 0,
      lastUpdated: new Date().toISOString(),
      startTime: Date.now()
    }
    this.checkpoint = null
    this.processedIds = new Set() // Track what we've already processed
    
    // Rate limiting configuration
    this.baseDelay = 200 // Base delay between requests (ms)
    this.currentDelay = this.baseDelay
    this.maxDelay = 10000 // Maximum delay (10 seconds)
    this.backoffMultiplier = 2
    this.rateLimitCooldown = 30000 // 30 seconds cooldown after rate limit
    this.consecutiveErrors = 0
    this.maxConsecutiveErrors = 5
  }

  async initDirectories() {
    const dirs = [DATA_DIR, CACHE_DIR, PROCESSED_DIR, STREAMING_DIR, ICONS_DIR]
    for (const dir of dirs) {
      try {
        await access(dir)
      } catch {
        await mkdir(dir, { recursive: true })
        console.log(`📁 Created directory: ${dir}`)
      }
    }
  }

  async loadCheckpoint() {
    try {
      const checkpointData = await readFile(CHECKPOINT_FILE, 'utf8')
      this.checkpoint = JSON.parse(checkpointData)
      console.log(`📋 Loaded checkpoint from ${new Date(this.checkpoint.timestamp).toLocaleString()}`)
      
      // Load already processed IDs
      await this.loadProcessedIds()
      return true
    } catch {
      this.checkpoint = {
        timestamp: new Date().toISOString(),
        completed: [],
        processing: [],
        pageTitles: {},
        processedPages: {}
      }
      return false
    }
  }

  async loadProcessedIds() {
    try {
      // Load existing streaming data to know what we've already processed
      const itemsFile = join(STREAMING_DIR, 'items-stream.jsonl')
      const monstersFile = join(STREAMING_DIR, 'monsters-stream.jsonl')
      
      for (const file of [itemsFile, monstersFile]) {
        try {
          const data = await readFile(file, 'utf8')
          const lines = data.trim().split('\n')
          for (const line of lines) {
            if (line.trim()) {
              const item = JSON.parse(line)
              this.processedIds.add(item.id)
            }
          }
        } catch {
          // File doesn't exist yet
        }
      }
      
      console.log(`📋 Loaded ${this.processedIds.size} previously processed items`)
    } catch (error) {
      console.warn('⚠️  Could not load processed IDs:', error.message)
    }
  }

  async saveCheckpoint() {
    this.checkpoint.timestamp = new Date().toISOString()
    await writeFile(CHECKPOINT_FILE, JSON.stringify(this.checkpoint, null, 2))
  }

  async appendToStream(item, type = 'items') {
    const streamFile = join(STREAMING_DIR, `${type}-stream.jsonl`)
    const line = JSON.stringify(item) + '\n'
    await appendFile(streamFile, line)
  }

  async run() {
    await this.initDirectories()
    await this.loadCheckpoint()

    // Initialize database
    await databaseService.init()

    console.log('🎮 OSRS Wiki Data Scraper (Optimized)')
    console.log('=====================================')
    console.log('Scraping data directly from the OSRS Wiki')
    console.log(`⚡ Initial concurrency: ${this.concurrency} pages at once`)
    console.log(`� Max concurrency: ${this.maxConcurrency}`)
    console.log(`�💾 Batch size: ${this.batchSize} items per save`)
    console.log(`⏰ Base delay: ${this.baseDelay}ms`)
    console.log('💾 Storage: SQLite Database')
    console.log('🔄 Features: Rate limit handling, Dynamic concurrency, Retry logic')
    console.log('')

    // Scrape different data types
    await this.scrapeItemsOptimized()
    await this.scrapeMonstersOptimized()
    await this.scrapePrayersOptimized()

    this.stats.lastUpdated = new Date().toISOString()
    await this.saveStats()
    
    // Display final statistics
    const dbStats = databaseService.getStats()
    
    const elapsed = (Date.now() - this.stats.startTime) / 1000
    console.log('')
    console.log('🎉 Scraping completed successfully!')
    console.log(`⏱️  Total time: ${Math.round(elapsed)}s`)
    console.log(`📊 Items in database: ${dbStats.items}`)
    console.log(`⚔️  Equipment items: ${dbStats.equipment}`)
    console.log(`🗡️  Weapon items: ${dbStats.weapons}`)
    console.log(`👹 Monsters: ${dbStats.monsters}`)
    console.log(`🙏 Prayers: ${dbStats.prayers}`)
  }

  /**
   * Optimized items scraping with concurrency and streaming
   */
  async scrapeItemsOptimized() {
    console.log('\n📦 Scraping items data from OSRS Wiki...')
    
    // Get page titles
    let pageTitlesObj = this.checkpoint.pageTitles.items
    if (!pageTitlesObj) {
      console.log('📝 Extracting pages from category: Items')
      console.log('📝 Extracting pages from category: Pets')
      pageTitlesObj = await this.wikiClient.extractPageTitles(['Items', 'Pets'])
      
      if (!pageTitlesObj || typeof pageTitlesObj !== 'object') {
        console.error('❌ Failed to extract page titles from categories')
        return
      }
      
      this.checkpoint.pageTitles.items = pageTitlesObj
      await this.saveCheckpoint()
      console.log(`✅ Extracted ${Object.keys(pageTitlesObj).length} page titles`)
    } else {
      console.log(`📋 Using cached ${Object.keys(pageTitlesObj).length} page titles`)
    }

    // Convert object keys to array for processing
    const pageTitles = Object.keys(pageTitlesObj)

    // Filter out already processed pages
    const processedPages = this.checkpoint.processedPages.items || []
    const remainingPages = pageTitles.filter(title => !processedPages.includes(title))
    
    if (remainingPages.length === 0) {
      console.log('✅ All items already processed')
      return
    }

    console.log(`🔄 Processing ${remainingPages.length} remaining pages...`)
    console.log(`⏭️  Skipped ${pageTitles.length - remainingPages.length} already processed pages`)

    // Process pages in batches with dynamic concurrency
    let processed = 0
    const total = remainingPages.length
    
    for (let i = 0; i < remainingPages.length; i += this.concurrency) {
      // Check if we need to pause due to errors
      await this.checkErrorThreshold()
      
      const batch = remainingPages.slice(i, i + this.concurrency)
      
      console.log(`🔄 Processing batch of ${batch.length} pages (concurrency: ${this.concurrency}, delay: ${this.currentDelay}ms)`)
      
      // Process batch concurrently
      const promises = batch.map(pageTitle => this.processItemPage(pageTitle))
      const results = await Promise.allSettled(promises)
      
      // Handle results
      for (let j = 0; j < results.length; j++) {
        const result = results[j]
        const pageTitle = batch[j]
        
        if (result.status === 'fulfilled' && result.value) {
          // Save successful result directly to database
          try {
            const itemData = result.value
            // Set the icon path to the local file path
            if (itemData.icon) {
              itemData.icon_path = itemData.icon
              itemData.icon_url = null // We have local file, no need for URL
            }
            
            databaseService.insertItem(itemData)
            this.stats.itemsProcessed++
            console.log(`💾 Saved item ${itemData.id}: ${itemData.name}`)
          } catch (dbError) {
            console.error(`❌ Database error for ${pageTitle}:`, dbError.message)
          }
        } else if (result.status === 'rejected') {
          console.error(`❌ Failed to process ${pageTitle}:`, result.reason.message)
          this.consecutiveErrors++
        }
        
        // Mark as processed regardless of success/failure
        if (!this.checkpoint.processedPages.items) {
          this.checkpoint.processedPages.items = []
        }
        this.checkpoint.processedPages.items.push(pageTitle)
        processed++
      }
      
      // Save checkpoint every batch
      await this.saveCheckpoint()
      
      // Progress update with rate limiting stats
      const percent = Math.round((processed / total) * 100)
      const rate = processed / ((Date.now() - this.stats.startTime) / 1000)
      const eta = Math.round((total - processed) / rate)
      console.log(`   📊 Progress: ${processed}/${total} (${percent}%) | Rate: ${rate.toFixed(1)}/s | ETA: ${eta}s`)
      console.log(`   📊 Rate limits: ${this.stats.rateLimitHits} | Retries: ${this.stats.retries} | Errors: ${this.consecutiveErrors}`)
      
      // Apply current delay between batches
      await this.delay(this.currentDelay)
    }
    
    console.log(`✅ Completed items scraping: ${this.stats.itemsProcessed} items processed`)
  }

  /**
   * Process a single item page with retry logic
   */
  async processItemPage(pageTitle) {
    try {
      // Use retry wrapper for wiki API calls
      const wikitext = await this.retryApiCall(async () => {
        return await this.wikiClient.getPageWikitext(pageTitle)
      })
      
      if (!wikitext) return null
      
      const parser = new WikitextParser(wikitext)
      
      // Try to extract item infobox
      if (parser.extractInfobox('infobox item') || parser.extractInfobox('infobox pet')) {
        const itemData = await this.extractItemData(parser, pageTitle)
        
        if (itemData && itemData.id && !this.processedIds.has(itemData.id)) {
          this.processedIds.add(itemData.id)
          return itemData
        }
      }
      
      return null
    } catch (error) {
      console.error(`❌ Error processing ${pageTitle}:`, error.message)
      this.consecutiveErrors++
      return null
    }
  }

  /**
   * Extract item data from parsed infobox
   */
  async extractItemData(parser, pageTitle) {
    const id = parser.extractId()
    if (!id) return null

    // Extract icon information
    const iconFilename = parser.extractIcon()
    let localIconPath = null
    
    if (iconFilename) {
      // Download and cache the icon locally using item ID as filename
      localIconPath = await this.downloadIcon(iconFilename, id)
      if (localIconPath) {
        console.log(`📥 Cached icon for ${pageTitle}: ${localIconPath}`)
      } else {
        console.warn(`⚠️  Could not download icon for ${pageTitle}`)
      }
    }

    const itemData = {
      id: id,
      name: InfoboxCleaner.clean(parser.extractValue('name'), 'string') || pageTitle,
      examine: InfoboxCleaner.clean(parser.extractValue('examine'), 'examine'),
      wiki_name: pageTitle,
      wiki_url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(pageTitle)}`,
      icon: localIconPath, // Local file path
      icon_path: localIconPath, // For database storage
      icon_url: iconFilename ? `https://oldschool.runescape.wiki/w/File:${encodeURIComponent(iconFilename)}` : null, // Wiki file page for reference
      members: InfoboxCleaner.clean(parser.extractValue('members'), 'boolean'),
      tradeable: InfoboxCleaner.clean(parser.extractValue('tradeable'), 'boolean'),
      tradeable_on_ge: InfoboxCleaner.clean(parser.extractValue('exchangeable'), 'boolean'),
      stackable: InfoboxCleaner.clean(parser.extractValue('stackable'), 'boolean'),
      noted: InfoboxCleaner.clean(parser.extractValue('noted'), 'boolean'),
      noteable: InfoboxCleaner.clean(parser.extractValue('noteable'), 'boolean'),
      weight: InfoboxCleaner.clean(parser.extractValue('weight'), 'number'),
      buy_limit: InfoboxCleaner.clean(parser.extractValue('buylimit'), 'number'),
      quest_item: InfoboxCleaner.clean(parser.extractValue('quest'), 'boolean'),
      release_date: InfoboxCleaner.clean(parser.extractValue('release'), 'date'),
      duplicate: false,
      equipable: false,
      equipable_by_player: false,
      equipable_weapon: false,
      cost: InfoboxCleaner.clean(parser.extractValue('cost'), 'number'),
      lowalch: InfoboxCleaner.clean(parser.extractValue('low'), 'number'),
      highalch: InfoboxCleaner.clean(parser.extractValue('high'), 'number'),
      destruction: InfoboxCleaner.clean(parser.extractValue('destroy'), 'string'),
      last_updated: new Date().toISOString()
    }

    // Check if item is equipable
    const slot = InfoboxCleaner.clean(parser.extractValue('slot'), 'string')
    if (slot) {
      itemData.equipable = true
      itemData.equipable_by_player = true
      itemData.equipment = {
        attack_stab: InfoboxCleaner.clean(parser.extractValue('astab'), 'stats'),
        attack_slash: InfoboxCleaner.clean(parser.extractValue('aslash'), 'stats'),
        attack_crush: InfoboxCleaner.clean(parser.extractValue('acrush'), 'stats'),
        attack_magic: InfoboxCleaner.clean(parser.extractValue('amagic'), 'stats'),
        attack_ranged: InfoboxCleaner.clean(parser.extractValue('arange'), 'stats'),
        defence_stab: InfoboxCleaner.clean(parser.extractValue('dstab'), 'stats'),
        defence_slash: InfoboxCleaner.clean(parser.extractValue('dslash'), 'stats'),
        defence_crush: InfoboxCleaner.clean(parser.extractValue('dcrush'), 'stats'),
        defence_magic: InfoboxCleaner.clean(parser.extractValue('dmagic'), 'stats'),
        defence_ranged: InfoboxCleaner.clean(parser.extractValue('drange'), 'stats'),
        melee_strength: InfoboxCleaner.clean(parser.extractValue('str'), 'stats'),
        ranged_strength: InfoboxCleaner.clean(parser.extractValue('rstr'), 'stats'),
        magic_damage: InfoboxCleaner.clean(parser.extractValue('mdmg'), 'stats'),
        prayer: InfoboxCleaner.clean(parser.extractValue('prayer'), 'stats'),
        slot: slot,
        requirements: InfoboxCleaner.clean(parser.extractValue('reqs'), 'requirements')
      }
      
      // Check if it's a weapon
      const attackSpeed = parser.extractValue('aspeed')
      if (attackSpeed) {
        itemData.equipable_weapon = true
        itemData.weapon = {
          attack_speed: InfoboxCleaner.clean(attackSpeed, 'number'),
          weapon_type: InfoboxCleaner.clean(parser.extractValue('wtype'), 'string'),
          stab: itemData.equipment.attack_stab,
          slash: itemData.equipment.attack_slash,
          crush: itemData.equipment.attack_crush,
          magic: itemData.equipment.attack_magic,
          ranged: itemData.equipment.attack_ranged
        }
      }
    }

    return itemData
  }

  // Placeholder methods for monsters and prayers (similar optimization patterns)
  async scrapeMonstersOptimized() {
    console.log('\n👹 Optimized monsters scraping - TODO: implement similar to items')
    // Similar implementation to scrapeItemsOptimized but for monsters
  }

  async scrapePrayersOptimized() {
    console.log('\n🙏 Optimized prayers scraping - TODO: implement similar to items')
    // Similar implementation to scrapeItemsOptimized but for prayers
  }

  /**
   * Get database statistics and save to summary file
   */
  async saveStats() {
    const dbStats = databaseService.getStats()
    const statsData = {
      ...this.stats,
      database: dbStats,
      lastUpdated: new Date().toISOString()
    }
    
    const statsFile = join(PROCESSED_DIR, 'summary.json')
    await writeFile(statsFile, JSON.stringify(statsData, null, 2))
    console.log('📊 Statistics saved to summary.json')
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Handle rate limiting by adjusting concurrency and delays
   */
  async handleRateLimit() {
    this.stats.rateLimitHits++
    this.consecutiveErrors++
    
    console.warn(`⚠️  Rate limit hit (${this.stats.rateLimitHits} total). Adjusting parameters...`)
    
    // Reduce concurrency
    if (this.concurrency > this.minConcurrency) {
      this.concurrency = Math.max(this.minConcurrency, this.concurrency - 1)
      console.log(`📉 Reduced concurrency to ${this.concurrency}`)
    }
    
    // Increase delay
    this.currentDelay = Math.min(this.maxDelay, this.currentDelay * this.backoffMultiplier)
    console.log(`⏰ Increased delay to ${this.currentDelay}ms`)
    
    // Wait for cooldown period
    console.log(`⏳ Waiting ${this.rateLimitCooldown/1000}s for rate limit cooldown...`)
    await this.delay(this.rateLimitCooldown)
  }

  /**
   * Handle successful request (reset some rate limiting)
   */
  handleSuccess() {
    this.consecutiveErrors = 0
    
    // Gradually restore concurrency if we've been successful
    if (this.stats.itemsProcessed % 10 === 0 && this.consecutiveErrors === 0) {
      if (this.concurrency < this.maxConcurrency) {
        this.concurrency = Math.min(this.maxConcurrency, this.concurrency + 1)
        console.log(`📈 Increased concurrency to ${this.concurrency}`)
      }
      
      // Gradually reduce delay
      if (this.currentDelay > this.baseDelay) {
        this.currentDelay = Math.max(this.baseDelay, this.currentDelay * 0.8)
        console.log(`⏰ Reduced delay to ${this.currentDelay}ms`)
      }
    }
  }

  /**
   * Check if we should pause due to too many consecutive errors
   */
  async checkErrorThreshold() {
    if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
      console.warn(`⚠️  Too many consecutive errors (${this.consecutiveErrors}). Taking a longer break...`)
      await this.delay(60000) // 1 minute break
      this.consecutiveErrors = 0
    }
  }

  /**
   * Retry wrapper for API calls with exponential backoff
   */
  async retryApiCall(apiCallFn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await apiCallFn()
        this.handleSuccess()
        return result
      } catch (error) {
        this.stats.retries++
        
        // Check if it's a rate limit error
        if (error.message && (error.message.includes('429') || error.message.includes('rate limit'))) {
          await this.handleRateLimit()
          continue // Try again after rate limit handling
        }
        
        // For other errors, use exponential backoff
        if (attempt < maxRetries) {
          const retryDelay = Math.min(this.maxDelay, 1000 * Math.pow(2, attempt - 1))
          console.warn(`⚠️  API call failed (attempt ${attempt}/${maxRetries}). Retrying in ${retryDelay}ms...`)
          await this.delay(retryDelay)
        } else {
          console.error(`❌ API call failed after ${maxRetries} attempts:`, error.message)
          throw error
        }
      }
    }
  }

  /**
   * Download and cache an icon file locally with retry logic
   */
  async downloadIcon(iconFilename, itemId) {
    if (!iconFilename || !itemId) return null
    
    try {
      // Ensure icons directory exists
      await mkdir(ICONS_DIR, { recursive: true })
      
      const fileName = `${itemId}.png`
      const iconPath = join(ICONS_DIR, fileName)
      
      // Check if icon already exists
      try {
        await access(iconPath)
        console.log(`✅ Icon already cached: ${fileName}`)
        return iconPath // Icon already exists, return full path
      } catch {
        // Icon doesn't exist, download it
      }
      
      console.log(`📥 Downloading icon for item ${itemId}: ${iconFilename}`)
      
      // Ensure filename has .png extension for MediaWiki API
      const filenameWithExt = iconFilename.endsWith('.png') ? iconFilename : iconFilename + '.png'
      
      // Get proper image info through MediaWiki API
      const imageInfo = await this.wikiClient.getImageInfo(filenameWithExt)
      
      if (!imageInfo || !imageInfo.thumburl) {
        console.warn(`⚠️  Could not get image info for: ${iconFilename}`)
        return null
      }
      
      // Add delay before downloading to be respectful to image server
      await this.delay(this.currentDelay)
      
      // Try downloading with retry logic
      const success = await this.retryApiCall(async () => {
        const result = await this.downloadIconFromUrl(imageInfo.thumburl, iconPath)
        if (!result) {
          throw new Error('Icon download failed')
        }
        return result
      }, 3) // 3 retries for icons using proper API URLs
      
      if (success) {
        console.log(`✅ Successfully downloaded icon: ${fileName}`)
        return iconPath // Return full local path
      }
      
      return null // Download failed
    } catch (error) {
      console.warn(`⚠️  Error downloading icon ${iconFilename}:`, error.message)
      return null
    }
  }

  /**
   * Download icon from URL to local path with better error handling
   */
  downloadIconFromUrl(url, iconPath) {
    return new Promise((resolve) => {
      const file = createWriteStream(iconPath)
      
      const request = https.get(url, {
        headers: {
          'User-Agent': 'OSRS-Progress-Image-Bot/1.0 (https://github.com/yourusername/prog-to-img-endpoint; your-email@example.com)',
          'Accept': 'image/png,image/jpeg,image/gif,image/*,*/*',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache'
        }
      }, (response) => {
        if (response.statusCode === 200) {
          console.log(`📥 Downloading icon from: ${url}`)
          response.pipe(file)
          file.on('finish', () => {
            file.close()
            console.log(`✅ Icon download completed: ${iconPath}`)
            resolve(true)
          })
          file.on('error', (error) => {
            file.close()
            console.warn(`⚠️  File write error:`, error.message)
            resolve(false)
          })
        } else if (response.statusCode === 404) {
          file.close()
          console.warn(`⚠️  Icon not found (404): ${url}`)
          resolve(false)
        } else if (response.statusCode === 403) {
          file.close()
          console.warn(`⚠️  Access denied (403) for icon: ${url}`)
          resolve(false)
        } else if (response.statusCode === 429) {
          file.close()
          console.warn(`⚠️  Rate limited (429) on icon download: ${url}`)
          resolve(false)
        } else if (response.statusCode >= 300 && response.statusCode < 400) {
          // Handle redirects
          file.close()
          if (response.headers.location) {
            console.log(`🔄 Redirecting icon download to: ${response.headers.location}`)
            this.downloadIconFromUrl(response.headers.location, iconPath).then(resolve)
          } else {
            console.warn(`⚠️  Redirect without location for icon: ${response.statusCode}`)
            resolve(false)
          }
        } else {
          file.close()
          console.warn(`⚠️  Failed to download icon: ${response.statusCode} ${url}`)
          resolve(false)
        }
      })
      
      request.on('error', (error) => {
        file.close()
        console.warn(`⚠️  Error downloading icon:`, error.message)
        resolve(false)
      })
      
      request.setTimeout(30000, () => {
        request.destroy()
        file.close()
        console.warn(`⚠️  Timeout downloading icon: ${url}`)
        resolve(false)
      })
    })
  }
}

export default OSRSWikiScraperOptimized
