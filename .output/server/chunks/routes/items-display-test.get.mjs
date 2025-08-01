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
import 'chokidar';
import 'anymatch';
import 'node:crypto';

const itemsDisplayTest_get = defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { dynamic } = query;
    console.log("Route accessed!");
    console.log("Query parameters:", query);
    console.log("Dynamic parameter:", dynamic);
    const fileName = dynamic ? "all-items-display-dynamic.html" : "all-items-display.html";
    const htmlPath = join(process.cwd(), "tests", fileName);
    console.log(`Serving ${fileName} from ${htmlPath}`);
    try {
      const htmlContent = readFileSync(htmlPath, "utf-8");
      console.log(`Successfully read file: ${htmlPath}`);
      setHeader(event, "Content-Type", "text/html");
      return htmlContent;
    } catch (fileError) {
      console.error(`File not found: ${htmlPath}`);
      throw createError({
        statusCode: 404,
        statusMessage: "File Not Found",
        data: { error: `File not found: ${fileName}` }
      });
    }
  } catch (error) {
    console.error("Error in items-display-test route:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "Internal Server Error",
      data: { error: error.message || "Failed to load items display" }
    });
  }
});

export { itemsDisplayTest_get as default };
//# sourceMappingURL=items-display-test.get.mjs.map
