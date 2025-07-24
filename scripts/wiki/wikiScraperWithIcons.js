import { WikitextParser } from './wikitextParser.js'
import { WikiApiClient } from './wikiApiClient.js'
import { InfoboxCleaner } from './infoboxCleaner.js'
import { createWriteStream, promises as fs } from 'fs'
import { join, dirname } from 'path'
import https from 'https'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Enhanced OSRS Wiki scraper that also downloads item icons
 */
export class OSRSWikiScraperWithIcons {
  constructor() {
    this.wikiClient = new WikiApiClient()
    this.stats = {
      itemsProcessed: 0,
      iconsDownloaded: 0,
      iconErrors: 0
    }
    this.checkpoint = {
      pageTitles: { items: null },
      processedPages: { items: [] },
      downloadedIcons: []
    }
    this.processedIds = new Set()
    this.iconConcurrency = 3 // Lower concurrency for icon downloads
    this.pageDelay = 100
    this.iconDelay = 200
  }

  /**
   * Load checkpoint data
   */
  async loadCheckpoint() {
    try {
      const checkpointPath = join(__dirname, '../../data/wiki-icons-checkpoint.json')
      const data = await fs.readFile(checkpointPath, 'utf8')
      this.checkpoint = { ...this.checkpoint, ...JSON.parse(data) }
      
      // Rebuild processed IDs set
      if (this.checkpoint.processedPages.items) {
        for (const pageTitle of this.checkpoint.processedPages.items) {
          // This is a simplified approach - in practice you'd want to store the IDs directly
          this.processedIds.add(pageTitle)
        }
      }
      
      console.log(`📋 Loaded checkpoint: ${this.checkpoint.processedPages.items?.length || 0} pages processed`)
      console.log(`📋 Loaded checkpoint: ${this.checkpoint.downloadedIcons?.length || 0} icons downloaded`)
    } catch (error) {
      console.log('📋 No previous checkpoint found, starting fresh')
      this.checkpoint = {
        pageTitles: { items: null },
        processedPages: { items: [] },
        downloadedIcons: []
      }
    }
  }

  /**
   * Save checkpoint data
   */
  async saveCheckpoint() {
    try {
      const checkpointPath = join(__dirname, '../../data/wiki-icons-checkpoint.json')
      await fs.writeFile(checkpointPath, JSON.stringify(this.checkpoint, null, 2))
    } catch (error) {
      console.error('❌ Error saving checkpoint:', error.message)
    }
  }

  /**
   * Download a single icon from OSRS Wiki
   */
  async downloadIcon(imageName, itemId) {
    return new Promise((resolve) => {
      // Convert "File:Abyssal whip.png" to proper URL
      const fileName = imageName.replace('File:', '').trim()
      const encodedFileName = encodeURIComponent(fileName)
      const iconUrl = `https://oldschool.runescape.wiki/images/${encodedFileName}`
      
      const iconDir = join(__dirname, '../../icons/items')
      const iconPath = join(iconDir, `${itemId}.png`)
      
      // Create icons/items directory if it doesn't exist
      fs.mkdir(iconDir, { recursive: true }).then(() => {
        const file = createWriteStream(iconPath)
        
        const request = https.get(iconUrl, (response) => {
          if (response.statusCode === 200) {
            response.pipe(file)
            file.on('finish', () => {
              file.close()
              this.stats.iconsDownloaded++
              resolve(true)
            })
          } else if (response.statusCode === 404) {
            // Try alternative URL format for some icons
            const altUrl = `https://oldschool.runescape.wiki/images/${fileName.replace(/ /g, '_')}`
            this.downloadIconAlternative(altUrl, iconPath).then(resolve).catch(() => {
              console.warn(`⚠️  Icon not found: ${fileName}`)
              this.stats.iconErrors++
              resolve(false)
            })
          } else {
            console.warn(`⚠️  Failed to download icon ${fileName}: ${response.statusCode}`)
            this.stats.iconErrors++
            resolve(false)
          }
        })
        
        request.on('error', (error) => {
          console.warn(`⚠️  Error downloading icon ${fileName}:`, error.message)
          this.stats.iconErrors++
          resolve(false)
        })
        
        request.setTimeout(10000, () => {
          request.destroy()
          console.warn(`⚠️  Timeout downloading icon: ${fileName}`)
          this.stats.iconErrors++
          resolve(false)
        })
      }).catch(() => {
        console.error('❌ Failed to create icons directory')
        resolve(false)
      })
    })
  }

