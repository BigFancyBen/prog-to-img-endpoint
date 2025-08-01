import { c as defineEventHandler, h as getQuery, e as createError } from '../../../_/nitro.mjs';
import { O as OSRSDataService } from '../../../_/osrsDataService.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:url';
import 'node:path';
import 'chokidar';
import 'anymatch';
import 'node:crypto';
import '../../../_/databaseService.mjs';
import 'better-sqlite3';
import 'path';
import 'url';
import 'fs/promises';
import 'https';

const search_get = defineEventHandler(async (event) => {
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
      try {
        const item = await OSRSDataService.getItemById(id, true);
        results = [item];
      } catch (error) {
        if (error.message && error.message.includes("not found")) {
          results = [];
        } else {
          throw error;
        }
      }
    } else if (searchTerm) {
      results = await OSRSDataService.searchItemsByName(searchTerm, maxResults);
    }
    return {
      items: results,
      total: results.length,
      page: pageNum,
      max_results: maxResults,
      query: { name: searchTerm, id },
      count: results.length,
      wiki_lookup_enabled: true,
      _links: {
        self: { href: `search?${new URLSearchParams(query).toString()}` },
        parent: { href: "/osrs/items" }
      }
    };
  } catch (error) {
    console.error("Error in item search:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message || "Unknown error" }
    });
  }
});

export { search_get as default };
//# sourceMappingURL=search.get.mjs.map
