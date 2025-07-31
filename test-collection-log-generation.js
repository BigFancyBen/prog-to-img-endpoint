import { generateCollectionLogSVG } from './services/svgGenerationService.js';

async function testCollectionLogGeneration() {
  try {
    console.log('🎨 Testing exact collection log generation process...');
    
    const testData = {
      itemName: "Silver necklace",
      userName: "TestPlayer"
    };
    
    console.log('Input data:', testData);
    
    const result = await generateCollectionLogSVG(testData);
    
    console.log('✅ Collection log SVG generated successfully!');
    console.log('SVG length:', result.length, 'characters');
    
    // Check if it contains the expected elements
    if (result.includes('TestPlayer')) {
      console.log('✅ Contains username');
    }
    
    if (result.includes('Silver necklace')) {
      console.log('✅ Contains item name');
    }
    
    if (result.includes('data:image/png;base64,')) {
      console.log('✅ Contains base64 image data');
    }
    
  } catch (error) {
    console.error('❌ Collection log generation failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  process.exit(0);
}

testCollectionLogGeneration();
