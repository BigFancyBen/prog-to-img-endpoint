import { c as defineEventHandler, g as getRouterParam, e as createError, h as getQuery } from '../../../_/nitro.mjs';
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

const _id__get = defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, "id");
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "Bad Request",
        data: { error: "Item ID is required" }
      });
    }
    const query = getQuery(event);
    const enableWikiLookup = query.wiki_lookup !== "false";
    const item = await OSRSDataService.getItemById(id, enableWikiLookup);
    return item;
  } catch (error) {
    if (error.message && error.message.includes("not found")) {
      throw createError({
        statusCode: 404,
        statusMessage: "Not Found",
        data: { error: error.message }
      });
    }
    console.error("Error fetching item:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: error.message || "Unknown error" }
    });
  }
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
