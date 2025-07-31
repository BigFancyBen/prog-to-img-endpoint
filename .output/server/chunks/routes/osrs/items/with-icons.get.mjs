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

const withIcons_get = defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { page = 1, max_results = 25 } = query;
    const pageNum = parseInt(page) || 1;
    const maxResults = parseInt(max_results) || 25;
    const result = await OSRSDataService.getAllItems(pageNum, maxResults);
    const itemsWithIcons = await Promise.all(
      result.items.map(async (item) => {
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
      total: result.total,
      page: pageNum,
      max_results: maxResults,
      total_pages: Math.ceil(result.total / maxResults)
    };
  } catch (error) {
    console.error("Error fetching items with icons:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: "Failed to fetch items with icons" }
    });
  }
});

export { withIcons_get as default };
//# sourceMappingURL=with-icons.get.mjs.map
