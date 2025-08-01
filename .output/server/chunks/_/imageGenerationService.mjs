import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import sharp from 'sharp';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { O as OSRSDataService, I as IconService, d as databaseService } from './osrsDataService.mjs';

const __filename$2 = fileURLToPath(globalThis._importMeta_.url);
const __dirname = dirname(__filename$2);
const CANVAS_CONFIG = {
  WIDTH: 330,
  TITLE_HEIGHT: 80};
({
  FONT_DIR: join(__dirname, "../font"),
  ICONS_DIR: join(__dirname, "../icons"),
  ITEMS_DIR: join(__dirname, "../icons/items"),
  FONT_FILE: join(__dirname, "../font/runescape.ttf")
});
const COLLECTION_LOG_CONFIG = {
  WIDTH: 396,
  HEIGHT: 221,
  ICON_SIZE: 32,
  ICON_POSITION: { x: 182, y: 123 }
};

function formatRuntime(mins) {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  let runtime = "";
  if (hours > 0) {
    runtime += hours === 1 ? `${hours}hr ` : `${hours}hrs `;
  }
  if (minutes > 0) {
    runtime += minutes === 1 ? `${minutes}min` : `${minutes}mins`;
  }
  return runtime.trim() || "0mins";
}
function formatCount(count) {
  if (count >= 1e6) {
    return `${Math.floor(count * 10 / 1e6) / 10}m`;
  }
  if (count > 1e5) {
    return `${Math.trunc(count / 1e3)}k`;
  }
  if (count > 1e3) {
    return `${Math.trunc(count * 10 / 1e3) / 10}k`;
  }
  return count.toString();
}
function formatXP(xp) {
  const xpInt = typeof xp === "string" ? parseInt(xp.replace(/,/g, "")) : xp;
  if (xpInt >= 1e6) {
    return `${Math.floor(xpInt * 10 / 1e6) / 10}m xp`;
  }
  if (xpInt > 1e3) {
    return `${Math.trunc(xpInt * 10 / 1e3 / 10)}k xp`;
  }
  return `${xpInt} xp`;
}
function getCurrentDate() {
  return (/* @__PURE__ */ new Date()).toLocaleDateString("en-US");
}

