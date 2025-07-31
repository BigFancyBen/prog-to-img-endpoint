import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';
import https from 'https';

const __filename = fileURLToPath(globalThis._importMeta_.url);
dirname(__filename);
const isProduction = true;
let DB_DIR = join(process.cwd(), "data");
let DB_PATH = join(DB_DIR, "osrs.db");
console.log(`\u{1F50D} Database path: ${DB_PATH}`);
console.log(`\u{1F50D} Is production: ${isProduction}`);
console.log(`\u{1F50D} Current working directory: ${process.cwd()}`);
class DatabaseService {
  constructor() {
    this.db = null;
  }
  /**
   * Initialize the database and create tables
   */
  async init() {
    try {
      await mkdir(DB_DIR, { recursive: true });
      const { existsSync } = await import('fs');
      const dbExists = existsSync(DB_PATH);
      console.log(`\u{1F50D} Database file exists: ${dbExists}`);
      console.log(`\u{1F50D} Database path: ${DB_PATH}`);
      this.db = new Database(DB_PATH);
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("synchronous = NORMAL");
      this.db.pragma("cache_size = 1000000");
      this.db.pragma("temp_store = memory");
      let itemCount = 0;
      try {
        itemCount = this.db.prepare("SELECT COUNT(*) as count FROM items").get().count;
        console.log(`\u{1F50D} Existing database has ${itemCount} items`);
      } catch (error) {
        console.log("\u{1F50D} No items table found, will create tables");
      }
      this.createTables();
      try {
        itemCount = this.db.prepare("SELECT COUNT(*) as count FROM items").get().count;
        console.log(`\u2705 Database initialized successfully (${itemCount} items found)`);
      } catch (error) {
        console.log("\u2705 Database initialized successfully (new database)");
      }
    } catch (error) {
      console.error("\u274C Failed to initialize database:", error);
      throw error;
    }
  }
  /**
   * Create database tables
   */
  createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        examine TEXT,
        wiki_name TEXT,
        wiki_url TEXT,
        icon_path TEXT,
        icon_url TEXT,
        icon_data BLOB,
        members BOOLEAN,
        tradeable BOOLEAN,
        tradeable_on_ge BOOLEAN,
        stackable BOOLEAN,
        noted BOOLEAN,
        noteable BOOLEAN,
        weight REAL,
        buy_limit INTEGER,
        quest_item BOOLEAN,
        release_date TEXT,
        duplicate BOOLEAN DEFAULT FALSE,
        equipable BOOLEAN DEFAULT FALSE,
        equipable_by_player BOOLEAN DEFAULT FALSE,
        equipable_weapon BOOLEAN DEFAULT FALSE,
        cost INTEGER,
        lowalch INTEGER,
        highalch INTEGER,
        destruction TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      this.db.exec(`ALTER TABLE items ADD COLUMN icon_data BLOB`);
    } catch (error) {
    }
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS equipment_stats (
        item_id INTEGER PRIMARY KEY,
        attack_stab INTEGER DEFAULT 0,
        attack_slash INTEGER DEFAULT 0,
        attack_crush INTEGER DEFAULT 0,
        attack_magic INTEGER DEFAULT 0,
        attack_ranged INTEGER DEFAULT 0,
        defence_stab INTEGER DEFAULT 0,
        defence_slash INTEGER DEFAULT 0,
        defence_crush INTEGER DEFAULT 0,
        defence_magic INTEGER DEFAULT 0,
        defence_ranged INTEGER DEFAULT 0,
        melee_strength INTEGER DEFAULT 0,
        ranged_strength INTEGER DEFAULT 0,
        magic_damage INTEGER DEFAULT 0,
        prayer INTEGER DEFAULT 0,
        slot TEXT,
        requirements TEXT,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS weapon_stats (
        item_id INTEGER PRIMARY KEY,
        attack_speed INTEGER,
        weapon_type TEXT,
        stab INTEGER DEFAULT 0,
        slash INTEGER DEFAULT 0,
        crush INTEGER DEFAULT 0,
        magic INTEGER DEFAULT 0,
        ranged INTEGER DEFAULT 0,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS monsters (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        examine TEXT,
        wiki_name TEXT,
        wiki_url TEXT,
        icon_path TEXT,
        members BOOLEAN,
        release_date TEXT,
        combat_level INTEGER,
        hitpoints INTEGER,
        max_hit INTEGER,
        attack_type TEXT,
        attack_speed INTEGER,
        aggressive BOOLEAN,
        poisonous BOOLEAN,
        immune_poison BOOLEAN,
        immune_venom BOOLEAN,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prayers (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        examine TEXT,
        wiki_name TEXT,
        wiki_url TEXT,
        icon_path TEXT,
        members BOOLEAN,
        level_required INTEGER,
        drain_rate REAL,
        book TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS special_icons (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        icon_data BLOB,
        icon_type TEXT,
        type TEXT,
        icon_mime_type TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      this.db.exec(`ALTER TABLE special_icons ADD COLUMN icon_mime_type TEXT`);
    } catch (error) {
    }
    try {
      this.db.exec(`ALTER TABLE special_icons ADD COLUMN type TEXT`);
    } catch (error) {
    }
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
      CREATE INDEX IF NOT EXISTS idx_items_members ON items(members);
      CREATE INDEX IF NOT EXISTS idx_items_tradeable ON items(tradeable);
      CREATE INDEX IF NOT EXISTS idx_items_equipable ON items(equipable);
      CREATE INDEX IF NOT EXISTS idx_monsters_name ON monsters(name);
      CREATE INDEX IF NOT EXISTS idx_monsters_combat_level ON monsters(combat_level);
      CREATE INDEX IF NOT EXISTS idx_prayers_name ON prayers(name);
      CREATE INDEX IF NOT EXISTS idx_prayers_level ON prayers(level_required);
    `);
    console.log("\u2705 Database tables created successfully");
  }
  /**
   * Insert or update an item
   */
  insertItem(itemData) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO items (
        id, name, examine, wiki_name, wiki_url, icon_path, icon_url, icon_data,
        members, tradeable, tradeable_on_ge, stackable, noted, noteable,
        weight, buy_limit, quest_item, release_date, duplicate,
        equipable, equipable_by_player, equipable_weapon,
        cost, lowalch, highalch, destruction, last_updated
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);
    const result = stmt.run(
      itemData.id,
      itemData.name,
      itemData.examine,
      itemData.wiki_name,
      itemData.wiki_url,
      itemData.icon_path || null,
      itemData.icon_url || null,
      itemData.icon_data || null,
      // Include icon buffer data
      itemData.members ? 1 : 0,
      itemData.tradeable ? 1 : 0,
      itemData.tradeable_on_ge ? 1 : 0,
      itemData.stackable ? 1 : 0,
      itemData.noted ? 1 : 0,
      itemData.noteable ? 1 : 0,
      itemData.weight,
      itemData.buy_limit,
      itemData.quest_item ? 1 : 0,
      itemData.release_date,
      itemData.duplicate ? 1 : 0,
      itemData.equipable ? 1 : 0,
      itemData.equipable_by_player ? 1 : 0,
      itemData.equipable_weapon ? 1 : 0,
      itemData.cost,
      itemData.lowalch,
      itemData.highalch,
      itemData.destruction,
      (/* @__PURE__ */ new Date()).toISOString()
    );
    if (itemData.equipment) {
      this.insertEquipmentStats(itemData.id, itemData.equipment);
    }
    if (itemData.weapon) {
      this.insertWeaponStats(itemData.id, itemData.weapon);
    }
    return result;
  }
  /**
   * Insert equipment stats
   */
  insertEquipmentStats(itemId, equipment) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO equipment_stats (
        item_id, attack_stab, attack_slash, attack_crush, attack_magic, attack_ranged,
        defence_stab, defence_slash, defence_crush, defence_magic, defence_ranged,
        melee_strength, ranged_strength, magic_damage, prayer, slot, requirements
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      itemId,
      equipment.attack_stab || 0,
      equipment.attack_slash || 0,
      equipment.attack_crush || 0,
      equipment.attack_magic || 0,
      equipment.attack_ranged || 0,
      equipment.defence_stab || 0,
      equipment.defence_slash || 0,
      equipment.defence_crush || 0,
      equipment.defence_magic || 0,
      equipment.defence_ranged || 0,
      equipment.melee_strength || 0,
      equipment.ranged_strength || 0,
      equipment.magic_damage || 0,
      equipment.prayer || 0,
      equipment.slot,
      JSON.stringify(equipment.requirements)
    );
  }
  /**
   * Insert weapon stats
   */
  insertWeaponStats(itemId, weapon) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO weapon_stats (
        item_id, attack_speed, weapon_type, stab, slash, crush, magic, ranged
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      itemId,
      weapon.attack_speed,
      weapon.weapon_type,
      weapon.stab || 0,
      weapon.slash || 0,
      weapon.crush || 0,
      weapon.magic || 0,
      weapon.ranged || 0
    );
  }
  /**
   * Get item by ID
   */
  getItemById(itemId) {
    const stmt = this.db.prepare(`
      SELECT i.*, 
             e.attack_stab, e.attack_slash, e.attack_crush, e.attack_magic, e.attack_ranged,
             e.defence_stab, e.defence_slash, e.defence_crush, e.defence_magic, e.defence_ranged,
             e.melee_strength, e.ranged_strength, e.magic_damage, e.prayer as equipment_prayer,
             e.slot, e.requirements,
             w.attack_speed, w.weapon_type, w.stab as weapon_stab, w.slash as weapon_slash,
             w.crush as weapon_crush, w.magic as weapon_magic, w.ranged as weapon_ranged
      FROM items i
      LEFT JOIN equipment_stats e ON i.id = e.item_id
      LEFT JOIN weapon_stats w ON i.id = w.item_id
      WHERE i.id = ?
    `);
    const row = stmt.get(itemId);
    if (!row) return null;
    return this.formatItemFromRow(row);
  }
  /**
   * Search items by name
   */
  searchItems(query, limit = 10) {
    const stmt = this.db.prepare(`
      SELECT i.*, 
             e.attack_stab, e.attack_slash, e.attack_crush, e.attack_magic, e.attack_ranged,
             e.defence_stab, e.defence_slash, e.defence_crush, e.defence_magic, e.defence_ranged,
             e.melee_strength, e.ranged_strength, e.magic_damage, e.prayer as equipment_prayer,
             e.slot, e.requirements,
             w.attack_speed, w.weapon_type, w.stab as weapon_stab, w.slash as weapon_slash,
             w.crush as weapon_crush, w.magic as weapon_magic, w.ranged as weapon_ranged
      FROM items i
      LEFT JOIN equipment_stats e ON i.id = e.item_id
      LEFT JOIN weapon_stats w ON i.id = w.item_id
      WHERE i.name LIKE ? OR i.examine LIKE ?
      ORDER BY i.name
      LIMIT ?
    `);
    const searchPattern = `%${query}%`;
    const rows = stmt.all(searchPattern, searchPattern, limit);
    return rows.map((row) => this.formatItemFromRow(row));
  }
  /**
   * Search items by name only
   */
  searchItemsByNameOnly(query, limit = 10) {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return [];
    }
    console.log(`\u{1F50D} Database search for: "${cleanQuery}"`);
    const stmt = this.db.prepare(`
      SELECT i.*, 
             e.attack_stab, e.attack_slash, e.attack_crush, e.attack_magic, e.attack_ranged,
             e.defence_stab, e.defence_slash, e.defence_crush, e.defence_magic, e.defence_ranged,
             e.melee_strength, e.ranged_strength, e.magic_damage, e.prayer as equipment_prayer,
             e.slot, e.requirements,
             w.attack_speed, w.weapon_type, w.stab as weapon_stab, w.slash as weapon_slash,
             w.crush as weapon_crush, w.magic as weapon_magic, w.ranged as weapon_ranged
      FROM items i
      LEFT JOIN equipment_stats e ON i.id = e.item_id
      LEFT JOIN weapon_stats w ON i.id = w.item_id
      WHERE i.name LIKE ? COLLATE NOCASE
      ORDER BY 
        CASE WHEN LOWER(i.name) = LOWER(?) THEN 0 ELSE 1 END,
        i.name
      LIMIT ?
    `);
    const searchPattern = `%${cleanQuery}%`;
    const rows = stmt.all(searchPattern, cleanQuery, limit);
    console.log(`\u{1F50D} Database search returned ${rows.length} results`);
    return rows.map((row) => this.formatItemFromRow(row));
  }
  /**
   * Get all items
   */
  getAllItems() {
    const stmt = this.db.prepare(`
      SELECT i.*, 
             e.attack_stab, e.attack_slash, e.attack_crush, e.attack_magic, e.attack_ranged,
             e.defence_stab, e.defence_slash, e.defence_crush, e.defence_magic, e.defence_ranged,
             e.melee_strength, e.ranged_strength, e.magic_damage, e.prayer as equipment_prayer,
             e.slot, e.requirements,
             w.attack_speed, w.weapon_type, w.stab as weapon_stab, w.slash as weapon_slash,
             w.crush as weapon_crush, w.magic as weapon_magic, w.ranged as weapon_ranged
      FROM items i
      LEFT JOIN equipment_stats e ON i.id = e.item_id
      LEFT JOIN weapon_stats w ON i.id = w.item_id
      ORDER BY i.id
    `);
    const rows = stmt.all();
    return rows.map((row) => this.formatItemFromRow(row));
  }
  /**
   * Format item data from database row
   */
  formatItemFromRow(row) {
    const item = {
      id: row.id,
      name: row.name,
      examine: row.examine,
      wiki_name: row.wiki_name,
      wiki_url: row.wiki_url,
      icon_path: row.icon_path,
      icon_url: row.icon_url,
      members: Boolean(row.members),
      tradeable: Boolean(row.tradeable),
      tradeable_on_ge: Boolean(row.tradeable_on_ge),
      stackable: Boolean(row.stackable),
      noted: Boolean(row.noted),
      noteable: Boolean(row.noteable),
      weight: row.weight,
      buy_limit: row.buy_limit,
      quest_item: Boolean(row.quest_item),
      release_date: row.release_date,
      duplicate: Boolean(row.duplicate),
      equipable: Boolean(row.equipable),
      equipable_by_player: Boolean(row.equipable_by_player),
      equipable_weapon: Boolean(row.equipable_weapon),
      cost: row.cost,
      lowalch: row.lowalch,
      highalch: row.highalch,
      destruction: row.destruction,
      last_updated: row.last_updated
    };
    if (row.slot) {
      item.equipment = {
        attack_stab: row.attack_stab || 0,
        attack_slash: row.attack_slash || 0,
        attack_crush: row.attack_crush || 0,
        attack_magic: row.attack_magic || 0,
        attack_ranged: row.attack_ranged || 0,
        defence_stab: row.defence_stab || 0,
        defence_slash: row.defence_slash || 0,
        defence_crush: row.defence_crush || 0,
        defence_magic: row.defence_magic || 0,
        defence_ranged: row.defence_ranged || 0,
        melee_strength: row.melee_strength || 0,
        ranged_strength: row.ranged_strength || 0,
        magic_damage: row.magic_damage || 0,
        prayer: row.equipment_prayer || 0,
        slot: row.slot,
        requirements: row.requirements ? JSON.parse(row.requirements) : null
      };
    }
    if (row.attack_speed) {
      item.weapon = {
        attack_speed: row.attack_speed,
        weapon_type: row.weapon_type,
        stab: row.weapon_stab || 0,
        slash: row.weapon_slash || 0,
        crush: row.weapon_crush || 0,
        magic: row.weapon_magic || 0,
        ranged: row.weapon_ranged || 0
      };
    }
    return item;
  }
  /**
   * Store icon data as BLOB in database
   */
  storeIconData(itemId, iconBuffer) {
    try {
      const stmt = this.db.prepare(`
        UPDATE items 
        SET icon_data = ? 
        WHERE id = ?
      `);
      const result = stmt.run(iconBuffer, itemId);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error storing icon data for item ${itemId}:`, error);
      return false;
    }
  }
  /**
   * Get icon data from database
   */
  getIconData(itemId) {
    try {
      const stmt = this.db.prepare(`
        SELECT icon_data 
        FROM items 
        WHERE id = ? AND icon_data IS NOT NULL
      `);
      const row = stmt.get(itemId);
      return row ? row.icon_data : null;
    } catch (error) {
      console.error(`Error getting icon data for item ${itemId}:`, error);
      return null;
    }
  }
  /**
   * Check if item has icon data stored
   */
  hasIconData(itemId) {
    try {
      const stmt = this.db.prepare(`
        SELECT 1 
        FROM items 
        WHERE id = ? AND icon_data IS NOT NULL
      `);
      return stmt.get(itemId) !== void 0;
    } catch (error) {
      console.error(`Error checking icon data for item ${itemId}:`, error);
      return false;
    }
  }
  /**
   * Get all items with missing icon data
   */
  getItemsWithoutIcons() {
    try {
      const stmt = this.db.prepare(`
        SELECT id, name, icon_path, icon_url
        FROM items 
        WHERE icon_data IS NULL
        ORDER BY id
      `);
      return stmt.all();
    } catch (error) {
      console.error("Error getting items without icons:", error);
      return [];
    }
  }
  /**
   * Get database statistics including icon data
   */
  getStats() {
    const itemCount = this.db.prepare("SELECT COUNT(*) as count FROM items").get().count;
    const itemsWithIcons = this.db.prepare("SELECT COUNT(*) as count FROM items WHERE icon_data IS NOT NULL").get().count;
    const equipmentCount = this.db.prepare("SELECT COUNT(*) as count FROM equipment_stats").get().count;
    const weaponCount = this.db.prepare("SELECT COUNT(*) as count FROM weapon_stats").get().count;
    const monsterCount = this.db.prepare("SELECT COUNT(*) as count FROM monsters").get().count;
    const prayerCount = this.db.prepare("SELECT COUNT(*) as count FROM prayers").get().count;
    return {
      items: itemCount,
      itemsWithIcons,
      iconCoverage: itemCount > 0 ? (itemsWithIcons / itemCount * 100).toFixed(1) + "%" : "0%",
      equipment: equipmentCount,
      weapons: weaponCount,
      monsters: monsterCount,
      prayers: prayerCount
    };
  }
  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
const databaseService = new DatabaseService();

class WikiApiClient {
  constructor() {
    this.baseUrl = "https://oldschool.runescape.wiki/api.php";
    this.userAgent = "OSRS-Item-API/1.0 (https://github.com/user/osrs-item-api)";
  }
  /**
   * Make a request to the OSRS Wiki API
   */
  async makeRequest(params) {
    const url = new URL(this.baseUrl);
    params.format = "json";
    params.origin = "*";
    Object.keys(params).forEach((key) => {
      url.searchParams.append(key, params[key]);
    });
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          "User-Agent": this.userAgent
        }
      };
      const req = https.get(url.toString(), options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Failed to parse JSON response: ${error.message}`));
          }
        });
      });
      req.on("error", (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });
      req.setTimeout(3e4, () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });
    });
  }
  /**
   * Get wikitext content for a page
   */
  async getPageContent(pageTitle) {
    var _a, _b, _c, _d, _e;
    try {
      const response = await this.makeRequest({
        action: "query",
        prop: "revisions",
        titles: pageTitle,
        rvprop: "content",
        rvslots: "main"
      });
      const pages = ((_a = response.query) == null ? void 0 : _a.pages) || {};
      const page = Object.values(pages)[0];
      if (!page || page.missing) {
        return null;
      }
      return ((_e = (_d = (_c = (_b = page.revisions) == null ? void 0 : _b[0]) == null ? void 0 : _c.slots) == null ? void 0 : _d.main) == null ? void 0 : _e["*"]) || null;
    } catch (error) {
      console.error(`Error getting page content for "${pageTitle}":`, error.message);
      return null;
    }
  }
  /**
   * Alias for getPageContent - get wikitext content for a page
   */
  async getPageWikitext(pageTitle) {
    return this.getPageContent(pageTitle);
  }
}

class WikitextParser {
  constructor(wikitext) {
    this.wikitext = wikitext || "";
  }
  /**
   * Extract value from infobox parameter
   */
  extractValue(paramName) {
    if (!this.wikitext) return null;
    const patterns = [
      new RegExp(`\\|\\s*${paramName}\\s*=\\s*([^\\|\\}]+)`, "i"),
      new RegExp(`\\|\\s*${paramName}\\s*=\\s*(.+?)(?=\\n\\||\\n\\}|\\}\\})`, "is")
    ];
    for (const pattern of patterns) {
      const match = this.wikitext.match(pattern);
      if (match) {
        let value = match[1].trim();
        value = value.replace(/<!--.*?-->/g, "");
        value = value.replace(/\[\[([^|\]]+)\|?[^\]]*\]\]/g, "$1");
        value = value.replace(/{{[^}]*}}/g, "");
        value = value.replace(/'''?([^']+)'''?/g, "$1");
        value = value.replace(/<[^>]*>/g, "");
        value = value.replace(/\n/g, " ");
        value = value.trim();
        return value || null;
      }
    }
    return null;
  }
  /**
   * Extract all infobox parameters
   */
  extractAllParameters() {
    if (!this.wikitext) return {};
    const params = {};
    const infoboxMatch = this.wikitext.match(/\{\{infobox[\s\S]*?\}\}/i);
    if (!infoboxMatch) return params;
    const infoboxContent = infoboxMatch[0];
    const paramMatches = infoboxContent.matchAll(/\|\s*([^=|\}]+?)\s*=\s*([^|\}]*?)(?=\n\s*\||$|\}\})/gi);
    for (const match of paramMatches) {
      const key = match[1].trim();
      let value = match[2].trim();
      value = value.replace(/<!--.*?-->/g, "");
      value = value.replace(/\[\[([^|\]]+)\|?[^\]]*\]\]/g, "$1");
      value = value.replace(/{{[^}]*}}/g, "");
      value = value.replace(/'''?([^']+)'''?/g, "$1");
      value = value.replace(/<[^>]*>/g, "");
      value = value.replace(/\n/g, " ");
      value = value.trim();
      if (value) {
        params[key.toLowerCase()] = value;
      }
    }
    return params;
  }
  /**
   * Extract item ID from wikitext
   */
  extractItemId() {
    const id = this.extractValue("id");
    if (id) {
      const numericId = parseInt(id.replace(/\D/g, ""));
      return isNaN(numericId) ? null : numericId;
    }
    return null;
  }
  /**
   * Check if this is a versioned item (has multiple IDs)
   */
  hasVersions() {
    const idValue = this.extractValue("id");
    return idValue && idValue.includes(",");
  }
  /**
   * Extract all version IDs for versioned items
   */
  extractVersionIds() {
    const idValue = this.extractValue("id");
    if (!idValue) return [];
    return idValue.split(",").map((id) => parseInt(id.trim().replace(/\D/g, ""))).filter((id) => !isNaN(id));
  }
  /**
   * Check if a specific infobox type exists on the page
   */
  extractInfobox(infoboxType) {
    if (!this.wikitext) return null;
    const pattern = new RegExp(`{{\\s*${infoboxType.replace(/\s+/g, "\\s+")}`, "i");
    const match = this.wikitext.match(pattern);
    if (match) {
      let startIndex = match.index;
      let braceCount = 0;
      let currentIndex = startIndex;
      while (currentIndex < this.wikitext.length) {
        const char = this.wikitext[currentIndex];
        if (char === "{") {
          braceCount++;
        } else if (char === "}") {
          braceCount--;
          if (braceCount === 0) {
            return this.wikitext.substring(startIndex, currentIndex + 1);
          }
        }
        currentIndex++;
      }
    }
    return null;
  }
}

class InfoboxCleaner {
  /**
   * Clean a value based on its expected type
   */
  static clean(value, type) {
    if (!value || value === "") return null;
    switch (type) {
      case "string":
        return this.cleanString(value);
      case "number":
        return this.cleanNumber(value);
      case "boolean":
        return this.cleanBoolean(value);
      case "examine":
        return this.cleanExamine(value);
      default:
        return this.cleanString(value);
    }
  }
  /**
   * Clean string values
   */
  static cleanString(value) {
    if (!value) return null;
    let cleaned = value.toString();
    cleaned = cleaned.replace(/\[\[([^|\]]+)\|?[^\]]*\]\]/g, "$1");
    cleaned = cleaned.replace(/{{[^}]*}}/g, "");
    cleaned = cleaned.replace(/'''?([^']+)'''?/g, "$1");
    cleaned = cleaned.replace(/<[^>]*>/g, "");
    cleaned = cleaned.replace(/<!--.*?-->/g, "");
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    return cleaned || null;
  }
  /**
   * Clean number values
   */
  static cleanNumber(value) {
    if (!value) return null;
    const numericMatch = value.toString().match(/[\d.]+/);
    if (!numericMatch) return null;
    const num = parseFloat(numericMatch[0]);
    return isNaN(num) ? null : num;
  }
  /**
   * Clean boolean values
   */
  static cleanBoolean(value) {
    if (!value) return null;
    const str = value.toString().toLowerCase().trim();
    const trueValues = ["yes", "true", "1", "y"];
    const falseValues = ["no", "false", "0", "n"];
    if (trueValues.includes(str)) return true;
    if (falseValues.includes(str)) return false;
    return null;
  }
  /**
   * Clean examine text
   */
  static cleanExamine(value) {
    if (!value) return null;
    let cleaned = this.cleanString(value);
    if (cleaned) {
      cleaned = cleaned.replace(/^(It's |This is |A )/i, "");
      cleaned = cleaned.replace(/\.$/, "");
      cleaned = cleaned.trim();
    }
    return cleaned || null;
  }
}

class WikiLookupService {
  constructor() {
    this.wikiClient = new WikiApiClient();
    this.databaseService = databaseService;
  }
  /**
   * Ensure database is initialized
   */
  async ensureDatabase() {
    if (!this.databaseService.db) {
      await this.databaseService.init();
    }
  }
  /**
   * Look up an item by ID on OSRS Wiki
   */
  async lookupItemById(itemId) {
    try {
      console.log(`\u{1F50D} Looking up item ID ${itemId} on OSRS Wiki...`);
      const searchResults = await this.searchForItemId(itemId);
      if (searchResults.length === 0) {
        console.log(`\u274C No pages found containing item ID ${itemId}`);
        return null;
      }
      for (const pageTitle of searchResults) {
        const itemVersions = await this.extractAllVersionsFromPage(pageTitle);
        const itemData = itemVersions.find((item) => item.id === parseInt(itemId));
        if (itemData) {
          console.log(`\u2705 Found item: ${itemData.name} (ID: ${itemId})`);
          for (const version of itemVersions) {
            await this.addItemToDatabase(version);
          }
          return itemData;
        }
      }
      console.log(`\u274C Item ID ${itemId} not found in any search results`);
      return null;
    } catch (error) {
      console.error(`\u274C Error looking up item ID ${itemId}:`, error.message);
      return null;
    }
  }
  /**
   * Look up an item by name on OSRS Wiki
   */
  async lookupItemByName(itemName) {
    try {
      console.log(`\u{1F50D} Looking up item "${itemName}" on OSRS Wiki...`);
      const searchVariations = [
        itemName,
        itemName.replace(/'/g, "'"),
        // Try straight apostrophe
        itemName.replace(/'/g, ""),
        // Remove apostrophes
        itemName.replace(/'/g, "%27"),
        // URL encoded apostrophe
        itemName.replace(/'/g, "_"),
        // Replace apostrophe with underscore (wiki format)
        itemName.replace(/ /g, "_"),
        // Replace spaces with underscores (wiki format)
        itemName.replace(/'/g, "_").replace(/ /g, "_")
        // Both replacements
      ];
      for (const searchName of searchVariations) {
        console.log(`\u{1F50D} Trying search variation: "${searchName}"`);
        const itemVersions = await this.extractAllVersionsFromPage(searchName);
        if (itemVersions.length > 0) {
          let bestMatch = itemVersions.find(
            (item) => item.name.toLowerCase() === itemName.toLowerCase()
          );
          if (!bestMatch) {
            bestMatch = itemVersions.find(
              (item) => item.name.toLowerCase().includes(itemName.toLowerCase())
            );
          }
          if (!bestMatch && itemVersions.length > 0) {
            bestMatch = itemVersions[0];
          }
          if (bestMatch) {
            console.log(`\u2705 Found item: ${bestMatch.name} (ID: ${bestMatch.id}) with ${itemVersions.length} versions`);
            for (const version of itemVersions) {
              await this.addItemToDatabase(version);
            }
            return bestMatch;
          }
        }
        const searchResults = await this.searchForItemName(searchName);
        for (const pageTitle of searchResults) {
          const itemVersions2 = await this.extractAllVersionsFromPage(pageTitle);
          for (const itemData of itemVersions2) {
            if (itemData.name.toLowerCase().includes(itemName.toLowerCase())) {
              console.log(`\u2705 Found item: ${itemData.name} (ID: ${itemData.id}) with ${itemVersions2.length} versions`);
              for (const version of itemVersions2) {
                await this.addItemToDatabase(version);
              }
              return itemData;
            }
          }
        }
      }
      console.log(`\u274C Item "${itemName}" not found`);
      return null;
    } catch (error) {
      console.error(`\u274C Error looking up item "${itemName}":`, error.message);
      return null;
    }
  }
  /**
   * Look up an item by its wiki page name (from the authoritative mapping)
   */
  async lookupItemByWikiPage(wikiPageName, expectedId = null) {
    try {
      console.log(`\u{1F50D} Looking up wiki page "${wikiPageName}" for item ID ${expectedId}...`);
      const decodedPageName = decodeURIComponent(wikiPageName);
      const itemVersions = await this.extractAllVersionsFromPage(decodedPageName);
      if (itemVersions.length === 0) {
        console.log(`\u274C No item data found on wiki page "${decodedPageName}"`);
        return null;
      }
      if (expectedId !== null) {
        const exactMatch = itemVersions.find((item) => item.id === expectedId);
        if (exactMatch) {
          console.log(`\u2705 Found exact match: ${exactMatch.name} (ID: ${exactMatch.id})`);
          for (const version of itemVersions) {
            await this.addItemToDatabase(version);
          }
          return exactMatch;
        }
      }
      const firstItem = itemVersions[0];
      console.log(`\u2705 Found item: ${firstItem.name} (ID: ${firstItem.id}) with ${itemVersions.length} versions`);
      for (const version of itemVersions) {
        await this.addItemToDatabase(version);
      }
      return firstItem;
    } catch (error) {
      console.error(`\u274C Error looking up wiki page "${wikiPageName}":`, error.message);
      return null;
    }
  }
  /**
   * Search for pages containing a specific item ID
   */
  async searchForItemId(itemId) {
    var _a;
    try {
      const response = await this.wikiClient.makeRequest({
        action: "query",
        list: "search",
        srsearch: `"${itemId}" infobox`,
        srnamespace: 0,
        // Main namespace only
        srlimit: 10
      });
      const results = ((_a = response.query) == null ? void 0 : _a.search) || [];
      return results.map((result) => result.title);
    } catch (error) {
      console.error(`Error searching for item ID ${itemId}:`, error.message);
      return [];
    }
  }
  /**
   * Search for pages containing a specific item name
   */
  async searchForItemName(itemName) {
    var _a;
    try {
      const response = await this.wikiClient.makeRequest({
        action: "query",
        list: "search",
        srsearch: `"${itemName}" infobox item`,
        srnamespace: 0,
        srlimit: 10
      });
      const results = ((_a = response.query) == null ? void 0 : _a.search) || [];
      return results.map((result) => result.title);
    } catch (error) {
      console.error(`Error searching for item "${itemName}":`, error.message);
      return [];
    }
  }
  /**
   * Extract item data from a wiki page
   */
  async extractItemDataFromPage(pageTitle, expectedId = null) {
    try {
      const wikitext = await this.wikiClient.getPageWikitext(pageTitle);
      if (!wikitext) return null;
      const parser = new WikitextParser(wikitext);
      let hasInfobox = false;
      if (parser.extractInfobox("infobox item") || parser.extractInfobox("Infobox Item") || parser.extractInfobox("infobox pet") || parser.extractInfobox("Infobox Pet") || parser.extractInfobox("item") || parser.extractInfobox("Item") || parser.extractInfobox("pet") || parser.extractInfobox("Pet")) {
        hasInfobox = true;
      }
      if (!hasInfobox) {
        const doc = parser.doc;
        if (doc) {
          const infoboxes = doc.infoboxes();
          for (const infobox of infoboxes) {
            const data = infobox.data || {};
            if (data.id || data.name || data.examine || data.value) {
              parser.template = parser.processInfobox(infobox);
              hasInfobox = true;
              break;
            }
          }
        }
      }
      if (!hasInfobox) return null;
      const id = parser.extractId();
      if (!id) return null;
      if (expectedId && id.toString() !== expectedId.toString()) {
        return null;
      }
      const iconFilename = parser.extractIcon();
      let localIconPath = null;
      let iconData = null;
      if (iconFilename) {
        const iconUrl = parser.getIconUrl(iconFilename);
        if (iconUrl) {
          const iconFileName = `${id}.png`;
          const iconResult = await this.downloadIcon(iconUrl, iconFileName, id, pageTitle, pageTitle);
          if (iconResult && iconResult.buffer) {
            localIconPath = iconResult.fileName;
            iconData = iconResult.buffer;
          }
        }
      }
      const itemData = {
        id,
        name: InfoboxCleaner.clean(parser.extractValue("name"), "string") || pageTitle,
        examine: InfoboxCleaner.clean(parser.extractValue("examine"), "examine"),
        wiki_name: pageTitle,
        wiki_url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(pageTitle)}`,
        icon_path: localIconPath || null,
        icon_url: null,
        icon_data: iconData,
        // Include the downloaded icon buffer
        members: InfoboxCleaner.clean(parser.extractValue("members"), "boolean"),
        tradeable: InfoboxCleaner.clean(parser.extractValue("tradeable"), "boolean"),
        tradeable_on_ge: InfoboxCleaner.clean(parser.extractValue("exchangeable"), "boolean"),
        stackable: InfoboxCleaner.clean(parser.extractValue("stackable"), "boolean"),
        noted: InfoboxCleaner.clean(parser.extractValue("noted"), "boolean"),
        noteable: InfoboxCleaner.clean(parser.extractValue("noteable"), "boolean"),
        weight: InfoboxCleaner.clean(parser.extractValue("weight"), "number"),
        buy_limit: InfoboxCleaner.clean(parser.extractValue("buylimit"), "number"),
        quest_item: InfoboxCleaner.clean(parser.extractValue("quest"), "boolean"),
        release_date: InfoboxCleaner.clean(parser.extractValue("release"), "date"),
        duplicate: false,
        equipable: false,
        equipable_by_player: false,
        equipable_weapon: false,
        cost: InfoboxCleaner.clean(parser.extractValue("cost"), "number"),
        lowalch: InfoboxCleaner.clean(parser.extractValue("low"), "number"),
        highalch: InfoboxCleaner.clean(parser.extractValue("high"), "number"),
        destruction: InfoboxCleaner.clean(parser.extractValue("destroy"), "string"),
        last_updated: (/* @__PURE__ */ new Date()).toISOString(),
        _source: "wiki_lookup"
        // Mark this as dynamically fetched
      };
      const slot = InfoboxCleaner.clean(parser.extractValue("slot"), "string");
      if (slot) {
        itemData.equipable = true;
        itemData.equipable_by_player = true;
        itemData.equipment = {
          attack_stab: InfoboxCleaner.clean(parser.extractValue("astab"), "stats"),
          attack_slash: InfoboxCleaner.clean(parser.extractValue("aslash"), "stats"),
          attack_crush: InfoboxCleaner.clean(parser.extractValue("acrush"), "stats"),
          attack_magic: InfoboxCleaner.clean(parser.extractValue("amagic"), "stats"),
          attack_ranged: InfoboxCleaner.clean(parser.extractValue("arange"), "stats"),
          defence_stab: InfoboxCleaner.clean(parser.extractValue("dstab"), "stats"),
          defence_slash: InfoboxCleaner.clean(parser.extractValue("dslash"), "stats"),
          defence_crush: InfoboxCleaner.clean(parser.extractValue("dcrush"), "stats"),
          defence_magic: InfoboxCleaner.clean(parser.extractValue("dmagic"), "stats"),
          defence_ranged: InfoboxCleaner.clean(parser.extractValue("drange"), "stats"),
          melee_strength: InfoboxCleaner.clean(parser.extractValue("str"), "stats"),
          ranged_strength: InfoboxCleaner.clean(parser.extractValue("rstr"), "stats"),
          magic_damage: InfoboxCleaner.clean(parser.extractValue("mdmg"), "stats"),
          prayer: InfoboxCleaner.clean(parser.extractValue("prayer"), "stats"),
          slot,
          requirements: InfoboxCleaner.clean(parser.extractValue("reqs"), "requirements")
        };
        const attackSpeed = parser.extractValue("aspeed");
        if (attackSpeed) {
          itemData.equipable_weapon = true;
          itemData.weapon = {
            attack_speed: InfoboxCleaner.clean(attackSpeed, "number"),
            weapon_type: InfoboxCleaner.clean(parser.extractValue("wtype"), "string"),
            stab: itemData.equipment.attack_stab,
            slash: itemData.equipment.attack_slash,
            crush: itemData.equipment.attack_crush,
            magic: itemData.equipment.attack_magic,
            ranged: itemData.equipment.attack_ranged
          };
        }
      }
      return itemData;
    } catch (error) {
      console.error(`Error extracting item data from ${pageTitle}:`, error.message);
      return null;
    }
  }
  /**
   * Extract all versions from a versioned item page
   */
  async extractAllVersionsFromPage(pageTitle) {
    try {
      const wikitext = await this.wikiClient.getPageWikitext(pageTitle);
      if (!wikitext) return [];
      const parser = new WikitextParser(wikitext);
      let hasInfobox = false;
      if (parser.extractInfobox("infobox item") || parser.extractInfobox("Infobox Item") || parser.extractInfobox("infobox pet") || parser.extractInfobox("Infobox Pet") || parser.extractInfobox("item") || parser.extractInfobox("Item") || parser.extractInfobox("pet") || parser.extractInfobox("Pet")) {
        hasInfobox = true;
      }
      if (!hasInfobox) {
        const doc = parser.doc;
        if (doc) {
          const infoboxes = doc.infoboxes();
          for (const infobox of infoboxes) {
            const data = infobox.data || {};
            if (data.id || data.name || data.examine || data.value) {
              parser.template = parser.processInfobox(infobox);
              hasInfobox = true;
              break;
            }
          }
        }
      }
      if (!hasInfobox || !parser.template) return [];
      parser.determineVersioning();
      if (!parser.isVersioned) {
        const id = parser.extractId();
        if (!id) return [];
        const itemData = await this.extractSingleItemData(parser, pageTitle, id, null);
        return itemData ? [itemData] : [];
      }
      const versions = [];
      const template = parser.template;
      const versionNumbers = /* @__PURE__ */ new Set();
      for (const key in template) {
        const match = key.match(/^(id|name|version)(\d+)$/i);
        if (match) {
          versionNumbers.add(parseInt(match[2]));
        }
      }
      console.log(`\u{1F50D} Found ${versionNumbers.size} versions for ${pageTitle}`);
      for (const versionNum of Array.from(versionNumbers).sort()) {
        const id = this.extractVersionedValue(template, "id", versionNum);
        if (id) {
          const itemData = await this.extractSingleItemData(parser, pageTitle, id, versionNum);
          if (itemData) {
            versions.push(itemData);
          }
        }
      }
      return versions;
    } catch (error) {
      console.error(`Error extracting versions from ${pageTitle}:`, error.message);
      return [];
    }
  }
  /**
   * Extract value for a specific version (e.g., name1, name2)
   */
  extractVersionedValue(template, field, versionNum) {
    const versionedKey = `${field}${versionNum}`;
    let value = null;
    if (template[versionedKey]) {
      value = this.cleanValue(template[versionedKey]);
    } else if (template[field]) {
      value = this.cleanValue(template[field]);
    }
    if (value && field === "image") {
      const fileMatch = value.match(/\[\[File:([^\]]+)\]\]/);
      if (fileMatch) {
        const filename = fileMatch[1].replace(/\.png$/i, "");
        return filename;
      }
    }
    return value;
  }
  /**
   * Clean value (same as WikitextParser cleanValue)
   */
  cleanValue(value) {
    if (!value) return "";
    if (value && typeof value === "object") {
      if (value.text && typeof value.text === "function") {
        return value.text().trim();
      } else if (value.toString) {
        return value.toString().trim();
      }
      return String(value).trim();
    }
    return String(value).replace(/\s+/g, " ").trim();
  }
  /**
   * Extract item data for a single version
   */
  async extractSingleItemData(parser, pageTitle, id, versionNum) {
    try {
      const template = parser.template;
      const getName = (field) => {
        if (versionNum) {
          const versionedValue = this.extractVersionedValue(template, field, versionNum);
          if (versionedValue) return versionedValue;
        }
        return parser.extractValue(field);
      };
      const iconFilename = versionNum ? this.extractVersionedValue(template, "image", versionNum) || parser.extractIcon() : parser.extractIcon();
      let localIconPath = null;
      let iconData = null;
      if (iconFilename) {
        const iconUrl = parser.getIconUrl(iconFilename);
        if (iconUrl) {
          const iconFileName = `${id}.png`;
          const itemName = InfoboxCleaner.clean(getName("name"), "string") || (versionNum ? `${pageTitle} ${versionNum}` : pageTitle);
          const iconNameForPattern = iconFilename || itemName;
          const iconResult = await this.downloadIcon(iconUrl, iconFileName, id, iconNameForPattern, pageTitle);
          if (iconResult && iconResult.buffer) {
            localIconPath = iconResult.fileName;
            iconData = iconResult.buffer;
          }
        }
      }
      const itemData = {
        id: parseInt(id),
        name: InfoboxCleaner.clean(getName("name"), "string") || (versionNum ? `${pageTitle} ${versionNum}` : pageTitle),
        examine: InfoboxCleaner.clean(getName("examine"), "examine"),
        wiki_name: pageTitle,
        wiki_url: `https://oldschool.runescape.wiki/w/${encodeURIComponent(pageTitle)}`,
        icon_path: localIconPath || null,
        icon_url: null,
        icon_data: iconData,
        // Include the downloaded icon buffer
        members: InfoboxCleaner.clean(getName("members"), "boolean"),
        tradeable: InfoboxCleaner.clean(getName("tradeable"), "boolean"),
        tradeable_on_ge: InfoboxCleaner.clean(getName("exchangeable"), "boolean"),
        stackable: InfoboxCleaner.clean(getName("stackable"), "boolean"),
        noted: InfoboxCleaner.clean(getName("noted"), "boolean"),
        noteable: InfoboxCleaner.clean(getName("noteable"), "boolean"),
        weight: InfoboxCleaner.clean(getName("weight"), "number"),
        buy_limit: InfoboxCleaner.clean(getName("buylimit"), "number"),
        quest_item: InfoboxCleaner.clean(getName("quest"), "boolean"),
        release_date: InfoboxCleaner.clean(getName("release"), "date"),
        duplicate: false,
        equipable: false,
        equipable_by_player: false,
        equipable_weapon: false,
        cost: InfoboxCleaner.clean(getName("cost"), "number"),
        lowalch: InfoboxCleaner.clean(getName("low"), "number"),
        highalch: InfoboxCleaner.clean(getName("high"), "number"),
        destruction: InfoboxCleaner.clean(getName("destroy"), "string"),
        last_updated: (/* @__PURE__ */ new Date()).toISOString(),
        _source: "wiki_lookup",
        _version: versionNum || 1
      };
      const slot = InfoboxCleaner.clean(getName("slot"), "string");
      if (slot) {
        itemData.equipable = true;
        itemData.equipable_by_player = true;
        itemData.equipment = {
          attack_stab: InfoboxCleaner.clean(getName("astab"), "stats"),
          attack_slash: InfoboxCleaner.clean(getName("aslash"), "stats"),
          attack_crush: InfoboxCleaner.clean(getName("acrush"), "stats"),
          attack_magic: InfoboxCleaner.clean(getName("amagic"), "stats"),
          attack_ranged: InfoboxCleaner.clean(getName("arange"), "stats"),
          defence_stab: InfoboxCleaner.clean(getName("dstab"), "stats"),
          defence_slash: InfoboxCleaner.clean(getName("dslash"), "stats"),
          defence_crush: InfoboxCleaner.clean(getName("dcrush"), "stats"),
          defence_magic: InfoboxCleaner.clean(getName("dmagic"), "stats"),
          defence_ranged: InfoboxCleaner.clean(getName("drange"), "stats"),
          melee_strength: InfoboxCleaner.clean(getName("str"), "stats"),
          ranged_strength: InfoboxCleaner.clean(getName("rstr"), "stats"),
          magic_damage: InfoboxCleaner.clean(getName("mdmg"), "stats"),
          prayer: InfoboxCleaner.clean(getName("prayer"), "stats"),
          slot,
          requirements: InfoboxCleaner.clean(getName("reqs"), "requirements")
        };
        const attackSpeed = getName("aspeed");
        if (attackSpeed) {
          itemData.equipable_weapon = true;
          itemData.weapon = {
            attack_speed: InfoboxCleaner.clean(attackSpeed, "number"),
            weapon_type: InfoboxCleaner.clean(getName("wtype"), "string"),
            stab: itemData.equipment.attack_stab,
            slash: itemData.equipment.attack_slash,
            crush: itemData.equipment.attack_crush,
            magic: itemData.equipment.attack_magic,
            ranged: itemData.equipment.attack_ranged
          };
        }
      }
      return itemData;
    } catch (error) {
      console.error(`Error extracting single item data:`, error.message);
      return null;
    }
  }
  /**
   * Download icon for a newly found item
   */
  /**
   * Get intelligent wiki image names by parsing the actual wiki page
   */
  async getWikiImageNames(itemName) {
    try {
      const wikiUrl = `https://oldschool.runescape.wiki/w/${encodeURIComponent(itemName.replace(/ /g, "_"))}`;
      console.log(`    \u{1F50D} Parsing wiki page: ${wikiUrl}`);
      const response = await fetch(wikiUrl);
      if (!response.ok) {
        return [];
      }
      const html = await response.text();
      const imageNames = /* @__PURE__ */ new Set();
      const infoboxMatches = html.match(/class="[^"]*infobox[^"]*"[^>]*>[\s\S]*?src="[^"]*\/images\/([^"\/]+\.png)"/gi);
      if (infoboxMatches) {
        infoboxMatches.forEach((match) => {
          var _a;
          const filename = (_a = match.match(/\/images\/([^"\/]+\.png)/i)) == null ? void 0 : _a[1];
          if (filename && this.isRelevantImage(filename, itemName)) {
            imageNames.add(decodeURIComponent(filename.replace(/_/g, " ").replace(".png", "")));
          }
        });
      }
      const fileMatches = html.match(/File:([^|\]]+\.png)/gi);
      if (fileMatches) {
        fileMatches.forEach((match) => {
          const filename = match.replace(/^File:/i, "").replace(".png", "");
          if (this.isRelevantImage(filename + ".png", itemName)) {
            imageNames.add(decodeURIComponent(filename.replace(/_/g, " ")));
          }
        });
      }
      return Array.from(imageNames);
    } catch (error) {
      console.log(`    \u274C Error parsing wiki page: ${error.message}`);
      return [];
    }
  }
  isRelevantImage(filename, itemName) {
    const filenameLower = filename.toLowerCase();
    const excludePatterns = [
      "creative_commons",
      "footer",
      "logo",
      "icon_external",
      "edit",
      "discord",
      "arrow",
      "button",
      "background",
      "banner",
      "header",
      "navigation",
      "wiki",
      "search",
      "menu",
      "ui_",
      "interface",
      "chat",
      "cursor"
    ];
    if (excludePatterns.some((pattern) => filenameLower.includes(pattern))) {
      return false;
    }
    if (filenameLower.includes("_detail.png") || filenameLower.includes("_inventory")) {
      return true;
    }
    const itemKeywords = itemName.toLowerCase().split(" ").filter((word) => word.length > 2);
    return itemKeywords.some((keyword) => filenameLower.includes(keyword));
  }
  /**
   * Get alternate names using enhanced patterns
   */
  getAlternateNames(itemName) {
    const alternates = [];
    const manualMappings = {
      "Grinder": ["Pestle and mortar"],
      "Golden bowl": ["Golden bowl (water)", "Gold bowl", "Blessed gold bowl"],
      "Broken shield": ["Broken shield (Hero's Quest)", "Broken shield (Heroes' Quest)"],
      "Twigs": ["Twig"],
      // Food items with variant patterns
      "Meat pie": ["Meat pie#Full"],
      "Half a meat pie": ["Meat pie#Half"],
      "Apple pie": ["Apple pie#Full"],
      "Half an apple pie": ["Apple pie#Half"],
      "Redberry pie": ["Redberry pie#Full"],
      "Half a redberry pie": ["Redberry pie#Half"],
      "Plain pizza": ["Plain pizza#Full"],
      "1/2 plain pizza": ["Plain pizza#Half"],
      "Meat pizza": ["Meat pizza#Full"],
      "1/2 meat pizza": ["Meat pizza#Half"],
      "Anchovy pizza": ["Anchovy pizza#Full"],
      "1/2 anchovy pizza": ["Anchovy pizza#Half"],
      "Pineapple pizza": ["Pineapple pizza#Full"],
      "1/2 pineapple pizza": ["Pineapple pizza#Half"],
      // Cocktail variants
      "Unfinished cocktail": ["Pineapple punch", "Fruit blast", "Wizard blizzard", "Short green guy", "Drunk dragon"],
      "Odd cocktail": ["Barbarian herblore", "Relicym's balm"]
    };
    if (manualMappings[itemName]) {
      alternates.push(...manualMappings[itemName]);
    }
    if (itemName.includes("#")) {
      const baseName = itemName.split("#")[0].trim();
      alternates.push(baseName);
    } else {
      alternates.push(`${itemName}#Full`);
      alternates.push(`${itemName}#Half`);
      if (itemName.startsWith("Half ")) {
        const fullName = itemName.replace("Half ", "").replace("a ", "").replace("an ", "");
        alternates.push(`${fullName}#Half`);
        alternates.push(`${fullName}#Full`);
      }
      if (itemName.startsWith("1/2 ")) {
        const fullName = itemName.replace("1/2 ", "");
        alternates.push(`${fullName}#Half`);
        alternates.push(`${fullName}#Full`);
      }
    }
    if (itemName.startsWith("Pet ")) {
      const petType = itemName.substring(4);
      const colors = ["white", "black", "brown", "grey", "red", "blue", "green"];
      const colorCombinations = ["grey and black", "grey and brown", "brown and white"];
      colors.forEach((color) => {
        alternates.push(`${petType} (${color})`);
      });
      colorCombinations.forEach((combo) => {
        alternates.push(`${petType} (${combo})`);
      });
    }
    const commonStates = ["(uncharged)", "(charged)", "(p)", "(p+)", "(p++)", "(noted)", "(e)"];
    commonStates.forEach((state) => {
      if (!itemName.includes(state)) {
        alternates.push(`${itemName} ${state}`);
      }
    });
    return [...new Set(alternates)].filter((name) => name !== itemName);
  }
  /**
   * Download and cache an icon file in database with enhanced intelligent patterns
   */
  async downloadIcon(iconUrl, fileName, itemId, itemName = null, wikiPageTitle = null) {
    if (!iconUrl || !fileName || !itemId) return null;
    try {
      if (await this.databaseService.hasIconData(itemId)) {
        return fileName;
      }
      console.log(`\u{1F4E5} Enhanced download for: ${fileName} (item ${itemId})`);
      if (itemName) {
        console.log(`  \u{1F9E0} Using intelligent patterns for: ${itemName}`);
        const pageForParsing = wikiPageTitle || itemName;
        const wikiImageNames = await this.getWikiImageNames(pageForParsing);
        const alternateNames = this.getAlternateNames(itemName);
        const urlPatterns = [
          // Basic patterns
          `https://oldschool.runescape.wiki/images/${itemName.replace(/ /g, "_")}.png`,
          `https://oldschool.runescape.wiki/images/${itemName.replace(/ /g, "_")}_detail.png`,
          `https://oldschool.runescape.wiki/images/${itemId}.png`,
          // Special patterns for food items with fractions (1/2 -> 1-2)
          `https://oldschool.runescape.wiki/images/${itemName.replace(/\//g, "-").replace(/ /g, "_")}.png`,
          `https://oldschool.runescape.wiki/images/${itemName.replace(/\//g, "-").replace(/ /g, "_")}_detail.png`,
          // Intelligent names from wiki page parsing
          ...wikiImageNames.map((name) => `https://oldschool.runescape.wiki/images/${name.replace(/ /g, "_")}.png`),
          ...wikiImageNames.map((name) => `https://oldschool.runescape.wiki/images/${name.replace(/ /g, "_")}_detail.png`),
          // Manual alternate names
          ...alternateNames.map((altName) => `https://oldschool.runescape.wiki/images/${altName.replace(/ /g, "_")}.png`),
          ...alternateNames.map((altName) => `https://oldschool.runescape.wiki/images/${altName.replace(/ /g, "_")}_detail.png`),
          // Alternate names with slash-to-hyphen conversion
          ...alternateNames.map((altName) => `https://oldschool.runescape.wiki/images/${altName.replace(/\//g, "-").replace(/ /g, "_")}.png`),
          ...alternateNames.map((altName) => `https://oldschool.runescape.wiki/images/${altName.replace(/\//g, "-").replace(/ /g, "_")}_detail.png`),
          // Original URL patterns (fallback)
          iconUrl,
          `https://oldschool.runescape.wiki/images/${fileName.replace(/\.(png|gif|jpg|jpeg)$/i, "").replace(/ /g, "_")}.png`,
          `https://oldschool.runescape.wiki/images/${encodeURIComponent(fileName.replace(/\.(png|gif|jpg|jpeg)$/i, ""))}.png`
        ];
        const uniqueUrls = [...new Set(urlPatterns)];
        console.log(`  \u{1F4CA} Generated ${uniqueUrls.length} intelligent URL patterns`);
        for (let i = 0; i < uniqueUrls.length; i++) {
          const tryUrl = uniqueUrls[i];
          const iconBuffer = await this.downloadIconFromUrl(tryUrl);
          if (iconBuffer) {
            console.log(`  \u2705 Success with intelligent pattern: ${tryUrl}`);
            return {
              fileName,
              buffer: iconBuffer,
              url: tryUrl
            };
          }
          if (i < uniqueUrls.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      } else {
        console.log(`  \u{1F4CB} Using basic patterns (no item name provided)`);
        let urlBaseName = iconUrl.includes("/images/") ? iconUrl.split("/images/")[1].replace(/\.(png|gif|jpg|jpeg)$/i, "") : fileName.replace(/\.(png|gif|jpg|jpeg)$/i, "");
        urlBaseName = decodeURIComponent(urlBaseName);
        const urlVariations = [
          `https://oldschool.runescape.wiki/images/${urlBaseName.replace(/ /g, "_")}.png`,
          iconUrl,
          `https://oldschool.runescape.wiki/images/${urlBaseName}.png`,
          `https://oldschool.runescape.wiki/images/${urlBaseName.replace(/ /g, "%20")}.png`,
          `https://oldschool.runescape.wiki/images/${encodeURIComponent(urlBaseName)}.png`
        ];
        const uniqueUrls = [...new Set(urlVariations)];
        for (let i = 0; i < uniqueUrls.length; i++) {
          const tryUrl = uniqueUrls[i];
          const iconBuffer = await this.downloadIconFromUrl(tryUrl);
          if (iconBuffer) {
            console.log(`  \u2705 Success with basic pattern: ${tryUrl}`);
            return {
              fileName,
              buffer: iconBuffer,
              url: tryUrl
            };
          }
          if (i < uniqueUrls.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1e3));
          }
        }
      }
      console.log(`  \u274C All URL patterns failed for: ${fileName}`);
      return null;
    } catch (error) {
      console.warn(`\u26A0\uFE0F  Error downloading icon ${fileName}:`, error.message);
      return null;
    }
  }
  /**
   * Download icon from URL and return buffer
   */
  async downloadIconFromUrl(url) {
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "image",
          "Sec-Fetch-Mode": "no-cors",
          "Sec-Fetch-Site": "cross-site",
          "Referer": "https://oldschool.runescape.wiki/"
        }
      };
      const request = https.get(options, (response) => {
        if (response.statusCode === 200) {
          const chunks = [];
          response.on("data", (chunk) => {
            chunks.push(chunk);
          });
          response.on("end", () => {
            const buffer = Buffer.concat(chunks);
            console.log(`\u2705 Successfully downloaded icon: ${url} (${buffer.length} bytes)`);
            resolve(buffer);
          });
        } else if (response.statusCode === 404) {
          console.warn(`\u26A0\uFE0F  Icon not found (404): ${url}`);
          resolve(null);
        } else {
          console.warn(`\u26A0\uFE0F  Failed to download icon: ${response.statusCode} - ${url}`);
          resolve(null);
        }
      });
      request.on("error", (error) => {
        console.warn(`\u26A0\uFE0F  Error downloading icon from ${url}:`, error.message);
        resolve(null);
      });
      request.setTimeout(15e3, () => {
        request.destroy();
        console.warn(`\u26A0\uFE0F  Timeout downloading icon from ${url}`);
        resolve(null);
      });
    });
  }
  /**
   * Add a newly found item to the database
   */
  async addItemToDatabase(itemData) {
    try {
      await this.ensureDatabase();
      const dbItemData = {
        id: itemData.id,
        name: itemData.name,
        examine: itemData.examine,
        wiki_name: itemData.wiki_name,
        wiki_url: itemData.wiki_url,
        icon_path: itemData.icon_path,
        icon_url: itemData.icon_url,
        icon_data: itemData.icon_data,
        // Include icon buffer data
        members: itemData.members,
        tradeable: itemData.tradeable,
        tradeable_on_ge: itemData.tradeable_on_ge,
        stackable: itemData.stackable,
        noted: itemData.noted,
        noteable: itemData.noteable,
        weight: itemData.weight || 0,
        buy_limit: itemData.buy_limit || 0,
        quest_item: itemData.quest_item,
        release_date: itemData.release_date,
        duplicate: itemData.duplicate || false,
        equipable: itemData.equipable || false,
        equipable_by_player: itemData.equipable_by_player || false,
        equipable_weapon: itemData.equipable_weapon || false,
        cost: itemData.cost || 0,
        lowalch: itemData.lowalch || 0,
        highalch: itemData.highalch || 0,
        destruction: itemData.destruction,
        last_updated: (/* @__PURE__ */ new Date()).toISOString()
      };
      const result = this.databaseService.insertItem(dbItemData);
      if (result && result.changes > 0) {
        console.log(`\u{1F4BE} Added item ${itemData.name} (ID: ${itemData.id}) to database`);
        if (itemData.icon_data) {
          console.log(`  \u2705 Icon data stored in database for item ${itemData.id}`);
        }
        return true;
      } else {
        console.error(`\u274C Failed to insert item ${itemData.name} (ID: ${itemData.id}) into database - no changes made`);
        return false;
      }
    } catch (error) {
      console.error(`\u274C Error adding item to database:`, error.message);
      return false;
    }
  }
}

