import databaseService from './services/databaseService.js';

async function checkScythe() {
  try {
    console.log('🔍 Checking for Scythe of vitur...');
    await databaseService.init();
    
    const scytheItems = databaseService.db.prepare(`
      SELECT id, name, LENGTH(icon_data) as icon_size 
      FROM items 
      WHERE name LIKE '%scythe%' OR name LIKE '%vitur%'
      ORDER BY name
    `).all();
    
    console.log(`📋 Found ${scytheItems.length} Scythe-related items:`);
    scytheItems.forEach(item => {
      console.log(`  ${item.id}: ${item.name} (icon: ${item.icon_size} bytes)`);
    });
    
    // Also search case-insensitive
    const allScythes = databaseService.db.prepare(`
      SELECT id, name, LENGTH(icon_data) as icon_size 
      FROM items 
      WHERE LOWER(name) LIKE '%scythe%' OR LOWER(name) LIKE '%vitur%'
      ORDER BY name
    `).all();
    
    if (allScythes.length !== scytheItems.length) {
      console.log(`\n📋 Case-insensitive search found ${allScythes.length} items:`);
      allScythes.forEach(item => {
        console.log(`  ${item.id}: ${item.name} (icon: ${item.icon_size} bytes)`);
      });
    }
    
    databaseService.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkScythe();
