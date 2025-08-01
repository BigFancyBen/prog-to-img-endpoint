import { c as defineEventHandler, i as getRouterParam, h as getQuery, e as createError } from '../../../_/nitro.mjs';
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

const _type__get = defineEventHandler(async (event) => {
  try {
    const type = getRouterParam(event, "type");
    const query = getQuery(event);
    const searchQuery = query.q;
    const searchId = query.id;
    const page = parseInt(query.page) || 1;
    const maxResults = parseInt(query.max_results) || 25;
    if (!searchQuery && !searchId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: { error: "Search query (q) or item ID (id) is required" }
      });
    }
    if (type !== "items") {
      return {
        error: true,
        statusCode: 400,
        statusMessage: "Bad Request",
        message: 'Invalid search type. Currently only "items" is supported'
      };
    }
    let results = [];
    if (searchId) {
      const itemId = parseInt(searchId);
      if (isNaN(itemId)) {
        throw createError({
          statusCode: 400,
          statusMessage: "Bad Request",
          data: { error: "Invalid item ID. Must be a number." }
        });
      }
      const item = await OSRSDataService.getItemById(itemId);
      if (item) {
        results = [item];
      }
    } else {
      results = await OSRSDataService.searchItemsByName(searchQuery, maxResults);
    }
    return {
      query: searchQuery || searchId,
      type,
      results,
      pagination: {
        page,
        maxResults,
        total: results.length,
        totalPages: Math.ceil(results.length / maxResults)
      }
    };
  } catch (error) {
    console.error("Error searching:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error instanceof Error ? error.message : "Unknown error occurred" }
    });
  }
});

export { _type__get as default };
//# sourceMappingURL=_type_.get.mjs.map