function detectImageFormat(buffer) {
  if (!buffer || buffer.length < 8) return "png";
  const hex = buffer.slice(0, 8).toString("hex");
  if (hex.startsWith("89504e47")) return "png";
  if (hex.startsWith("52494646")) return "webp";
  if (hex.startsWith("ffd8ff")) return "jpeg";
  if (hex.startsWith("47494638")) return "gif";
  return "png";
}
class IconService {
  /**
   * Get item icon as base64 data URL from database only
   */
  static async getItemIcon(itemId) {
    try {
      const iconBuffer = databaseService.getIconData(itemId);
      if (iconBuffer && iconBuffer.length > 0) {
        const format = detectImageFormat(iconBuffer);
        const base64Data = iconBuffer.toString("base64");
        return `data:image/${format};base64,${base64Data}`;
      }
      console.warn(`No icon found in database for item ${itemId}`);
      return null;
    } catch (error) {
      console.error(`Error getting icon for item ${itemId}:`, error);
      return null;
    }
  }
  /**
   * Get item icon as raw buffer from database only
   */
  static async getItemIconBuffer(itemId) {
    try {
      const iconBuffer = databaseService.getIconData(itemId);
      if (iconBuffer && iconBuffer.length > 0) {
        return iconBuffer;
      }
      console.warn(`No icon found in database for item ${itemId}`);
      return null;
    } catch (error) {
      console.error(`Error getting icon buffer for item ${itemId}:`, error);
      return null;
    }
  }
  /**
   * Check if an item has an icon in the database
   */
  static hasIcon(itemId) {
    try {
      const iconBuffer = databaseService.getIconData(itemId);
      return iconBuffer && iconBuffer.length > 0;
    } catch (error) {
      return false;
    }
  }
  /**
   * Get all items that have icons in the database
   */
  static getItemsWithIcons() {
    try {
      const db = databaseService.db;
      const itemsWithIcons = db.prepare(`
        SELECT id, name, length(icon_data) as icon_size 
        FROM items 
        WHERE icon_data IS NOT NULL AND length(icon_data) > 0
        ORDER BY id
      `).all();
      return itemsWithIcons;
    } catch (error) {
      console.error("Error getting items with icons:", error);
      return [];
    }
  }
  /**
   * Get items without icons (for fixing purposes)
   */
  static getItemsWithoutIcons() {
    try {
      const db = databaseService.db;
      const itemsWithoutIcons = db.prepare(`
        SELECT id, name 
        FROM items 
        WHERE icon_data IS NULL OR length(icon_data) = 0
        ORDER BY id
      `).all();
      return itemsWithoutIcons;
    } catch (error) {
      console.error("Error getting items without icons:", error);
      return [];
    }
  }
  /**
   * Get skill icon as base64 data URL from database only
   * Uses negative ID mapping for skill icons (-1 to -24)
   */
  static async getSkillIcon(skillName) {
    try {
      const specialIcon = await this.getSkillIconFromSpecialTable(skillName);
      if (specialIcon) {
        return specialIcon;
      }
      const skillId = this.getSkillIconId(skillName);
      const iconBuffer = databaseService.getIconData(skillId);
      if (iconBuffer && iconBuffer.length > 0) {
        const format = detectImageFormat(iconBuffer);
        return `data:image/${format};base64,${iconBuffer.toString("base64")}`;
      }
      console.warn(`No skill icon found in database for ${skillName} (ID: ${skillId})`);
      return null;
    } catch (error) {
      console.error(`Error loading skill icon ${skillName}:`, error);
      return null;
    }
  }
  /**
   * Get skill icon ID (negative IDs for skill icons)
   */
  static getSkillIconId(skillName) {
    const skillIds = {
      "attack": -1,
      "defence": -2,
      "strength": -3,
      "hitpoints": -4,
      "ranged": -5,
      "prayer": -6,
      "magic": -7,
      "cooking": -8,
      "woodcutting": -9,
      "fletching": -10,
      "fishing": -11,
      "firemaking": -12,
      "crafting": -13,
      "smithing": -14,
      "mining": -15,
      "herblore": -16,
      "agility": -17,
      "thieving": -18,
      "slayer": -19,
      "farming": -20,
      "runecraft": -21,
      "hunter": -22,
      "construction": -23,
      "overall": -24
    };
    return skillIds[skillName.toLowerCase()] || -999;
  }
  /**
   * Get collection log background icon from database
   * Should be stored with a special negative ID
   */
  static async getCollectionLogIcon() {
    try {
      const specialIcon = await this.getCollectionLogIconFromSpecialTable();
      if (specialIcon) {
        return specialIcon;
      }
      const iconBuffer = databaseService.getIconData(-100);
      if (iconBuffer && iconBuffer.length > 0) {
        const format = detectImageFormat(iconBuffer);
        return `data:image/${format};base64,${iconBuffer.toString("base64")}`;
      }
      console.warn("No collection log icon found in database");
      return null;
    } catch (error) {
      console.error("Error loading collection log icon:", error);
      return null;
    }
  }
  /**
   * Get icon statistics
   */
  static getIconStats() {
    try {
      const db = databaseService.db;
      const totalItems = db.prepare("SELECT COUNT(*) as count FROM items").get().count;
      const itemsWithIcons = db.prepare("SELECT COUNT(*) as count FROM items WHERE icon_data IS NOT NULL AND length(icon_data) > 0").get().count;
      const itemsWithoutIcons = totalItems - itemsWithIcons;
      const averageIconSize = db.prepare("SELECT AVG(length(icon_data)) as avg_size FROM items WHERE icon_data IS NOT NULL AND length(icon_data) > 0").get().avg_size;
      const totalIconSize = db.prepare("SELECT SUM(length(icon_data)) as total_size FROM items WHERE icon_data IS NOT NULL AND length(icon_data) > 0").get().total_size;
      return {
        totalItems,
        itemsWithIcons,
        itemsWithoutIcons,
        coveragePercentage: (itemsWithIcons / totalItems * 100).toFixed(2),
        averageIconSize: Math.round(averageIconSize || 0),
        totalIconSize: totalIconSize || 0
      };
    } catch (error) {
      console.error("Error getting icon stats:", error);
      return null;
    }
  }
  /**
   * Check if skill icon exists in database
   */
  static hasSkillIcon(skillName) {
    try {
      const skillId = this.getSkillIconId(skillName);
      const iconBuffer = databaseService.getIconData(skillId);
      return iconBuffer && iconBuffer.length > 0;
    } catch (error) {
      return false;
    }
  }
  /**
   * Get all skill icons that are missing from database
   */
  static getMissingSkillIcons() {
    const skills = [
      "attack",
      "defence",
      "strength",
      "hitpoints",
      "ranged",
      "prayer",
      "magic",
      "cooking",
      "woodcutting",
      "fletching",
      "fishing",
      "firemaking",
      "crafting",
      "smithing",
      "mining",
      "herblore",
      "agility",
      "thieving",
      "slayer",
      "farming",
      "runecraft",
      "hunter",
      "construction",
      "overall"
    ];
    return skills.filter((skill) => !this.hasSkillIcon(skill));
  }
  /**
   * Get skill icon from the special_icons table (NEW METHOD)
   */
  static async getSkillIconFromSpecialTable(skillName) {
    try {
      const db = databaseService.db;
      const skillIcon = db.prepare(`
        SELECT icon_data, icon_mime_type 
        FROM special_icons 
        WHERE name = ? AND type = 'skill'
      `).get(skillName.toLowerCase());
      if (skillIcon && skillIcon.icon_data) {
        const mimeType = skillIcon.icon_mime_type || "image/png";
        return `data:${mimeType};base64,${skillIcon.icon_data}`;
      }
      console.warn(`No skill icon found in special_icons table for ${skillName}`);
      return null;
    } catch (error) {
      console.error(`Error loading skill icon ${skillName}:`, error);
      return null;
    }
  }
  /**
   * Get collection log background from the special_icons table (NEW METHOD)
   */
  static async getCollectionLogIconFromSpecialTable() {
    try {
      const db = databaseService.db;
      const bgIcon = db.prepare(`
        SELECT icon_data, icon_mime_type 
        FROM special_icons 
        WHERE type = 'background' AND name = 'collection-log-background'
      `).get();
      if (bgIcon && bgIcon.icon_data) {
        const mimeType = bgIcon.icon_mime_type || "image/png";
        return `data:${mimeType};base64,${bgIcon.icon_data}`;
      }
      console.warn("No collection log background found in special_icons table");
      return null;
    } catch (error) {
      console.error("Error loading collection log background:", error);
      return null;
    }
  }
}

