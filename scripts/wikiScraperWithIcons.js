import { WikiApiClient } from './wiki/wikiApiClient.js'
import { WikitextParser } from './wiki/wikitextParser.js'
import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { createWriteStream } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATA_DIR = join(__dirname, '../data')
const ICONS_DIR = join(__dirname, '../icons')
const ITEMS_ICONS_DIR = join(ICONS_DIR, 'items')
const CHECKPOINT_FILE = join(DATA_DIR, 'wiki-icons-checkpoint.json')

/**
 * OSRS Wiki Icon Scraper - Downloads item icons from OSRS Wiki
 */
class OSRSWikiIconScraper {
  constructor(options = {}) {
    this.wikiClient = new WikiApiClient()
    this.concurrency = options.concurrency || 5 // Be more conservative with image downloads
    this.testMode = options.testMode || false // Test with first 10 items only
    this.stats = {
      iconsDownloaded: 0,
      iconsFailed: 0,
      totalProcessed: 0,
      startTime: Date.now()
    }
    this.checkpoint = null
    this.downloadedIcons = new Set()
  }

  async initDirectories() {
    const dirs = [DATA_DIR, ICONS_DIR, ITEMS_ICONS_DIR]
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
      
      // Load already downloaded icons
      this.downloadedIcons = new Set(this.checkpoint.downloadedIcons || [])
      return true
    } catch {
      this.checkpoint = {
        timestamp: new Date().toISOString(),
        downloadedIcons: [],
        processedPages: []
      }
      return false
    }
  }

  async saveCheckpoint() {
    this.checkpoint.timestamp = new Date().toISOString()
    this.checkpoint.downloadedIcons = Array.from(this.downloadedIcons)
    await writeFile(CHECKPOINT_FILE, JSON.stringify(this.checkpoint, null, 2))
  }

  async run() {
    await this.initDirectories()
    await this.loadCheckpoint()

    console.log('🖼️  OSRS Wiki Icon Scraper')
    console.log('==========================')
    console.log('Downloading item icons from OSRS Wiki')
    console.log(`⚡ Concurrency: ${this.concurrency} downloads at once`)
    if (this.testMode) {
      console.log('🧪 TEST MODE: Processing first 10 items only')
    }
    console.log('')

    await this.scrapeItemIcons()

    const elapsed = (Date.now() - this.stats.startTime) / 1000
    console.log('')
    console.log('🎉 Icon scraping completed!')
    console.log(`⏱️  Total time: ${Math.round(elapsed)}s`)
    console.log(`✅ Icons downloaded: ${this.stats.iconsDownloaded}`)
    console.log(`❌ Icons failed: ${this.stats.iconsFailed}`)
  }

  async scrapeItemIcons() {
    console.log('\n🖼️  Scraping item icons from OSRS Wiki...')
    
    // Get page titles for items
    console.log('📝 Extracting pages from category: Items')
    console.log('📝 Extracting pages from category: Pets')
    const pageTitlesObj = await this.wikiClient.extractPageTitles(['Items', 'Pets'])
    
    if (!pageTitlesObj || typeof pageTitlesObj !== 'object') {
      console.error('❌ Failed to extract page titles from categories')
      return
    }
    
    const pageTitles = Object.keys(pageTitlesObj)
    console.log(`✅ Found ${pageTitles.length} item pages`)

    // Filter out already processed pages
    const processedPages = this.checkpoint.processedPages || []
    let remainingPages = pageTitles.filter(title => !processedPages.includes(title))
    
    if (this.testMode) {
      remainingPages = remainingPages.slice(0, 10)
      console.log(`🧪 Test mode: processing only ${remainingPages.length} pages`)
    }
    
    if (remainingPages.length === 0) {
      console.log('✅ All item icons already processed')
      return
    }

    console.log(`🔄 Processing ${remainingPages.length} remaining pages...`)

    // Process pages in batches with concurrency
    let processed = 0
    const total = remainingPages.length
    
    for (let i = 0; i < remainingPages.length; i += this.concurrency) {
      const batch = remainingPages.slice(i, i + this.concurrency)
      
      // Process batch concurrently
      const promises = batch.map(pageTitle => this.processItemIconPage(pageTitle))
      const results = await Promise.allSettled(promises)
      
      // Handle results
      for (let j = 0; j < results.length; j++) {
        const result = results[j]
        const pageTitle = batch[j]
        
        if (result.status === 'fulfilled') {
          if (result.value) {
            this.stats.iconsDownloaded++
          }
        } else {
          console.error(`❌ Failed to process ${pageTitle}:`, result.reason.message)
          this.stats.iconsFailed++
        }
        
        // Mark as processed regardless of success/failure
        this.checkpoint.processedPages.push(pageTitle)
        processed++
      }
      
      // Save checkpoint every batch
      await this.saveCheckpoint()
      
      // Progress update
      const percent = Math.round((processed / total) * 100)
      const rate = processed / ((Date.now() - this.stats.startTime) / 1000)
      const eta = Math.round((total - processed) / rate)
      console.log(`   📊 Progress: ${processed}/${total} (${percent}%) | Rate: ${rate.toFixed(1)}/s | ETA: ${eta}s`)
      
      // Small delay to be respectful to the server
      await this.delay(200)
    }
    
    console.log(`✅ Completed icon scraping: ${this.stats.iconsDownloaded} icons downloaded`)
  }

  async processItemIconPage(pageTitle) {
    try {
      // Get wikitext for this page
      const wikitext = await this.wikiClient.getPageWikitext(pageTitle)
      if (!wikitext) return false
      
      const parser = new WikitextParser(wikitext)
      
      // Try to extract item infobox (be more flexible)
      let hasInfobox = false
      
      // Try multiple infobox types
      if (parser.extractInfobox('infobox item') || 
          parser.extractInfobox('infobox pet') ||
          parser.extractInfobox('item') ||
          parser.extractInfobox('pet')) {
        hasInfobox = true
      }
      
      // If no specific infobox found, try to find any infobox with item-like properties
      if (!hasInfobox) {
        const doc = parser.doc
        if (doc) {
          const infoboxes = doc.infoboxes()
          for (const infobox of infoboxes) {
            const data = infobox.data || {}
            // Check if this looks like an item infobox
            if (data.id || data.name || data.examine || data.value) {
              parser.template = parser.processInfobox(infobox)
              hasInfobox = true
              break
            }
          }
        }
      }
      
      if (hasInfobox) {
        const id = parser.extractId()
        if (!id) return false

        // Extract icon information from wikitext
        const iconInfo = this.extractIconInfo(parser, pageTitle, id)
        if (iconInfo) {
          return await this.downloadIcon(iconInfo, id, pageTitle)
        }
      }
      
      return false
    } catch (error) {
      console.error(`❌ Error processing ${pageTitle}:`, error.message)
      return false
    }
  }

  /**
   * Extract icon URL from wikitext infobox
   */
  extractIconInfo(parser, pageTitle, itemId) {
    // Try to get image parameter from infobox
    let imageParam = parser.extractValue('image')
    
    if (!imageParam) {
      // Fallback: try other common image parameter names
      imageParam = parser.extractValue('icon') || 
                   parser.extractValue('img') ||
                   parser.extractValue('picture')
    }
    
    if (imageParam) {
      // Clean the image parameter (remove File: prefix if present)
      let imageName = imageParam.replace(/^File:/, '').trim()
      
      // Handle wiki links [[File:...]]
      if (imageName.includes('[[') && imageName.includes(']]')) {
        const match = imageName.match(/\[\[(?:File:)?([^\]|]+)/)
        if (match) {
          imageName = match[1]
        }
      }
      
      if (imageName) {
        return {
          imageName: imageName,
          pageTitle: pageTitle,
          itemId: itemId
        }
      }
    }
    
    // Fallback: try to construct standard icon name
    const standardName = `${pageTitle.replace(/ /g, '_')}.png`
    return {
      imageName: standardName,
      pageTitle: pageTitle,
      itemId: itemId,
      isStandardName: true
    }
  }

  /**
   * Download icon from OSRS Wiki
   */
  async downloadIcon(iconInfo, itemId, pageTitle) {
    const { imageName, isStandardName } = iconInfo
    
    // Check if already downloaded
    const iconKey = `${itemId}_${imageName}`
    if (this.downloadedIcons.has(iconKey)) {
      return true
    }
    
    try {
      // Get the actual file URL from MediaWiki API
      const imageUrl = await this.getImageUrl(imageName)
      if (!imageUrl) {
        if (!isStandardName) {
          console.log(`⚠️  No image found for ${pageTitle} (${imageName})`)
        }
        return false
      }
      
      console.log(`🔍 Attempting to download: ${imageUrl}`)
      
      // Download the image
      const extension = this.getFileExtension(imageUrl)
      const filename = `${itemId}.${extension}`
      const filepath = join(ITEMS_ICONS_DIR, filename)
      
      await this.downloadFile(imageUrl, filepath)
      
      this.downloadedIcons.add(iconKey)
      console.log(`✅ Downloaded icon for ${pageTitle} (ID: ${itemId}) -> ${filename}`)
      return true
      
    } catch (error) {
      console.error(`❌ Failed to download icon for ${pageTitle}:`, error.message)
      return false
    }
  }

  /**
   * Get the actual image URL from MediaWiki API
   */
  async getImageUrl(imageName) {
    try {
      const response = await this.wikiClient.makeRequest({
        action: 'query',
        titles: `File:${imageName}`,
        prop: 'imageinfo',
        iiprop: 'url',
        format: 'json'
      })
      
      const pages = response.query?.pages
      if (pages) {
        const page = Object.values(pages)[0]
        if (page.imageinfo && page.imageinfo[0]) {
          return page.imageinfo[0].url
        }
      }
      return null
    } catch (error) {
      console.error(`Error getting image URL for ${imageName}:`, error.message)
      return null
    }
  }

  /**
   * Download file from URL using axios with proper headers
   */
  async downloadFile(url, filepath) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        headers: {
          'User-Agent': 'OSRS-Progress-Image-Bot/1.0 (https://github.com/yourusername/prog-to-img-endpoint; your-email@example.com)',
          'Accept': 'image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'DNT': '1',
          'Connection': 'keep-alive'
        },
        timeout: 30000
      })
      
      const fileStream = createWriteStream(filepath)
      response.data.pipe(fileStream)
      
      return new Promise((resolve, reject) => {
        fileStream.on('finish', resolve)
        fileStream.on('error', reject)
        response.data.on('error', reject)
      })
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`)
    }
  }

  /**
   * Get file extension from URL
   */
  getFileExtension(url) {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
    return match ? match[1] : 'png'
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export default OSRSWikiIconScraper
