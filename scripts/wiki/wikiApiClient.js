import https from 'https'

/**
 * Client for making requests to the OSRS Wiki API
 */
export class WikiApiClient {
  constructor() {
    this.baseUrl = 'https://oldschool.runescape.wiki/api.php'
    this.userAgent = 'OSRS-Item-API/1.0 (https://github.com/user/osrs-item-api)'
  }

  /**
   * Make a request to the OSRS Wiki API
   */
  async makeRequest(params) {
    const url = new URL(this.baseUrl)
    
    // Add default parameters
    params.format = 'json'
    params.origin = '*'
    
    // Add all parameters to URL
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key])
    })

    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': this.userAgent
        }
      }

      const req = https.get(url.toString(), options, (res) => {
        let data = ''
        
        res.on('data', chunk => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data)
            resolve(jsonData)
          } catch (error) {
            reject(new Error(`Failed to parse JSON response: ${error.message}`))
          }
        })
      })

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`))
      })

      req.setTimeout(30000, () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })
    })
  }

  /**
   * Get wikitext content for a page
   */
  async getPageContent(pageTitle) {
    try {
      const response = await this.makeRequest({
        action: 'query',
        prop: 'revisions',
        titles: pageTitle,
        rvprop: 'content',
        rvslots: 'main'
      })

      const pages = response.query?.pages || {}
      const page = Object.values(pages)[0]
      
      if (!page || page.missing) {
        return null
      }

      return page.revisions?.[0]?.slots?.main?.['*'] || null
    } catch (error) {
      console.error(`Error getting page content for "${pageTitle}":`, error.message)
      return null
    }
  }

  /**
   * Alias for getPageContent - get wikitext content for a page
   */
  async getPageWikitext(pageTitle) {
    return this.getPageContent(pageTitle)
  }
}
