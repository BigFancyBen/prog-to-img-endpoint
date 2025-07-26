import FileService from './services/fileService.js';

async function testCollectionLogBg() {
  try {
    console.log('Testing collection log background...');
    const bg = await FileService.getCollectionLogBackground();
    console.log('✅ Background retrieved successfully');
    console.log('Length:', bg.length);
    console.log('Starts with data URL:', bg.startsWith('data:image/'));
    console.log('Format:', bg.substring(0, 30) + '...');
  } catch (error) {
    console.error('❌ Error getting collection log background:', error);
  }
}

testCollectionLogBg();
