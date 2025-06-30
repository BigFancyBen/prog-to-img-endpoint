const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { CANVAS_CONFIG, COLORS, FONTS, COLLECTION_LOG_CONFIG } = require('../config/constants');
const { formatRuntime, formatCount, formatXP, getCurrentDate } = require('../utils/formatters');
const FileService = require('./fileService');

class SVGGenerationService {
  /**
   * Generate progress report SVG
   * @param {Object} data - Progress data
   * @returns {Promise<string>} SVG markup
   */
  static async generateProgressSVG(data) {
    const titleHeight = CANVAS_CONFIG.TITLE_HEIGHT;
    
    // Calculate dimensions
    let lootHeight = 0;
    if (data?.loot?.length > 0) {
      const numLootRows = Math.floor(data.loot.length / 7) + (data.loot.length % 7 === 0 ? 0 : 1);
      lootHeight = 45 + (35 * numLootRows);
    }
    
    let xpHeight = 0;
    if (data?.xp_earned?.length > 0) {
      const numSkillRows = Math.floor(data.xp_earned.length / 6) + 1;
      xpHeight = 40 + (numSkillRows * 50);
    }

    const canvasHeight = titleHeight + lootHeight + xpHeight;
    const canvasWidth = CANVAS_CONFIG.WIDTH;

    // Start SVG
    let svg = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add font definition
    svg += `<defs>
      <style>
        @font-face {
          font-family: 'Runescape';
          src: url('data:font/truetype;base64,${await this.getFontBase64()}') format('truetype');
        }
        .runescape-font { font-family: 'Runescape', monospace; }
        .title-text { font-size: 30px; fill: ${COLORS.YELLOW}; stroke: black; stroke-width: 2; }
        .subtitle-text { font-size: 16px; fill: ${COLORS.YELLOW}; stroke: black; stroke-width: 2; }
        .section-text { font-size: 20px; fill: ${COLORS.YELLOW}; stroke: black; stroke-width: 2; }
        .small-text { font-size: 14px; fill: ${COLORS.YELLOW}; stroke: black; stroke-width: 2; }
        .item-count { font-size: 14px; fill: ${COLORS.YELLOW}; stroke: black; stroke-width: 2; text-anchor: end; }
        .xp-text { font-size: 16px; fill: ${COLORS.YELLOW}; stroke: black; stroke-width: 2; text-anchor: middle; }
      </style>
    </defs>`;

    // Background
    svg += `<rect width="${canvasWidth}" height="${canvasHeight}" fill="white"/>`;
    
    // Title
    svg += `<text x="15" y="40" class="runescape-font title-text">${this.escapeXML(data.script_name)}</text>`;
    
    // Date and runtime
    const runtime = formatRuntime(data.runtime);
    const curDate = getCurrentDate();
    svg += `<text x="15" y="60" class="runescape-font subtitle-text">${curDate} - ${runtime}</text>`;
    
    // Dividers
    svg += `<line x1="0" y1="${titleHeight}" x2="${canvasWidth}" y2="${titleHeight}" stroke="black" stroke-width="0.5"/>`;
    if (lootHeight && xpHeight) {
      svg += `<line x1="0" y1="${titleHeight + lootHeight}" x2="${canvasWidth}" y2="${titleHeight + lootHeight}" stroke="black" stroke-width="0.5"/>`;
    }

    let currentY = titleHeight;

    // Loot section
    if (data?.loot?.length) {
      svg += `<text x="15" y="${currentY + 25}" class="runescape-font section-text">Loot:</text>`;
      svg += await this.generateLootIcons(data.loot, currentY + 35);
      currentY += lootHeight;
    }

    // XP section
    if (data?.xp_earned?.length) {
      svg += `<text x="15" y="${currentY + 25}" class="runescape-font section-text">XP:</text>`;
      svg += await this.generateXPIcons(data.xp_earned, currentY);
    }

    svg += '</svg>';
    return svg;
  }

  /**
   * Generate collection log SVG
   * @param {Object} data - Collection log data
   * @returns {Promise<string>} SVG markup
   */
  static async generateCollectionLogSVG(data) {
    const { WIDTH, HEIGHT, ICON_SIZE, ICON_POSITION } = COLLECTION_LOG_CONFIG;
    
    // Get background image as base64
    const bgImageBuffer = await FileService.getLocalImage(path.join(__dirname, '../../icons/collection-log.png'));
    const bgImageBase64 = `data:image/png;base64,${bgImageBuffer.toString('base64')}`;
    
    // Find item and get its icon
    const itemSearch = await FileService.loadItemSearch();
    const itemIndex = itemSearch.findIndex(item => item?.name === data.itemName);
    
    if (itemIndex === -1) {
      throw new Error('Item not found');
    }
    
    const itemIconBuffer = await FileService.getLocalImage(path.join(__dirname, `../../icons/items/${itemIndex}.png`));
    const itemIconBase64 = `data:image/png;base64,${itemIconBuffer.toString('base64')}`;

    let svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add font definition
    svg += `<defs>
      <style>
        @font-face {
          font-family: 'Runescape';
          src: url('data:font/truetype;base64,${await this.getFontBase64()}') format('truetype');
        }
        .runescape-font { font-family: 'Runescape', monospace; }
        .title-text { font-size: 25px; fill: ${COLORS.ORANGE}; stroke: black; stroke-width: 2; text-anchor: middle; }
        .date-text { font-size: 16px; fill: ${COLORS.ORANGE}; stroke: black; stroke-width: 2; text-anchor: middle; }
        .item-text { font-size: 22px; fill: ${COLORS.WHITE}; stroke: black; stroke-width: 2; text-anchor: middle; }
      </style>
    </defs>`;

    // Background image
    svg += `<image href="${bgImageBase64}" width="${WIDTH}" height="${HEIGHT}"/>`;
    
    // Title
    svg += `<text x="${WIDTH/2}" y="45" class="runescape-font title-text">${this.escapeXML(data.userName)}'s Collection Log</text>`;
    
    // Date and new item text
    const curDate = getCurrentDate();
    svg += `<text x="${WIDTH/2}" y="100" class="runescape-font date-text">${curDate} - New item:</text>`;
    
    // Item name
    svg += `<text x="${WIDTH/2}" y="125" class="runescape-font item-text">${this.escapeXML(data.itemName)}</text>`;
    
    // Item icon
    svg += `<image href="${itemIconBase64}" x="${ICON_POSITION.x}" y="${ICON_POSITION.y}" width="${ICON_SIZE}" height="${ICON_SIZE}"/>`;

    svg += '</svg>';
    return svg;
  }

