import databaseService from './services/databaseService.js';
import FileService from './services/fileService.js';

async function debugSilverNecklaceTest() {
  try {
    await databaseService.init();
    
    console.log('🔍 Testing Silver necklace item lookup...');
    
    // Test the exact same process the collection log uses
    console.log('\n1️⃣ Testing FileService.searchItemByName("Silver necklace"):');
    try {
      const itemData = await FileService.searchItemByName('Silver necklace');
      console.log('Found item:', {
        id: itemData.id,
        name: itemData.name
      });
      
      console.log('\n2️⃣ Testing FileService.getItemIconUrl for found item:');
      const iconUrl = await FileService.getItemIconUrl(itemData.id);
      console.log('Icon URL:', iconUrl);
      
    } catch (error) {
      console.error('❌ Error in item lookup:', error.message);
    }
    
    // Check all Silver necklace variants in database
    console.log('\n3️⃣ All Silver necklace entries in database:');
    const allSilverNecklaces = databaseService.db.prepare('SELECT id, name, icon_data FROM items WHERE name LIKE ?').all('%Silver necklace%');
    
    allSilverNecklaces.forEach(item => {
      console.log(`  ID ${item.id}: "${item.name}" - Icon: ${item.icon_data ? `${item.icon_data.length} bytes` : 'MISSING'}`);
    });
    
    // Test IconService directly for both IDs
    console.log('\n4️⃣ Testing IconService for both Silver necklace IDs:');
    const IconService = (await import('./services/iconService.js')).default;
    
    for (const id of [1796, 1797]) {
      try {
        const iconUrl = await IconService.getItemIcon(id);
        console.log(`  ID ${id}: ${iconUrl ? 'Icon available' : 'No icon'}`);
      } catch (error) {
        console.log(`  ID ${id}: Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

debugSilverNecklaceTest();
