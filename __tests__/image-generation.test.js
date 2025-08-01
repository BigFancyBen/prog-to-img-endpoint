const { generateProgressImage, generateCollectionLogImage } = require('../services/imageGenerationService.js');
const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

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
  },
  {
    name: 'mining-progress',
    data: {
      script_name: "Mining Session",
      runtime: 45,
      xp_earned: [
        { skill: "mining", xp: "8,500" }
      ],
      loot: [
        { id: 436, name: "Copper ore", count: 200 },
        { id: 438, name: "Tin ore", count: 200 }
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
  },
  {
    name: 'quest-collection',
    data: {
      itemName: "Quest cape",
      userName: "QuestMaster"
    }
  }
];

describe('Progress Image Generation', () => {
  progressTestCases.forEach(testCase => {
    test(`should generate progress image for ${testCase.name}`, async () => {
      const result = await generateProgressImage(testCase.data);
      
      expect(result).toBeDefined();
      expect(result.statusCode).toBe(200);
      expect(result.body).toBeDefined();
      
      // Extract base64 image data
      const base64Data = JSON.parse(result.body);
      expect(base64Data).toMatch(/^data:image\/png;base64,/);
      
      // Convert base64 to buffer
      const base64Image = base64Data.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Image, 'base64');
      
      // Save generated image
      const generatedPath = TEST_UTILS.getGeneratedImagePath(testCase.name);
      TEST_UTILS.saveImage(imageBuffer, generatedPath);
      
      // Compare with reference image if it exists
      const referencePath = TEST_UTILS.getReferenceImagePath(testCase.name);
      const referenceImage = TEST_UTILS.loadImage(referencePath);
      
      if (referenceImage) {
        // Load images for comparison
        const img1 = PNG.sync.read(imageBuffer);
        const img2 = PNG.sync.read(referenceImage);
        
        // Create diff image
        const { width, height } = img1;
        const diff = new PNG({ width, height });
        
        // Compare images
        const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {
          threshold: 0.1,
          includeAA: true
        });
        
        // Save diff image
        const diffPath = TEST_UTILS.getDiffImagePath(testCase.name);
        fs.writeFileSync(diffPath, PNG.sync.write(diff));
        
        // Allow some tolerance for minor differences
        const tolerance = width * height * 0.01; // 1% of pixels
        expect(numDiffPixels).toBeLessThan(tolerance);
      } else {
        // If no reference image exists, save the generated one as reference
        TEST_UTILS.saveImage(imageBuffer, referencePath);
        console.log(`Created reference image for ${testCase.name}`);
      }
    });
  });
});

describe('Collection Log Image Generation', () => {
  collectionLogTestCases.forEach(testCase => {
    test(`should generate collection log for ${testCase.name}`, async () => {
      const result = await generateCollectionLogImage(testCase.data);
      
      expect(result).toBeDefined();
      expect(result.statusCode).toBe(200);
      expect(result.body).toBeDefined();
      
      // Extract base64 image data
      const base64Data = JSON.parse(result.body);
      expect(base64Data).toMatch(/^data:image\/png;base64,/);
      
      // Convert base64 to buffer
      const base64Image = base64Data.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Image, 'base64');
      
      // Save generated image
      const generatedPath = TEST_UTILS.getGeneratedImagePath(`collection-${testCase.name}`);
      TEST_UTILS.saveImage(imageBuffer, generatedPath);
      
      // Compare with reference image if it exists
      const referencePath = TEST_UTILS.getReferenceImagePath(`collection-${testCase.name}`);
      const referenceImage = TEST_UTILS.loadImage(referencePath);
      
      if (referenceImage) {
        // Load images for comparison
        const img1 = PNG.sync.read(imageBuffer);
        const img2 = PNG.sync.read(referenceImage);
        
        // Create diff image
        const { width, height } = img1;
        const diff = new PNG({ width, height });
        
        // Compare images
        const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {
          threshold: 0.1,
          includeAA: true
        });
        
        // Save diff image
        const diffPath = TEST_UTILS.getDiffImagePath(`collection-${testCase.name}`);
        fs.writeFileSync(diffPath, PNG.sync.write(diff));
        
        // Allow some tolerance for minor differences
        const tolerance = width * height * 0.01; // 1% of pixels
        expect(numDiffPixels).toBeLessThan(tolerance);
      } else {
        // If no reference image exists, save the generated one as reference
        TEST_UTILS.saveImage(imageBuffer, referencePath);
        console.log(`Created reference image for collection-${testCase.name}`);
      }
    });
  });
});

describe('API Endpoint Tests', () => {
  test('should handle progress image API endpoint', async () => {
    // This would test the actual API endpoint
    // For now, we'll test the service directly
    const testData = {
      script_name: "API Test",
      runtime: 30,
      xp_earned: [{ skill: "agility", xp: "10,000" }]
    };
    
    const result = await generateProgressImage(testData);
    expect(result.statusCode).toBe(200);
  });
  
  test('should handle collection log API endpoint', async () => {
    const testData = {
      itemName: "Test Item",
      userName: "TestUser"
    };
    
    const result = await generateCollectionLogImage(testData);
    expect(result.statusCode).toBe(200);
  });
}); 