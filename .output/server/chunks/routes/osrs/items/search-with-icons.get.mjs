import { c as defineEventHandler, g as getQuery, e as createError } from '../../../_/nitro.mjs';
import { O as OSRSDataService, I as IconService } from '../../../_/osrsDataService.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:url';
import 'node:path';
import 'node:crypto';
import 'better-sqlite3';
import 'path';
import 'url';
import 'fs/promises';
import 'https';

const searchWithIcons_get = defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { name, id, query: searchQuery, page = 1, max_results = 25 } = query;
    const searchTerm = name || searchQuery;
    if (!searchTerm && !id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: { error: "Either name/query or id parameter is required" }
      });
    }
    let results = [];
    const pageNum = parseInt(page) || 1;
    const maxResults = parseInt(max_results) || 25;
    if (id) {
      const item = await OSRSDataService.getItemById(parseInt(id));
      if (item) {
        results = [item];
      }
    } else if (searchTerm) {
      results = await OSRSDataService.searchItemsByName(searchTerm, maxResults);
    }
    const itemsWithIcons = await Promise.all(
      results.map(async (item) => {
        try {
          const iconDataUrl = await IconService.getItemIcon(item.id);
          return {
            ...item,
            icon_data_url: iconDataUrl || null
          };
        } catch (error) {
          console.error(`Error loading icon for item ${item.id}:`, error);
          return {
            ...item,
            icon_data_url: null
          };
        }
      })
    );
    return {
      items: itemsWithIcons,
      total: itemsWithIcons.length,
      page: pageNum,
      max_results: maxResults,
      query: { name: searchTerm, id },
      count: itemsWithIcons.length,
      wiki_lookup_enabled: true
    };
  } catch (error) {
    console.error("Error searching items with icons:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: "Failed to search items with icons" }
    });
  }
});

export { searchWithIcons_get as default };
//# sourceMappingURL=search-with-icons.get.mjs.map
