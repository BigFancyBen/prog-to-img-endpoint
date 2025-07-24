/**
 * Wikitext parser for extracting infobox data from OSRS Wiki pages
 * Uses wtf_wikipedia for proper MediaWiki wikitext parsing
 */
import wtf from 'wtf_wikipedia'

export class WikitextParser {
  constructor(wikitext) {
    this.wikitext = wikitext
    this.template = null
    this.isVersioned = false
    this.doc = null
  }

  /**
   * Extract an infobox template from wikitext
   */
  extractInfobox(templateType) {
    if (!this.wikitext) return false

    try {
      // Parse the wikitext using wtf_wikipedia
      this.doc = wtf(this.wikitext)
      
      // Look for infoboxes first (this is the correct approach for OSRS Wiki)
      const infoboxes = this.doc.infoboxes()
      
      for (let infobox of infoboxes) {
        // Check if this infobox has item-related properties
        const data = infobox.data || {}
        const properties = Object.keys(data)
        
        // Look for typical item properties
        const itemProperties = ['name', 'id', 'value', 'examine', 'tradeable', 'members', 'stackable']
        const hasItemProps = itemProperties.some(prop => properties.includes(prop))
        
        if (hasItemProps) {
          this.template = this.processInfobox(infobox)
          this.determineVersioning()
          return true
        }
      }
      
      // Fallback: look for templates that match our infobox type
      const templates = this.doc.templates()
      
      for (let template of templates) {
        // The template name is stored in template.data.template
        const templateName = template.data?.template || template.template || template.name || ''
        
        // Check if this template matches our target type (case-insensitive)
        // For OSRS Wiki, look for exact template names
        const normalizedTemplate = templateName.toLowerCase().replace(/\s+/g, ' ').trim()
        const normalizedTarget = templateType.toLowerCase().replace(/\s+/g, ' ').trim()
        
        if (normalizedTemplate === normalizedTarget || 
            normalizedTemplate.includes(normalizedTarget) ||
            normalizedTarget.includes(normalizedTemplate)) {
          
          console.log(`🎯 Found template: ${templateName}`)
          this.template = this.processTemplate(template)
          this.determineVersioning()
          return true
        }
      }
      
      console.log(`⚠️  No ${templateType} infobox found. Available infoboxes:`, 
                  infoboxes.map((box, i) => `Infobox ${i} (${Object.keys(box.data || {}).slice(0, 3).join(', ')}...)`))
      
    } catch (error) {
      console.warn(`⚠️  wtf_wikipedia parsing failed for ${templateType}:`, error.message)
      // Fallback to regex-based parsing
      return this.extractInfoboxFallback(templateType)
    }
    
    return false
  }

  /**
   * Process a template from wtf_wikipedia into our format
   */
  processTemplate(template) {
    const processed = {}
    
    // wtf_wikipedia provides template data in different ways
    if (template.json) {
      // Use the json() method if available
      const jsonData = template.json()
      for (const [key, value] of Object.entries(jsonData)) {
        if (key !== 'template' && key !== 'name') {
          processed[key] = this.cleanValue(value)
        }
      }
    } else if (template.data) {
      // Extract from data object
      for (const [key, value] of Object.entries(template.data)) {
        processed[key] = this.cleanValue(value)
      }
    } else {
      // Try to extract parameters directly
      const params = template.parameters || template.params || {}
      for (const [key, value] of Object.entries(params)) {
        processed[key] = this.cleanValue(value)
      }
    }
    
    return processed
  }

  /**
   * Process an infobox from wtf_wikipedia into our format
   */
  processInfobox(infobox) {
    const processed = {}
    
    // Extract data from the infobox
    const data = infobox.data || {}
    
    for (const [key, value] of Object.entries(data)) {
      processed[key] = this.cleanValue(value)
    }
    
    return processed
  }

