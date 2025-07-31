import databaseService from '../services/databaseService.js';

/**
 * Enhanced WikiLookupService extension that incorporates intelligent patterns
 * from our MissingIconFixer for better icon detection and downloading
 */
class EnhancedIconService {
  constructor() {
    this.stats = { attempts: 0, successes: 0, failures: 0 };
  }

  async init() {
    await databaseService.init();
  }

  /**
   * Get intelligent wiki image names by parsing the actual wiki page
   */
  async getWikiImageNames(itemName) {
    try {
      const wikiUrl = `https://oldschool.runescape.wiki/w/${encodeURIComponent(itemName.replace(/ /g, '_'))}`;
      console.log(`    🔍 Parsing wiki page: ${wikiUrl}`);
      
      const response = await fetch(wikiUrl);
      if (!response.ok) {
        return [];
      }
      
      const html = await response.text();
      const imageNames = new Set();
      
      // Pattern 1: Infobox images (most reliable for item icons)
      const infoboxMatches = html.match(/class="[^"]*infobox[^"]*"[^>]*>[\s\S]*?src="[^"]*\/images\/([^"\/]+\.png)"/gi);
      if (infoboxMatches) {
        infoboxMatches.forEach(match => {
          const filename = match.match(/\/images\/([^"\/]+\.png)/i)?.[1];
          if (filename && this.isRelevantImage(filename, itemName)) {
            imageNames.add(decodeURIComponent(filename.replace(/_/g, ' ').replace('.png', '')));
          }
        });
      }
      
      // Pattern 2: Gallery images specifically
      const galleryMatches = html.match(/(?:class="gallery[^"]*"|gallery)[^>]*>[\s\S]*?src="[^"]*\/images\/([^"\/]+\.png)"/gi);
      if (galleryMatches) {
        galleryMatches.forEach(match => {
          const filename = match.match(/\/images\/([^"\/]+\.png)/i)?.[1];
          if (filename && this.isRelevantImage(filename, itemName)) {
            imageNames.add(decodeURIComponent(filename.replace(/_/g, ' ').replace('.png', '')));
          }
        });
      }
      
      // Pattern 3: File: links that contain the item name
      const fileMatches = html.match(/File:([^|\]]+\.png)/gi);
      if (fileMatches) {
        fileMatches.forEach(match => {
          const filename = match.replace(/^File:/i, '').replace('.png', '');
          if (this.isRelevantImage(filename + '.png', itemName)) {
            imageNames.add(decodeURIComponent(filename.replace(/_/g, ' ')));
          }
        });
      }
      
      const results = Array.from(imageNames);
      console.log(`    ✅ Found ${results.length} relevant image names from wiki`);
      
      return results;
    } catch (error) {
      console.log(`    ❌ Error parsing wiki page: ${error.message}`);
      return [];
    }
  }

  isRelevantImage(filename, itemName) {
    const filenameLower = filename.toLowerCase();
    
    // Exclude common non-item images
    const excludePatterns = [
      'creative_commons', 'footer', 'logo', 'icon_external', 'edit', 'discord',
      'arrow', 'button', 'background', 'banner', 'header', 'navigation',
      'wiki', 'search', 'menu', 'ui_', 'interface', 'chat', 'cursor'
    ];
    
    if (excludePatterns.some(pattern => filenameLower.includes(pattern))) {
      return false;
    }
    
    // Include if it's clearly an inventory/detail image
    if (filenameLower.includes('_detail.png') || filenameLower.includes('_inventory')) {
      return true;
    }
    
    // Include if filename contains key parts of item name
    const itemKeywords = itemName.toLowerCase().split(' ').filter(word => word.length > 2);
    return itemKeywords.some(keyword => filenameLower.includes(keyword));
  }

  /**
   * Get alternate names using our enhanced patterns
   */
  getAlternateNames(itemName) {
    const alternates = [];
    
    // Manual mappings for known edge cases
    const manualMappings = {
      'Grinder': ['Pestle and mortar'],
      'Golden bowl': ['Golden bowl (water)', 'Gold bowl', 'Blessed gold bowl'],
      'Broken shield': ['Broken shield (Hero\'s Quest)', 'Broken shield (Heroes\' Quest)'],
      'Twigs': ['Twig']
    };
    
    if (manualMappings[itemName]) {
      alternates.push(...manualMappings[itemName]);
    }
    
    // Pet variations
    if (itemName.startsWith('Pet ')) {
      const petType = itemName.substring(4);
      const colors = ['white', 'black', 'brown', 'grey', 'red', 'blue', 'green'];
      const colorCombinations = ['grey and black', 'grey and brown', 'brown and white'];
      
      colors.forEach(color => {
        alternates.push(`${petType} (${color})`);
      });
      
      colorCombinations.forEach(combo => {
        alternates.push(`${petType} (${combo})`);
      });
    }
    
    // Thread variations
    if (itemName.includes('thread')) {
      const colors = ['red', 'green', 'blue'];
      colors.forEach(color => {
        alternates.push(`${itemName} (${color})`);
      });
    }
    
    // Common equipment states
    const commonStates = ['(uncharged)', '(charged)', '(p)', '(p+)', '(p++)', '(noted)', '(e)'];
    commonStates.forEach(state => {
      if (!itemName.includes(state)) {
        alternates.push(`${itemName} ${state}`);
      }
    });
    
    return [...new Set(alternates)].filter(name => name !== itemName);
  }

  /**
   * Enhanced icon download with intelligent patterns
   */
  async downloadIconWithIntelligence(itemId, itemName) {
    this.stats.attempts++;
    
    try {
      console.log(`📥 Enhanced download for ${itemName} (ID: ${itemId})`);
      
      // Get intelligent image names from wiki page
      const wikiImageNames = await this.getWikiImageNames(itemName);
      
      // Build comprehensive URL patterns
      const urlPatterns = [
        // Basic patterns
        `https://oldschool.runescape.wiki/images/${itemName.replace(/ /g, '_')}.png`,
        `https://oldschool.runescape.wiki/images/${itemName.replace(/ /g, '_')}_detail.png`,
        `https://oldschool.runescape.wiki/images/${itemId}.png`,
        
        // Intelligent names from wiki page parsing
        ...wikiImageNames.map(name => `https://oldschool.runescape.wiki/images/${name.replace(/ /g, '_')}.png`),
        ...wikiImageNames.map(name => `https://oldschool.runescape.wiki/images/${name.replace(/ /g, '_')}_detail.png`),
        
        // Manual alternate names
        ...this.getAlternateNames(itemName).map(altName => `https://oldschool.runescape.wiki/images/${altName.replace(/ /g, '_')}.png`),
        ...this.getAlternateNames(itemName).map(altName => `https://oldschool.runescape.wiki/images/${altName.replace(/ /g, '_')}_detail.png`),
        
        // Fallback patterns
        `https://oldschool.runescape.wiki/images/${itemName.replace(/[()]/g, '').replace(/ /g, '_')}.png`,
        `https://oldschool.runescape.wiki/images/${itemName.replace(/ /g, '_')}_(empty).png`,
        `https://oldschool.runescape.wiki/images/${itemName.replace(/ /g, '_')}_inventory_icon.png`
      ];
      
      // Remove duplicates while preserving order
      const uniqueUrls = [...new Set(urlPatterns)];
      
      for (const url of uniqueUrls) {
        try {
          console.log(`  Trying: ${url}`);
          const response = await fetch(url);
          
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            console.log(`  ✅ Downloaded ${buffer.length} bytes`);
            
            const stored = databaseService.storeIconData(itemId, buffer);
            if (stored) {
              console.log(`  ✅ Stored icon for ${itemName}`);
              this.stats.successes++;
              return { success: true, url, size: buffer.length };
            }
          } else {
            console.log(`  ❌ HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error) {
          console.log(`  ❌ Error: ${error.message}`);
        }
      }
      
      this.stats.failures++;
      return { success: false };
    } catch (error) {
      console.error(`❌ Enhanced download failed for ${itemName}:`, error.message);
      this.stats.failures++;
      return { success: false, error: error.message };
    }
  }

  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.attempts > 0 ? ((this.stats.successes / this.stats.attempts) * 100).toFixed(1) + '%' : '0%'
    };
  }
}

export default EnhancedIconService;
