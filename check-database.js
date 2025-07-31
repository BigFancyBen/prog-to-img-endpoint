import databaseService from './services/databaseService.js';

async function checkDatabase() {
  try {
    console.log('🔍 Initializing database...');
    await databaseService.init();
    
    console.log('📊 Checking database status...');
    
    const totalResult = databaseService.db.prepare('SELECT COUNT(*) as count FROM items').get();
    console.log('📊 Total items:', totalResult.count);

    const withIconsResult = databaseService.db.prepare('SELECT COUNT(*) as count FROM items WHERE icon_data IS NOT NULL').get();
    console.log('✅ Items with icons:', withIconsResult.count);

    const withoutIconsResult = databaseService.db.prepare('SELECT COUNT(*) as count FROM items WHERE icon_data IS NULL').get();
    console.log('❌ Items without icons:', withoutIconsResult.count);

    if (totalResult.count > 0) {
      const percentage = ((withIconsResult.count / totalResult.count) * 100).toFixed(1);
      console.log('📈 Icon coverage:', percentage + '%');
    }

    if (withoutIconsResult.count === 0) {
      console.log('🎉 PERFECT! All items have icons!');
    } else {
      console.log('\n📋 Items still missing icons:');
      const missing = databaseService.db.prepare('SELECT id, name FROM items WHERE icon_data IS NULL LIMIT 10').all();
      missing.forEach(item => {
        console.log('❌', item.id + ':', item.name);
      });
      
      if (withoutIconsResult.count > 10) {
        console.log(`... and ${withoutIconsResult.count - 10} more`);
      }
    }

    databaseService.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
