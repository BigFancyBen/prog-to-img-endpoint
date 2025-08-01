const fs = require('fs');
const path = require('path');

// Create test directories if they don't exist
const testDirs = [
  '__tests__/reference-images',
  '__tests__/generated-images',
  '__tests__/diff-images'
];

testDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Global test utilities
global.TEST_UTILS = {
  getReferenceImagePath: (testName) => path.join(__dirname, 'reference-images', `${testName}.png`),
  getGeneratedImagePath: (testName) => path.join(__dirname, 'generated-images', `${testName}.png`),
  getDiffImagePath: (testName) => path.join(__dirname, 'diff-images', `${testName}-diff.png`),
  saveImage: (buffer, path) => fs.writeFileSync(path, buffer),
  loadImage: (path) => fs.existsSync(path) ? fs.readFileSync(path) : null
}; 