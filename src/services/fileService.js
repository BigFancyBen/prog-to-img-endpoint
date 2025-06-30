const fs = require('fs').promises;
const path = require('path');
const { PATHS } = require('../config/constants');

class FileService {
  /**
   * Read a local image file and return as buffer
   * @param {string} filePath - Path to the image file
   * @returns {Promise<Buffer>} Image buffer
   */
  static async getLocalImage(filePath) {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      console.error(`Error reading image file: ${filePath}`, error);
      throw new Error(`Failed to read image: ${path.basename(filePath)}`);
    }
  }

  /**
   * Get item icon by ID
   * @param {number} itemId - Item ID
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getItemIcon(itemId) {
    const iconPath = path.join(PATHS.ITEMS_DIR, `${itemId}.png`);
    const imageBuffer = await this.getLocalImage(iconPath);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  }

  /**
   * Get skill icon by name
   * @param {string} skillName - Name of the skill
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getSkillIcon(skillName) {
    const iconPath = path.join(PATHS.ICONS_DIR, `${skillName}.png`);
    const imageBuffer = await this.getLocalImage(iconPath);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  }

  /**
   * Get collection log background
   * @returns {Promise<string>} Base64 encoded image
   */
  static async getCollectionLogBackground() {
    const iconPath = path.join(PATHS.ICONS_DIR, 'collection-log.png');
    const imageBuffer = await this.getLocalImage(iconPath);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  }

  /**
   * Load item search data
   * @returns {Promise<Array>} Item search data
   */
  static async loadItemSearch() {
    try {
      const itemSearchPath = path.join(__dirname, '../../itemSearch.json');
      const data = await fs.readFile(itemSearchPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading item search data:', error);
      throw new Error('Failed to load item search data');
    }
  }
}

module.exports = FileService; 