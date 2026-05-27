import https from 'https'

/**
 * Client for making requests to the OSRS Wiki API.
 *
 * Wikimedia bot etiquette (https://www.mediawiki.org/wiki/API:Etiquette):
 *  - send a descriptive User-Agent
 *  - use maxlag for non-interactive bots so the server can throttle us
 *    when the wiki is under load
 *  - back off on `maxlag` and `ratelimited` errors with exponential delay
 */
export class WikiApiClient {
  constructor() {
    this.baseUrl = 'https://oldschool.runescape.wiki/api.php'
    this.userAgent = 'OSRS-Item-API/1.0 (https://github.com/user/osrs-item-api)'
    this.maxRetries = 3
  }

  /**
   * Make a request to the OSRS Wiki API with retry/backoff for maxlag and rate-limit errors.
   */
  async makeRequest(params) {
    // Inject API-level defaults — caller can override by passing the same key.
    const merged = {
      format: 'json',
      formatversion: 2,
      maxlag: 5,
      origin: '*',
      ...params,
    }

    let attempt = 0
    while (true) {
      const { json, retryAfter } = await this._fetchOnce(merged)

      const errorCode = json?.error?.code
      const retryable = errorCode === 'maxlag' || errorCode === 'ratelimited'

      if (!retryable || attempt >= this.maxRetries) {
        return json
      }

      // Wikimedia returns a Retry-After header in seconds; fall back to
      // exponential backoff (5s, 10s, 20s).
      const backoffMs = retryAfter
        ? retryAfter * 1000
        : 5000 * Math.pow(2, attempt)

      console.warn(`⚠️  Wiki API ${errorCode}; retrying in ${backoffMs}ms (attempt ${attempt + 1}/${this.maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, backoffMs))
      attempt++
    }
  }

  _fetchOnce(params) {
    const url = new URL(this.baseUrl)
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key])
    })

    return new Promise((resolve, reject) => {
      const options = {
        headers: { 'User-Agent': this.userAgent },
      }

      const req = https.get(url.toString(), options, (res) => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          const retryAfterHeader = res.headers['retry-after']
          const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null
          try {
            const jsonData = JSON.parse(data)
            resolve({ json: jsonData, retryAfter })
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
   * Get wikitext content for a page. Strips URL fragments (OSRS wiki anchors
   * are not real wikitext sections — they are rendered from {{Switch infobox}}
   * version labels) and follows wiki redirects automatically.
   */
  async getPageContent(pageTitle) {
    try {
      const cleanTitle = String(pageTitle).split('#')[0]

      const response = await this.makeRequest({
        action: 'query',
        prop: 'revisions',
        titles: cleanTitle,
        rvprop: 'content',
        rvslots: 'main',
        redirects: 1,
      })

      // formatversion=2 → query.pages is an array
      const pages = response.query?.pages || []
      const page = Array.isArray(pages) ? pages[0] : Object.values(pages)[0]

      if (!page || page.missing) {
        return null
      }

      return page.revisions?.[0]?.slots?.main?.content || null
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
