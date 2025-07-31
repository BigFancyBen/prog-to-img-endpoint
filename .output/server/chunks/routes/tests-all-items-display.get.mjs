import { c as defineEventHandler, h as getQuery, f as setHeader, e as createError } from '../_/nitro.mjs';
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

const testsAllItemsDisplay_get = defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { dynamic } = query;
    const fileName = dynamic ? "all-items-display-dynamic.html" : "all-items-display.html";
    const htmlPath = join(process.cwd(), "tests", fileName);
    console.log(`Serving ${fileName} from ${htmlPath}`);
    const htmlContent = readFileSync(htmlPath, "utf-8");
    setHeader(event, "Content-Type", "text/html");
    return htmlContent;
  } catch (error) {
    console.error("Error reading all-items-display.html:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: { error: "Failed to load all-items-display.html" }
    });
  }
});

export { testsAllItemsDisplay_get as default };
//# sourceMappingURL=tests-all-items-display.get.mjs.map
