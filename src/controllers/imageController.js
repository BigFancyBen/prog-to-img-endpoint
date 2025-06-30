const { ProgressImageService, CollectionLogService } = require('../services/imageGenerationService');

class ImageController {
  static async generateProgressImage(req, res, next) {
    try {
      const imageData = await ProgressImageService.generate(req.body);
      res.json(imageData);
    } catch (error) {
      next(error);
    }
  }

  static async generateCollectionLogImage(req, res, next) {
    try {
      const imageData = await CollectionLogService.generate(req.body);
      res.json(imageData);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = {
  generateProgressImage: ImageController.generateProgressImage,
  generateCollectionLogImage: ImageController.generateCollectionLogImage
}; 