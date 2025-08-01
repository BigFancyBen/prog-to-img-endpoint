import { generateProgressImage, generateCollectionLogImage } from '../services/imageGenerationService.js';
import fs from 'fs';
import path from 'path';

// Test cases for documentation pages
const progressExamples = [
  {
    name: 'agility-example',
    data: {
      script_name: "Seers Agility",
      runtime: 60,
      xp_earned: [
        { skill: "agility", xp: "126,585" }
      ]
    }
  },
  {
    name: 'multi-skill-example',
    data: {
      script_name: "Multi-Skill Training",
      runtime: 120,
      xp_earned: [
        { skill: "agility", xp: "126,585" },
        { skill: "strength", xp: "4200" }
      ],
      loot: [
        { id: 249, name: "Guam leaf", count: 43 }
      ]
    }
  },
  {
    name: 'combat-example',
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
    name: 'mining-example',
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
  },
  {
    name: 'fishing-example',
    data: {
      script_name: "Fishing Trip",
      runtime: 75,
      xp_earned: [
        { skill: "fishing", xp: "12,000" }
      ],
      loot: [
        { id: 317, name: "Raw trout", count: 85 },
        { id: 321, name: "Raw salmon", count: 45 }
      ]
    }
  },
  {
    name: 'herblore-example',
    data: {
      script_name: "Herblore Training",
      runtime: 30,
      xp_earned: [
        { skill: "herblore", xp: "15,000" }
      ],
      loot: [
        { id: 121, name: "Attack potion(3)", count: 25 },
        { id: 133, name: "Strength potion(3)", count: 20 }
      ]
    }
  }
];

const collectionLogExamples = [
  {
    name: 'jar-example',
    data: {
      itemName: "Jar of dirt",
      userName: "TestPlayer"
    }
  },
  {
    name: 'dragon-example',
    data: {
      itemName: "Dragon scimitar",
      userName: "DragonSlayer"
    }
  },
  {
    name: 'abyssal-example',
    data: {
      itemName: "Abyssal whip",
      userName: "AbyssHunter"
    }
  },
  {
    name: 'quest-example',
    data: {
      itemName: "Cape of legends",
      userName: "QuestMaster"
    }
  },
  {
    name: 'pet-example',
    data: {
      itemName: "Huberte",
      userName: "PetCollector"
    }
  },
  {
    name: 'boss-example',
    data: {
      itemName: "Dragon claws",
      userName: "BossHunter"
    }
  }
];

async function generateAndSaveImage(generator, data, filename, outputDir) {
  try {
    
    const result = await generator(data);
    
    if (result.statusCode === 200) {
      // Extract base64 image data
      const base64Data = JSON.parse(result.body);
      const base64Image = base64Data.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Buffer.from(base64Image, 'base64');
      
      // Save image
      const outputPath = path.join(outputDir, filename);
      fs.writeFileSync(outputPath, imageBuffer);
      
      return true;
    } else {
      console.error(`❌ Failed to generate ${filename}: ${result.statusCode}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error generating ${filename}:`, error.message);
    return false;
  }
}

async function updateProgressImageDocs() {

  const outputDir = 'public/docs/images';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let successCount = 0;
  for (const example of progressExamples) {
    const success = await generateAndSaveImage(
      generateProgressImage,
      example.data,
      `${example.name}.png`,
      outputDir
    );
    if (success) successCount++;
  }

  return successCount;
}

async function updateCollectionLogDocs() {

  const outputDir = 'public/docs/images';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let successCount = 0;
  for (const example of collectionLogExamples) {
    const success = await generateAndSaveImage(
      generateCollectionLogImage,
      example.data,
      `collection-${example.name}.png`,
      outputDir
    );
    if (success) successCount++;
  }

  return successCount;
}

async function updateAllDocImages() {

  const progressCount = await updateProgressImageDocs();
  const collectionCount = await updateCollectionLogDocs();

  if (progressCount + collectionCount === progressExamples.length + collectionLogExamples.length) {
    
  } else {
    
    process.exit(1);
  }
}

// Run the update
updateAllDocImages().catch(error => {
  console.error('❌ Error updating documentation images:', error);
  process.exit(1);
}); 