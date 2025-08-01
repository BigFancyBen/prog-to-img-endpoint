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

  const outputDir = 'test-output/progress-images';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let successCount = 0;
  for (const testCase of progressTestCases) {
    try {
      
      const result = await generateProgressImage(testCase.data);
      
      if (result.statusCode === 200) {
        // Extract base64 image data
        const base64Data = JSON.parse(result.body);
        const base64Image = base64Data.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Image, 'base64');
        
        // Save image
        const outputPath = path.join(outputDir, `${testCase.name}.png`);
        fs.writeFileSync(outputPath, imageBuffer);

        successCount++;
      } else {
        
      }
    } catch (error) {
      
    }
  }

  return successCount;
}

async function testCollectionLogGeneration() {

  const outputDir = 'test-output/collection-logs';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let successCount = 0;
  for (const testCase of collectionLogTestCases) {
    try {
      
      const result = await generateCollectionLogImage(testCase.data);
      
      if (result.statusCode === 200) {
        // Extract base64 image data
        const base64Data = JSON.parse(result.body);
        const base64Image = base64Data.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Image, 'base64');
        
        // Save image
        const outputPath = path.join(outputDir, `${testCase.name}.png`);
        fs.writeFileSync(outputPath, imageBuffer);

        successCount++;
      } else {
        
      }
    } catch (error) {
      
    }
  }

  return successCount;
}

async function runAllTests() {

  const progressCount = await testProgressImageGeneration();
  const collectionCount = await testCollectionLogGeneration();

  if (progressCount + collectionCount === progressTestCases.length + collectionLogTestCases.length) {
    
    process.exit(0);
  } else {
    
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
}); 