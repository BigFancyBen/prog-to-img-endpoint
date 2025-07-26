/**
 * Test SVG generation for collection log to debug background issue
 */

import { generateCollectionLogSVG } from './services/svgGenerationService.js';
import fs from 'fs';

async function testCollectionLogSVG() {
  try {
    console.log('Testing collection log SVG generation...');
    
    const testData = {
      itemName: 'Toolkit',
      userName: 'TestUser'
    };
    
    const svgString = await generateCollectionLogSVG(testData);
    
    // Save the SVG to examine it
    fs.writeFileSync('test-collection-log-output.svg', svgString);
    
    console.log('✅ SVG saved as test-collection-log-output.svg');
    console.log(`📊 SVG length: ${svgString.length} characters`);
    
    // Check if background image reference is in the SVG
    const hasBackgroundImage = svgString.includes('<image href="data:image/png;base64,');
    console.log(`🖼️  Has background image reference: ${hasBackgroundImage}`);
    
    if (hasBackgroundImage) {
      // Extract a portion of the image reference to verify it's not empty
      const bgMatch = svgString.match(/<image href="(data:image\/png;base64,[^"]{50})/);
      if (bgMatch) {
        console.log(`🔍 Background image starts with: ${bgMatch[1]}...`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCollectionLogSVG();
