const express = require('express');
const { generateProgressImage, generateCollectionLogImage } = require('../controllers/imageController');
const { validateProgressRequest, validateCollectionLogRequest } = require('../validators/requestValidators');

const router = express.Router();

// Progress report image generation
router.post('/progress-image', validateProgressRequest, generateProgressImage);

// Collection log image generation  
router.post('/collection-log', validateCollectionLogRequest, generateCollectionLogImage);

// Legacy endpoints for backward compatibility
router.post('/getImage', validateProgressRequest, generateProgressImage);
router.post('/getCollectionLogItem', validateCollectionLogRequest, generateCollectionLogImage);

module.exports = router; 