import databaseService from './services/databaseService.js';

class VariantIconFixer {
  constructor() {
    this.stats = { checked: 0, fixed: 0, failed: 0 };
  }

  async init() {
    await databaseService.init();
    console.log('✅ Database initialized for variant fixing');
  }

  async findItemsWithMultipleVariants() {
    // Find items that have the same name but different IDs
    const duplicateNames = databaseService.db.prepare(`
      SELECT name, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM items 
      GROUP BY name 
      HAVING count > 1
      ORDER BY count DESC, name
    `).all();

    console.log(`🔍 Found ${duplicateNames.length} items with multiple variants`);
    return duplicateNames;
  }

  async getWikiVariantImages(itemName) {
    try {
      const wikiUrl = `https://oldschool.runescape.wiki/w/${encodeURIComponent(itemName.replace(/ /g, '_'))}`;
      console.log(`    🔍 Checking wiki page: ${wikiUrl}`);
      
      const response = await fetch(wikiUrl);
      if (!response.ok) {
        return [];
      }
      
      const html = await response.text();
      const variants = new Set();
      
      // Look for specific variant patterns in the HTML
      
      // Pattern 1: Infobox with different states
      const infoboxImageMatches = html.match(/class="[^"]*infobox[^"]*"[\s\S]*?File:([^|\]]+\.png)/gi);
      if (infoboxImageMatches) {
        infoboxImageMatches.forEach(match => {
          const filename = match.match(/File:([^|\]]+\.png)/i)?.[1];
          if (filename && this.isItemVariant(filename, itemName)) {
            variants.add(filename.replace('.png', ''));
          }
        });
      }
      
      // Pattern 2: Gallery section with variants
      const gallerySection = html.match(/##\s*Gallery[\s\S]*?(?=##|$)/i);
      if (gallerySection) {
        const galleryImages = gallerySection[0].match(/File:([^|\]]+\.png)/gi);
        if (galleryImages) {
          galleryImages.forEach(match => {
            const filename = match.replace(/^File:/i, '');
            if (this.isItemVariant(filename, itemName)) {
              variants.add(filename.replace('.png', ''));
            }
          });
        }
      }
      
      // Pattern 3: Look for common variant keywords
      const variantKeywords = [
        '(uncharged)', '(charged)', '(empty)', '(full)',
        '(broken)', '(repaired)', '(noted)',
        '(1)', '(2)', '(3)', '(4)', '(5)',
        '(p)', '(p+)', '(p++)', '(kp)',
        '(e)', '(i)', '(s)',
        'detail', 'inventory'
      ];
      