const __filename$1 = fileURLToPath(globalThis._importMeta_.url);
dirname(__filename$1);
const cache = /* @__PURE__ */ new Map();
const CACHE_TTL = 60 * 60 * 1e3;
class FileService {
  /**
   * Get item data from database by ID with automatic wiki lookup
   * @param {number} itemId - Item ID
   * @param {boolean} enableWikiLookup - Enable automatic wiki lookup for missing items
   * @returns {Promise<Object>} Item data
   */
  static async getItemData(itemId, enableWikiLookup = true) {
    const cacheKey = `item_${itemId}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
      cache.delete(cacheKey);
    }
    try {
      const itemData = await OSRSDataService.getItemById(itemId, enableWikiLookup);
      if (itemData && !itemData._missing) {
        cache.set(cacheKey, {
          data: itemData,
          timestamp: Date.now()
        });
        return itemData;
      }
      if (!itemData) {
        console.warn(`\u26A0\uFE0F  Item ${itemId} not found in cache or wiki - returning placeholder data`);
        const placeholderData = {
          id: itemId,
          name: `Unknown Item ${itemId}`,
          examine: "Item data not available",
          icon: null,
          _missing: true
        };
        cache.set(cacheKey, {
          data: placeholderData,
          timestamp: Date.now()
        });
        return placeholderData;
      }
      cache.set(cacheKey, {
        data: itemData,
        timestamp: Date.now()
      });
      return itemData;
    } catch (error) {
      console.error(`Error fetching item ${itemId}:`, error);
      throw new Error(`Failed to fetch item data for ID: ${itemId}`);
    }
  }
  /**
   * Get item icon as base64 from database or filesystem
   * @param {number} itemId - Item ID
   * @param {boolean} enableWikiLookup - Enable automatic wiki lookup for missing items
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getItemIconUrl(itemId, enableWikiLookup = true) {
    try {
      const iconDataUrl = await IconService.getItemIcon(itemId);
      if (iconDataUrl) {
        return iconDataUrl;
      }
      const itemData = await this.getItemData(itemId, enableWikiLookup);
      if (itemData._missing) {
        console.warn(`\u26A0\uFE0F  Using placeholder icon for missing item ${itemId}`);
        const placeholderIcon2 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
        return `data:image/png;base64,${placeholderIcon2}`;
      }
      if (itemData.icon && itemData.icon.startsWith("data:")) {
        return itemData.icon;
      }
      const placeholderIcon = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      return `data:image/png;base64,${placeholderIcon}`;
    } catch (error) {
      console.error(`Error getting item icon for ${itemId}:`, error);
      const placeholderIcon = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      return `data:image/png;base64,${placeholderIcon}`;
    }
  }
  /**
   * Search for items by name using database
   * @param {string} itemName - Name of the item to search for
   * @returns {Promise<Object>} First matching item data
   */
  static async searchItemByName(itemName) {
    const cacheKey = `search_${itemName.toLowerCase()}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
      cache.delete(cacheKey);
    }
    try {
      console.log(`\u{1F50D} FileService searching for: "${itemName}"`);
      const searchResult = await OSRSDataService.searchItemsByName(itemName, 1);
      if (searchResult && searchResult.length > 0) {
        const item = searchResult[0];
        console.log(`\u2705 Found item: ${item.name} (ID: ${item.id})`);
        cache.set(cacheKey, {
          data: item,
          timestamp: Date.now()
        });
        return item;
      }
      console.log(`\u{1F50D} Database search failed for "${itemName}", trying exact name lookup...`);
      const exactItem = await OSRSDataService.getItemByName(itemName);
      if (exactItem) {
        console.log(`\u2705 Found item via exact lookup: ${exactItem.name} (ID: ${exactItem.id})`);
        cache.set(cacheKey, {
          data: exactItem,
          timestamp: Date.now()
        });
        return exactItem;
      }
      console.log(`\u{1F50D} Exact lookup failed, trying broader search...`);
      const broaderResults = await OSRSDataService.searchItemsByName(itemName.split(" ")[0], 5);
      if (broaderResults && broaderResults.length > 0) {
        console.log(`\u{1F50D} Broader search found ${broaderResults.length} items:`);
        broaderResults.forEach((item) => {
          console.log(`  - ${item.name} (ID: ${item.id})`);
        });
      }
      throw new Error(`Item not found: ${itemName}`);
    } catch (error) {
      console.error(`Error searching for item ${itemName}:`, error);
      throw new Error(`Failed to find item: ${itemName}`);
    }
  }
  /**
   * Get skill icon as base64 using IconService
   * @param {string} skillName - Name of the skill
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getSkillIcon(skillName) {
    try {
      return await IconService.getSkillIcon(skillName);
    } catch (error) {
      console.error(`Error reading skill icon for ${skillName}:`, error);
      throw new Error(`Failed to read skill icon: ${skillName}`);
    }
  }
  /**
   * Get collection log background using IconService
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getCollectionLogBackground() {
    try {
      return await IconService.getCollectionLogIcon();
    } catch (error) {
      console.error("Error reading collection log background:", error);
      throw new Error("Failed to read collection log background");
    }
  }
  /**
   * Read a local image file and return as buffer (fallback method)
   * @param {string} filePath - Path to the image file
   * @returns {Promise<Buffer>} Image buffer
   */
  static async getLocalImage(filePath) {
    try {
      return await readFile(filePath);
    } catch (error) {
      console.error(`Error reading image file: ${filePath}`, error);
      throw new Error(`Failed to read image: ${filePath}`);
    }
  }
  /**
   * Clear the cache (useful for testing or memory management)
   */
  static clearCache() {
    cache.clear();
  }
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  static getCacheStats() {
    return {
      size: cache.size,
      entries: Array.from(cache.keys())
    };
  }
}
FileService.getItemData;
FileService.getItemIconUrl;
FileService.searchItemByName;
FileService.getSkillIcon;
FileService.getCollectionLogBackground;
FileService.getLocalImage;

