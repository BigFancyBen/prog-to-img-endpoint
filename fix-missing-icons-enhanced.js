import databaseService from './services/databaseService.js'
import WikiLookupService from './services/wikiLookupService.js'
import fs from 'fs'

/**
 * Enhanced missing icon fixer that handles both truly missing icons and corrupted icon data
 */
class EnhancedIconFixer {
  constructor() {
    this.wikiService = new WikiLookupService()
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      corrupted_fixed: 0,
      errors: []
    }
  }

  async init() {
    await databaseService.init()
    console.log('✅ Database initialized')
  }

  /**
   * Find items with missing or corrupted icon data
   */
  async findProblematicItems() {
    console.log('🔍 Analyzing icon data quality...')
    
    const allItems = databaseService.getAllItems()
    const missingIcons = []
    const corruptedIcons = []
    
    for (const item of allItems) {
      const iconBuffer = databaseService.getIconData(item.id)
      
      if (!iconBuffer) {
        // Truly missing icon data
        missingIcons.push(item)
      } else if (iconBuffer.length > 0) {
        // Check if icon data is valid (PNG or WebP)
        const isPNG = iconBuffer[0] === 0x89 && iconBuffer[1] === 0x50 && iconBuffer[2] === 0x4E && iconBuffer[3] === 0x47
        const isWebP = iconBuffer[0] === 0x52 && iconBuffer[1] === 0x49 && iconBuffer[2] === 0x46 && iconBuffer[3] === 0x46 &&
                      iconBuffer[8] === 0x57 && iconBuffer[9] === 0x45 && iconBuffer[10] === 0x42 && iconBuffer[11] === 0x50
        
        if (!isPNG && !isWebP) {
          // Corrupted icon data
          corruptedIcons.push({
            ...item,
            dataPreview: iconBuffer.toString('utf8', 0, Math.min(30, iconBuffer.length)).replace(/[^\x20-\x7E]/g, '�')
          })
        }
      }
    }
    
    console.log(`📊 Analysis complete:`)
    console.log(`   Items with no icon data: ${missingIcons.length}`)
    console.log(`   Items with corrupted icon data: ${corruptedIcons.length}`)
    console.log(`   Total items needing fixes: ${missingIcons.length + corruptedIcons.length}`)
    
    return { missingIcons, corruptedIcons }
  }

  /**
   * Check if an image filename is relevant to the item
   */
  isRelevantImage(filename, itemName) {
    const excludePatterns = [
      'wikia', 'wiki', 'logo', 'favicon', 'edit', 'delete', 'history',
      'discussion', 'talk', 'file:', 'category:', 'template:', 'special:',
      'css', 'js', 'json', 'thumb', 'magnify', 'external',
      'facebook', 'twitter', 'youtube', 'discord', 'reddit',
      'navigation', 'search', 'menu', 'header', 'footer',
      'sidebar', 'popup', 'modal', 'overlay', 'dropdown',
      'button', 'icon_', 'ui_', 'interface'
    ]
    
    const filenameLower = filename.toLowerCase()
    if (excludePatterns.some(pattern => filenameLower.includes(pattern))) {
      return false
    }
    
    // Must be a .png file
    if (!filenameLower.endsWith('.png')) {
      return false
    }
    
    return true
  }

  /**
   * Get potential image names from wiki page
   */
  async getWikiImageNames(item) {
    try {
      // Special handling for Hex edit detected items
      if (item.name === "Hex edit detected") {
        return this.getHexEditDetectedImages(item)
      }

      // Use wiki mapping if available, otherwise guess from item name
      const itemMapping = databaseService.db.prepare(`
        SELECT wiki_page FROM item_wiki_mapping WHERE id = ?
      `).get(item.id)
      
      let wikiPageName = itemMapping?.wiki_page
      
      if (!wikiPageName) {
        wikiPageName = item.name.replace(/ /g, '_')
        console.log(`    ⚠️  No wiki mapping for ${item.name}, guessing: ${wikiPageName}`)
      } else {
        console.log(`    ✅ Using wiki mapping: ${wikiPageName}`)
      }
      
      const wikiUrl = `https://oldschool.runescape.wiki/w/${encodeURIComponent(wikiPageName)}`
      
      const response = await fetch(wikiUrl)
      if (!response.ok) {
        console.log(`    ❌ Wiki page not found: ${response.status}`)
        return []
      }
      
      const html = await response.text()
      
      // Skip disambiguation pages
      if (html.includes('disambiguation page')) {
        console.log(`    🔀 Disambiguation page, skipping`)
        return []
      }
      
      const imageNames = new Set()
      
      // Look for infobox images (most reliable)
      const infoboxMatches = html.match(/class="[^"]*infobox[^"]*"[^>]*>[\s\S]*?src="[^"]*\/images\/([^"\/]+\.png)"/gi)
      if (infoboxMatches) {
        infoboxMatches.forEach(match => {
          const filename = match.match(/\/images\/([^"\/]+\.png)/i)?.[1]
          if (filename && this.isRelevantImage(filename, item.name)) {
            imageNames.add(decodeURIComponent(filename))
          }
        })
      }
      
      // Look for File: references
      const fileMatches = html.match(/File:([^|\\]]+\\.png)/gi)
      if (fileMatches) {
        fileMatches.forEach(match => {
          const filename = match.replace(/^File:/i, '')
          if (this.isRelevantImage(filename, item.name)) {
            imageNames.add(decodeURIComponent(filename))
          }
        })
      }
      
      // Look for images with item name keywords
      const itemKeywords = item.name.toLowerCase().split(/[\s\(\)]+/).filter(word => word.length > 2)
      const allImageMatches = html.match(/src="[^"]*\/images\/([^"\/]+\.png)"/gi)
      if (allImageMatches) {
        allImageMatches.forEach(match => {
          const filename = match.match(/\/images\/([^"\/]+\.png)/i)?.[1]
          if (filename && this.isRelevantImage(filename, item.name)) {
            const filenameLower = filename.toLowerCase()
            const hasKeyword = itemKeywords.some(keyword => 
              filenameLower.includes(keyword.toLowerCase())
            )
            if (hasKeyword) {
              imageNames.add(decodeURIComponent(filename))
            }
          }
        })
      }
      
      console.log(`    📸 Found ${imageNames.size} potential images`)
      return Array.from(imageNames)
      
    } catch (error) {
      console.error(`    ❌ Error fetching wiki page: ${error.message}`)
      return []
    }
  }

  /**
   * Get Hex edit detected image names based on item ID
   */
  async getHexEditDetectedImages(item) {
    const hexEditMapping = {
      6189: "Hex_edit_detected_(Fish_1)_detail.png",
      6190: "Hex_edit_detected_(Fish_2)_detail.png", 
      6191: "Hex_edit_detected_(Sword)_detail.png",
      6192: "Hex_edit_detected_(Battleaxe)_detail.png",
      6193: "Hex_edit_detected_(Med_helm)_detail.png",
      6194: "Hex_edit_detected_(Kiteshield)_detail.png",
      6195: "Hex_edit_detected_(Shears)_detail.png",
      6196: "Hex_edit_detected_(Spade)_detail.png",
      6197: "Hex_edit_detected_(Ring)_detail.png",
      6198: "Hex_edit_detected_(Necklace)_detail.png"
    }

    const imageName = hexEditMapping[item.id]
    if (imageName) {
      console.log(`    🎯 Found Hex edit detected image: ${imageName}`)
      return [imageName]
    }

    console.log(`    ❌ No Hex edit detected mapping for ID: ${item.id}`)
    return []
  }

  /**
   * Download and store icon for an item
   */
  async downloadIcon(item, imageNames) {
    for (const imageName of imageNames) {
      try {
        const imageUrl = `https://oldschool.runescape.wiki/images/${encodeURIComponent(imageName)}`
        console.log(`    📥 Trying: ${imageUrl}`)
        
        const response = await fetch(imageUrl)
        if (!response.ok) {
          console.log(`    ❌ Failed to download: ${response.status}`)
          continue
        }
        
        const buffer = await response.arrayBuffer()
        const iconBuffer = Buffer.from(buffer)
        
        // Validate it's a real image
        const isPNG = iconBuffer[0] === 0x89 && iconBuffer[1] === 0x50 && iconBuffer[2] === 0x4E && iconBuffer[3] === 0x47
        const isWebP = iconBuffer[0] === 0x52 && iconBuffer[1] === 0x49 && iconBuffer[2] === 0x46 && iconBuffer[3] === 0x46
        
        if (!isPNG && !isWebP) {
          console.log(`    ❌ Not a valid image format`)
          continue
        }
        
        // Store in database
        databaseService.db.prepare(`
          UPDATE items SET icon_data = ? WHERE id = ?
        `).run(iconBuffer, item.id)
        
        console.log(`    ✅ Successfully downloaded and stored ${iconBuffer.length} bytes`)
        return true
        
      } catch (error) {
        console.log(`    ❌ Error downloading ${imageName}: ${error.message}`)
        continue
      }
    }
    
    return false
  }

  /**
   * Special handling for Barrows items - use undamaged version for degraded states
   */
  async fixBarrowsItem(item, isCorrupted = false) {
    const prefix = isCorrupted ? '🔧' : '📥'
    console.log(`${prefix} Fixing Barrows item ${item.name} (ID: ${item.id})`)
    
    if (isCorrupted) {
      console.log(`    🚨 Current data: "${item.dataPreview}"`)
    }

    // Map degraded/broken Barrows items to their undamaged versions
    // Use exact database names
    const barrowsMapping = {
      // Ahrim's hood - corrupted undamaged, need to copy from working item
      "Ahrim's hood (undamaged)": { sourceId: 4712, sourceName: "Ahrim's robetop (undamaged)" }, // Use robetop as fallback
      "Ahrim's hood (100)": { sourceId: 4712, sourceName: "Ahrim's robetop (undamaged)" },
      "Ahrim's hood (75)": { sourceId: 4712, sourceName: "Ahrim's robetop (undamaged)" }, 
      "Ahrim's hood (50)": { sourceId: 4712, sourceName: "Ahrim's robetop (undamaged)" },
      "Ahrim's hood (25)": { sourceId: 4712, sourceName: "Ahrim's robetop (undamaged)" },
      "Ahrim's hood(broken)": { sourceId: 4712, sourceName: "Ahrim's robetop (undamaged)" },
      
      // Ahrim's staff - corrupted undamaged  
      "Ahrim's staff (undamaged)": { sourceId: 4712, sourceName: "Ahrim's robetop (undamaged)" },
      "Ahrim's staff (100)": { sourceId: 4712, sourceName: "Ahrim's robetop (undamaged)" },
      "Ahrim's staff (75)": { sourceId: 4712, sourceName: "Ahrim's robetop (undamaged)" },
      "Ahrim's staff (50)": { sourceId: 4712, sourceName: "Ahrim's robetop (undamaged)" },
      "Ahrim's staff (25)": { sourceId: 4712, sourceName: "Ahrim's robetop (undamaged)" },
      "Ahrim's staff(broken)": { sourceId: 4712, sourceName: "Ahrim's robetop (undamaged)" },
      
      // Dharok's helm - corrupted undamaged
      "Dharok's helm (undamaged)": { sourceId: 4718, sourceName: "Dharok's greataxe (undamaged)" },
      "Dharok's helm (100)": { sourceId: 4718, sourceName: "Dharok's greataxe (undamaged)" },
      "Dharok's helm (75)": { sourceId: 4718, sourceName: "Dharok's greataxe (undamaged)" },
      "Dharok's helm (50)": { sourceId: 4718, sourceName: "Dharok's greataxe (undamaged)" },
      "Dharok's helm (25)": { sourceId: 4718, sourceName: "Dharok's greataxe (undamaged)" },
      "Dharok's helm(broken)": { sourceId: 4718, sourceName: "Dharok's greataxe (undamaged)" },
      
      // Verac's brassard - corrupted states
      "Verac's brassard (100)": { sourceId: 4757, sourceName: "Verac's brassard (undamaged)" },
      "Verac's brassard (75)": { sourceId: 4757, sourceName: "Verac's brassard (undamaged)" },
      "Verac's brassard (50)": { sourceId: 4757, sourceName: "Verac's brassard (undamaged)" },
      "Verac's brassard (25)": { sourceId: 4757, sourceName: "Verac's brassard (undamaged)" }
    }

    const mapping = barrowsMapping[item.name]
    if (!mapping) {
      console.log(`    ❌ No mapping found for ${item.name}`)
      return false
    }

    console.log(`    🔄 Using source: ${mapping.sourceName} (ID: ${mapping.sourceId})`)

    // Get the icon data from the source item
    const sourceIconBuffer = databaseService.getIconData(mapping.sourceId)
    
    if (!sourceIconBuffer || sourceIconBuffer.length === 0) {
      console.log(`    ❌ Source item has no icon data: ${mapping.sourceName}`)
      return false
    }

    // Validate the source icon is valid
    const isPNG = sourceIconBuffer[0] === 0x89 && sourceIconBuffer[1] === 0x50 && sourceIconBuffer[2] === 0x4E && sourceIconBuffer[3] === 0x47
    const isWebP = sourceIconBuffer[0] === 0x52 && sourceIconBuffer[1] === 0x49 && sourceIconBuffer[2] === 0x46 && sourceIconBuffer[3] === 0x46

    if (!isPNG && !isWebP) {
      console.log(`    ❌ Source item has corrupted icon data: ${mapping.sourceName}`)
      return false
    }

    // Copy the icon data to the target item
    databaseService.db.prepare(`
      UPDATE items SET icon_data = ? WHERE id = ?
    `).run(sourceIconBuffer, item.id)

    console.log(`    ✅ Successfully copied icon from ${mapping.sourceName} (${sourceIconBuffer.length} bytes)`)
    
    if (isCorrupted) {
      this.stats.corrupted_fixed++
    }
    this.stats.success++
    return true
  }

  /**
   * Check if an item is a degraded Barrows item that needs fixing
   */
  isBarrowsItem(itemName) {
    const barrowsItems = [
      "Ahrim's hood (undamaged)", "Ahrim's hood (100)", "Ahrim's hood (75)", "Ahrim's hood (50)", "Ahrim's hood (25)", "Ahrim's hood(broken)",
      "Ahrim's staff (undamaged)", "Ahrim's staff (100)", "Ahrim's staff (75)", "Ahrim's staff (50)", "Ahrim's staff (25)", "Ahrim's staff(broken)",
      "Dharok's helm (undamaged)", "Dharok's helm (100)", "Dharok's helm (75)", "Dharok's helm (50)", "Dharok's helm (25)", "Dharok's helm(broken)",
      "Verac's brassard (100)", "Verac's brassard (75)", "Verac's brassard (50)", "Verac's brassard (25)"
    ]
    
    return barrowsItems.includes(itemName)
  }

  /**
   * Fix a single item's icon
   */
  async fixItemIcon(item, isCorrupted = false) {
    // Special handling for Barrows items
    if (this.isBarrowsItem(item.name)) {
      return await this.fixBarrowsItem(item, isCorrupted)
    }

    const prefix = isCorrupted ? '🔧' : '📥'
    console.log(`${prefix} Fixing icon for ${item.name} (ID: ${item.id})`)
    
    if (isCorrupted) {
      console.log(`    🚨 Current data: "${item.dataPreview}"`)
    }
    
    const imageNames = await this.getWikiImageNames(item)
    
    if (imageNames.length === 0) {
      console.log(`    ❌ No images found on wiki page`)
      return false
    }
    
    const success = await this.downloadIcon(item, imageNames)
    
    if (success) {
      if (isCorrupted) {
        this.stats.corrupted_fixed++
      }
      this.stats.success++
      return true
    } else {
      this.stats.failed++
      this.stats.errors.push(`${item.name} (ID: ${item.id}): No valid images found`)
      return false
    }
  }

  /**
   * Main fix process
   */
  async fixAllIcons() {
    const { missingIcons, corruptedIcons } = await this.findProblematicItems()
    
    const allProblematicItems = [
      ...corruptedIcons.map(item => ({ ...item, isCorrupted: true })),
      ...missingIcons.map(item => ({ ...item, isCorrupted: false }))
    ]
    
    this.stats.total = allProblematicItems.length
    
    if (this.stats.total === 0) {
      console.log('🎉 No missing or corrupted icons found!')
      return
    }
    
    console.log(`\n🚀 Starting to fix ${this.stats.total} problematic icons...`)
    console.log('📦 Processing in batches with delays to avoid rate limiting\n')
    
    const batchSize = 10
    const delay = 2000 // 2 seconds between batches
    
    for (let i = 0; i < allProblematicItems.length; i += batchSize) {
      const batch = allProblematicItems.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(allProblematicItems.length / batchSize)
      
      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (items ${i + 1}-${Math.min(i + batchSize, allProblematicItems.length)})`)
      
      for (const item of batch) {
        await this.fixItemIcon(item, item.isCorrupted)
        
        const progress = ((this.stats.success + this.stats.failed) / this.stats.total * 100).toFixed(1)
        console.log(`📊 Progress: ${this.stats.success + this.stats.failed}/${this.stats.total} (${progress}%) | ✅ ${this.stats.success} | 🔧 ${this.stats.corrupted_fixed} | ❌ ${this.stats.failed}\n`)
      }
      
      // Delay between batches (except for the last batch)
      if (i + batchSize < allProblematicItems.length) {
        console.log(`⏳ Waiting ${delay/1000}s before next batch...\n`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  /**
   * Generate final report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60))
    console.log('📊 ICON FIXING COMPLETE')
    console.log('='.repeat(60))
    console.log(`📈 Statistics:`)
    console.log(`   Total items processed: ${this.stats.total}`)
    console.log(`   Successfully fixed: ${this.stats.success}`)
    console.log(`   Corrupted data fixed: ${this.stats.corrupted_fixed}`)
    console.log(`   Failed to fix: ${this.stats.failed}`)
    console.log(`   Success rate: ${((this.stats.success / this.stats.total) * 100).toFixed(1)}%`)
    
    if (this.stats.errors.length > 0) {
      console.log(`\n❌ Failed items:`)
      this.stats.errors.forEach(error => console.log(`   ${error}`))
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      errors: this.stats.errors
    }
    
    fs.writeFileSync('icon-fix-report.json', JSON.stringify(report, null, 2))
    console.log(`\n📄 Detailed report saved to: icon-fix-report.json`)
    
    console.log('\n💡 Tip: Run the test-all-items-display.js script to see the updated results!')
  }

  /**
   * Run the complete fixing process
   */
  async run() {
    try {
      console.log('🔧 Enhanced Missing Icon Fixer')
      console.log('=' .repeat(40))
      
      await this.init()
      await this.fixAllIcons()
      this.generateReport()
      
    } catch (error) {
      console.error('❌ Fatal error:', error)
      process.exit(1)
    }
  }
}

// Run the fixer
const fixer = new EnhancedIconFixer()
fixer.run().catch(console.error)