  /**
   * Clean and normalize template values
   */
  cleanValue(value) {
    if (!value) return ''
    
    // If it's a wtf_wikipedia object, try to get text
    if (value && typeof value === 'object') {
      if (value.text && typeof value.text === 'function') {
        return value.text().trim()
      } else if (value.toString) {
        return value.toString().trim()
      }
      return String(value).trim()
    }
    
    // Clean string values
    return String(value)
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Fallback regex-based extraction for when wtf_wikipedia fails
   */
  extractInfoboxFallback(templateType) {
    console.log(`🔄 Falling back to regex parsing for ${templateType}`)
    
    const templateRegex = new RegExp(
      `{{\\s*${templateType}\\s*([\\s\\S]*?)(?=\n\\s*}}|\n\\s*{{|$)`,
      'gims'
    )
    const match = templateRegex.exec(this.wikitext)
    
    if (match) {
      this.template = this.parseTemplateFallback(match[0])
      this.determineVersioning()
      return true
    }
    
    return false
  }

  /**
   * Parse a template string into a structured object (fallback method)
   */
  parseTemplateFallback(templateString) {
    const lines = templateString.split('\n')
    const template = {}
    let currentKey = null
    let currentValue = ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (!trimmed || trimmed.startsWith('{{') || trimmed === '}}') {
        continue
      }
      
      if (trimmed.includes('=') && trimmed.indexOf('=') < trimmed.length - 1) {
        if (currentKey) {
          template[currentKey] = this.cleanWikitext(currentValue.trim())
        }
        
        const equalIndex = trimmed.indexOf('=')
        currentKey = trimmed.substring(0, equalIndex).replace('|', '').trim()
        currentValue = trimmed.substring(equalIndex + 1).trim()
      } else if (currentKey) {
        currentValue += ' ' + trimmed
      }
    }
    
    if (currentKey) {
      template[currentKey] = this.cleanWikitext(currentValue.trim())
    }
    
    return template
  }

