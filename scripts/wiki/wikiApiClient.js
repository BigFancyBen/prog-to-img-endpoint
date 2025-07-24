import axios from 'axios'

/**
 * OSRS Wiki API client for extracting data directly from the wiki
 */
export class WikiApiClient {
  constructor() {
    this.baseUrl = 'https://oldschool.runescape.wiki/api.php'
    this.userAgent = 'OSRS-Progress-Image-Bot/1.0 (https://github.com/yourusername/prog-to-img-endpoint; your-email@example.com)'
    
    // Rate limiting tracking
    this.lastRequestTime = 0
    this.minRequestInterval = 100 // Minimum time between requests (ms)
  }

  /**
   * Make a rate-limited API request
   */
  async makeRequest(params, options = {}) {
    // Ensure minimum time between requests
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minRequestInterval) {
      await this.delay(this.minRequestInterval - timeSinceLastRequest)
    }
    
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          ...params,
          format: 'json'
        },
        headers: { 
          'User-Agent': this.userAgent,
          ...options.headers
        },
        timeout: options.timeout || 30000,
        ...options
      })
      
      this.lastRequestTime = Date.now()
      
      // Check for API errors
      if (response.data.error) {
        throw new Error(`Wiki API error: ${response.data.error.info || response.data.error.code}`)
      }
      
      return response
    } catch (error) {
      this.lastRequestTime = Date.now()
      
      // Handle different types of errors
      if (error.response) {
        const status = error.response.status
        if (status === 429) {
          throw new Error(`Rate limit exceeded (429). Please wait before retrying.`)
        } else if (status === 503) {
          throw new Error(`Service unavailable (503). The wiki may be under heavy load.`)
        } else if (status >= 500) {
          throw new Error(`Server error (${status}). Please try again later.`)
        }
      }
      
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
        throw new Error(`Network connection error: ${error.message}`)
      }
      
      throw error
    }
  }

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Extract page titles from a wiki category
   */
  async extractPageTitles(categories) {
    const pageTitles = {}
    
    for (const category of categories) {
      console.log(`📝 Extracting pages from category: ${category}`)
      
      let cmcontinue = null
      do {
        const params = {
          action: 'query',
          list: 'categorymembers',
          cmtitle: `Category:${category}`,
          cmlimit: 500,
          format: 'json'
        }
        
        if (cmcontinue) {
          params.cmcontinue = cmcontinue
        }
        
        try {
          const response = await this.makeRequest({
            action: 'query',
            list: 'categorymembers',
            cmtitle: `Category:${category}`,
            cmlimit: 500,
            ...(cmcontinue && { cmcontinue })
          })
          
          const data = response.data
          
          if (data.query && data.query.categorymembers) {
            for (const member of data.query.categorymembers) {
              const title = member.title
              
              // Skip files and categories
              if (title.startsWith('File:') || title.startsWith('Category:')) {
                continue
              }
              
              pageTitles[title] = null // Will be populated with revision date later
            }
          }
          
          cmcontinue = data.continue ? data.continue.cmcontinue : null
        } catch (error) {
          console.error(`❌ Error extracting pages from ${category}:`, error.message)
          break
        }
      } while (cmcontinue)
    }
    
    console.log(`✅ Extracted ${Object.keys(pageTitles).length} page titles`)
    return pageTitles
  }

  /**
   * Extract revision timestamps for pages
   */
  async extractRevisionTimestamps(pageTitles) {
    const titles = Object.keys(pageTitles)
    const batchSize = 50 // Max titles per API request
    
    for (let i = 0; i < titles.length; i += batchSize) {
      const batch = titles.slice(i, i + batchSize)
      const titleString = batch.join('|')
      
      try {
        const response = await this.makeRequest({
          action: 'query',
          prop: 'revisions',
          titles: titleString,
          rvprop: 'timestamp'
        })
        
        const pages = response.data.query.pages
        
        for (const pageId in pages) {
          const page = pages[pageId]
          if (page.revisions && page.revisions[0]) {
            pageTitles[page.title] = page.revisions[0].timestamp
          }
        }
      } catch (error) {
        console.error(`❌ Error extracting revision timestamps for batch ${i / batchSize + 1}:`, error.message)
      }
    }
    
    return pageTitles
  }

  /**
   * Extract wiki text for a specific page
   */
  async extractPageWikitext(pageTitle) {
    try {
      const response = await this.makeRequest({
        action: 'parse',
        prop: 'wikitext',
        page: pageTitle
      })
      
      if (response.data.parse && response.data.parse.wikitext) {
        return response.data.parse.wikitext['*']
      }
      
      return null
    } catch (error) {
      console.error(`❌ Error extracting wikitext for ${pageTitle}:`, error.message)
      return null
    }
  }

  /**
   * Alias for extractPageWikitext for compatibility
   */
  async getPageWikitext(pageTitle) {
    return this.extractPageWikitext(pageTitle)
  }

  /**
   * Extract all wikitext for multiple pages
   */
  async extractAllWikitext(pageTitles) {
    const wikitextData = {}
    const titles = Object.keys(pageTitles)
    let processedCount = 0
    
    console.log(`📄 Extracting wikitext for ${titles.length} pages...`)
    
    for (const title of titles) {
      const wikitext = await this.extractPageWikitext(title)
      
      if (wikitext) {
        wikitextData[title] = wikitext
      }
      
      processedCount++
      
      if (processedCount % 50 === 0) {
        console.log(`   Progress: ${processedCount}/${titles.length} pages processed`)
      }
      
      // Rate limiting - be respectful to the wiki
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`✅ Extracted wikitext for ${Object.keys(wikitextData).length} pages`)
    return wikitextData
  }

  /**
   * Query semantic MediaWiki for structured data (e.g., monster drops)
   */
  async querySMW(query, limit = 500) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          action: 'ask',
          format: 'json',
          query: `${query}|limit=${limit}`
        },
        headers: { 'User-Agent': this.userAgent }
      })
      
      return response.data
    } catch (error) {
      console.error(`❌ Error executing SMW query: ${query}`, error.message)
      return null
    }
  }

  /**
   * Get the actual file URL for an image through the MediaWiki API
   */
  async getImageUrl(filename) {
    if (!filename) return null
    
    // Clean the filename
    const cleanFilename = filename.replace(/^File:/, '').replace(/\.png$/, '').trim()
    const fileTitle = `File:${cleanFilename}.png`
    
    try {
      const response = await this.makeRequest({
        action: 'query',
        titles: fileTitle,
        prop: 'imageinfo',
        iiprop: 'url',
        iiurlwidth: '300' // Get a reasonable size
      })
      
      if (response.data?.query?.pages) {
        const pages = Object.values(response.data.query.pages)
        const page = pages[0]
        
        if (page && page.imageinfo && page.imageinfo[0]) {
          return page.imageinfo[0].url
        }
      }
      
      return null
    } catch (error) {
      console.warn(`⚠️  Could not get image URL for ${filename}:`, error.message)
      return null
    }
  }

  /**
   * Get image information and download URL
   */
  async getImageInfo(filename) {
    try {
      if (!filename) return null
      
      // Clean filename - remove File: prefix if present
      const cleanFilename = filename.replace(/^File:/, '')
      
      console.log(`🔍 Getting image info for: ${cleanFilename}`)
      
      const response = await this.makeRequest({
        action: 'query',
        titles: `File:${cleanFilename}`,
        prop: 'imageinfo',
        iiprop: 'url|size|mime',
        iiurlwidth: 128, // Request a reasonable size
        format: 'json'
      })
      
      const pages = response.data.query?.pages
      if (!pages) return null
      
      const pageId = Object.keys(pages)[0]
      const page = pages[pageId]
      
      if (page.missing || !page.imageinfo) {
        console.warn(`⚠️  Image not found: ${cleanFilename}`)
        return null
      }
      
      const imageInfo = page.imageinfo[0]
      return {
        url: imageInfo.url,
        thumburl: imageInfo.thumburl || imageInfo.url,
        width: imageInfo.width,
        height: imageInfo.height,
        mime: imageInfo.mime,
        filename: cleanFilename
      }
    } catch (error) {
      console.warn(`⚠️  Error getting image info for ${filename}:`, error.message)
      return null
    }
  }
}
