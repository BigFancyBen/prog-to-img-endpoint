import { c as defineEventHandler, h as getRouterParam, g as getQuery, e as createError } from '../../../_/nitro.mjs';
import { O as OSRSDataService } from '../../../_/osrsDataService.mjs';
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

const _type__get = defineEventHandler(async (event) => {
  try {
    const type = getRouterParam(event, "type");
    const query = getQuery(event);
    const searchQuery = query.q;
    if (!searchQuery) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: { error: "Search query (q) is required" }
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
    const results = await OSRSDataService.searchItemsByName(searchQuery);
    return {
      query: searchQuery,
      type,
      results
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
