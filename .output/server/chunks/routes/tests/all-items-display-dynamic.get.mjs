import { c as defineEventHandler, f as setHeader, e as createError } from '../../_/nitro.mjs';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:url';
import 'node:path';
import 'node:crypto';

const allItemsDisplayDynamic_get = defineEventHandler(async (event) => {
  try {
    const htmlPath = join(process.cwd(), "tests", "all-items-display-dynamic.html");
    const htmlContent = readFileSync(htmlPath, "utf-8");
    setHeader(event, "Content-Type", "text/html");
    return htmlContent;
  } catch (error) {
    console.error("Error reading all-items-display-dynamic.html:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: "Failed to load all-items-display-dynamic.html" }
    });
  }
});

export { allItemsDisplayDynamic_get as default };
//# sourceMappingURL=all-items-display-dynamic.get.mjs.map
