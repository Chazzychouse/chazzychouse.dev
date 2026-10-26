/**
 * Checks a running copy of the site: every page is 200 with the promised headers, the PDF is
 * a PDF, and unknown paths are 404. Retries briefly, since a fresh deploy can take a moment.
 * Usage: node scripts/smoke.ts <base-url>
 */
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { pageRoutes, readSite } from "../src/lib/dist.ts";
import { headerNames } from "../src/lib/headers.ts";

const ATTEMPTS = 6;
const WAIT_MS = 10_000;

const base = process.argv[2];
if (base === undefined) {
  console.error("usage: node scripts/smoke.ts <base-url>");
  process.exit(2);
}

const required = headerNames(readFileSync("public/_headers", "utf8"));
const routes = pageRoutes(readSite("dist")).filter((route) => route !== "/404");

let problems: string[] = [];
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  problems = await check(base);
  if (problems.length === 0) break;
  if (attempt < ATTEMPTS) await sleep(WAIT_MS);
}
if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(`✓ ${base}: ${routes.length} pages, PDF and 404 behave`);

async function check(baseUrl: string): Promise<string[]> {
  try {
    return await checkOnce(baseUrl);
  } catch (error) {
    return [`fetch failed: ${error instanceof Error ? error.message : String(error)}`];
  }
}

async function checkOnce(baseUrl: string): Promise<string[]> {
  const found: string[] = [];
  for (const route of routes) {
    const response = await fetch(new URL(route, baseUrl), { redirect: "manual" });
    if (response.status !== 200) found.push(`${route}: status ${response.status}`);
    for (const name of required) {
      if (!response.headers.has(name)) found.push(`${route}: missing header ${name}`);
    }
  }
  const pdf = await fetch(new URL("/resume.pdf", baseUrl));
  if (!(pdf.headers.get("content-type") ?? "").startsWith("application/pdf")) {
    found.push(`/resume.pdf: content-type ${pdf.headers.get("content-type")}`);
  }
  const missing = await fetch(new URL("/this-page-does-not-exist/", baseUrl));
  if (missing.status !== 404) found.push(`unknown path: status ${missing.status}, expected 404`);
  return found;
}
