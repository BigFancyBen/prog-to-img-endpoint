import databaseService from '../services/databaseService.js';
import EnhancedIconService from '../services/enhancedIconService.js';

/**
 * Compare the effectiveness of basic vs enhanced icon patterns
 */
async function compareIconMethods() {
  await databaseService.init();
  
  console.log('🔍 Comparing basic vs enhanced icon detection methods...\n');
  
  // Get some items that were previously problematic
  const testItems = [
    { id: '11920', name: 'Dragon pickaxe' },
    { id: '22325', name: 'Scythe of vitur' },
    { id: '22664', name: 'Scythe of vitur' },
    { id: '1673', name: 'Silver necklace' },
    { id: '1679', name: 'Gold necklace' },
    { id: '1357', name: 'Grinder' },
    { id: '334', name: 'Trout' },
    { id: '12020', name: 'Pet kitten' }
  ];
  
  const enhancedService = new EnhancedIconService();
  await enhancedService.init();
  
  for (const item of testItems) {
    console.log(`\n📋 Testing: ${item.name} (ID: ${item.id})`);
    
    // Basic patterns (original approach)
    const basicPatterns = [
      `https://oldschool.runescape.wiki/images/${item.name.replace(/ /g, '_')}.png`,
      `https://oldschool.runescape.wiki/images/${item.name.replace(/ /g, '_')}_detail.png`,
      `https://oldschool.runescape.wiki/images/${encodeURIComponent(item.name.replace(/ /g, '_'))}.png`,
      `https://oldschool.runescape.wiki/images/${item.id}.png`
    ];
    
    console.log(`  📊 Basic patterns (${basicPatterns.length}):`);
    let basicSuccess = false;
    for (const url of basicPatterns) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          console.log(`    ✅ ${url}`);
          basicSuccess = true;
          break;
        }
      } catch (error) {
        // Silent fail for comparison
      }
    }
    if (!basicSuccess) {
      console.log(`    ❌ No basic patterns worked`);
    }
    
    // Enhanced patterns
    console.log(`  🚀 Enhanced method:`);
    const wikiNames = await enhancedService.getWikiImageNames(item.name);
    const alternateNames = enhancedService.getAlternateNames(item.name);
    
    console.log(`    🔍 Wiki parsed names: ${wikiNames.length}`);
    if (wikiNames.length > 0) {
      console.log(`      ${wikiNames.slice(0, 3).join(', ')}${wikiNames.length > 3 ? '...' : ''}`);
    }
    
    console.log(`    🔄 Alternate names: ${alternateNames.length}`);
    if (alternateNames.length > 0) {
      console.log(`      ${alternateNames.slice(0, 3).join(', ')}${alternateNames.length > 3 ? '...' : ''}`);
    }
    
    // Check if we already have this icon
    const existingIcon = databaseService.getIconData(item.id);
    if (existingIcon && existingIcon.length > 0) {
      console.log(`    ✅ Icon already in database (${existingIcon.length} bytes)`);
    } else {
      console.log(`    ❌ No icon in database`);
    }
  }
  
  // Overall database stats
  console.log(`\n📈 Current Database Status:`);
  const coverage = databaseService.getIconCoverageStats();
  console.log(`   Total items: ${coverage.total}`);
  console.log(`   With icons: ${coverage.withIcons}`);
  console.log(`   Missing: ${coverage.missing}`);
  console.log(`   Coverage: ${coverage.percentage}%`);
}

// Run the comparison
compareIconMethods().catch(console.error);
