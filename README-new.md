# RuneScape Progress Image Generator

A modern API endpoint for generating progress report images for Old School RuneScape players.

## Features

- **Progress Image Generation**: Create visual progress reports for OSRS players
- **Collection Log Items**: Generate images for collection log item displays  
- **Direct Wiki Integration**: Data sourced directly from OSRS Wiki (no external dependencies)
- **Modern Tech Stack**: Built with Nitro for fast, edge-deployable API endpoints
- **Comprehensive Database**: Items, monsters, equipment, and weapons data
- **Incremental Updates**: Keep data current without full re-scraping

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Fetch Game Data
```bash
# Initial data fetch (15-30 minutes)
npm run fetch-data

# OR for faster updates after initial setup
npm run update-data
```

### 3. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Data Source

This project uses a modern wiki scraping system that pulls data directly from the Old School RuneScape Wiki. This ensures:

- ✅ Always up-to-date with game changes
- ✅ No dependency on third-party data repositories  
- ✅ Direct access to the community-maintained source of truth
- ✅ Incremental updates for new content

See [WIKI_SCRAPER.md](./WIKI_SCRAPER.md) for detailed information about the data scraping system.

## API Endpoints

### Items
- `GET /osrs/items` - List all items
- `GET /osrs/items/:id` - Get specific item by ID
- `GET /osrs/equipment` - List all equipment
- `GET /osrs/weapons` - List all weapons

### Monsters  
- `GET /osrs/monsters` - List all monsters
- `GET /osrs/monsters/:id` - Get specific monster by ID

### Search
- `GET /osrs/search/items?q=searchterm` - Search items
- `GET /osrs/search/monsters?q=searchterm` - Search monsters

### Image Generation
- `POST /api/progress-image` - Generate progress report image
- `POST /api/collection-log` - Generate collection log image

## Project Structure

```
├── routes/           # API endpoint handlers
├── scripts/          # Data fetching and processing
│   ├── wiki/        # Wiki scraping utilities
│   ├── wikiScraper.js       # Main scraper
│   ├── incrementalScraper.js # Fast updates
│   └── runDataFetch.js      # CLI for full scrape
├── data/
│   ├── cache/       # Raw wiki data cache
│   └── processed/   # Clean, structured data
├── services/        # Business logic
├── utils/          # Helper functions
└── types/          # TypeScript definitions
```

## Development

### Adding New Data Fields

1. Update the wiki parser in `scripts/wiki/wikitextParser.js`
2. Add data cleaning logic in `scripts/wiki/infoboxCleaner.js` 
3. Update the scraper to extract the new field
4. Test with both full and incremental scrapes

### Data Updates

```bash
# Full re-scrape (when major changes occur)
npm run fetch-data

# Quick update check (daily/weekly)
npm run update-data
```

### Building for Production

```bash
npm run build
```

## Deployment

This project is built with Nitro and can be deployed to various platforms:

- **Vercel**: `npm run build` and deploy `.output/` 
- **Netlify**: Set build command to `npm run build`
- **Cloudflare Workers**: Nitro automatically generates worker code
- **Node.js**: Run `npm start` with the built output

## Environment Variables

```bash
# Optional: Custom user agent for wiki API requests
WIKI_USER_AGENT="YourApp/1.0 (https://yoursite.com; your-email@example.com)"
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b new-feature`
3. Make your changes and test thoroughly
4. Ensure data scraping still works: `npm run update-data`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

- Data sourced from [Old School RuneScape Wiki](https://oldschool.runescape.wiki/)
- Inspired by the [osrsbox](https://github.com/osrsbox/osrsbox-db) project's approach to wiki scraping
- Built with [Nitro](https://nitro.unjs.io/) framework
