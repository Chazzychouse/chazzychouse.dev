/** Reads public/_headers so the smoke test checks exactly the headers the site promises. */

export function headerNames(headersFile: string): string[] {
  const names: string[] = [];
  let inAllPaths = false;
  for (const line of headersFile.split("\n")) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      inAllPaths = line.trim() === "/*";
      continue;
    }
    const colon = line.indexOf(":");
    if (inAllPaths && colon !== -1) names.push(line.slice(0, colon).trim().toLowerCase());
  }
  return names;
}