const __filename = fileURLToPath(globalThis._importMeta_.url);
dirname(__filename);
async function generateProgressSVG(data) {
  var _a, _b, _c, _d;
  if (!databaseService.db) {
    await databaseService.init();
  }
  const titleHeight = CANVAS_CONFIG.TITLE_HEIGHT;
  let lootHeight = 0;
  if (((_a = data == null ? void 0 : data.loot) == null ? void 0 : _a.length) > 0) {
    const numLootRows = Math.floor(data.loot.length / 7) + (data.loot.length % 7 === 0 ? 0 : 1);
    lootHeight = 45 + 35 * numLootRows;
  }
  let xpHeight = 0;
  if (((_b = data == null ? void 0 : data.xp_earned) == null ? void 0 : _b.length) > 0) {
    const numSkillRows = Math.floor(data.xp_earned.length / 6) + 1;
    xpHeight = 40 + numSkillRows * 50;
  }
  const canvasHeight = titleHeight + lootHeight + xpHeight;
  const canvasWidth = CANVAS_CONFIG.WIDTH;
  let svg = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<defs>
    <filter id="rs-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="black" flood-opacity="1"/>
    </filter>
    <style>
      .runescape-font {
        font-family: 'RuneScape UF', 'Runescape', monospace;
        font-weight: normal;
        font-style: normal;
      }
      .yellow-text { fill: #ffff00; }
      .orange-text { fill: #ff981f; }
      .white-text { fill: #ffffff; }
      .title-text { font-size: 30px; }
      .subtitle-text { font-size: 16px; }
      .section-text { font-size: 20px; }
      .small-text { font-size: 14px; }
      .item-count { font-size: 14px; text-anchor: end; }
      .xp-text { font-size: 16px; text-anchor: middle; }
    </style>
  </defs>`;
  svg += `<text x="15" y="40" class="runescape-font yellow-text title-text" filter="url(#rs-shadow)">${escapeXML(data.script_name)}</text>`;
  const runtime = formatRuntime(data.runtime);
  const curDate = getCurrentDate();
  svg += `<text x="15" y="60" class="runescape-font yellow-text subtitle-text" filter="url(#rs-shadow)">${curDate} - ${runtime}</text>`;
  svg += `<line x1="0" y1="${titleHeight}" x2="${canvasWidth}" y2="${titleHeight}" stroke="black" stroke-width="0.5"/>`;
  if (lootHeight && xpHeight) {
    svg += `<line x1="0" y1="${titleHeight + lootHeight}" x2="${canvasWidth}" y2="${titleHeight + lootHeight}" stroke="black" stroke-width="0.5"/>`;
  }
  let currentY = titleHeight;
  if ((_c = data == null ? void 0 : data.loot) == null ? void 0 : _c.length) {
    svg += `<text x="15" y="${currentY + 25}" class="runescape-font yellow-text section-text" filter="url(#rs-shadow)">Loot:</text>`;
    svg += await generateLootIcons(data.loot, currentY + 35);
    currentY += lootHeight;
  }
  if ((_d = data == null ? void 0 : data.xp_earned) == null ? void 0 : _d.length) {
    svg += `<text x="15" y="${currentY + 25}" class="runescape-font yellow-text section-text" filter="url(#rs-shadow)">XP:</text>`;
    svg += await generateXPIcons(data.xp_earned, currentY);
  }
  svg += "</svg>";
  return svg;
}
async function generateCollectionLogSVG(data) {
  if (!databaseService.db) {
    await databaseService.init();
  }
  const { itemName, userName } = data;
  const { WIDTH, HEIGHT, ICON_SIZE, ICON_POSITION } = COLLECTION_LOG_CONFIG;
  console.log("\u{1F50D} Initializing database for collection log generation...");
  await databaseService.init();
  const stats = databaseService.getStats();
  console.log("\u{1F50D} Database stats:", stats);
  if (stats.items === 0) {
    throw new Error("Database appears to be empty or not properly initialized");
  }
  const bgImageBase64 = await IconService.getCollectionLogIcon();
  if (!bgImageBase64) {
    throw new Error("Collection log background image could not be loaded");
  }
  console.log(`\u{1F50D} Searching for item: "${data.itemName}"`);
  const itemData = await databaseService.searchItemsByNameOnly(data.itemName);
  console.log(`\u{1F50D} Search results: ${itemData ? itemData.length : "null"} items found`);
  if (!itemData || itemData.length === 0) {
    console.log(`\u{1F50D} No exact match found, trying broader search...`);
    const broaderResults = await databaseService.searchItemsByNameOnly("Leather body", 10);
    console.log(`\u{1F50D} Broader search results: ${broaderResults.length} items found`);
    broaderResults.forEach((item2) => {
      console.log(`  - ${item2.name} (ID: ${item2.id})`);
    });
    throw new Error(`Item not found: ${data.itemName}. Database contains ${stats.items} items. Please check the item name spelling or try a different item.`);
  }
  const item = itemData[0];
  const itemIconBase64 = await IconService.getItemIcon(item.id);
  if (!itemIconBase64) {
    throw new Error(`Failed to load icon for item: ${data.itemName} (ID: ${item.id})`);
  }
  const bgImagePng = await convertToPngDataUrl(bgImageBase64);
  await convertToPngDataUrl(itemIconBase64);
  let svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<defs>
    <filter id="rs-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="black" flood-opacity="1"/>
    </filter>
    <style>
      .runescape-font {
        font-family: 'RuneScape UF', 'Runescape', monospace;
        font-weight: normal;
        font-style: normal;
      }
      .orange-text { fill: #ff981f; }
      .white-text { fill: #ffffff; }
      .examine-text { fill: #ffffff; }
      .date-small { fill: #cccccc; }
      .title-text { font-size: 25px; text-anchor: middle; }
      .date-text { font-size: 16px; text-anchor: middle; }
      .item-text { font-size: 22px; text-anchor: middle; }
      .examine-item-text { font-size: 14px; text-anchor: middle; font-family: 'Runescape Chat', 'RuneScape UF', 'Runescape', monospace; font-style: italic; }
      .small-date-text { font-size: 12px; text-anchor: end; }
    </style>
  </defs>`;
  svg += `<image href="${bgImagePng}" x="0" y="0" width="${WIDTH}" height="${HEIGHT}"/>`;
  svg += `<text x="${WIDTH / 2}" y="45" class="runescape-font orange-text title-text" filter="url(#rs-shadow)">${escapeXML(data.userName)}'s Collection Log</text>`;
  const centerYOffset = 3;
  svg += `<text x="${WIDTH / 2}" y="${98 + centerYOffset}" class="runescape-font orange-text item-text" filter="url(#rs-shadow)">${escapeXML(data.itemName)}</text>`;
  const curDate = getCurrentDate();
  const shortDate = formatShortDate(curDate);
  svg += `<text x="${WIDTH - 20}" y="${HEIGHT - 5}" class="runescape-font date-small small-date-text">${shortDate}</text>`;
  const iconY = ICON_POSITION.y - 12 + centerYOffset;
  svg += `<image href="${itemIconBase64}" x="${ICON_POSITION.x}" y="${iconY}" width="${ICON_SIZE}" height="${ICON_SIZE}"/>`;
  if (item.examine && item.examine.trim()) {
    const examineY = iconY + ICON_SIZE + 18;
    const examineText = item.examine.trim();
    const maxLineLength = 50;
    const lines = wrapText(examineText, maxLineLength);
    const lineHeight = 13;
    lines.forEach((line, index) => {
      const lineY = examineY + index * lineHeight;
      const skewOffset = line.length * 7 * 0.1 / 2;
      const additionalOffset = 23;
      const adjustedX = WIDTH / 2 + skewOffset + additionalOffset;
      svg += `<text x="${adjustedX}" y="${lineY}" class="examine-text examine-item-text" style="font-family: 'Runescape Chat', 'RuneScape UF', 'Runescape', monospace; transform: skewX(-10deg);">${escapeXML(line)}</text>`;
    });
  }
  svg += "</svg>";
  return svg;
}
async function generateLootIcons(lootItems, startY) {
  let svg = "";
  const processedLoot = processCoinStacks(lootItems);
  for (let i = 0; i < processedLoot.length; i++) {
    const item = processedLoot[i];
    const xOffset = 15 + 40 * (i % 7);
    const row = Math.floor(i / 7);
    const yOffset = startY + row * 35;
    try {
      const iconUrl = await FileService.getItemIconUrl(item.id);
      svg += `<image href="${iconUrl}" x="${xOffset}" y="${yOffset}" width="32" height="32"/>`;
      const formattedCount = formatCount(item.count);
      svg += `<text x="${xOffset + 30}" y="${yOffset + 30}" class="runescape-font yellow-text item-count" filter="url(#rs-shadow)">${formattedCount}</text>`;
    } catch (error) {
      console.warn(`Could not load icon for item ${item.id}:`, error.message);
    }
  }
  return svg;
}
async function generateXPIcons(xpData, startY) {
  let svg = "";
  for (let i = 0; i < xpData.length; i++) {
    const xpItem = xpData[i];
    const yOffset = startY + 40 + 50 * Math.floor(i / 5);
    const xOffset = 15 + 60 * (i % 5);
    try {
      const iconBase64 = await FileService.getSkillIcon(xpItem.skill);
      svg += `<image href="${iconBase64}" x="${xOffset}" y="${yOffset}" width="25" height="25"/>`;
      const formattedXP = formatXP(xpItem.xp);
      svg += `<text x="${xOffset + 12.5}" y="${yOffset + 40}" class="runescape-font yellow-text xp-text" filter="url(#rs-shadow)">${formattedXP}</text>`;
    } catch (error) {
      console.warn(`Could not load icon for skill ${xpItem.skill}:`, error.message);
    }
  }
  return svg;
}
function processCoinStacks(lootItems) {
  const coinIds = [617, 995, 996, 997, 998, 999, 1e3, 1001, 1002, 1003, 1004, 6964, 8890, 8891, 8892, 8893, 8894, 8895, 8896, 8897, 8898, 8899, 14440, 18028];
  return lootItems.map((item) => {
    if (coinIds.includes(item.id)) {
      if (item.count > 5e4) {
        return { ...item, id: 1004 };
      } else if (item.count > 1e4) {
        return { ...item, id: 1003 };
      } else if (item.count > 1e3) {
        return { ...item, id: 1001 };
      } else {
        return { ...item, id: 998 };
      }
    }
    return item;
  });
}
async function convertToPngDataUrl(dataUrl) {
  if (!dataUrl || !dataUrl.includes("base64")) {
    return dataUrl;
  }
  if (dataUrl.includes("image/png")) {
    return dataUrl;
  }
  try {
    const base64Data = dataUrl.split(",")[1];
    const imageBuffer = Buffer.from(base64Data, "base64");
    const pngBuffer = await sharp(imageBuffer).png({ quality: 100, compressionLevel: 0 }).toBuffer();
    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  } catch (error) {
    console.warn("Failed to convert image to PNG, using original:", error.message);
    return dataUrl;
  }
}
async function svgToPng(svgString) {
  try {
    const result = await sharp(Buffer.from(svgString)).png({
      quality: 100,
      compressionLevel: 0,
      adaptiveFiltering: false,
      force: true
    }).toBuffer();
    return result;
  } catch (error) {
    throw error;
  }
}
function formatShortDate(dateString) {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}
function wrapText(text, maxLength) {
  if (text.length <= maxLength) {
    return [text];
  }
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxLength) {
      currentLine = currentLine ? currentLine + " " + word : word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        lines.push(word.slice(0, maxLength));
        currentLine = word.slice(maxLength);
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}
function escapeXML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function generateProgressImage(data) {
  try {
    const svgString = await generateProgressSVG(data);
    const pngBuffer = await svgToPng(svgString);
    return {
      statusCode: 200,
      body: JSON.stringify(`data:image/png;base64,${pngBuffer.toString("base64")}`)
    };
  } catch (error) {
    console.error("Error generating progress image:", error);
    throw error;
  }
}
async function generateCollectionLogImage(data) {
  try {
    const svgString = await generateCollectionLogSVG(data);
    const pngBuffer = await svgToPng(svgString);
    return {
      statusCode: 200,
      body: JSON.stringify(`data:image/png;base64,${pngBuffer.toString("base64")}`)
    };
  } catch (error) {
    console.error("Error generating collection log image:", error);
    throw error;
  }
}

export { generateProgressImage as a, generateCollectionLogImage as g };
//# sourceMappingURL=imageGenerationService.mjs.map
