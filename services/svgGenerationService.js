import sharp from 'sharp'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { CANVAS_CONFIG, COLORS, FONTS, COLLECTION_LOG_CONFIG } from '../config/constants.js'
import { formatRuntime, formatCount, formatXP, getCurrentDate } from '../utils/formatters.js'
import FileService from './fileService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Generate progress report SVG
 * @param {Object} data - Progress data
 * @returns {Promise<string>} SVG markup
 */
export async function generateProgressSVG(data) {
  const titleHeight = CANVAS_CONFIG.TITLE_HEIGHT
  
  // Calculate dimensions
  let lootHeight = 0
  if (data?.loot?.length > 0) {
    const numLootRows = Math.floor(data.loot.length / 7) + (data.loot.length % 7 === 0 ? 0 : 1)
    lootHeight = 45 + (35 * numLootRows)
  }
  
  let xpHeight = 0
  if (data?.xp_earned?.length > 0) {
    const numSkillRows = Math.floor(data.xp_earned.length / 6) + 1
    xpHeight = 40 + (numSkillRows * 50)
  }

  const canvasHeight = titleHeight + lootHeight + xpHeight
  const canvasWidth = CANVAS_CONFIG.WIDTH

  // Start SVG with transparent background
  let svg = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">`
  
  // Add font definition and drop shadow filter
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
  </defs>`

  // No background rect - transparent background
  
  // Title
  svg += `<text x="15" y="40" class="runescape-font yellow-text title-text" filter="url(#rs-shadow)">${escapeXML(data.script_name)}</text>`
  
  // Date and runtime
  const runtime = formatRuntime(data.runtime)
  const curDate = getCurrentDate()
  svg += `<text x="15" y="60" class="runescape-font yellow-text subtitle-text" filter="url(#rs-shadow)">${curDate} - ${runtime}</text>`
  
  // Dividers
  svg += `<line x1="0" y1="${titleHeight}" x2="${canvasWidth}" y2="${titleHeight}" stroke="black" stroke-width="0.5"/>`
  if (lootHeight && xpHeight) {
    svg += `<line x1="0" y1="${titleHeight + lootHeight}" x2="${canvasWidth}" y2="${titleHeight + lootHeight}" stroke="black" stroke-width="0.5"/>`
  }

  let currentY = titleHeight

  // Loot section
  if (data?.loot?.length) {
    svg += `<text x="15" y="${currentY + 25}" class="runescape-font yellow-text section-text" filter="url(#rs-shadow)">Loot:</text>`
    svg += await generateLootIcons(data.loot, currentY + 35)
    currentY += lootHeight
  }

  // XP section
  if (data?.xp_earned?.length) {
    svg += `<text x="15" y="${currentY + 25}" class="runescape-font yellow-text section-text" filter="url(#rs-shadow)">XP:</text>`
    svg += await generateXPIcons(data.xp_earned, currentY)
  }

  svg += '</svg>'
  return svg
}

/**
 * Generate collection log SVG
 * @param {Object} data - Collection log data
 * @returns {Promise<string>} SVG markup
 */
export async function generateCollectionLogSVG(data) {
  const { WIDTH, HEIGHT, ICON_SIZE, ICON_POSITION } = COLLECTION_LOG_CONFIG
  
  // Get background image as base64
  const bgImageBase64 = await FileService.getCollectionLogBackground()
  
  // Find item using osrsbox API
  const itemData = await FileService.searchItemByName(data.itemName)
  const itemIconUrl = await FileService.getItemIconUrl(itemData.id)

  let svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">`
  
  // Add font definition and drop shadow filter
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
      .title-text { font-size: 25px; text-anchor: middle; }
      .date-text { font-size: 16px; text-anchor: middle; }
      .item-text { font-size: 22px; text-anchor: middle; }
    </style>
  </defs>`

  // Background image
  svg += `<image href="${bgImageBase64}" width="${WIDTH}" height="${HEIGHT}"/>`
  
  // Title
  svg += `<text x="${WIDTH/2}" y="45" class="runescape-font orange-text title-text" filter="url(#rs-shadow)">${escapeXML(data.userName)}'s Collection Log</text>`
  
  // Date and new item text
  const curDate = getCurrentDate()
  svg += `<text x="${WIDTH/2}" y="100" class="runescape-font orange-text date-text" filter="url(#rs-shadow)">${curDate} - New item:</text>`
  
  // Item name
  svg += `<text x="${WIDTH/2}" y="125" class="runescape-font white-text item-text" filter="url(#rs-shadow)">${escapeXML(data.itemName)}</text>`
  
  // Item icon
  svg += `<image href="${itemIconUrl}" x="${ICON_POSITION.x}" y="${ICON_POSITION.y}" width="${ICON_SIZE}" height="${ICON_SIZE}"/>`

  svg += '</svg>'
  return svg
}

