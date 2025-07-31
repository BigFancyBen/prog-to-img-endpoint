import { c as defineEventHandler, g as getQuery, e as createError } from '../../_/nitro.mjs';
import { O as OSRSDataService } from '../../_/osrsDataService.mjs';
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

const index_get = defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const page = parseInt(query.page) || 1;
    const maxResults = parseInt(query.max_results) || 25;
    const result = await OSRSDataService.getAllMonsters(page, maxResults);
    return result;
  } catch (error) {
    console.error("Error fetching monsters:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message }
    });
  }
});

export { index_get as default };
//# sourceMappingURL=index.get3.mjs.map
