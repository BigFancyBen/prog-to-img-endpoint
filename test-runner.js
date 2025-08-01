#!/usr/bin/env node

/**
 * Simple Test Runner for OSRS Image Generation API
 * 
 * Usage:
 *   node test-runner.js                    # Run all tests
 *   node test-runner.js --progress         # Run only progress image tests
 *   node test-runner.js --collection       # Run only collection log tests
 *   node test-runner.js --update           # Update reference images
 */

import { generateProgressImage, generateCollectionLogImage } from './services/imageGenerationService.js';
import fs from 'fs';
import path from 'path';

// Test data
const progressTests = [
  {
    name: 'agility-progress',
    data: {
      script_name: "Seers Agility",
      runtime: 60,
      xp_earned: [{ skill: "agility", xp: "126,585" }]
    }
  },
  {
    name: 'multi-skill-progress',
    data: {
      script_name: "Multi-Skill Training",
      runtime: 120,
      xp_earned: [
        { skill: "agility", xp: "126,585" },
        { skill: "strength", xp: "4200" }
      ],
      loot: [{ id: 249, name: "Guam leaf", count: 43 }]
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

const collectionTests = [
  {
    name: 'jar-collection',
    data: { itemName: "Jar of dirt", userName: "TestPlayer" }
  },
  {
    name: 'dragon-collection',
    data: { itemName: "Dragon scimitar", userName: "DragonSlayer" }
  },
  {
    name: 'abyssal-collection',
    data: { itemName: "Abyssal whip", userName: "AbyssHunter" }
  }
];

async function testProgressImages() {
  console.log('\n🧪 Testing Progress Image Generation...');
  
  const outputDir = 'test-output/progress-images';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let successCount = 0;
  for (const test of progressTests) {
    try {
      console.log(`  Testing ${test.name}...`);
      const result = await generateProgressImage(test.data);
      
      if (result.statusCode === 200) {
        const base64Data = JSON.parse(result.body);
        const base64Image = base64Data.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Image, 'base64');
        
        const outputPath = path.join(outputDir, `${test.name}.png`);
        fs.writeFileSync(outputPath, imageBuffer);
        
        console.log(`    ✅ Generated successfully`);
        successCount++;
      } else {
        console.log(`    ❌ Failed with status ${result.statusCode}`);
      }
    } catch (error) {
      console.log(`    ❌ Error: ${error.message}`);
    }
  }
  
  console.log(`  Progress Images: ${successCount}/${progressTests.length} successful`);
  return successCount;
}

async function testCollectionLogs() {
  console.log('\n🧪 Testing Collection Log Generation...');
  
  const outputDir = 'test-output/collection-logs';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let successCount = 0;
  for (const test of collectionTests) {
    try {
      console.log(`  Testing ${test.name}...`);
      const result = await generateCollectionLogImage(test.data);
      
      if (result.statusCode === 200) {
        const base64Data = JSON.parse(result.body);
        const base64Image = base64Data.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Image, 'base64');
        
        const outputPath = path.join(outputDir, `${test.name}.png`);
        fs.writeFileSync(outputPath, imageBuffer);
        
        console.log(`    ✅ Generated successfully`);
        successCount++;
      } else {
        console.log(`    ❌ Failed with status ${result.statusCode}`);
      }
    } catch (error) {
      console.log(`    ❌ Error: ${error.message}`);
    }
  }
  
  console.log(`  Collection Logs: ${successCount}/${collectionTests.length} successful`);
  return successCount;
}

async function updateReferenceImages() {
  console.log('\n🔄 Updating Reference Images...');
  
  // Run the update script
  const { execSync } = await import('child_process');
  try {
    execSync('node scripts/update-doc-images.js', { stdio: 'inherit' });
    console.log('  ✅ Reference images updated successfully');
  } catch (error) {
    console.log('  ❌ Failed to update reference images');
    console.error(error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isUpdate = args.includes('--update');
  const isProgressOnly = args.includes('--progress');
  const isCollectionOnly = args.includes('--collection');
  
  console.log('🚀 OSRS Image Generation Test Runner');
  console.log('=====================================');
  
  if (isUpdate) {
    await updateReferenceImages();
    return;
  }
  
  let progressCount = 0;
  let collectionCount = 0;
  
  if (!isCollectionOnly) {
    progressCount = await testProgressImages();
  }
  
  if (!isProgressOnly) {
    collectionCount = await testCollectionLogs();
  }
  
  console.log('\n📊 Test Summary:');
  console.log(`Progress Images: ${progressCount}/${progressTests.length}`);
  console.log(`Collection Log Images: ${collectionCount}/${collectionTests.length}`);
  console.log(`Total: ${progressCount + collectionCount}/${progressTests.length + collectionTests.length}`);
  
  if (progressCount + collectionCount === progressTests.length + collectionTests.length) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Check the logs above.');
    process.exit(1);
  }
}

// Run the test runner
main().catch(error => {
  console.error('\n❌ Test runner failed:', error);
  process.exit(1);
}); 