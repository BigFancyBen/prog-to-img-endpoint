/**
 * Utility class for cleaning up infobox data from OSRS Wiki
 */
export class InfoboxCleaner {
  /**
   * Clean a value based on its expected type
   */
  static clean(value, type) {
    if (!value || value === '') return null

    switch (type) {
      case 'string':
        return this.cleanString(value)
      
      case 'number':
        return this.cleanNumber(value)
      
      case 'boolean':
        return this.cleanBoolean(value)
      
      case 'examine':
        return this.cleanExamine(value)
      
      default:
        return this.cleanString(value)
    }
  }

  /**
   * Clean string values
   */
  static cleanString(value) {
    if (!value) return null
    
    let cleaned = value.toString()
    
    // Remove common wiki formatting
    cleaned = cleaned.replace(/\[\[([^|\]]+)\|?[^\]]*\]\]/g, '$1') // Links
    cleaned = cleaned.replace(/{{[^}]*}}/g, '') // Templates
    cleaned = cleaned.replace(/'''?([^']+)'''?/g, '$1') // Bold/italic
    cleaned = cleaned.replace(/<[^>]*>/g, '') // HTML tags
    cleaned = cleaned.replace(/<!--.*?-->/g, '') // Comments
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    
    return cleaned || null
  }

  /**
   * Clean number values
   */
  static cleanNumber(value) {
    if (!value) return null
    
    // Extract numeric value
    const numericMatch = value.toString().match(/[\d.]+/)
    if (!numericMatch) return null
    
    const num = parseFloat(numericMatch[0])
    return isNaN(num) ? null : num
  }

  /**
   * Clean boolean values
   */
  static cleanBoolean(value) {
    if (!value) return null
    
    const str = value.toString().toLowerCase().trim()
    
    // Common boolean representations
    const trueValues = ['yes', 'true', '1', 'y']
    const falseValues = ['no', 'false', '0', 'n']
    
    if (trueValues.includes(str)) return true
    if (falseValues.includes(str)) return false
    
    return null
  }

  /**
   * Clean examine text
   */
  static cleanExamine(value) {
    if (!value) return null
    
    let cleaned = this.cleanString(value)
    
    // Remove common examine text prefixes/suffixes
    if (cleaned) {
      cleaned = cleaned.replace(/^(It's |This is |A )/i, '')
      cleaned = cleaned.replace(/\.$/, '') // Remove trailing period
      cleaned = cleaned.trim()
    }
    
    return cleaned || null
  }
}
