/**
 * Checks links in dist/. By default checks internal links and anchors, offline.
 * With --external, fetches every external link instead (for the weekly job).
 */
import { readSite } from "../src/lib/dist.ts";
import { checkSite, externalLinks } from "../src/lib/links.ts";

const site = readSite("dist");
const problems = process.argv.includes("--external") ? await checkExternal() : checkInternal();

if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log("✓ all links resolve");

function checkInternal(): string[] {
  return checkSite(site).map((p) => `${p.page}: ${p.href} (${p.reason})`);
}

async function checkExternal(): Promise<string[]> {
  const problems: string[] = [];
  for (const url of externalLinks(site)) {
    try {
      const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
      if (response.status >= 400) problems.push(`${url}: status ${response.status}`);
    } catch (error) {
      problems.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return problems;
}