      const itemNameBase = itemName.replace(/[()]/g, '').trim();
      const srcMatches = html.match(/src="[^"]*\/images\/([^"\/]+\.png)"/gi);
      if (srcMatches) {
        srcMatches.forEach(match => {
          const filename = match.match(/\/images\/([^"\/]+\.png)/i)?.[1];
          if (filename) {
            const decodedName = decodeURIComponent(filename).replace(/_/g, ' ');
            
            // Check if this looks like a variant of our item
            const containsItemName = decodedName.toLowerCase().includes(itemNameBase.toLowerCase());
            const hasVariantKeyword = variantKeywords.some(keyword => 
              decodedName.toLowerCase().includes(keyword.toLowerCase())
            );
            
            if (containsItemName || hasVariantKeyword) {
              variants.add(filename.replace('.png', ''));
            }
          }
        });
      }
      
      const results = Array.from(variants);
      console.log(`    ✅ Found ${results.length} potential variants`);
      
      return results;
    } catch (error) {
      console.log(`    ❌ Error fetching variants: ${error.message}`);
      return [];
    }
  }

  isItemVariant(filename, itemName) {
    const filenameLower = filename.toLowerCase();
    const itemNameLower = itemName.toLowerCase().replace(/ /g, '_');
    
    // Exclude obvious non-item images
    const excludePatterns = [
      'creative_commons', 'footer', 'logo', 'icon_external', 'edit', 'discord',
      'arrow', 'button', 'background', 'banner', 'header', 'navigation',
      'wiki', 'search', 'menu', 'ui_', 'interface', 'chat', 'cursor',
      'concept_art', 'work-in-progress', 'attack.gif'
    ];
    
    if (excludePatterns.some(pattern => filenameLower.includes(pattern))) {
      return false;
    }
    
    // Must contain a significant part of the item name or be clearly related
    const itemNameParts = itemNameLower.split('_').filter(part => part.length > 2);
    const hasSignificantMatch = itemNameParts.some(part => filenameLower.includes(part));
    
    return hasSignificantMatch;
  }

  async downloadVariantIcon(itemId, itemName, variantName) {
    const urls = [
      `https://oldschool.runescape.wiki/images/${variantName.replace(/ /g, '_')}.png`,
      `https://oldschool.runescape.wiki/images/${variantName.replace(/ /g, '_')}_detail.png`
    ];
    
    for (const url of urls) {
      try {
        console.log(`      Trying: ${url}`);
        const response = await fetch(url);
        
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          console.log(`      ✅ Downloaded ${buffer.length} bytes`);
          
          const stored = databaseService.storeIconData(itemId, buffer);
          if (stored) {
            console.log(`      ✅ Updated icon for item ${itemId}`);
            return true;
          }
        } else {
          console.log(`      ❌ HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
      }
    }
    
    return false;
  }

  async fixVariants(itemName, itemIds) {
    console.log(`\n🔧 Fixing variants for: ${itemName}`);
    console.log(`📋 Item IDs: ${itemIds}`);
    
    const variants = await this.getWikiVariantImages(itemName);
    if (variants.length === 0) {
      console.log(`    ❌ No variants found for ${itemName}`);
      return false;
    }
    
    const ids = itemIds.split(',').map(id => parseInt(id.trim()));
    
    // Try to match each item ID with the best variant
    let anyFixed = false;
    
    for (let i = 0; i < ids.length; i++) {
      const itemId = ids[i];
      console.log(`  🎯 Fixing item ${itemId} (${i + 1}/${ids.length})`);
      
      // Try variants in order of preference
      const variantPriority = [
        // First try exact name match
        itemName,
        // Then try common base variants
        ...variants.filter(v => v.toLowerCase().includes('uncharged') || v.toLowerCase().includes('detail')),
        // Then try numbered variants based on ID order
        ...variants.filter(v => v.match(/\(\d+\)/)),
        // Finally try all other variants
        ...variants
      ];
      
      const uniqueVariants = [...new Set(variantPriority)];
      
      let fixed = false;
      for (const variant of uniqueVariants) {
        if (await this.downloadVariantIcon(itemId, itemName, variant)) {
          fixed = true;
          anyFixed = true;
          break;
        }
      }
      
      if (!fixed) {
        console.log(`    ❌ Could not fix item ${itemId}`);
      }
    }
    
    return anyFixed;
  }

  async fixAllVariants(maxItems = 50) {
    console.log('🚀 Starting comprehensive variant fixing...\n');
    
    const multiVariantItems = await this.findItemsWithMultipleVariants();
    
    const itemsToProcess = multiVariantItems.slice(0, maxItems);
    console.log(`📦 Processing ${itemsToProcess.length} items with variants\n`);
    
    for (let i = 0; i < itemsToProcess.length; i++) {
      const item = itemsToProcess[i];
      this.stats.checked++;
      
      console.log(`\n[${i + 1}/${itemsToProcess.length}] Processing: ${item.name} (${item.count} variants)`);
      
      try {
        const success = await this.fixVariants(item.name, item.ids);
        if (success) {
          this.stats.fixed++;
        } else {
          this.stats.failed++;
        }
        
        // Small delay to be respectful to the wiki
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing ${item.name}:`, error.message);
        this.stats.failed++;
      }
    }
    
    console.log('\n📊 Final Results:');
    console.log(`✅ Items checked: ${this.stats.checked}`);
    console.log(`🔧 Items fixed: ${this.stats.fixed}`);
    console.log(`❌ Items failed: ${this.stats.failed}`);
    console.log(`📈 Success rate: ${((this.stats.fixed / this.stats.checked) * 100).toFixed(1)}%`);
  }

  async close() {
    databaseService.close();
  }
}

async function main() {
  const fixer = new VariantIconFixer();
  
  try {
    await fixer.init();
    
    // Process items with multiple variants
    await fixer.fixAllVariants(30); // Start with 30 items to test
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    await fixer.close();
  }
}

main();