class OSRSDataService {
  /**
   * Get item data by ID
   */
  static async getItemById(itemId, enableWikiLookup = true) {
    try {
      if (!databaseService.db) {
        await databaseService.init();
      }
      let itemData = databaseService.getItemById(itemId);
      if (!itemData && enableWikiLookup) {
        console.log(`\u{1F50D} Item ${itemId} not found in database, attempting wiki lookup...`);
        try {
          const wikiService = new WikiLookupService();
          const foundItem = await wikiService.lookupItemById(itemId);
          if (foundItem) {
            const dbItemData = {
              ...foundItem,
              icon_path: foundItem.icon,
              icon_url: foundItem.icon_url || null
            };
            databaseService.insertItem(dbItemData);
            itemData = databaseService.getItemById(itemId);
            if (itemData) {
              console.log(`\u2705 Found item ${itemId} via wiki lookup and added to database`);
            }
          }
        } catch (error) {
          console.error(`\u274C Wiki lookup failed for item ${itemId}:`, error.message);
        }
      }
      if (!itemData) {
        console.warn(`\u26A0\uFE0F  Item ${itemId} not found in database or wiki`);
        return this.createPlaceholderItem(itemId);
      }
      return await this.transformItemData(itemData);
    } catch (error) {
      console.error(`Error fetching item ${itemId}:`, error);
      return this.createPlaceholderItem(itemId);
    }
  }
  /**
   * Get item by exact name match
   */
  static async getItemByName(name) {
    try {
      if (!databaseService.db) {
        await databaseService.init();
      }
      const item = databaseService.db.prepare(`
        SELECT * FROM items 
        WHERE LOWER(name) = LOWER(?)
        LIMIT 1
      `).get(name);
      if (item) {
        return await this.transformItemData(item);
      }
      console.log(`\u{1F50D} Item "${name}" not found in database, attempting wiki lookup...`);
      try {
        const wikiService = new WikiLookupService();
        const foundItem = await wikiService.lookupItemByName(name);
        if (foundItem) {
          console.log(`\u2705 Found item "${name}" via wiki lookup`);
          return foundItem;
        }
      } catch (error) {
        console.error(`\u274C Wiki lookup failed for item "${name}":`, error.message);
      }
      return null;
    } catch (error) {
      console.error(`Error fetching item by name "${name}":`, error);
      return null;
    }
  }
  /**
   * Search items by name
   */
  static async searchItemsByName(query, limit = 10) {
    try {
      if (!databaseService.db) {
        await databaseService.init();
      }
      const items = await databaseService.searchItemsByNameOnly(query, limit);
      console.log(`\u{1F50D} Database search for "${query}" returned ${items.length} items`);
      if (items.length === 0) {
        console.log(`\u{1F50D} No items found for "${query}" in database, attempting wiki lookup...`);
        try {
          const wikiService = new WikiLookupService();
          const foundItem = await wikiService.lookupItemByName(query);
          if (foundItem) {
            const dbItemData = {
              ...foundItem,
              icon_path: foundItem.icon,
              icon_url: foundItem.icon_url || null
            };
            databaseService.insertItem(dbItemData);
            return [databaseService.getItemById(foundItem.id)];
          }
        } catch (error) {
          console.error(`\u274C Wiki lookup failed for "${query}":`, error.message);
        }
      }
      return items;
    } catch (error) {
      console.error(`Error searching items for "${query}":`, error);
      return [];
    }
  }
  /**
   * Get all items with pagination
   */
  static async getAllItems(page = 1, maxResults = 25) {
    try {
      if (!databaseService.db) {
        await databaseService.init();
      }
      const offset = (page - 1) * maxResults;
      const countStmt = databaseService.db.prepare("SELECT COUNT(*) as count FROM items");
      const totalItems = countStmt.get().count;
      const stmt = databaseService.db.prepare(`
        SELECT i.*, 
               e.attack_stab, e.attack_slash, e.attack_crush, e.attack_magic, e.attack_ranged,
               e.defence_stab, e.defence_slash, e.defence_crush, e.defence_magic, e.defence_ranged,
               e.melee_strength, e.ranged_strength, e.magic_damage, e.prayer as equipment_prayer,
               e.slot, e.requirements,
               w.attack_speed, w.weapon_type, w.stab as weapon_stab, w.slash as weapon_slash,
               w.crush as weapon_crush, w.magic as weapon_magic, w.ranged as weapon_ranged
        FROM items i
        LEFT JOIN equipment_stats e ON i.id = e.item_id
        LEFT JOIN weapon_stats w ON i.id = w.item_id
        ORDER BY i.id
        LIMIT ? OFFSET ?
      `);
      const rows = stmt.all(maxResults, offset);
      const items = rows.map((row) => databaseService.formatItemFromRow(row));
      return {
        items,
        pagination: {
          page,
          maxResults,
          total: totalItems,
          totalPages: Math.ceil(totalItems / maxResults)
        }
      };
    } catch (error) {
      console.error("Error getting all items:", error);
      return {
        items: [],
        pagination: {
          page,
          maxResults,
          total: 0,
          totalPages: 0
        }
      };
    }
  }
  /**
   * Get item icon as base64
   */
  static async getItemIconUrl(itemId) {
    try {
      return await IconService.getItemIcon(itemId);
    } catch (error) {
      console.error(`Error getting item icon for ${itemId}:`, error);
      const placeholderIcon = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
      return `data:image/png;base64,${placeholderIcon}`;
    }
  }
  /**
   * Get database statistics
   */
  static async getStats() {
    try {
      if (!databaseService.db) {
        await databaseService.init();
      }
      return databaseService.getStats();
    } catch (error) {
      console.error("Error getting database stats:", error);
      return { items: 0, equipment: 0, weapons: 0, monsters: 0, prayers: 0 };
    }
  }
  /**
   * Transform item data to use IconService for icon URL
   */
  static async transformItemData(itemData) {
    try {
      const transformedData = { ...itemData };
      const iconUrl = await IconService.getItemIcon(itemData.id);
      transformedData.icon_url = iconUrl;
      transformedData.icon_path = null;
      return transformedData;
    } catch (error) {
      console.error(`Error transforming item data for item ${itemData.id}:`, error);
      return itemData;
    }
  }
  /**
   * Create placeholder item for missing items
   */
  static createPlaceholderItem(itemId) {
    return {
      id: itemId,
      name: `Unknown Item (${itemId})`,
      examine: "This item is not yet available in our database.",
      wiki_name: null,
      wiki_url: null,
      icon_path: null,
      icon_url: null,
      members: false,
      tradeable: false,
      tradeable_on_ge: false,
      stackable: false,
      noted: false,
      noteable: false,
      weight: 0,
      buy_limit: 0,
      quest_item: false,
      release_date: null,
      duplicate: false,
      equipable: false,
      equipable_by_player: false,
      equipable_weapon: false,
      cost: 0,
      lowalch: 0,
      highalch: 0,
      destruction: null,
      _missing: true,
      // Flag to indicate this is a placeholder
      last_updated: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  /**
   * Get equipment item by ID (only items that are equipable)
   */
  static async getEquipmentById(itemId, enableWikiLookup = true) {
    try {
      const item = await this.getItemById(itemId, enableWikiLookup);
      if (!item) {
        throw new Error(`Equipment item ${itemId} not found`);
      }
      if (!item.equipable) {
        throw new Error(`Item ${itemId} is not equipable`);
      }
      return item;
    } catch (error) {
      console.error(`Error fetching equipment ${itemId}:`, error);
      throw error;
    }
  }
  /**
   * Get weapon item by ID (only items that are weapons)
   */
  static async getWeaponById(itemId, enableWikiLookup = true) {
    try {
      const item = await this.getItemById(itemId, enableWikiLookup);
      if (!item) {
        throw new Error(`Weapon item ${itemId} not found`);
      }
      if (!item.equipable_weapon) {
        throw new Error(`Item ${itemId} is not a weapon`);
      }
      return item;
    } catch (error) {
      console.error(`Error fetching weapon ${itemId}:`, error);
      throw error;
    }
  }
  /**
   * Get all equipable items
   */
  static async getAllEquipment() {
    try {
      if (!databaseService.db) {
        await databaseService.init();
      }
      const stmt = databaseService.db.prepare(`
        SELECT i.*, 
               e.attack_stab, e.attack_slash, e.attack_crush, e.attack_magic, e.attack_ranged,
               e.defence_stab, e.defence_slash, e.defence_crush, e.defence_magic, e.defence_ranged,
               e.melee_strength, e.ranged_strength, e.magic_damage, e.prayer as equipment_prayer,
               e.slot, e.requirements,
               w.attack_speed, w.weapon_type, w.stab as weapon_stab, w.slash as weapon_slash,
               w.crush as weapon_crush, w.magic as weapon_magic, w.ranged as weapon_ranged
        FROM items i
        LEFT JOIN equipment_stats e ON i.id = e.item_id
        LEFT JOIN weapon_stats w ON i.id = w.item_id
        WHERE i.equipable = 1
        ORDER BY i.name
      `);
      const rows = stmt.all();
      return rows.map((row) => databaseService.formatItemFromRow(row));
    } catch (error) {
      console.error("Error fetching all equipment:", error);
      return [];
    }
  }
  /**
   * Get all weapon items
   */
  static async getAllWeapons() {
    try {
      if (!databaseService.db) {
        await databaseService.init();
      }
      const stmt = databaseService.db.prepare(`
        SELECT i.*, 
               e.attack_stab, e.attack_slash, e.attack_crush, e.attack_magic, e.attack_ranged,
               e.defence_stab, e.defence_slash, e.defence_crush, e.defence_magic, e.defence_ranged,
               e.melee_strength, e.ranged_strength, e.magic_damage, e.prayer as equipment_prayer,
               e.slot, e.requirements,
               w.attack_speed, w.weapon_type, w.stab as weapon_stab, w.slash as weapon_slash,
               w.crush as weapon_crush, w.magic as weapon_magic, w.ranged as weapon_ranged
        FROM items i
        LEFT JOIN equipment_stats e ON i.id = e.item_id
        LEFT JOIN weapon_stats w ON i.id = w.item_id
        WHERE i.equipable_weapon = 1
        ORDER BY i.name
      `);
      const rows = stmt.all();
      return rows.map((row) => databaseService.formatItemFromRow(row));
    } catch (error) {
      console.error("Error fetching all weapons:", error);
      return [];
    }
  }
  /**
   * Get monster by ID
   * @param {number} monsterId - Monster ID
   * @returns {Promise<Object>} Monster data
   */
  static async getMonsterById(monsterId) {
    try {
      await databaseService.init();
      const stmt = databaseService.db.prepare(`
        SELECT * FROM monsters WHERE id = ?
      `);
      const monster = stmt.get(monsterId);
      if (!monster) {
        throw new Error(`Monster with ID ${monsterId} not found`);
      }
      return monster;
    } catch (error) {
      console.error(`Error fetching monster ${monsterId}:`, error);
      throw error;
    }
  }
  /**
   * Get all monsters with pagination
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Number of monsters per page
   * @returns {Promise<Object>} Paginated monsters data
   */
  static async getAllMonsters(page = 1, limit = 25) {
    try {
      await databaseService.init();
      const offset = (page - 1) * limit;
      const countStmt = databaseService.db.prepare("SELECT COUNT(*) as count FROM monsters");
      const { count: total } = countStmt.get();
      const stmt = databaseService.db.prepare(`
        SELECT * FROM monsters
        ORDER BY name
        LIMIT ? OFFSET ?
      `);
      const monsters = stmt.all(limit, offset);
      return {
        results: monsters,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error("Error fetching all monsters:", error);
      throw error;
    }
  }
  /**
   * Get prayer by ID
   * @param {number} prayerId - Prayer ID
   * @returns {Promise<Object>} Prayer data
   */
  static async getPrayerById(prayerId) {
    try {
      await databaseService.init();
      const stmt = databaseService.db.prepare(`
        SELECT * FROM prayers WHERE id = ?
      `);
      const prayer = stmt.get(prayerId);
      if (!prayer) {
        throw new Error(`Prayer with ID ${prayerId} not found`);
      }
      return prayer;
    } catch (error) {
      console.error(`Error fetching prayer ${prayerId}:`, error);
      throw error;
    }
  }
  /**
   * Get all prayers with pagination
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Number of prayers per page
   * @returns {Promise<Object>} Paginated prayers data
   */
  static async getAllPrayers(page = 1, limit = 25) {
    try {
      await databaseService.init();
      const offset = (page - 1) * limit;
      const countStmt = databaseService.db.prepare("SELECT COUNT(*) as count FROM prayers");
      const { count: total } = countStmt.get();
      const stmt = databaseService.db.prepare(`
        SELECT * FROM prayers
        ORDER BY level_required, name
        LIMIT ? OFFSET ?
      `);
      const prayers = stmt.all(limit, offset);
      return {
        results: prayers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error("Error fetching all prayers:", error);
      throw error;
    }
  }
  /**
   * Get database summary including items, monsters, and prayers
   * @returns {Promise<Object>} Database summary
   */
  static async getDataSummary() {
    try {
      await databaseService.init();
      const itemsCount = databaseService.db.prepare("SELECT COUNT(*) as count FROM items").get().count;
      const monstersCount = databaseService.db.prepare("SELECT COUNT(*) as count FROM monsters").get().count;
      const prayersCount = databaseService.db.prepare("SELECT COUNT(*) as count FROM prayers").get().count;
      return {
        items: itemsCount,
        monsters: monstersCount,
        prayers: prayersCount,
        total: itemsCount + monstersCount + prayersCount
      };
    } catch (error) {
      console.error("Error getting data summary:", error);
      throw error;
    }
  }
}

export { IconService as I, OSRSDataService as O, databaseService as d };
//# sourceMappingURL=osrsDataService.mjs.map
