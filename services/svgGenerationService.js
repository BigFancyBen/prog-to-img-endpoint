import sharp from 'sharp'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { CANVAS_CONFIG, COLORS, FONTS, COLLECTION_LOG_CONFIG } from '../config/constants.js'
import { formatRuntime, formatCount, formatXP, getCurrentDate } from '../utils/formatters.js'
import FileService from './fileService.js'
import IconService from './iconService.js'
import databaseService from './databaseService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Generate progress report SVG
 * @param {Object} data - Progress data
 * @returns {Promise<string>} SVG markup
 */
export async function generateProgressSVG(data) {
  // Ensure database is initialized (singleton pattern)
  await databaseService.init()
  
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

  const fontFaceCss = await getEmbeddedFontFaceCss()

  // Start SVG with transparent background
  let svg = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">`

  // Add font definition and drop shadow filter
  svg += `<defs>
    <filter id="rs-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="black" flood-opacity="1"/>
    </filter>
    <style>
      ${fontFaceCss}
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
 * Generate level-up SVG
 * Renders the skill icon at 2x the normal XP-section size (50x50) with
 * "Level <n>" text rendered next to it in RuneScape style.
 * @param {Object} data - { skill, level }
 * @returns {Promise<string>} SVG markup
 */
async function readFileBase64(absPath) {
  const buffer = await readFile(absPath)
  return buffer.toString('base64')
}

async function getLevelUpBackgroundDataUrl() {
  const b64 = await readFileBase64(join(process.cwd(), 'icons', 'levelUpBackground.png'))
  return `data:image/png;base64,${b64}`
}

let _embeddedFontFaceCssPromise = null
function getEmbeddedFontFaceCss() {
  if (!_embeddedFontFaceCssPromise) {
    _embeddedFontFaceCssPromise = (async () => {
      const fontDir = join(process.cwd(), 'font')
      const [npcChat, chat, uf, base] = await Promise.all([
        readFileBase64(join(fontDir, 'runescape_npc_chat.ttf')),
        readFileBase64(join(fontDir, 'runescape_chat.ttf')),
        readFileBase64(join(fontDir, 'runescape_uf.ttf')),
        readFileBase64(join(fontDir, 'runescape.ttf'))
      ])
      return `
        @font-face { font-family: 'Runescape NPC Chat'; src: url(data:font/ttf;base64,${npcChat}) format('truetype'); }
        @font-face { font-family: 'Runescape Chat'; src: url(data:font/ttf;base64,${chat}) format('truetype'); }
        @font-face { font-family: 'RuneScape UF'; src: url(data:font/ttf;base64,${uf}) format('truetype'); }
        @font-face { font-family: 'Runescape'; src: url(data:font/ttf;base64,${base}) format('truetype'); }
      `
    })()
  }
  return _embeddedFontFaceCssPromise
}

function titleCaseSkill(skill) {
  if (!skill) return ''
  return skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase()
}

export async function generateLevelUpSVG(data) {
  await databaseService.init()

  const canvasWidth = 1040
  const canvasHeight = 283

  const [bgDataUrl, fontFaceCss] = await Promise.all([
    getLevelUpBackgroundDataUrl(),
    getEmbeddedFontFaceCss()
  ])

  const iconBox = { x: 80, y: 100, width: 80, height: 80 }
  const textCenterX = 520
  const skillTitle = titleCaseSkill(data.skill)
  const curDate = getCurrentDate()

  let svg = `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">`

  svg += `<defs>
    <filter id="rs-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="black" flood-opacity="1"/>
    </filter>
    <style>
      ${fontFaceCss}
      .rs-chat {
        font-family: 'Runescape NPC Chat', 'Runescape Chat', monospace;
        font-weight: normal;
        font-style: normal;
        text-anchor: middle;
      }
      .congrats { font-size: 72px; fill: #002783; }
      .your-level { font-size: 72px; fill: #000000; }
      .date-line { font-size: 30px; fill: #ffff00; text-anchor: end; font-family: 'RuneScape UF', 'Runescape', monospace; }
    </style>
  </defs>`

  svg += `<image href="${bgDataUrl}" x="0" y="0" width="${canvasWidth}" height="${canvasHeight}"/>`

  try {
    const iconBase64 = await FileService.getSkillIcon(data.skill)
    svg += `<image href="${iconBase64}" x="${iconBox.x}" y="${iconBox.y}" width="${iconBox.width}" height="${iconBox.height}" preserveAspectRatio="xMidYMid meet"/>`
  } catch (error) {
    console.warn(`Could not load icon for skill ${data.skill}:`, error.message)
  }

  svg += `<text x="${textCenterX}" y="125" class="rs-chat congrats">Congratulations, ${escapeXML(data.username)}!</text>`
  svg += `<text x="${textCenterX}" y="195" class="rs-chat your-level">Your ${escapeXML(skillTitle)} level is now ${data.level}.</text>`
  svg += `<text x="1020" y="260" class="date-line" filter="url(#rs-shadow)">${escapeXML(curDate)}</text>`

  svg += '</svg>'
  return svg
}

