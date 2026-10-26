import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { pageRoutes, readSite } from "../src/lib/dist.ts";

const routes = pageRoutes(readSite("dist"));
const BLOCKING = new Set(["serious", "critical"]);

for (const colorScheme of ["light", "dark"] as const) {
  for (const route of routes) {
    test(`${route} has no serious accessibility violations (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(route);
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = violations.filter((v) => BLOCKING.has(v.impact ?? ""));
      const summary = blocking.map((v) => ({ rule: v.id, nodes: v.nodes.map((n) => n.target) }));
      expect(blocking, JSON.stringify(summary, null, 2)).toEqual([]);
    });
  }
}
