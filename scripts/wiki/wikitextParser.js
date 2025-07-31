/**
 * Parser for OSRS Wiki wikitext content
 */
export class WikitextParser {
  constructor(wikitext) {
    this.wikitext = wikitext || ''
  }

  /**
   * Extract value from infobox parameter
   */
  extractValue(paramName) {
    if (!this.wikitext) return null

    // Create regex to match the parameter
    const patterns = [
      new RegExp(`\\|\\s*${paramName}\\s*=\\s*([^\\|\\}]+)`, 'i'),
      new RegExp(`\\|\\s*${paramName}\\s*=\\s*(.+?)(?=\\n\\||\\n\\}|\\}\\})`, 'is')
    ]

    for (const pattern of patterns) {
      const match = this.wikitext.match(pattern)
      if (match) {
        let value = match[1].trim()
        
        // Clean up common wikitext formatting
        value = value.replace(/<!--.*?-->/g, '') // Remove comments
        value = value.replace(/\[\[([^|\]]+)\|?[^\]]*\]\]/g, '$1') // Remove links but keep text
        value = value.replace(/{{[^}]*}}/g, '') // Remove templates
        value = value.replace(/'''?([^']+)'''?/g, '$1') // Remove bold/italic
        value = value.replace(/<[^>]*>/g, '') // Remove HTML tags
        value = value.replace(/\n/g, ' ') // Replace newlines with spaces
        value = value.trim()
        
        return value || null
      }
    }

    return null
  }

  /**
   * Extract all infobox parameters
   */
  extractAllParameters() {
    if (!this.wikitext) return {}

    const params = {}
    
    // Find infobox content
    const infoboxMatch = this.wikitext.match(/\{\{infobox[\s\S]*?\}\}/i)
    if (!infoboxMatch) return params

    const infoboxContent = infoboxMatch[0]
    
    // Extract parameters
    const paramMatches = infoboxContent.matchAll(/\|\s*([^=|\}]+?)\s*=\s*([^|\}]*?)(?=\n\s*\||$|\}\})/gi)
    
    for (const match of paramMatches) {
      const key = match[1].trim()
      let value = match[2].trim()
      
      // Clean up value
      value = value.replace(/<!--.*?-->/g, '')
      value = value.replace(/\[\[([^|\]]+)\|?[^\]]*\]\]/g, '$1')
      value = value.replace(/{{[^}]*}}/g, '')
      value = value.replace(/'''?([^']+)'''?/g, '$1')
      value = value.replace(/<[^>]*>/g, '')
      value = value.replace(/\n/g, ' ')
      value = value.trim()
      
      if (value) {
        params[key.toLowerCase()] = value
      }
    }

    return params
  }

  /**
   * Extract item ID from wikitext
   */
  extractItemId() {
    const id = this.extractValue('id')
    if (id) {
      const numericId = parseInt(id.replace(/\D/g, ''))
      return isNaN(numericId) ? null : numericId
    }
    return null
  }

  /**
   * Check if this is a versioned item (has multiple IDs)
   */
  hasVersions() {
    const idValue = this.extractValue('id')
    return idValue && idValue.includes(',')
  }

  /**
   * Extract all version IDs for versioned items
   */
  extractVersionIds() {
    const idValue = this.extractValue('id')
    if (!idValue) return []

    return idValue.split(',')
      .map(id => parseInt(id.trim().replace(/\D/g, '')))
      .filter(id => !isNaN(id))
  }

  /**
   * Check if a specific infobox type exists on the page
   */
  extractInfobox(infoboxType) {
    if (!this.wikitext) return null

    // Create pattern to match the infobox template
    const pattern = new RegExp(`{{\\s*${infoboxType.replace(/\s+/g, '\\s+')}`, 'i')
    const match = this.wikitext.match(pattern)
    
    if (match) {
      // Find the full infobox content
      let startIndex = match.index
      let braceCount = 0
      let currentIndex = startIndex
      
      // Count braces to find the end of the template
      while (currentIndex < this.wikitext.length) {
        const char = this.wikitext[currentIndex]
        if (char === '{') {
          braceCount++
        } else if (char === '}') {
          braceCount--
          if (braceCount === 0) {
            // Found the end of the template
            return this.wikitext.substring(startIndex, currentIndex + 1)
          }
        }
        currentIndex++
      }
    }
    
    return null
  }
}