  /**
   * Generate loot icons section
   * @param {Array} lootItems - Array of loot items
   * @param {number} startY - Starting Y position
   * @returns {Promise<string>} SVG markup for loot section
   */
  static async generateLootIcons(lootItems, startY) {
    let svg = '';
    
    // Process coin stacks (same logic as original)
    const processedLoot = this.processCoinStacks(lootItems);
    
    for (let i = 0; i < processedLoot.length; i++) {
      const item = processedLoot[i];
      const xOffset = 15 + (40 * (i % 7));
      const row = Math.floor(i / 7);
      const yOffset = startY + row * 35;
      
      try {
        const iconBuffer = await FileService.getLocalImage(path.join(__dirname, `../../icons/items/${item.id}.png`));
        const iconBase64 = `data:image/png;base64,${iconBuffer.toString('base64')}`;
        
        // Item icon
        svg += `<image href="${iconBase64}" x="${xOffset}" y="${yOffset}" width="32" height="32"/>`;
        
        // Item count
        const formattedCount = formatCount(item.count);
        svg += `<text x="${xOffset + 30}" y="${yOffset + 30}" class="runescape-font item-count">${formattedCount}</text>`;
      } catch (error) {
        console.warn(`Could not load icon for item ${item.id}:`, error.message);
      }
    }
    
    return svg;
  }

  /**
   * Generate XP icons section
   * @param {Array} xpData - Array of XP earned data
   * @param {number} startY - Starting Y position
   * @returns {Promise<string>} SVG markup for XP section
   */
  static async generateXPIcons(xpData, startY) {
    let svg = '';
    
    for (let i = 0; i < xpData.length; i++) {
      const xpItem = xpData[i];
      const yOffset = startY + 40 + (50 * Math.floor(i / 5));
      const xOffset = 15 + (60 * (i % 5));
      
      try {
        const iconBuffer = await FileService.getLocalImage(path.join(__dirname, `../../icons/${xpItem.skill}.png`));
        const iconBase64 = `data:image/png;base64,${iconBuffer.toString('base64')}`;
        
        // Skill icon
        svg += `<image href="${iconBase64}" x="${xOffset}" y="${yOffset}" width="25" height="25"/>`;
        
        // XP text
        const formattedXP = formatXP(xpItem.xp);
        svg += `<text x="${xOffset + 12.5}" y="${yOffset + 40}" class="runescape-font xp-text">${formattedXP}</text>`;
      } catch (error) {
        console.warn(`Could not load icon for skill ${xpItem.skill}:`, error.message);
      }
    }
    
    return svg;
  }

  /**
   * Process coin stacks to use appropriate coin graphics
   * @param {Array} lootItems - Original loot items
   * @returns {Array} Processed loot items
   */
  static processCoinStacks(lootItems) {
    const coinIds = [617, 995, 996, 997, 998, 999, 1000, 1001, 1002, 1003, 1004, 6964, 8890, 8891, 8892, 8893, 8894, 8895, 8896, 8897, 8898, 8899, 14440, 18028];
    
    return lootItems.map(item => {
      if (coinIds.includes(item.id)) {
        if (item.count > 50000) {
          return { ...item, id: 1004 };
        } else if (item.count > 10000) {
          return { ...item, id: 1003 };
        } else if (item.count > 1000) {
          return { ...item, id: 1001 };
        } else {
          return { ...item, id: 998 };
        }
      }
      return item;
    });
  }

  /**
   * Get font as base64 string
   * @returns {Promise<string>} Base64 encoded font
   */
  static async getFontBase64() {
    try {
      const fontBuffer = await fs.readFile(path.join(__dirname, '../../font/runescape.ttf'));
      return fontBuffer.toString('base64');
    } catch (error) {
      console.warn('Could not load font, using fallback');
      return '';
    }
  }

  /**
   * Convert SVG to PNG using Sharp
   * @param {string} svgString - SVG markup
   * @returns {Promise<Buffer>} PNG buffer
   */
  static async svgToPng(svgString) {
    return await sharp(Buffer.from(svgString))
      .png()
      .toBuffer();
  }

  /**
   * Escape XML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  static escapeXML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

module.exports = SVGGenerationService; 