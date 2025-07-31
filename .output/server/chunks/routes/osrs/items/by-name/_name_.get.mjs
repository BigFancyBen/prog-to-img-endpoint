import { c as defineEventHandler, h as getRouterParam, e as createError } from '../../../../_/nitro.mjs';
import { O as OSRSDataService } from '../../../../_/osrsDataService.mjs';
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

const _name__get = defineEventHandler(async (event) => {
  try {
    const name = getRouterParam(event, "name");
    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: { error: "Item name is required" }
      });
    }
    const decodedName = decodeURIComponent(name);
    const item = await OSRSDataService.getItemByName(decodedName);
    if (!item) {
      throw createError({
        statusCode: 404,
        statusMessage: "Not Found",
        data: { error: `Item '${decodedName}' not found` }
      });
    }
    return item;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching item by name:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error instanceof Error ? error.message : "Unknown error occurred" }
    });
  }
});

export { _name__get as default };
//# sourceMappingURL=_name_.get.mjs.map
