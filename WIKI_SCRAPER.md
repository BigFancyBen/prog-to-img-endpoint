# OSRS Wiki Data Scraper

This project now uses a modern wiki scraping system that pulls data directly from the Old School RuneScape Wiki, replacing the dependency on osrsbox-db. The wiki is used as the single source of truth for all item and monster data.

## Features

- **Direct Wiki Scraping**: Extracts data directly from OSRS Wiki infoboxes
- **Incremental Updates**: Fast updates for new items/monsters without full re-scraping
- **Checkpoint System**: Resume interrupted scrapes from where they left off
- **Rate Limiting**: Respectful to wiki servers with proper delays
- **Structured Data**: Clean, normalized JSON output compatible with existing code

## Quick Start

### Initial Data Fetch
Run this once to get all items and monsters data:

```bash
npm run fetch-data
```

This will:
- Scrape all items from the wiki's Items and Pets categories
- Scrape all monsters from the wiki's Monsters category
- Extract structured data from infoboxes
- Save processed data to `data/processed/`

### Incremental Updates
Run this periodically to check for new content:

```bash
npm run update-data
```

This will:
- Check for recently modified pages in relevant categories
- Extract data for any new items/monsters found
- Update the existing database without re-scraping everything

## Data Structure

### Items
```json
{
  "id": 1234,
  "name": "Example Item",
  "examine": "An example item.",
  "wiki_name": "Example Item",
  "wiki_url": "https://oldschool.runescape.wiki/w/Example_Item",
  "members": true,
  "tradeable": true,
  "equipable": false,
  "quest_item": false,
  "cost": 1000,
  "weight": 2.267,
  "last_updated": "2025-01-22"
}
```

### Equipment (subset of items)
Items with `equipable: true` include additional equipment data:
```json
{
  "equipment": {
    "attack_stab": 65,
    "attack_slash": 0,
    "defence_stab": 0,
    "slot": "weapon",
    "requirements": {
      "attack": 70
    }
  }
}
```

### Monsters
```json
{
  "id": 415,
  "name": "Example Monster",
  "examine": "A dangerous creature.",
  "combat_level": 124,
  "hitpoints": 150,
  "max_hit": 8,
  "attack_type": ["stab"],
  "slayer_monster": true,
  "slayer_level": 85,
  "slayer_xp": 150.0,
  "drops": [],
  "last_updated": "2025-01-22"
}
```

## Output Files

The scraper creates several processed data files:

- `data/processed/items.json` - All items data
- `data/processed/equipment.json` - Equipable items only
- `data/processed/weapons.json` - Weapon items only
- `data/processed/monsters.json` - All monsters data
- `data/processed/summary.json` - Statistics and metadata

## Cache Files

Raw wiki data is cached to avoid re-scraping:

- `data/cache/items-wiki.json` - Raw items data from wiki
- `data/cache/monsters-wiki.json` - Raw monsters data from wiki
- `data/wiki-checkpoint.json` - Scraping progress checkpoint

## Configuration

The scraper can be configured by modifying the source files:

- **Rate Limiting**: Adjust delays in `WikiApiClient.js`
- **Categories**: Change which wiki categories to scrape
- **Data Fields**: Modify which infobox fields to extract
- **Cleaning Rules**: Update data cleaning logic in `InfoboxCleaner.js`

## Scheduled Updates

For production use, consider setting up a cron job or scheduled task to run incremental updates:

```bash
# Check for updates daily at 2 AM
0 2 * * * cd /path/to/project && npm run update-data
```

## Troubleshooting

### Slow Performance
- The initial scrape can take 15-30 minutes due to rate limiting
- Use incremental updates for faster subsequent updates
- Check your internet connection

### Missing Data
- Some items may not have complete infobox data on the wiki
- Items marked with `incomplete: true` need manual review
- Equipment stats default to 0 if not specified

### API Errors
- The scraper respects wiki rate limits
- Temporary network issues will be logged but not crash the process
- Use checkpoints to resume from failures

## Comparison to osrsbox-db

| Feature | osrsbox-db | Wiki Scraper |
|---------|------------|--------------|
| Data Source | GitHub repository | OSRS Wiki directly |
| Update Frequency | Manual updates | Real-time with wiki |
| Dependencies | External JSON files | Self-contained |
| Data Freshness | May lag behind game updates | Always current |
| Setup Complexity | Simple download | Initial scrape required |
| Incremental Updates | Not supported | Built-in |

## Contributing

When adding new data fields:

1. Update the wiki parser to extract the field
2. Add cleaning logic in `InfoboxCleaner.js`
3. Update the data structure documentation
4. Test with both full and incremental scrapes

## License

This wiki scraping system respects the OSRS Wiki's terms of service and includes proper rate limiting to avoid overloading their servers.