/**
 * Generate collection log SVG
 * @param {Object} data - Collection log data
 * @returns {Promise<string>} SVG markup
 */
export async function generateCollectionLogSVG(data) {
  // Ensure database is initialized (singleton pattern)
  await databaseService.init()
  
  const { itemName, userName } = data
  
  const { WIDTH, HEIGHT, ICON_SIZE, ICON_POSITION } = COLLECTION_LOG_CONFIG
  
  // Verify database is working
  const stats = databaseService.getStats()
  
  if (stats.items === 0) {
    throw new Error('Database appears to be empty or not properly initialized')
  }
  
  // Get background image from IconService (using special_icons table)
  const bgImageBase64 = await IconService.getCollectionLogIcon()
  
  if (!bgImageBase64) {
    throw new Error('Collection log background image could not be loaded')
  }
  
  // Find item in database and get its icon
  const itemData = await databaseService.searchItemsByNameOnly(data.itemName)
  
  if (!itemData || itemData.length === 0) {
    // Try a broader search to help with debugging
    const broaderResults = await databaseService.searchItemsByNameOnly('Leather body', 10)
    
    throw new Error(`Item not found: ${data.itemName}. Database contains ${stats.items} items. Please check the item name spelling or try a different item.`)
  }
  
  // Get the first matching item
  const item = itemData[0]
  const itemIconBase64 = await IconService.getItemIcon(item.id)
  
  if (!itemIconBase64) {
    throw new Error(`Failed to load icon for item: ${data.itemName} (ID: ${item.id})`)
  }
  
  // Convert both background and item icon to PNG for SVG compatibility
  const bgImagePng = await convertToPngDataUrl(bgImageBase64)
  const itemIconPng = await convertToPngDataUrl(itemIconBase64)

  const fontFaceCss = await getEmbeddedFontFaceCss()

  let svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<defs>
    <filter id="rs-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="0" flood-color="black" flood-opacity="1"/>
    </filter>
    <style>
      ${fontFaceCss}
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

  // Background image using base64 data URL
  svg += `<image href="${bgImagePng}" x="0" y="0" width="${WIDTH}" height="${HEIGHT}"/>`
  
  // Title
  svg += `<text x="${WIDTH/2}" y="45" class="runescape-font orange-text title-text" filter="url(#rs-shadow)">${escapeXML(data.userName)}'s Collection Log</text>`
  
  // Move center section down a few px
  const centerYOffset = 3;

  // Item name (orange color, moved down)
  svg += `<text x="${WIDTH/2}" y="${98 + centerYOffset}" class="runescape-font orange-text item-text" filter="url(#rs-shadow)">${escapeXML(data.itemName)}</text>`

  // Small date in bottom right corner (keep as previously adjusted)
  const curDate = getCurrentDate()
  const shortDate = formatShortDate(curDate)
  svg += `<text x="${WIDTH - 20}" y="${HEIGHT - 5}" class="runescape-font date-small small-date-text">${shortDate}</text>`

  // Item icon using base64 data URL (move down by centerYOffset)
  const iconY = ICON_POSITION.y - 12 + centerYOffset;
  svg += `<image href="${itemIconBase64}" x="${ICON_POSITION.x}" y="${iconY}" width="${ICON_SIZE}" height="${ICON_SIZE}"/>`

  // Examine text below the icon (move down by centerYOffset, increase gap to 18px)
  if (item.examine && item.examine.trim()) {
    const examineY = iconY + ICON_SIZE + 18; // 18px below icon
    const examineText = item.examine.trim()

    // Wrap long examine text across multiple lines
    const maxLineLength = 50 // characters per line
    const lines = wrapText(examineText, maxLineLength)

    const lineHeight = 13; // reduced from 16px
    lines.forEach((line, index) => {
      const lineY = examineY + (index * lineHeight);
              // Compensate for skew offset and adjust to center relative to icon
        const skewOffset = (line.length * 7 * 0.1) / 2; // Approximate compensation for skewX(-10deg)
        const additionalOffset = 23 // Additional offset to center relative to icon
        const adjustedX = (WIDTH/2) + skewOffset + additionalOffset;
      svg += `<text x="${adjustedX}" y="${lineY}" class="examine-text examine-item-text" style="font-family: 'Runescape Chat', 'RuneScape UF', 'Runescape', monospace; transform: skewX(-10deg);">${escapeXML(line)}</text>`;
    })
  }

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
 * Convert WebP data URL to PNG data URL for SVG compatibility
 * @param {string} dataUrl - Base64 data URL (could be PNG or WebP)
 * @returns {Promise<string>} PNG data URL
 */
async function convertToPngDataUrl(dataUrl) {
  if (!dataUrl || !dataUrl.includes('base64')) {
    return dataUrl
  }
  
  // If it's already PNG, return as-is
  if (dataUrl.includes('image/png')) {
    return dataUrl
  }
  
  try {
    // Extract base64 data
    const base64Data = dataUrl.split(',')[1]
    const imageBuffer = Buffer.from(base64Data, 'base64')
    
    // Convert to PNG using Sharp
    const pngBuffer = await sharp(imageBuffer)
      .png({ quality: 100, compressionLevel: 0 })
      .toBuffer()
    
    return `data:image/png;base64,${pngBuffer.toString('base64')}`
  } catch (error) {
    console.warn('Failed to convert image to PNG, using original:', error.message)
    return dataUrl
  }
}

/**
 * Convert SVG to PNG using Sharp
 * @param {string} svgString - SVG markup
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function svgToPng(svgString) {
  try {
    const result = await sharp(Buffer.from(svgString))
      .png({ 
        quality: 100,
        compressionLevel: 0,
        adaptiveFiltering: false,
        force: true
      })
      .toBuffer()
    
    return result
  } catch (error) {
    throw error
  }
}

/**
 * Format date as short MM/DD/YY format
 * @param {string} dateString - Date string from getCurrentDate()
 * @returns {string} Short formatted date
 */
function formatShortDate(dateString) {
  // getCurrentDate() returns format like "July 31, 2025"
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  return `${month}/${day}/${year}`
}

/**
 * Wrap text to multiple lines
 * @param {string} text - Text to wrap
 * @param {number} maxLength - Maximum characters per line
 * @returns {Array<string>} Array of wrapped lines
 */
function wrapText(text, maxLength) {
  if (text.length <= maxLength) {
    return [text]
  }
  
  const words = text.split(' ')
  const lines = []
  let currentLine = ''
  
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxLength) {
      currentLine = currentLine ? currentLine + ' ' + word : word
    } else {
      if (currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        // Word is longer than maxLength, split it
        lines.push(word.slice(0, maxLength))
        currentLine = word.slice(maxLength)
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine)
  }
  
  return lines
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