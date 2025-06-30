const SVGGenerationService = require('./svgGenerationService');

class ImageGenerationService {
  /**
   * Generate progress report image
   * @param {Object} data - Progress data
   * @returns {Promise<Object>} Response with base64 image
   */
  static async generateProgressImage(data) {
    try {
      // Generate SVG
      const svgString = await SVGGenerationService.generateProgressSVG(data);
      
      // Convert to PNG
      const pngBuffer = await SVGGenerationService.svgToPng(svgString);
      
      // Return in the expected format
      return {
        statusCode: 200,
        body: JSON.stringify(`data:image/png;base64,${pngBuffer.toString('base64')}`)
      };
    } catch (error) {
      console.error('Error generating progress image:', error);
      throw error;
    }
  }

  /**
   * Generate collection log image
   * @param {Object} data - Collection log data
   * @returns {Promise<Object>} Response with base64 image
   */
  static async generateCollectionLogImage(data) {
    try {
      // Generate SVG
      const svgString = await SVGGenerationService.generateCollectionLogSVG(data);
      
      // Convert to PNG
      const pngBuffer = await SVGGenerationService.svgToPng(svgString);
      
      // Return in the expected format
      return {
        statusCode: 200,
        body: JSON.stringify(`data:image/png;base64,${pngBuffer.toString('base64')}`)
      };
    } catch (error) {
      console.error('Error generating collection log image:', error);
      throw error;
    }
  }
}

// Create service instances for easier access
const ProgressImageService = {
  generate: ImageGenerationService.generateProgressImage
};

const CollectionLogService = {
  generate: ImageGenerationService.generateCollectionLogImage
};

module.exports = {
  ImageGenerationService,
  ProgressImageService,
  CollectionLogService
}; 