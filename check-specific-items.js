import databaseService from './services/databaseService.js';

async function checkSpecificItems() {
  try {
    console.log('🔍 Checking specific problematic items...');
    await databaseService.init();
    
    const problemItems = [
      'Scythe of vitur',
      'Dragon pickaxe'
    ];
    
    for (const itemName of problemItems) {
      console.log(`\n📋 Checking: ${itemName}`);
      
      // Search for exact and partial matches
      const exactMatch = databaseService.db.prepare(`
        SELECT id, name, LENGTH(icon_data) as icon_size 
        FROM items 
        WHERE name = ?
      `).get(itemName);
      
      const partialMatches = databaseService.db.prepare(`
        SELECT id, name, LENGTH(icon_data) as icon_size 
        FROM items 
        WHERE LOWER(name) LIKE LOWER(?)
        ORDER BY name
      `).all(`%${itemName}%`);
      
      if (exactMatch) {
        console.log(`  ✅ Exact match: ${exactMatch.id} - ${exactMatch.name} (${exactMatch.icon_size} bytes)`);
      } else {
        console.log(`  ❌ No exact match found`);
      }
      
      if (partialMatches.length > 0) {
        console.log(`  📋 Partial matches (${partialMatches.length}):`);
        partialMatches.forEach(item => {
          const status = item.icon_size > 0 ? '✅' : '❌';
          console.log(`    ${status} ${item.id}: ${item.name} (${item.icon_size} bytes)`);
        });
      } else {
        console.log(`  ❌ No partial matches found`);
      }
    }
    
    // Check for any items with 0-byte icons (corrupted)
    console.log('\n🔍 Checking for corrupted icons (0 bytes)...');
    const corruptedIcons = databaseService.db.prepare(`
      SELECT id, name, LENGTH(icon_data) as icon_size 
      FROM items 
      WHERE icon_data IS NOT NULL AND LENGTH(icon_data) = 0
      LIMIT 10
    `).all();
    
    if (corruptedIcons.length > 0) {
      console.log(`❌ Found ${corruptedIcons.length} items with corrupted icons:`);
      corruptedIcons.forEach(item => {
        console.log(`  ${item.id}: ${item.name}`);
      });
    } else {
      console.log('✅ No corrupted icons found');
    }
    
    databaseService.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSpecificItems();
