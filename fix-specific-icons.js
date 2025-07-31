import databaseService from './services/databaseService.js';

class IconFixer {
  async init() {
    await databaseService.init();
  }

  async fixSpecificIcon(itemId, itemName, correctImageUrl) {
    try {
      console.log(`🔧 Fixing icon for ${itemName} (ID: ${itemId})`);
      console.log(`📥 Downloading from: ${correctImageUrl}`);
      
      const response = await fetch(correctImageUrl);
      if (!response.ok) {
        console.log(`❌ Failed to download: ${response.status} ${response.statusText}`);
        return false;
      }
      
      const buffer = Buffer.from(await response.arrayBuffer());
      console.log(`✅ Downloaded ${buffer.length} bytes`);
      
      const stored = databaseService.storeIconData(itemId, buffer);
      if (stored) {
        console.log(`✅ Updated icon for ${itemName}`);
        return true;
      } else {
        console.log(`❌ Failed to store icon for ${itemName}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error fixing ${itemName}:`, error.message);
      return false;
    }
  }

  async fixKnownProblems() {
    console.log('🔧 Fixing known problematic icons...\n');
    
    const fixes = [
      {
        id: 22325,
        name: 'Scythe of vitur',
        urls: [
          'https://oldschool.runescape.wiki/images/Scythe_of_vitur_(uncharged).png',
          'https://oldschool.runescape.wiki/images/Scythe_of_vitur.png',
          'https://oldschool.runescape.wiki/images/Scythe_of_vitur_(uncharged)_detail.png'
        ]
      },
      {
        id: 11920,
        name: 'Dragon pickaxe',
        urls: [
          'https://oldschool.runescape.wiki/images/Dragon_pickaxe.png',
          'https://oldschool.runescape.wiki/images/Dragon_pickaxe_detail.png'
        ]
      }
    ];
    
    for (const fix of fixes) {
      console.log(`\n🎯 Fixing ${fix.name} (ID: ${fix.id})`);
      
      let success = false;
      for (const url of fix.urls) {
        if (await this.fixSpecificIcon(fix.id, fix.name, url)) {
          success = true;
          break;
        }
      }
      
      if (!success) {
        console.log(`❌ Could not fix ${fix.name} with any of the provided URLs`);
      }
    }
  }

  async close() {
    databaseService.close();
  }
}

async function main() {
  const fixer = new IconFixer();
  await fixer.init();
  await fixer.fixKnownProblems();
  await fixer.close();
}

main().catch(console.error);
