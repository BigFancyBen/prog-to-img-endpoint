/**
 * Test collection log image generation and save the result
 */

import fs from 'fs';

async function testCollectionLogImage() {
  try {
    console.log('Testing collection log image generation...');
    
    const response = await fetch('http://localhost:3001/api/collection-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        itemName: 'Toolkit',
        userName: 'TestUser'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Collection log API successful');
      
      // Extract base64 data (remove data:image/png;base64, prefix)
      const base64Data = result.body.replace(/^"data:image\/png;base64,/, '').replace(/"$/, '');
      
      // Convert to buffer and save as PNG
      const imageBuffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync('test-collection-log-output.png', imageBuffer);
      
      console.log('✅ Image saved as test-collection-log-output.png');
      console.log(`📊 Image size: ${imageBuffer.length} bytes`);
      
    } else {
      console.error('❌ Collection log API failed:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCollectionLogImage();
