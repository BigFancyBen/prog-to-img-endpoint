/**
 * Data cleaners for OSRS Wiki infobox properties
 * Based on the osrsbox infobox_cleaner approach
 */
export class InfoboxCleaner {
  /**
   * Clean a boolean value from wiki text
   */
  static boolean(value) {
    if (!value) return false
    
    const cleanValue = value.toLowerCase().trim()
    
    return ['yes', 'true', '1', 'y'].includes(cleanValue)
  }

  /**
   * Clean a numeric value
   */
  static number(value) {
    if (!value) return null
    
    const cleanValue = value.replace(/[^\d.-]/g, '')
    const num = parseFloat(cleanValue)
    
    return isNaN(num) ? null : num
  }

  /**
   * Clean a weight value
   */
  static weight(value) {
    if (!value) return null
    
    // Handle weight format like "2.267 kg"
    const match = value.match(/([\d.]+)\s*kg/i)
    if (match) {
      return parseFloat(match[1])
    }
    
    return this.number(value)
  }

  /**
   * Clean examine text
   */
  static examine(value, itemName) {
    if (!value) return null
    
    let cleanValue = value.trim()
    
    // Handle special cases for variable examine text
    const variableExamineItems = [
      'Clue scroll (easy)',
      'Clue scroll (medium)', 
      'Clue scroll (hard)',
      'Clue scroll (elite)',
      'Clue scroll (master)',
      'Clue scroll (beginner)'
    ]
    
    if (variableExamineItems.includes(itemName)) {
      return 'A clue!'
    }
    
    return cleanValue
  }

  /**
   * Clean tradeable status
   */
  static tradeable(value) {
    if (!value) return false
    
    const cleanValue = value.toLowerCase().trim()
    
    // Handle various ways tradeable is expressed
    if (['no', 'false', 'untradeable', 'not tradeable'].includes(cleanValue)) {
      return false
    }
    
    return true
  }

  /**
   * Clean quest item status
   */
  static quest(value) {
    return this.boolean(value)
  }

  /**
   * Clean members status
   */
  static members(value) {
    return this.boolean(value)
  }

  /**
   * Clean release date
   */
  static releaseDate(value) {
    if (!value) return null
    
    // Try to parse various date formats
    const cleanValue = value.trim()
    
    try {
      const date = new Date(cleanValue)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0] // Return YYYY-MM-DD format
      }
    } catch (error) {
      // If parsing fails, return the original value
      return cleanValue
    }
    
    return cleanValue
  }

  /**
   * Clean combat stats
   */
  static stats(value) {
    const num = this.number(value)
    return num !== null ? num : 0
  }

  /**
   * Clean attack speed
   */
  static attackSpeed(value) {
    return this.number(value) || 0
  }

  /**
   * Clean slot information
   */
  static slot(value) {
    if (!value) return null
    
    return value.toLowerCase().trim()
  }

  /**
   * Clean equipment requirement
   */
  static requirements(value) {
    if (!value) return null
    
    // Parse requirements like "70 Attack, 70 Strength"
    const requirements = {}
    const parts = value.split(',')
    
    for (const part of parts) {
      const match = part.trim().match(/(\d+)\s+(\w+)/i)
      if (match) {
        const level = parseInt(match[1])
        const skill = match[2].toLowerCase()
        requirements[skill] = level
      }
    }
    
    return Object.keys(requirements).length > 0 ? requirements : null
  }

  /**
   * Clean categories/attributes for monsters
   */
  static categories(value) {
    if (!value) return []
    
    return value.split(',').map(cat => cat.trim().toLowerCase()).filter(cat => cat.length > 0)
  }

  /**
   * Clean slayer masters list
   */
  static slayerMasters(value) {
    if (!value) return []
    
    const masters = value.split(',').map(master => master.trim().toLowerCase())
    
    // Handle Steve -> Nieve conversion for consistency
    return masters.map(master => master === 'steve' ? 'nieve' : master)
  }

  /**
   * Clean attack types
   */
  static attackTypes(value) {
    if (!value) return []
    
    return value.split(',').map(type => type.trim().toLowerCase()).filter(type => type.length > 0)
  }

  /**
   * Generic cleaner that routes to specific cleaners
   */
  static clean(value, propertyType) {
    switch (propertyType) {
      case 'boolean':
      case 'members':
      case 'tradeable':
      case 'quest':
        return this.boolean(value)
      
      case 'number':
      case 'stats':
        return this.stats(value)
      
      case 'weight':
        return this.weight(value)
      
      case 'examine':
        return this.examine(value)
      
      case 'release_date':
        return this.releaseDate(value)
      
      case 'slot':
        return this.slot(value)
      
      case 'requirements':
        return this.requirements(value)
      
      case 'categories':
        return this.categories(value)
      
      case 'slayer_masters':
        return this.slayerMasters(value)
      
      case 'attack_types':
        return this.attackTypes(value)
      
      default:
        return value ? value.trim() : null
    }
  }
}
