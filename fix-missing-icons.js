import databaseService from './services/databaseService.js';
import WikiLookupService from './services/wikiLookupService.js';

class MissingIconFixer {
  constructor() {
    this.wikiService = new WikiLookupService();
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      errors: []
    };
  }

  async init() {
    await databaseService.init();
    console.log('✅ Database initialized');
  }

  async findItemsWithMissingIcons() {
    console.log('🔍 Finding items with missing icons...');
    
    const missingIconItems = databaseService.db.prepare(`
      SELECT i.id, i.name, m.wiki_page
      FROM items i
      LEFT JOIN item_wiki_mapping m ON i.id = m.id
      WHERE i.icon_data IS NULL 
      ORDER BY i.id
    `).all();
    
    console.log(`📊 Found ${missingIconItems.length} items with missing icons`);
    return missingIconItems;
  }

  async getWikiImageNames(item) {
    try {
      // Use the authoritative wiki page from item_wiki_mapping if available
      let wikiPageName = item.wiki_page;
      
      if (!wikiPageName) {
        // Fallback to guessing from item name if not in mapping
        wikiPageName = item.name.replace(/ /g, '_');
        console.log(`    ⚠️  No wiki mapping found for item ${item.id}, guessing page name: ${wikiPageName}`);
      } else {
        console.log(`    ✅ Using authoritative wiki page: ${wikiPageName}`);
      }
      
      const wikiUrl = `https://oldschool.runescape.wiki/w/${encodeURIComponent(wikiPageName)}`;
      console.log(`    🔍 Checking wiki page: ${wikiUrl}`);
      
      const response = await fetch(wikiUrl);
      if (!response.ok) {
        return [];
      }
      
      const html = await response.text();
      
      // Extract image file names from the HTML
      const imageNames = new Set();
      
      // Check if this is a disambiguation page
      if (html.includes('disambiguation page') || html.includes('distinguish between articles with similar names')) {
        console.log(`    🔀 Detected disambiguation page, skipping icon search`);
        return []; // Disambiguation pages don't have item icons
      }
      
      // More specific patterns to avoid footer/UI images
      
      // Pattern 1: Infobox images (most reliable for item icons)
      const infoboxMatches = html.match(/class="[^"]*infobox[^"]*"[^>]*>[\s\S]*?src="[^"]*\/images\/([^"\/]+\.png)"/gi);
      if (infoboxMatches) {
        infoboxMatches.forEach(match => {
          const filename = match.match(/\/images\/([^"\/]+\.png)/i)?.[1];
          if (filename && this.isRelevantImage(filename, item.name)) {
            imageNames.add(decodeURIComponent(filename.replace(/_/g, ' ').replace('.png', '')));
          }
        });
      }
      
      // Pattern 2: Gallery images specifically
      const galleryMatches = html.match(/(?:class="gallery[^"]*"|gallery)[^>]*>[\s\S]*?src="[^"]*\/images\/([^"\/]+\.png)"/gi);
      if (galleryMatches) {
        galleryMatches.forEach(match => {
          const filename = match.match(/\/images\/([^"\/]+\.png)/i)?.[1];
          if (filename && this.isRelevantImage(filename, item.name)) {
            imageNames.add(decodeURIComponent(filename.replace(/_/g, ' ').replace('.png', '')));
          }
        });
      }
      
      // Pattern 3: File: links that contain the item name
      const fileMatches = html.match(/File:([^|\]]+\.png)/gi);
      if (fileMatches) {
        fileMatches.forEach(match => {
          const filename = match.replace(/^File:/i, '').replace('.png', '');
          if (this.isRelevantImage(filename + '.png', item.name)) {
            imageNames.add(decodeURIComponent(filename.replace(/_/g, ' ')));
          }
        });
      }
      
      // Pattern 4: Look for images that definitely contain the item name
      const itemKeywords = item.name.toLowerCase().split(' ');
      const specificMatches = html.match(/src="[^"]*\/images\/([^"\/]+\.png)"/gi);
      if (specificMatches) {
        specificMatches.forEach(match => {
          const filename = match.match(/\/images\/([^"\/]+\.png)/i)?.[1];
          if (filename && this.isRelevantImage(filename, item.name)) {
            // Only include if filename contains key parts of the item name
            const filenameLower = filename.toLowerCase();
            const hasKeyword = itemKeywords.some(keyword => 
              keyword.length > 2 && filenameLower.includes(keyword.toLowerCase())
            );
            if (hasKeyword) {
              imageNames.add(decodeURIComponent(filename.replace(/_/g, ' ').replace('.png', '')));
            }
          }
        });
      }
      
      // Pattern 5: Fallback for specific cases where wiki uses generic images
      if (imageNames.size === 0) {
        // Fire arrows: Use any fire arrow image found
        if (item.name.toLowerCase().includes('fire arrow')) {
          const fireArrowMatches = html.match(/src="[^"]*\/images\/([^"\/]*fire_arrow[^"\/]*\.png)"/gi);
          if (fireArrowMatches) {
            fireArrowMatches.forEach(match => {
              const filename = match.match(/\/images\/([^"\/]+\.png)/i)?.[1];
              if (filename) {
                imageNames.add(decodeURIComponent(filename.replace(/_/g, ' ').replace('.png', '')));
              }
            });
          }
        }
        
        // Sliding pieces: Use any sliding piece image found
        if (item.name.toLowerCase().includes('sliding piece')) {
          const slidingMatches = html.match(/src="[^"]*\/images\/([^"\/]*sliding_piece[^"\/]*\.png)"/gi);
          if (slidingMatches) {
            slidingMatches.forEach(match => {
              const filename = match.match(/\/images\/([^"\/]+\.png)/i)?.[1];
              if (filename) {
                imageNames.add(decodeURIComponent(filename.replace(/_/g, ' ').replace('.png', '')));
              }
            });
          }
        }
        
        // If still no images, look for any main infobox image (last resort for specific item types)
        if (imageNames.size === 0 && (
          item.name.toLowerCase().includes('fire arrow') ||
          item.name.toLowerCase().includes('crystal') ||
          item.name.toLowerCase().includes('spell') ||
          item.name.toLowerCase().includes('symbol')
        )) {
          const mainImageMatch = html.match(/class="[^"]*infobox[^"]*"[\s\S]*?src="[^"]*\/images\/([^"\/]+\.png)"/i);
          if (mainImageMatch) {
            const filename = mainImageMatch[1];
            if (filename) {
              imageNames.add(decodeURIComponent(filename.replace(/_/g, ' ').replace('.png', '')));
            }
          }
        }
      }
      
      const results = Array.from(imageNames).filter(name => name.length > 0);
      console.log(`    ✅ Found ${results.length} relevant image names from wiki page`);
      
      return results;
    } catch (error) {
      console.log(`    ❌ Error fetching wiki page: ${error.message}`);
      return [];
    }
  }

  isRelevantImage(filename, itemName) {
    const filenameLower = filename.toLowerCase();
    
    // Exclude common non-item images
    const excludePatterns = [
      'creative_commons', 'footer', 'logo', 'icon_external', 'edit', 'discord',
      'button', 'background', 'banner', 'header', 'navigation',
      'wiki', 'search', 'menu', 'ui_', 'interface', 'chat', 'cursor'
    ];
    
    if (excludePatterns.some(pattern => filenameLower.includes(pattern))) {
      return false;
    }
    
    // Include if it's clearly an inventory/detail image (even if generic)
    if (filenameLower.includes('_detail.png') || filenameLower.includes('_inventory')) {
      return true;
    }
    
    // Include any .png that could be an item icon - be more permissive
    // This will catch generic images like "Bronze_fire_arrow_detail.png" used for mithril fire arrows
    if (filenameLower.endsWith('.png')) {
      // Include if filename contains any part of item name OR item category
      const itemKeywords = itemName.toLowerCase().split(' ').filter(word => word.length > 2);
      
      // Check if any keyword matches
      const hasKeywordMatch = itemKeywords.some(keyword => filenameLower.includes(keyword));
      
      // For fire arrows, accept any fire arrow image
      if (itemName.toLowerCase().includes('fire arrow') && filenameLower.includes('fire_arrow')) {
        return true;
      }
      
      // For crystals, accept any crystal image
      if (itemName.toLowerCase().includes('crystal') && filenameLower.includes('crystal')) {
        return true;
      }
      
      // For spells, accept any spell image
      if (itemName.toLowerCase().includes('spell') && filenameLower.includes('spell')) {
        return true;
      }
      
      // For potions with dose numbers, be more flexible with parentheses and underscores
      if (itemName.includes('(') && itemName.includes(')')) {
        // Extract the base name and dose from item name like "Defence potion(1)"
        const match = itemName.match(/^(.+?)\((\d+)\)$/);
        if (match) {
          const baseName = match[1].trim().toLowerCase();
          const dose = match[2];
          
          // Check if filename contains the base name and dose in any format
          if (filenameLower.includes(baseName.replace(/ /g, '_')) && 
              (filenameLower.includes(`(${dose})`) || filenameLower.includes(`_${dose}_`) || filenameLower.includes(`_${dose}.png`))) {
            return true;
          }
        }
      }
      
      return hasKeywordMatch;
    }
    
    return false;
  }

  getAlternateNames(itemName) {
    const alternates = [];
    
    // Specific manual mappings for edge cases that we know work
    const manualMappings = {
      'Grinder': ['Pestle and mortar'],
      'Golden bowl': ['Golden bowl (water)', 'Gold bowl', 'Blessed gold bowl'],
      'Broken shield': ['Broken shield (Hero\'s Quest)', 'Broken shield (Heroes\' Quest)'],
      'Twigs': ['Twig'],
      // Cocktail mappings based on the disambiguation page structure
      'Unfinished cocktail': [
        'Pineapple punch', 'Wizard blizzard', 'Blurberry special',
        'Unfinished cocktail (Pineapple punch)', 'Unfinished cocktail (Wizard blizzard)', 'Unfinished cocktail (Blurberry special)'
      ],
      // Tiles (Rogues' Den) variants - all use generic tile icons
      'Tiles (Rogues\' Den) (correct)': ['Tile', 'Floor tile'],
      'Tiles (Rogues\' Den) (flipped vertically)': ['Tile', 'Floor tile'],
      'Tiles (Rogues\' Den) (flipped horizontally)': ['Tile', 'Floor tile'],
      'Tiles (Rogues\' Den) (rotated)': ['Tile', 'Floor tile'],
      // Add base pattern for all Tiles variants
      'Tiles (Rogues\' Den)': ['Tile', 'Floor tile'],
      
      // Sliding piece variants - use generic sliding piece icons
      'Sliding piece': ['Sliding piece', 'Puzzle piece'],
      
      // Fishbowl pet variants - use base fishbowl icon
      'Fishbowl (pet)': ['Fishbowl', 'Pet fishbowl'],
      
      // Hellcat variants - use base hellcat icon  
      'Hellcat': ['Cat', 'Hellcat', 'Pet cat'],
      
      // Pharaoh's sceptre variants - use base sceptre icon
      'Pharaoh\'s sceptre (discontinued)': ['Pharaoh\'s sceptre', 'Sceptre'],
      
      // Fractured crystal variants - use base crystal icon
      'Fractured crystal (Mourning\'s End Part II)': ['Crystal', 'Fractured crystal'],
      
      // Falconer's glove variants - use base glove icon
      'Falconer\'s glove': ['Glove', 'Falconer\'s glove'],
      
      // Queen's secateurs variants - use base secateurs icon
      'Queen\'s secateurs': ['Secateurs', 'Queen\'s secateurs']
    };
    
    // Add manual mappings if they exist
    if (manualMappings[itemName]) {
      alternates.push(...manualMappings[itemName]);
    }
    
    // Special handling for Tiles (Rogues' Den) variants
    if (itemName.startsWith('Tiles (Rogues\' Den)')) {
      alternates.push('Tile', 'Floor tile');
    }
    
    // Special handling for Sliding piece variants
    if (itemName.includes('Sliding_piece_') || itemName.includes('Sliding piece')) {
      alternates.push('Sliding piece', 'Puzzle piece');
    }
    
    // Special handling for Fishbowl pet variants
    if (itemName.startsWith('Fishbowl (pet)')) {
      alternates.push('Fishbowl', 'Pet fishbowl');
    }
    
    // Special handling for Hellcat variants
    if (itemName.startsWith('Hellcat')) {
      alternates.push('Cat', 'Hellcat', 'Pet cat');
    }
    
    // Special handling for Pharaoh's sceptre variants
    if (itemName.startsWith('Pharaoh\'s sceptre')) {
      alternates.push('Pharaoh\'s sceptre', 'Sceptre');
    }
    
    // Special handling for Fractured crystal variants
    if (itemName.startsWith('Fractured crystal')) {
      alternates.push('Crystal', 'Fractured crystal');
    }
    
    // Special handling for Falconer's glove variants
    if (itemName.startsWith('Falconer\'s glove')) {
      alternates.push('Glove', 'Falconer\'s glove');
    }
    
    // Special handling for Queen's secateurs variants
    if (itemName.startsWith('Queen\'s secateurs')) {
      alternates.push('Secateurs', 'Queen\'s secateurs');
    }
    
    // Special handling for Hex edit detected items (use generic error/debug icons)
    if (itemName.startsWith('Hex edit detected')) {
      alternates.push('Error', 'Debug item', 'Unknown item');
    }
    
    // Handle specific cocktail patterns
    if (itemName.includes('Unfinished cocktail')) {
      // These are disambiguation items, likely won't have individual icons
      return alternates; // Return early, don't add generic patterns
    }
    
    // Simplified generic patterns for common cases only
    
    // 1. Pet variations - handle kittens, cats, and other pets with color variants
    if (itemName.startsWith('Pet ')) {
      const petType = itemName.substring(4); // Remove 'Pet ' prefix
      const colors = ['white', 'black', 'brown', 'grey', 'red', 'blue', 'green'];
      const colorCombinations = ['grey and black', 'grey and brown', 'brown and white'];
      
      colors.forEach(color => {
        alternates.push(`${petType} (${color})`);
      });
      
      colorCombinations.forEach(combo => {
        alternates.push(`${petType} (${combo})`);
      });
    }
    
    // 2. Thread variations - handle colored threads
    if (itemName.includes('thread')) {
      const colors = ['red', 'green', 'blue'];
      colors.forEach(color => {
        alternates.push(`${itemName} (${color})`);
      });
    }
    
    // 3. Common equipment states (reduced list)
    const commonStates = ['(p)', '(p+)', '(p++)', '(noted)', '(e)'];
    commonStates.forEach(state => {
      if (!itemName.includes(state)) {
        alternates.push(`${itemName} ${state}`);
      }
    });
    
    // Remove duplicates and the original name
    return [...new Set(alternates)].filter(name => name !== itemName);
  }

  async downloadMissingIcon(item) {
    try {
      console.log(`📥 Downloading icon for item ${item.id}: ${item.name}`);
      
      // First, try to get intelligent image names from the wiki page using authoritative mapping
      const wikiImageNames = await this.getWikiImageNames(item);
      
      // Special handling for items with URL fragments (variants on same wiki page)
      let variantPatterns = [];
      
      // Barrows equipment durability variants
      const isBarrows = /^(Ahrim|Dharok|Guthan|Karil|Torag|Verac)'s/.test(item.name);
      if (isBarrows && /\((100|75|50|25|broken|undamaged)\)/.test(item.name)) {
        const baseName = item.name.replace(/\s*\((100|75|50|25|broken|undamaged)\)/g, '');
        
        // Extract durability from item name
        const durabilityMatch = item.name.match(/\((100|75|50|25|broken|undamaged)\)/);
        const durability = durabilityMatch ? durabilityMatch[1] : '';
        
        // Map durability states to their numeric values for icon naming
        const durabilityMapping = {
          'undamaged': '100',
          'broken': '0'
        };
        const iconDurability = durabilityMapping[durability] || durability;
        
        console.log(`    🛡️ Detected Barrows durability variant: ${baseName} (${durability} -> icon: ${iconDurability})`);
        
        // Generate durability-specific icon patterns
        variantPatterns = [
          // Try durability-specific icons first (these show visual wear states)
          `https://oldschool.runescape.wiki/images/${baseName.replace(/ /g, '_')}_${iconDurability}.png`,
          `https://oldschool.runescape.wiki/images/${baseName.replace(/ /g, '_')}_${iconDurability}_detail.png`,
          `https://oldschool.runescape.wiki/images/${baseName.replace(/'/g, '%27')}_${iconDurability}.png`,
          `https://oldschool.runescape.wiki/images/${baseName.replace(/'/g, '%27')}_${iconDurability}_detail.png`,
          `https://oldschool.runescape.wiki/images/${encodeURIComponent(baseName)}_${iconDurability}.png`,
          `https://oldschool.runescape.wiki/images/${encodeURIComponent(baseName)}_${iconDurability}_detail.png`,
          
          // Try with parentheses format: Ahrim's_robetop_(0).png
          `https://oldschool.runescape.wiki/images/${baseName.replace(/ /g, '_')}_(${iconDurability}).png`,
          `https://oldschool.runescape.wiki/images/${baseName.replace(/ /g, '_')}_(${iconDurability})_detail.png`,
          
          // Fallback to base item icon if durability-specific not found
          `https://oldschool.runescape.wiki/images/${baseName.replace(/ /g, '_')}.png`,
          `https://oldschool.runescape.wiki/images/${baseName.replace(/ /g, '_')}_detail.png`,
          `https://oldschool.runescape.wiki/images/${encodeURIComponent(baseName)}.png`,
          `https://oldschool.runescape.wiki/images/${encodeURIComponent(baseName)}_detail.png`,
          `https://oldschool.runescape.wiki/images/${baseName.replace(/'/g, '%27')}.png`,
          `https://oldschool.runescape.wiki/images/${baseName.replace(/'/g, '%27')}_detail.png`,
        ];
      }
      // Other wiki fragment patterns (Tiles, Kegs, etc.)
      else if (/\([^)]+\)$/.test(item.name)) {
        // Extract base name by removing the parenthetical variant
        const baseName = item.name.replace(/\s*\([^)]+\)$/, '');
        
        // Check if this looks like a wiki fragment variant
        const commonFragmentPatterns = [
          /Tiles \(.*\) \((correct|flipped|rotated|horizontally|vertically)\)/,
          /.*\(keg\) \(\d+ pints?\)/,
          /.*\(.*\) \((empty|full|partially|broken|active|inactive)\)/
        ];
        
        const isFragmentVariant = commonFragmentPatterns.some(pattern => pattern.test(item.name));
        
        if (isFragmentVariant && baseName !== item.name) {
          console.log(`    🔗 Detected wiki fragment variant, using base name: ${baseName}`);
          
          variantPatterns = [
            // Try base item icon (most variants share the same icon)
            `https://oldschool.runescape.wiki/images/${baseName.replace(/ /g, '_')}.png`,
            `https://oldschool.runescape.wiki/images/${baseName.replace(/ /g, '_')}_detail.png`,
            `https://oldschool.runescape.wiki/images/${encodeURIComponent(baseName)}.png`,
            `https://oldschool.runescape.wiki/images/${encodeURIComponent(baseName)}_detail.png`,
            `https://oldschool.runescape.wiki/images/${baseName.replace(/'/g, '%27')}.png`,
            `https://oldschool.runescape.wiki/images/${baseName.replace(/'/g, '%27')}_detail.png`,
            
            // Also try with the full name in case they do have unique icons
            `https://oldschool.runescape.wiki/images/${item.name.replace(/ /g, '_')}.png`,
            `https://oldschool.runescape.wiki/images/${item.name.replace(/ /g, '_')}_detail.png`,
          ];
        }
      }
      
      // Build URL patterns starting with intelligent names from wiki
      const urlPatterns = [
        // Priority 1: Wiki fragment variant patterns (Barrows, Tiles, Kegs, etc.)
        ...variantPatterns,
        
        // Priority 2: Basic patterns
        `https://oldschool.runescape.wiki/images/${item.name.replace(/ /g, '_')}.png`,
        `https://oldschool.runescape.wiki/images/${item.name.replace(/ /g, '_')}_detail.png`,
        `https://oldschool.runescape.wiki/images/${item.id}.png`,
        
        // Priority 3: Add intelligent names from wiki page parsing
        ...wikiImageNames.map(name => `https://oldschool.runescape.wiki/images/${name.replace(/ /g, '_')}.png`),
        ...wikiImageNames.map(name => `https://oldschool.runescape.wiki/images/${name.replace(/ /g, '_')}_detail.png`),
        
        // Priority 4: Manual alternate names (known working patterns)
        ...this.getAlternateNames(item.name).map(altName => `https://oldschool.runescape.wiki/images/${altName.replace(/ /g, '_')}.png`),
        ...this.getAlternateNames(item.name).map(altName => `https://oldschool.runescape.wiki/images/${altName.replace(/ /g, '_')}_detail.png`),
        
        // Priority 5: Fallback to common patterns only if wiki parsing didn't work
        `https://oldschool.runescape.wiki/images/${item.name.replace(/[()]/g, '').replace(/ /g, '_')}.png`,
        `https://oldschool.runescape.wiki/images/${item.name.replace(/\(/g, '_(').replace(/\)/g, ')').replace(/ /g, '_')}.png`,
        `https://oldschool.runescape.wiki/images/${item.name.replace(/ /g, '_')}_(empty).png`,
        `https://oldschool.runescape.wiki/images/${item.name.replace(/ /g, '_')}_detail.png`,
        `https://oldschool.runescape.wiki/images/${item.name.replace(/ /g, '_')}_inventory_icon.png`
      ];
      
      // Remove duplicates while preserving order
      const uniqueUrls = [...new Set(urlPatterns)];
      
      for (const url of uniqueUrls) {
        try {
          const response = await fetch(url);
          
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            console.log(`  ✅ Downloaded ${buffer.length} bytes from: ${url}`);
            
            // Store in database
            const stored = databaseService.storeIconData(item.id, buffer);
            if (stored) {
              console.log(`  ✅ Stored in database for item ${item.id}`);
              return true;
            } else {
              console.log(`  ❌ Failed to store in database for item ${item.id}`);
            }
          }
          // Don't log individual 404s - they're expected during pattern testing
        } catch (error) {
          // Don't log individual errors - they're expected during pattern testing
        }
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Failed to download icon for ${item.name} (${item.id}):`, error.message);
      return false;
    }
  }

  async fixMissingIcons(batchSize = 10, delayMs = 1000) {
    const missingItems = await this.findItemsWithMissingIcons();
    this.stats.total = missingItems.length;
    
    console.log(`🚀 Starting to fix ${missingItems.length} missing icons...`);
    console.log(`📦 Batch size: ${batchSize}, Delay: ${delayMs}ms`);
    
    for (let i = 0; i < missingItems.length; i += batchSize) {
      const batch = missingItems.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(missingItems.length / batchSize);
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (items ${i + 1}-${Math.min(i + batchSize, missingItems.length)})`);
      
      for (const item of batch) {
        console.log(`🔍 Downloading icon for item ${item.id}: ${item.name}`);
        const success = await this.downloadMissingIcon(item);
        
        if (success) {
          this.stats.success++;
        } else {
          this.stats.failed++;
          this.stats.errors.push(`${item.id}: ${item.name}`);
          console.log(`  ❌ Failed to find icon for: ${item.name}`);
        }
        
        // Progress update
        const processed = this.stats.success + this.stats.failed;
        const percentage = ((processed / this.stats.total) * 100).toFixed(1);
        console.log(`📊 Progress: ${processed}/${this.stats.total} (${percentage}%) | ✅ ${this.stats.success} | ❌ ${this.stats.failed}`);
      }
      
      // Delay between batches to be respectful to the wiki
      if (i + batchSize < missingItems.length) {
        console.log(`⏳ Waiting ${delayMs}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    this.printFinalStats();
  }

  printFinalStats() {
    console.log('\n🎯 Final Results:');
    console.log(`📊 Total items processed: ${this.stats.total}`);
    console.log(`✅ Successfully downloaded: ${this.stats.success}`);
    console.log(`❌ Failed to download: ${this.stats.failed}`);
    console.log(`📈 Success rate: ${((this.stats.success / this.stats.total) * 100).toFixed(1)}%`);
    
    if (this.stats.failed > 0) {
      console.log('\n❌ Failed items (first 10):');
      this.stats.errors.slice(0, 10).forEach(error => {
        console.log(`  ${error}`);
      });
      
      if (this.stats.errors.length > 10) {
        console.log(`  ... and ${this.stats.errors.length - 10} more`);
      }
    }
  }

  async run() {
    try {
      await this.init();
      await this.fixMissingIcons(15, 2000); // 15 items per batch, 2 second delay
    } catch (error) {
      console.error('💥 Fatal error:', error);
    }
    
    process.exit(0);
  }
}

// Run the fixer
console.log('🔧 Starting Missing Icon Fixer...');
const fixer = new MissingIconFixer();
fixer.run();
