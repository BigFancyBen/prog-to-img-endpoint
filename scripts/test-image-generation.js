import { generateProgressImage, generateCollectionLogImage } from '../services/imageGenerationService.js';
import fs from 'fs';
import path from 'path';

// Test data for progress images
const progressTestCases = [
  {
    name: 'agility-progress',
    data: {
      script_name: "Seers Agility",
      runtime: 60,
      xp_earned: [
        { skill: "agility", xp: "126,585" }
      ]
    }
  },
  {
    name: 'multi-skill-progress',
    data: {
      script_name: "Multi-Skill Training",
      runtime: 120,
      xp_earned: [
        { skill: "agility", xp: "126,585" },
        { skill: "strength", xp: "4200" },
        { skill: "cooking", xp: "15,000" }
      ],
      loot: [
        { id: 249, name: "Guam leaf", count: 43 },
        { id: 251, name: "Tarromin", count: 12 }
      ]
    }
  },
  {
    name: 'combat-progress',
    data: {
      script_name: "Combat Training",
      runtime: 90,
      xp_earned: [
        { skill: "attack", xp: "25,000" },
        { skill: "strength", xp: "25,000" },
        { skill: "defence", xp: "25,000" }
      ],
      loot: [
        { id: 526, name: "Bones", count: 150 },
        { id: 532, name: "Big bones", count: 75 }
      ]
    }
  }
];

// Test data for collection logs
const collectionLogTestCases = [
  {
    name: 'jar-collection',
    data: {
      itemName: "Jar of dirt",
      userName: "TestPlayer"
    }
  },
  {
    name: 'dragon-collection',
    data: {
      itemName: "Dragon scimitar",
      userName: "DragonSlayer"
    }
  },
  {
    name: 'rare-collection',
    data: {
      itemName: "Abyssal whip",
      userName: "AbyssHunter"
    }
  }
];

async function testProgressImageGeneration() {
  console.log('\n🧪 Testing Progress Image Generation...');
  
  const outputDir = 'test-output/progress-images';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let successCount = 0;
  for (const testCase of progressTestCases) {
    try {
      console.log(`Testing ${testCase.name}...`);
      const result = await generateProgressImage(testCase.data);
      
      if (result.statusCode === 200) {
        // Extract base64 image data
        const base64Data = JSON.parse(result.body);
        const base64Image = base64Data.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Image, 'base64');
        
        // Save image
        const outputPath = path.join(outputDir, `${testCase.name}.png`);
        fs.writeFileSync(outputPath, imageBuffer);
        
        console.log(`✅ ${testCase.name} - Generated successfully`);
        successCount++;
      } else {
        console.log(`❌ ${testCase.name} - Failed with status ${result.statusCode}`);
      }
    } catch (error) {
      console.log(`❌ ${testCase.name} - Error: ${error.message}`);
    }
  }
  
  console.log(`Progress Images: ${successCount}/${progressTestCases.length} successful`);
  return successCount;
}

async function testCollectionLogGeneration() {
  console.log('\n🧪 Testing Collection Log Generation...');
  
  const outputDir = 'test-output/collection-logs';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let successCount = 0;
  for (const testCase of collectionLogTestCases) {
    try {
      console.log(`Testing ${testCase.name}...`);
      const result = await generateCollectionLogImage(testCase.data);
      
      if (result.statusCode === 200) {
        // Extract base64 image data
        const base64Data = JSON.parse(result.body);
        const base64Image = base64Data.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Image, 'base64');
        
        // Save image
        const outputPath = path.join(outputDir, `${testCase.name}.png`);
        fs.writeFileSync(outputPath, imageBuffer);
        
        console.log(`✅ ${testCase.name} - Generated successfully`);
        successCount++;
      } else {
        console.log(`❌ ${testCase.name} - Failed with status ${result.statusCode}`);
      }
    } catch (error) {
      console.log(`❌ ${testCase.name} - Error: ${error.message}`);
    }
  }
  
  console.log(`Collection Logs: ${successCount}/${collectionLogTestCases.length} successful`);
  return successCount;
}

async function runAllTests() {
  console.log('🚀 Starting Image Generation Test Suite...');
  
  const progressCount = await testProgressImageGeneration();
  const collectionCount = await testCollectionLogGeneration();
  
  console.log('\n📊 Test Summary:');
  console.log(`Progress Images: ${progressCount}/${progressTestCases.length}`);
  console.log(`Collection Log Images: ${collectionCount}/${collectionLogTestCases.length}`);
  console.log(`Total: ${progressCount + collectionCount}/${progressTestCases.length + collectionLogTestCases.length}`);
  
  if (progressCount + collectionCount === progressTestCases.length + collectionLogTestCases.length) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Check the logs above.');
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
}); 