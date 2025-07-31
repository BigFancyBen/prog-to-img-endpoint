import databaseService from './services/databaseService.js';

async function analyzeItemGaps() {
  try {
    await databaseService.init();
    
    // Check how Silver necklace got into the database originally
    const item = databaseService.db.prepare('SELECT id, name, icon_data FROM items WHERE id = 1796').get();
    console.log('Current Silver necklace in DB:', {
      id: item?.id,
      name: item?.name,
      hasIcon: !!item?.icon_data,
      iconSize: item?.icon_data ? item.icon_data.length : 0
    });
    
    // Check items around 1796 to see the pattern
    console.log('\n📊 Items around ID 1796:');
    const nearbyItems = databaseService.db.prepare('SELECT id, name, icon_data FROM items WHERE id BETWEEN 1790 AND 1800 ORDER BY id').all();
    
    nearbyItems.forEach(item => {
      console.log(`  ID ${item.id}: ${item.name} - Icon: ${item.icon_data ? `${item.icon_data.length} bytes` : 'MISSING'}`);
    });
    
    // Check total items with missing icons
    const missingIcons = databaseService.db.prepare('SELECT COUNT(*) as count FROM items WHERE icon_data IS NULL').get();
    console.log(`\n🔍 Total items with missing icons: ${missingIcons.count}`);
    
    // Get a sample of items with missing icons
    const sampleMissing = databaseService.db.prepare('SELECT id, name FROM items WHERE icon_data IS NULL ORDER BY id LIMIT 10').all();
    console.log('\n📋 Sample items with missing icons:');
    sampleMissing.forEach(item => {
      console.log(`  ID ${item.id}: ${item.name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

analyzeItemGaps();
