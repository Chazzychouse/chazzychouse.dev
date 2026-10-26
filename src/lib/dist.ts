/** Reads a built site from disk. Synchronous so test files can enumerate pages at load time. */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export function readSite(dir: string): Map<string, string> {
  const site = new Map<string, string>();
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const full = join(entry.parentPath, entry.name);
    const path = relative(dir, full).split(sep).join("/");
    site.set(path, path.endsWith(".html") ? readFileSync(full, "utf8") : "");
  }
  return site;
}

export function routeOf(file: string): string {
  return `/${file.replace(/index\.html$/, "").replace(/\.html$/, "")}`;
}

export function pageRoutes(site: ReadonlyMap<string, string>): string[] {
  return [...site.keys()].filter((path) => path.endsWith(".html")).map(routeOf).sort();
}
