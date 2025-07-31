import { OSRS_ITEMS_URL, CACHE_DIR } from '../config/constants.js';
import path from 'path';
import fs from 'fs';
import databaseService from '../services/databaseService.js';
import EnhancedIconService from '../services/enhancedIconService.js';

/**
 * Enhanced data fetcher that uses intelligent icon patterns
 * Integrates our enhanced wiki parsing and alternate name detection
 */
class EnhancedDataFetcher {
  constructor() {
    this.iconService = new EnhancedIconService();
    this.stats = {
      itemsProcessed: 0,
      iconsDownloaded: 0,
      iconsSkipped: 0,
      errors: 0
    };
  }

  async init() {
    await databaseService.init();
    await this.iconService.init();
    
    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  }

  async fetchItemsData() {
    try {
      console.log('📥 Fetching OSRS items data...');
      const response = await fetch(OSRS_ITEMS_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Fetched ${Object.keys(data).length} items`);
      
      // Cache the raw data
      const cacheFile = path.join(CACHE_DIR, 'items-complete.json');
      fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
      console.log(`✅ Cached items data to ${cacheFile}`);
      
      return data;
    } catch (error) {
      console.error('❌ Error fetching items data:', error.message);
      throw error;
    }
  }

  async processItemsWithEnhancedIcons(itemsData, options = {}) {
    const {
      skipExisting = true,
      maxItems = null,
      startFrom = 0
    } = options;
    
    const items = Object.entries(itemsData);
    const totalItems = maxItems ? Math.min(maxItems, items.length - startFrom) : items.length - startFrom;
    
    console.log(`🚀 Processing ${totalItems} items with enhanced icon service...`);
    console.log(`   Skip existing: ${skipExisting}`);
    console.log(`   Start from: ${startFrom}`);
    
    let processed = 0;
    
    for (let i = startFrom; i < items.length && (maxItems === null || processed < maxItems); i++) {
      const [itemId, itemData] = items[i];
      const itemName = itemData.name;
      
      this.stats.itemsProcessed++;
      processed++;
      
      console.log(`\n[${processed}/${totalItems}] Processing: ${itemName} (ID: ${itemId})`);
      
      try {
        // Store item data
        const stored = databaseService.storeItemData(itemId, itemData);
        if (!stored) {
          console.log(`  ⚠️ Failed to store item data`);
          this.stats.errors++;
          continue;
        }
        
        // Check if icon already exists (if skip enabled)
        if (skipExisting) {
          const existingIcon = databaseService.getIconData(itemId);
          if (existingIcon && existingIcon.length > 0) {
            console.log(`  ⏭️ Icon already exists (${existingIcon.length} bytes)`);
            this.stats.iconsSkipped++;
            continue;
          }
        }
        
        // Download icon with enhanced intelligence
        const iconResult = await this.iconService.downloadIconWithIntelligence(itemId, itemName);
        
        if (iconResult.success) {
          console.log(`  ✅ Icon downloaded successfully`);
          this.stats.iconsDownloaded++;
        } else {
          console.log(`  ❌ Failed to download icon`);
          this.stats.errors++;
        }
        
        // Brief pause to be respectful to the wiki
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`  ❌ Error processing ${itemName}:`, error.message);
        this.stats.errors++;
      }
      
      // Progress update every 50 items
      if (processed % 50 === 0) {
        this.printProgress();
      }
    }
    
    console.log('\n🎉 Enhanced processing complete!');
    this.printFinalStats();
  }

  printProgress() {
    const iconStats = this.iconService.getStats();
    console.log(`\n📊 Progress Update:`);
    console.log(`   Items processed: ${this.stats.itemsProcessed}`);
    console.log(`   Icons downloaded: ${this.stats.iconsDownloaded}`);
    console.log(`   Icons skipped: ${this.stats.iconsSkipped}`);
    console.log(`   Errors: ${this.stats.errors}`);
    console.log(`   Icon success rate: ${iconStats.successRate}`);
  }

  printFinalStats() {
    const iconStats = this.iconService.getStats();
    console.log(`\n📈 Final Statistics:`);
    console.log(`   Total items processed: ${this.stats.itemsProcessed}`);
    console.log(`   Icons downloaded: ${this.stats.iconsDownloaded}`);
    console.log(`   Icons skipped: ${this.stats.iconsSkipped}`);
    console.log(`   Errors: ${this.stats.errors}`);
    console.log(`   Icon success rate: ${iconStats.successRate}`);
    console.log(`   Database items: ${databaseService.getItemCount()}`);
    console.log(`   Database coverage: ${databaseService.getIconCoverageStats().percentage}%`);
  }

  // Convenience method to run just missing icons
  async fixMissingIcons() {
    console.log('🔧 Running enhanced missing icon fix...');
    
    await this.init();
    
    const missingIcons = databaseService.getItemsWithoutIcons();
    console.log(`Found ${missingIcons.length} items without icons`);
    
    if (missingIcons.length === 0) {
      console.log('✅ All items already have icons!');
      return;
    }
    
    let fixed = 0;
    for (const item of missingIcons) {
      console.log(`\n[${fixed + 1}/${missingIcons.length}] Fixing: ${item.name} (ID: ${item.id})`);
      
      const result = await this.iconService.downloadIconWithIntelligence(item.id, item.name);
      if (result.success) {
        fixed++;
        console.log(`  ✅ Fixed!`);
      } else {
        console.log(`  ❌ Still missing`);
      }
      
      // Brief pause
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    console.log(`\n🎉 Fixed ${fixed}/${missingIcons.length} missing icons`);
    console.log(`   Final coverage: ${databaseService.getIconCoverageStats().percentage}%`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'full';
  
  const fetcher = new EnhancedDataFetcher();
  
  try {
    if (command === 'icons-only') {
      await fetcher.fixMissingIcons();
    } else if (command === 'full') {
      await fetcher.init();
      const itemsData = await fetcher.fetchItemsData();
      await fetcher.processItemsWithEnhancedIcons(itemsData, {
        skipExisting: true
      });
    } else if (command === 'force-all') {
      await fetcher.init();
      const itemsData = await fetcher.fetchItemsData();
      await fetcher.processItemsWithEnhancedIcons(itemsData, {
        skipExisting: false
      });
    } else {
      console.log('Usage:');
      console.log('  node enhancedDataFetcher.js [command]');
      console.log('');
      console.log('Commands:');
      console.log('  full       - Fetch items and download missing icons (default)');
      console.log('  icons-only - Only fix missing icons');
      console.log('  force-all  - Re-download all icons');
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default EnhancedDataFetcher;
