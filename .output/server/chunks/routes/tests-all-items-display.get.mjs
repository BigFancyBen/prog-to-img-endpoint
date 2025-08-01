import { c as defineEventHandler, h as getQuery } from '../_/nitro.mjs';
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

const testsAllItemsDisplay_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { dynamic } = query;
  console.log("Route accessed!");
  console.log("Query parameters:", query);
  console.log("Dynamic parameter:", dynamic);
  return {
    message: "Items display route working!",
    dynamic,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
});

export { testsAllItemsDisplay_get as default };
//# sourceMappingURL=tests-all-items-display.get.mjs.map
