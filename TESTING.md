# Image Generation Testing Suite

This document describes the testing infrastructure for the OSRS Image Generation API, including progress images and collection logs.

## 🧪 Test Commands

### Run Tests
```bash
npm test
```
Runs the complete test suite for both progress images and collection logs.

### Update Reference Images
```bash
npm run update
```
Updates both the documentation images and reference images for visual diff testing.

### Update Documentation Images Only
```bash
npm run update-docs
```
Generates new reference images for the documentation pages.

## 📁 Test Structure

### Test Files
- `scripts/test-image-generation.js` - Main test suite
- `scripts/update-doc-images.js` - Documentation image generator
- `__tests__/image-generation.test.js` - Jest test suite (alternative)
- `__tests__/setup.js` - Jest test setup

### Test Output Directories
- `test-output/progress-images/` - Generated progress image tests
- `test-output/collection-logs/` - Generated collection log tests
- `public/docs/images/` - Documentation reference images
- `__tests__/reference-images/` - Jest reference images
- `__tests__/generated-images/` - Jest generated images
- `__tests__/diff-images/` - Jest diff images

## 🎯 Test Cases

### Progress Image Tests
1. **Agility Training** - Single skill with XP gains
2. **Multi-Skill Training** - Multiple skills with loot
3. **Combat Training** - Combat skills with drops
4. **Mining Session** - Resource gathering with ores

### Collection Log Tests
1. **Jar Collection** - Rare item (Jar of dirt)
2. **Dragon Collection** - Equipment (Dragon scimitar)
3. **Rare Collection** - Weapon (Abyssal whip)
4. **Quest Collection** - Quest item (Quest cape)

## 📊 Visual Diff Testing

The test suite includes visual diff testing using `pixelmatch` and `pngjs`:

- **Tolerance**: 1% of total pixels allowed to differ
- **Threshold**: 0.1 for pixel comparison
- **Include AA**: Anti-aliasing included in comparison

### Diff Image Generation
When tests run, diff images are generated showing:
- Green: Matching pixels
- Red: Different pixels in first image
- Blue: Different pixels in second image

## 🔧 Test Data

### Progress Image Test Data
```javascript
{
  script_name: "Seers Agility",
  runtime: 60,
  xp_earned: [
    { skill: "agility", xp: "126,585" }
  ],
  loot: [
    { id: 249, name: "Guam leaf", count: 43 }
  ]
}
```

### Collection Log Test Data
```javascript
{
  itemName: "Jar of dirt",
  userName: "TestPlayer"
}
```

## 📈 Documentation Integration

### Progress Image Documentation
Reference images are automatically included in `/docs/progress-image.html`:
- `agility-example.png` - Agility training example
- `multi-skill-example.png` - Multi-skill training example
- `combat-example.png` - Combat training example

### Collection Log Documentation
Reference images are automatically included in `/docs/collection-log.html`:
- `collection-jar-example.png` - Jar of dirt example
- `collection-dragon-example.png` - Dragon scimitar example
- `collection-abyssal-example.png` - Abyssal whip example

## 🚀 Continuous Integration

### Pre-commit Hooks
Consider adding these to your CI pipeline:
```bash
# Run tests before deployment
npm test

# Update reference images if needed
npm run update
```

### GitHub Actions Example
```yaml
name: Image Generation Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure `data/osrs.db` exists
   - Run `npm run fetch-data` if database is missing

2. **Icon Loading Errors**
   - Check that icon files exist in `icons/` directory
   - Run `npm run fix-icons` to repair missing icons

3. **Image Generation Failures**
   - Verify Sharp library is properly installed
   - Check system memory for large image generation

4. **Test Failures**
   - Run `npm run update` to regenerate reference images
   - Check diff images in `__tests__/diff-images/` for visual differences

### Debug Mode
Enable verbose logging by setting environment variable:
```bash
DEBUG=true npm test
```

## 📝 Adding New Tests

### Adding Progress Image Test
1. Add test case to `progressTestCases` array in test file
2. Include realistic XP and loot data
3. Run `npm run update` to generate reference image

### Adding Collection Log Test
1. Add test case to `collectionLogTestCases` array in test file
2. Use valid item names from OSRS database
3. Run `npm run update` to generate reference image

### Test Naming Convention
- Progress images: `{activity}-progress`
- Collection logs: `{item-type}-collection`
- Examples: `agility-progress`, `jar-collection`

## 🎨 Image Quality Standards

### Progress Images
- Resolution: 800x600 minimum
- Format: PNG with transparency
- Quality: High compression, clear text

### Collection Log Images
- Resolution: 600x400 minimum
- Format: PNG with transparency
- Quality: Crisp icons, readable text

## 📊 Performance Metrics

### Test Execution Time
- Individual test: < 5 seconds
- Full suite: < 30 seconds
- Image generation: < 2 seconds per image

### Memory Usage
- Peak memory: < 100MB
- Image processing: < 50MB per image
- Database queries: < 10MB

## 🔄 Maintenance

### Regular Tasks
1. **Weekly**: Run `npm test` to ensure all tests pass
2. **Monthly**: Run `npm run update` to refresh reference images
3. **Quarterly**: Review and update test cases with new content

### Database Updates
When the OSRS database is updated:
1. Run `npm run fetch-data` to update item data
2. Run `npm run update` to regenerate all reference images
3. Review diff images for any unexpected changes

## 📚 Additional Resources

- [Jest Testing Framework](https://jestjs.io/)
- [Pixelmatch Documentation](https://github.com/mapbox/pixelmatch)
- [PNG.js Documentation](https://github.com/lukeapage/pngjs)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/) 