  /**
   * Try alternative URL format for icon download
   */
  async downloadIconAlternative(url, iconPath) {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(iconPath)
      
      const request = https.get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file)
          file.on('finish', () => {
            file.close()
            this.stats.iconsDownloaded++
            resolve(true)
          })
        } else {
          reject(new Error(`HTTP ${response.statusCode}`))
        }
      })
      
      request.on('error', reject)
      request.setTimeout(10000, () => {
        request.destroy()
        reject(new Error('Timeout'))
      })
    })
  }

  /**
   * Extract item icon from wikitext
   */
  extractItemIcon(wikitext, itemName) {
    // Look for image references in the infobox
    const imageRegex = /\|\s*image\s*=\s*\[\[File:([^|\]]+)\.(png|jpg|jpeg)/i
    let match = imageRegex.exec(wikitext)
    
    if (match) {
      return `File:${match[1]}.${match[2]}`
    }
    
    // Fallback: look for any image that matches the item name
    const itemNamePattern = itemName.replace(/[^a-zA-Z0-9]/g, '\\s*')
    const fallbackRegex = new RegExp(`\\[\\[File:(${itemNamePattern}[^|\\]]*\\.(png|jpg|jpeg))`, 'i')
    match = fallbackRegex.exec(wikitext)
    
    if (match) {
      return `File:${match[1]}`
    }
    
    // Last resort: assume standard naming
    return `File:${itemName}.png`
  }

  /**
   * Process a single item page and download its icon
   */
  async processItemPageWithIcon(pageTitle) {
    try {
      // Get wikitext for this page
      const wikitext = await this.wikiClient.getPageWikitext(pageTitle)
      if (!wikitext) return null
      
      const parser = new WikitextParser(wikitext)
      
      // Try to extract item infobox
      if (parser.extractInfobox('infobox item') || parser.extractInfobox('infobox pet')) {
        const itemData = this.extractItemData(parser, pageTitle)
        
        if (itemData && itemData.id && !this.processedIds.has(itemData.id)) {
          this.processedIds.add(itemData.id)
          
          // Extract and download icon
          const iconName = this.extractItemIcon(wikitext, itemData.name)
          const iconDownloaded = await this.downloadIcon(iconName, itemData.id)
          
          if (iconDownloaded) {
            this.checkpoint.downloadedIcons.push({
              id: itemData.id,
              name: itemData.name,
              icon: iconName
            })
          }
          
          return itemData
        }
      }
      
      return null
    } catch (error) {
      console.error(`❌ Error processing ${pageTitle}:`, error.message)
      return null
    }
  }

  /**
   * Extract item data from parsed infobox (same as before)
   */
  extractItemData(parser, pageTitle) {
    const id = parser.extractId()
    if (!id) return null

    const itemData = {
      id: id,
      name: InfoboxCleaner.clean(parser.extractValue('name'), 'string') || pageTitle,
      examine: InfoboxCleaner.clean(parser.extractValue('examine'), 'examine'),
      wiki_name: pageTitle,
      wiki_url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(pageTitle)}`,
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
      cost: InfoboxCleaner.clean(parser.extractValue('value'), 'number') || 0,
      lowalch: InfoboxCleaner.clean(parser.extractValue('alchlow'), 'number') || 0,
      highalch: InfoboxCleaner.clean(parser.extractValue('alchhigh'), 'number') || 0,
      destruction: InfoboxCleaner.clean(parser.extractValue('destroy'), 'string'),
      last_updated: new Date().toISOString()
    }

    return itemData
  }

  /**
   * Run the enhanced scraper with icon downloads
   */
  async run(testMode = false, maxItems = null) {
    console.log('🎮 OSRS Wiki Data Scraper with Icons')
    console.log('=====================================')
    console.log('Scraping data and downloading icons from the OSRS Wiki')
    
    await this.loadCheckpoint()
    
    // Get page titles (reuse existing logic)
    let pageTitlesObj = this.checkpoint.pageTitles.items
    if (!pageTitlesObj) {
      console.log('📝 Extracting page titles...')
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
    
    const pageTitles = Object.keys(pageTitlesObj)
    const processedPages = this.checkpoint.processedPages.items || []
    let remainingPages = pageTitles.filter(title => !processedPages.includes(title))
    
    if (testMode && maxItems) {
      remainingPages = remainingPages.slice(0, maxItems)
      console.log(`🧪 TEST MODE: Processing only first ${maxItems} item pages`)
    }
    
    if (remainingPages.length === 0) {
      console.log('✅ All items already processed')
      return
    }
    
    console.log(`🔄 Processing ${remainingPages.length} remaining pages...`)
    console.log(`📁 Icons will be saved to: icons/items/`)
    
    // Process pages with icon downloads
    let processed = 0
    for (const pageTitle of remainingPages) {
      const itemData = await this.processItemPageWithIcon(pageTitle)
      
      if (itemData) {
        processed++
        console.log(`✅ Processed: ${itemData.name} (ID: ${itemData.id}) with icon`)
      }
      
      // Update checkpoint
      this.checkpoint.processedPages.items.push(pageTitle)
      
      // Save checkpoint every 10 items
      if (processed % 10 === 0) {
        await this.saveCheckpoint()
        console.log(`📊 Progress: ${processed}/${remainingPages.length} (${((processed/remainingPages.length)*100).toFixed(1)}%)`)
        console.log(`📊 Icons: ${this.stats.iconsDownloaded} downloaded, ${this.stats.iconErrors} errors`)
      }
      
      // Delay between requests
      await this.delay(this.pageDelay)
    }
    
    await this.saveCheckpoint()
    
    console.log('\\n🎉 Scraping with icons completed!')
    console.log(`📊 Items processed: ${processed}`)
    console.log(`📊 Icons downloaded: ${this.stats.iconsDownloaded}`)
    console.log(`📊 Icon errors: ${this.stats.iconErrors}`)
    console.log(`📁 Icons saved to: icons/items/[itemId].png`)
  }

  /**
   * Delay helper
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
