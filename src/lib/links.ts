/** Link checking over a built site, given as a map of file path → contents. */

export interface Problem {
  page: string;
  href: string;
  reason: string;
}

const LINK = /\s(?:href|src)="([^"]*)"/g;
const ID = /\sid="([^"]*)"/g;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function extractLinks(html: string): string[] {
  return [...html.matchAll(LINK)].map((match) => match[1] ?? "");
}

export function checkSite(site: ReadonlyMap<string, string>): Problem[] {
  const problems: Problem[] = [];
  for (const [page, html] of site) {
    if (!page.endsWith(".html")) continue;
    for (const href of extractLinks(html)) {
      if (SCHEME.test(href) || href.startsWith("//")) continue;
      const reason = brokenReason(page, href, site);
      if (reason !== undefined) problems.push({ page, href, reason });
    }
  }
  return problems;
}

export function externalLinks(site: ReadonlyMap<string, string>): string[] {
  const links = new Set<string>();
  for (const [page, html] of site) {
    if (!page.endsWith(".html")) continue;
    for (const href of extractLinks(html)) if (/^https?:\/\//.test(href)) links.add(href);
  }
  return [...links].sort();
}

function brokenReason(page: string, href: string, site: ReadonlyMap<string, string>): string | undefined {
  if (!href.startsWith("/") && !href.startsWith("#")) return "relative link; use a root-relative path";
  const hash = href.indexOf("#");
  const path = (hash === -1 ? href : href.slice(0, hash)).split("?")[0] ?? "";
  const fragment = hash === -1 ? "" : decodeURIComponent(href.slice(hash + 1));
  const target = path === "" ? page : fileFor(path, site);
  if (target === undefined) return "no such page";
  if (fragment === "") return undefined;
  if (!target.endsWith(".html")) return "anchor on a file that isn't a page";
  const ids = new Set([...(site.get(target) ?? "").matchAll(ID)].map((match) => match[1]));
  return ids.has(fragment) ? undefined : `no element with id "${fragment}"`;
}

/** The built file that serves a URL path, as Workers static assets resolves it. */
function fileFor(path: string, site: ReadonlyMap<string, string>): string | undefined {
  const clean = path.replace(/^\//, "");
  const candidates = clean === "" || clean.endsWith("/")
    ? [`${clean}index.html`]
    : [clean, `${clean}.html`, `${clean}/index.html`];
  return candidates.find((candidate) => site.has(candidate));
}
