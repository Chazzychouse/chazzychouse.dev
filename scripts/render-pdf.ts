/** Prints the built /resume/ page to dist/resume.pdf using its print stylesheet. */
import { chromium } from "@playwright/test";
import { preview } from "astro";

const PORT = 4322;
const OUTPUT = "dist/resume.pdf";

const server = await preview({ server: { port: PORT }, logLevel: "warn" });
try {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/resume/`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({ path: OUTPUT, preferCSSPageSize: true, tagged: true, outline: true });
  } finally {
    await browser.close();
  }
} finally {
  await server.stop();
}
console.log(`wrote ${OUTPUT}`);