  /**
   * Clean wikitext from template values (fallback method)
   */
  cleanWikitext(value) {
    if (!value) return ''
    
    return value
      .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/\{\{[^}]+\}\}/g, '')
      .replace(/<!--.*?-->/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/<br\s*\/?>/gi, '')
      .replace(/\([^)]*\)$/, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Extract a value from the template
   */
  extractValue(key) {
    if (!this.template) return null
    
    // Try exact match first
    if (this.template[key]) {
      return this.template[key]
    }
    
    // Try case-insensitive match
    const lowerKey = key.toLowerCase()
    for (const templateKey in this.template) {
      if (templateKey.toLowerCase() === lowerKey) {
        return this.template[templateKey]
      }
    }
    
    return null
  }

  /**
   * Extract item/monster ID from template
   */
  extractId() {
    const idFields = ['id', 'itemid', 'npcid', 'item id', 'npc id']
    
    for (const field of idFields) {
      const value = this.extractValue(field)
      if (value) {
        const ids = this.parseIdString(value)
        if (ids.length > 0) {
          return ids[0] // Return first ID for now
        }
      }
    }
    
    return null
  }

  /**
   * Parse ID string that might contain multiple IDs
   */
  parseIdString(idString) {
    if (!idString) return []
    
    // Split by common separators and extract numbers
    const parts = idString.split(/[,\s]+/)
    const ids = []
    
    for (const part of parts) {
      const match = part.match(/\d+/)
      if (match) {
        ids.push(parseInt(match[0]))
      }
    }
    
    return ids
  }

  /**
   * Determine if the template is versioned
   */
  determineVersioning() {
    if (!this.template) return false
    
    // Check for versioned properties (id1, id2, etc.)
    const versionedFields = ['id1', 'id2', 'name1', 'name2', 'version1', 'version2']
    
    for (const field of versionedFields) {
      if (this.template[field]) {
        this.isVersioned = true
        return true
      }
    }
    
    return false
  }

  /**
   * Extract icon/image filename from the template
   */
  extractIcon() {
    if (!this.template) return null

    // Handle versioned templates differently
    if (this.isVersioned) {
      return this.extractVersionedIcon()
    }

    // Try common icon field names
    const iconFields = ['image', 'icon', 'picture', 'file']
    
    for (const field of iconFields) {
      const value = this.extractValue(field)
      if (value) {
        return this.selectBestIcon(value)
      }
    }
    
    return null
  }

  /**
   * Extract icon from versioned template (handles image1, image2, etc.)
   */
  extractVersionedIcon() {
    if (!this.template) return null
    
    // Look for numbered image fields
    const imageFields = []
    for (let i = 1; i <= 10; i++) {
      const field = `image${i}`
      if (this.template[field]) {
        imageFields.push({ field, value: this.template[field], index: i })
      }
    }
    
    if (imageFields.length === 0) {
      // Fallback to regular image field
      const value = this.extractValue('image')
      if (value) {
        return this.selectBestIcon(value)
      }
      return null
    }
    
    // Select the first image (usually the most basic/common version)
    const selectedImage = imageFields[0]
    console.log(`🎯 Selected versioned icon: ${selectedImage.field} (${imageFields.length} versions available)`)
    
    return this.selectBestIcon(selectedImage.value)
  }

  /**
   * Select the best icon from multiple options
   */
  selectBestIcon(imageValue) {
    if (!imageValue) return null
    
    // If there are multiple images in the field, extract them
    const fileMatches = imageValue.match(/\[\[File:([^\]]+)\]\]/g)
    
    if (!fileMatches || fileMatches.length === 0) {
      // No File: links found, clean the value as-is
      return this.cleanIconFilename(imageValue)
    }
    
    if (fileMatches.length === 1) {
      // Single image, extract it
      const filename = fileMatches[0].match(/File:([^\]]+)/)[1]
      return this.cleanIconFilename(filename)
    }
    
    // Multiple images - select the best one
    const filenames = fileMatches.map(match => {
      const filename = match.match(/File:([^\]]+)/)[1]
      return this.cleanIconFilename(filename)
    })
    
    console.log(`🎯 Multiple icons found: ${filenames.join(', ')}`)
    
    // Selection priority for stackable items (bolts, arrows, etc.):
    // 1. Files ending with "detail" (no number) - the canonical detailed view
    // 2. Files ending with just the item name (no number/suffix) - main icon
    // 3. Files with "5" - usually shows the max stack
    // 4. Files with the lowest number (1, 2, 3, etc.) - basic version
    // 5. Avoid charged/special versions unless it's the only option
    
    // Priority 1: Detail version (best for most items)
    const detailIcon = filenames.find(name => {
      const baseName = name.toLowerCase().replace(/\.png$/i, '')
      return baseName.endsWith('detail') && !baseName.includes('(e)') && !baseName.includes('(p)')
    })
    
    if (detailIcon) {
      console.log(`✅ Selected detail icon: ${detailIcon}`)
      return detailIcon
    }
    
    // Priority 2: Main icon (no number/suffix)
    const mainIcon = filenames.find(name => {
      const baseName = name.replace(/\.png$/i, '')
      // Should not end with a number, charge indicator, or special suffix
      return !baseName.match(/[0-9]$|_charged?$|_\(e\)$|_\(p\+?\+?\)$|_detail$/)
    })
    
    if (mainIcon) {
      console.log(`✅ Selected main icon: ${mainIcon}`)
      return mainIcon
    }
    
    // Priority 3: Stack of 5 (for stackable items, this often shows the best representation)
    const stack5Icon = filenames.find(name => name.match(/\s5$/i))
    if (stack5Icon) {
      console.log(`✅ Selected stack-5 icon: ${stack5Icon}`)
      return stack5Icon
    }
    
    // Priority 4: Standard numbered versions (prefer lower numbers)
    const numberedIcons = filenames.filter(name => {
      const baseName = name.replace(/\.png$/i, '')
      return baseName.match(/[0-9]$/)
    }).sort((a, b) => {
      const aNum = parseInt(a.match(/([0-9]+)(?:\.png)?$/i)?.[1] || '999')
      const bNum = parseInt(b.match(/([0-9]+)(?:\.png)?$/i)?.[1] || '999')
      return aNum - bNum
    })
    
    if (numberedIcons.length > 0) {
      console.log(`✅ Selected numbered icon: ${numberedIcons[0]}`)
      return numberedIcons[0]
    }
    
    // Fallback: just use the first one
    console.log(`⚠️  Using fallback icon: ${filenames[0]}`)
    return filenames[0]
  }

  /**
   * Clean and normalize icon filename
   */
  cleanIconFilename(filename) {
    if (!filename) return null
    
    // Remove File: prefix if present
    let cleaned = filename.replace(/^File:/i, '').trim()
    
    // Remove wiki link brackets if present
    cleaned = cleaned.replace(/\[\[|\]\]/g, '')
    
    // Remove pipe and everything after (wiki link text)
    cleaned = cleaned.replace(/\|.*$/, '')
    
    // Remove .png extension if present (we'll add it back when needed)
    cleaned = cleaned.replace(/\.png$/i, '')
    
    return cleaned.trim()
  }

  /**
   * Get the full icon URL for OSRS Wiki
   */
  getIconUrl(filename) {
    if (!filename) return null
    
    const cleanFilename = this.cleanIconFilename(filename)
    if (!cleanFilename) return null
    
    // OSRS Wiki icon URLs follow this pattern
    return `https://oldschool.runescape.wiki/images/${encodeURIComponent(cleanFilename)}.png`
  }

  /**
   * Get all template data for debugging
   */
  getTemplateData() {
    return this.template
  }

  /**
   * Get additional debug information
   */
  getDebugInfo() {
    return {
      hasTemplate: !!this.template,
      isVersioned: this.isVersioned,
      templateKeys: this.template ? Object.keys(this.template) : [],
      parsedWithWtf: !!this.doc
    }
  }
}
