import { c as defineEventHandler, h as getQuery, e as createError } from '../../_/nitro.mjs';
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
    const equipment = await OSRSDataService.getAllEquipment();
    const startIndex = (page - 1) * maxResults;
    const endIndex = startIndex + maxResults;
    const paginatedEquipment = equipment.slice(startIndex, endIndex);
    return {
      equipment: paginatedEquipment,
      pagination: {
        page,
        maxResults,
        total: equipment.length,
        totalPages: Math.ceil(equipment.length / maxResults)
      }
    };
  } catch (error) {
    console.error("Error fetching equipment:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message || "Unknown error" }
    });
  }
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