/**
 * Generate loot icons section
 * @param {Array} lootItems - Array of loot items
 * @param {number} startY - Starting Y position
 * @returns {Promise<string>} SVG markup for loot section
 */
async function generateLootIcons(lootItems, startY) {
  let svg = ''
  
  // Process coin stacks (same logic as original)
  const processedLoot = processCoinStacks(lootItems)
  
  for (let i = 0; i < processedLoot.length; i++) {
    const item = processedLoot[i]
    const xOffset = 15 + (40 * (i % 7))
    const row = Math.floor(i / 7)
    const yOffset = startY + row * 35
    
    try {
      const iconUrl = await FileService.getItemIconUrl(item.id)
      
      // Item icon
      svg += `<image href="${iconUrl}" x="${xOffset}" y="${yOffset}" width="32" height="32"/>`
      
      // Item count
      const formattedCount = formatCount(item.count)
      svg += `<text x="${xOffset + 30}" y="${yOffset + 30}" class="runescape-font yellow-text item-count" filter="url(#rs-shadow)">${formattedCount}</text>`
    } catch (error) {
      console.warn(`Could not load icon for item ${item.id}:`, error.message)
    }
  }
  
  return svg
}

/**
 * Generate XP icons section
 * @param {Array} xpData - Array of XP earned data
 * @param {number} startY - Starting Y position
 * @returns {Promise<string>} SVG markup for XP section
 */
async function generateXPIcons(xpData, startY) {
  let svg = ''
  
  for (let i = 0; i < xpData.length; i++) {
    const xpItem = xpData[i]
    const yOffset = startY + 40 + (50 * Math.floor(i / 5))
    const xOffset = 15 + (60 * (i % 5))
    
    try {
      const iconBase64 = await FileService.getSkillIcon(xpItem.skill)
      
      // Skill icon
      svg += `<image href="${iconBase64}" x="${xOffset}" y="${yOffset}" width="25" height="25"/>`
      
      // XP text
      const formattedXP = formatXP(xpItem.xp)
      svg += `<text x="${xOffset + 12.5}" y="${yOffset + 40}" class="runescape-font yellow-text xp-text" filter="url(#rs-shadow)">${formattedXP}</text>`
    } catch (error) {
      console.warn(`Could not load icon for skill ${xpItem.skill}:`, error.message)
    }
  }
  
  return svg
}

/**
 * Process coin stacks to use appropriate coin graphics
 * @param {Array} lootItems - Original loot items
 * @returns {Array} Processed loot items
 */
function processCoinStacks(lootItems) {
  const coinIds = [617, 995, 996, 997, 998, 999, 1000, 1001, 1002, 1003, 1004, 6964, 8890, 8891, 8892, 8893, 8894, 8895, 8896, 8897, 8898, 8899, 14440, 18028]
  
  return lootItems.map(item => {
    if (coinIds.includes(item.id)) {
      if (item.count > 50000) {
        return { ...item, id: 1004 }
      } else if (item.count > 10000) {
        return { ...item, id: 1003 }
      } else if (item.count > 1000) {
        return { ...item, id: 1001 }
      } else {
        return { ...item, id: 998 }
      }
    }
    return item
  })
}

/**
 * Get font as base64 string
 * @returns {Promise<string>} Base64 encoded font
 */
async function getFontBase64() {
  try {
    const fontPath = join(process.cwd(), 'font', 'runescape.ttf')
    console.log('Attempting to load font from:', fontPath)
    const fontBuffer = await readFile(fontPath)
    return fontBuffer.toString('base64')
  } catch (error) {
    console.warn('Could not load font, using fallback')
    return ''
  }
}

/**
 * Convert SVG to PNG using Sharp
 * @param {string} svgString - SVG markup
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function svgToPng(svgString) {
  return await sharp(Buffer.from(svgString))
    .png({ 
      quality: 100,
      compressionLevel: 0,
      adaptiveFiltering: false,
      force: true
    })
    .toBuffer()
}

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
} 