import databaseService from './services/databaseService.js';

class TargetedIconFixer {
  async init() {
    await databaseService.init();
    console.log('✅ Database initialized for targeted fixing');
  }

  async fixSpecificIcon(itemId, itemName, correctImageUrl) {
    try {
      console.log(`🔧 Fixing ${itemName} (ID: ${itemId})`);
      console.log(`📥 Downloading: ${correctImageUrl}`);
      
      const response = await fetch(correctImageUrl);
      if (!response.ok) {
        console.log(`❌ Failed: ${response.status} ${response.statusText}`);
        return false;
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      console.log(`✅ Downloaded ${buffer.length} bytes`);
      
      const stored = databaseService.storeIconData(itemId, buffer);
      if (stored) {
        console.log(`✅ Updated icon for ${itemName}`);
        return true;
      } else {
        console.log(`❌ Failed to store icon`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      return false;
    }
  }

  async fixProblematicItems() {
    console.log('🎯 Fixing specifically reported problematic items...\n');
    
    const fixes = [
      // Scythe of vitur - try uncharged version (normal appearance)
      {
        id: 22325,
        name: 'Scythe of vitur',
        urls: [
          'https://oldschool.runescape.wiki/images/Scythe_of_vitur_(uncharged).png',
          'https://oldschool.runescape.wiki/images/Scythe_of_vitur.png'
        ]
      },
      // Second Scythe variant - might be charged version
      {
        id: 22664,
        name: 'Scythe of vitur (charged)',
        urls: [
          'https://oldschool.runescape.wiki/images/Scythe_of_vitur_(charged).png',
          'https://oldschool.runescape.wiki/images/Scythe_of_vitur.png'
        ]
      },
      // Dragon pickaxe
      {
        id: 11920,
        name: 'Dragon pickaxe',
        urls: [
          'https://oldschool.runescape.wiki/images/Dragon_pickaxe.png',
          'https://oldschool.runescape.wiki/images/Dragon_pickaxe_detail.png'
        ]
      }
    ];
    
    let fixed = 0;
    for (const fix of fixes) {
      console.log(`\n🎯 Targeting: ${fix.name} (ID: ${fix.id})`);
      
      let success = false;
      for (const url of fix.urls) {
        if (await this.fixSpecificIcon(fix.id, fix.name, url)) {
          success = true;
          fixed++;
          break;
        }
      }
      
      if (!success) {
        console.log(`❌ Could not fix ${fix.name}`);
      }
    }
    
    console.log(`\n📊 Results: ${fixed}/${fixes.length} items fixed`);
  }

  async close() {
    databaseService.close();
  }
}

async function main() {
  const fixer = new TargetedIconFixer();
  
  try {
    await fixer.init();
    await fixer.fixProblematicItems();
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  } finally {
    await fixer.close();
  }
}

main();
