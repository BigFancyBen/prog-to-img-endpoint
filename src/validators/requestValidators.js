const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const validateProgressRequest = [
  body('script_name')
    .notEmpty()
    .withMessage('Script name is required')
    .isString()
    .withMessage('Script name must be a string'),
  
  body('runtime')
    .isNumeric()
    .withMessage('Runtime must be a number'),
  
  body('loot')
    .optional()
    .isArray()
    .withMessage('Loot must be an array'),
  
  body('loot.*.id')
    .optional()
    .isNumeric()
    .withMessage('Loot item ID must be numeric'),
  
  body('loot.*.count')
    .optional()
    .isNumeric()
    .withMessage('Loot item count must be numeric'),
  
  body('xp_earned')
    .optional()
    .isArray()
    .withMessage('XP earned must be an array'),
  
  body('xp_earned.*.skill')
    .optional()
    .isString()
    .withMessage('Skill name must be a string'),
  
  body('xp_earned.*.xp')
    .optional()
    .isString()
    .withMessage('XP value must be a string'),
  
  handleValidationErrors
];

const validateCollectionLogRequest = [
  body('itemName')
    .notEmpty()
    .withMessage('Item name is required')
    .isString()
    .withMessage('Item name must be a string'),
  
  body('userName')
    .notEmpty()
    .withMessage('User name is required')
    .isString()
    .withMessage('User name must be a string'),
  
  handleValidationErrors
];

module.exports = {
  validateProgressRequest,
  validateCollectionLogRequest
}; 