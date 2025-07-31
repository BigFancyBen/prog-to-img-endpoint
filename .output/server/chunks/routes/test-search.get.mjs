import { c as defineEventHandler, h as getQuery } from '../_/nitro.mjs';
import { O as OSRSDataService } from '../_/osrsDataService.mjs';
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

const testSearch_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const searchQuery = query.q || "instruction";
  console.log(`Test route: Searching for "${searchQuery}"`);
  const results = await OSRSDataService.testSearchItemsByName(searchQuery);
  return {
    query: searchQuery,
    results
  };
});

export { testSearch_get as default };
//# sourceMappingURL=test-search.get.mjs.map
