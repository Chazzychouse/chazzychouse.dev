# Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this
> plan task-by-task, inline in the main session (the user's CLAUDE.md asks for inline work on
> sequential tasks). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy chazzychouse.dev: a static Astro site with Chase's resume (page +
PDF from one data file) and five project write-ups, verified in CI and deployed to Cloudflare.

**Architecture:** Astro 7 static output. `src/data/resume.yaml` and `src/content/projects/*.md`
are content collections validated by Zod schemas in `src/lib/schema.ts`. A build script prints
`/resume/` to `dist/resume.pdf` with Playwright. Small pure modules in `src/lib/` (dates, links,
pdf, headers, dist) carry the logic that the check scripts and tests use. Cloudflare Workers
static assets serves `dist/` with headers from `public/_headers`.

**Tech Stack:** Astro 7.4.2, TypeScript 6.0.3 (`astro check` doesn't support TS 7), Zod 4 via
`astro/zod`, Vitest 5.0.5, Playwright 1.64.1, @axe-core/playwright 4.14.0, unpdf 1.9.1, yaml
2.9.1, wrangler 4.152.0, Fontsource (Source Serif 4, Inter), pnpm 12.14.0, Node 24 in CI.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-26-portfolio-site-design.md`.
- Domain: `https://chazzychouse.dev`. Worker name: `chazzychouse-dev`.
- `resume.yaml` is the only copy of the resume. Delete `resume.md` once it's converted.
- No client-side JavaScript, no inline scripts and no inline styles: the CSP is
  `script-src 'self' https://static.cloudflareinsights.com; style-src 'self'`. Set
  `build.inlineStylesheets: "never"`.
- `trailingSlash: "always"`: every internal page link ends in `/` (e.g. `/resume/`).
- Featured projects in order: ingest-the-world, csvql, sportal, gpui-tunes, bongocat. Never
  feature universe, Eventually or audio-classifier (possible RoboCent property).
- `projects/` holds Chase's code repos. It is git-ignored and excluded from TypeScript, and
  nothing in it is ever read by the build.
- Run Node scripts as `.ts` directly (Node ≥ 23.6 strips types): use only erasable TypeScript
  syntax (no enums or namespaces), `import type` for types, and `.ts` extensions on relative
  imports.
- Light and dark themes follow `prefers-color-scheme`. Pages work at 320px wide with a 16px
  gutter.
- Copy: write in Chase's first person on About and in write-ups. No em-dash chains, no hype
  words ("passionate", "rockstar").
- Commit after each task. End each message with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Scaffold Astro with the resume schema and data

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.nvmrc`
- Create: `src/lib/schema.ts`, `src/content.config.ts`, `src/lib/content.ts`
- Create: `src/data/resume.yaml`
- Create: `src/pages/index.astro` (temporary stub, replaced in Task 3)
- Modify: `.gitignore`
- Delete: `resume.md`

**Interfaces:**
- Produces: `resumeSchema`, `projectSchema`, `type Resume` from `src/lib/schema.ts`;
  `getResume(): Promise<Resume>` and
  `getProjects(): Promise<CollectionEntry<"projects">[]>` (sorted by `order`) from
  `src/lib/content.ts`; collections `resume` (single entry id `resume`) and `projects`.

- [ ] **Step 1: Write the package and config files**

`package.json`:
```json
{
  "name": "chazzychouse.dev",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.14.0",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview"
  }
}
```

`astro.config.mjs`:
```js
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://chazzychouse.dev",
  trailingSlash: "always",
  build: { inlineStylesheets: "never" },
});
```

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "projects"]
}
```

`.nvmrc`:
```
24
```

Append to `.gitignore`:
```
test-results/
playwright-report/
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
cd ~/resume && pnpm add astro@7.4.2 @fontsource-variable/source-serif-4@5.3.1 @fontsource-variable/inter@5.3.0 \
  && pnpm add -D @astrojs/check@0.9.12 typescript@6.0.3
```
Expected: `pnpm-lock.yaml` created, no errors.

- [ ] **Step 3: Write the schemas**

`src/lib/schema.ts`:
```ts
/** Content schemas: the shape of resume.yaml and of each project's frontmatter. */
import { z } from "astro/zod";

const yearMonth = z.string().regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, "use YYYY or YYYY-MM");
const endDate = z.union([yearMonth, z.literal("present")]);

const role = z.object({ title: z.string(), start: yearMonth, end: endDate });

export const resumeSchema = z.object({
  name: z.string(),
  location: z.string(),
  email: z.email(),
  github: z.url(),
  headline: z.string(),
  summary: z.string(),
  experience: z
    .array(
      z.object({
        company: z.string(),
        roles: z.array(role).min(1),
        bullets: z.array(z.string()).min(1),
      }),
    )
    .min(1),
  skills: z.array(z.object({ label: z.string(), items: z.array(z.string()).min(1) })).min(1),
  education: z.array(
    z.object({
      school: z.string(),
      program: z.string(),
      start: yearMonth,
      end: endDate,
      note: z.string().optional(),
    }),
  ),
  earlier: z.array(
    z.object({
      title: z.string(),
      org: z.string(),
      start: yearMonth,
      end: endDate,
      note: z.string().optional(),
      detail: z.string(),
    }),
  ),
});

export type Resume = z.infer<typeof resumeSchema>;

export const projectSchema = z.object({
  title: z.string(),
  tagline: z.string(),
  stack: z.array(z.string()).min(1),
  repo: z.url(),
  order: z.number().int().positive(),
  /** Bullets for the resume's Projects section; the write-up body is the page. */
  highlights: z.array(z.string()).min(1).max(4),
});
```

`src/content.config.ts`:
```ts
import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";
import { projectSchema, resumeSchema } from "./lib/schema.ts";

const resume = defineCollection({ loader: file("src/data/resume.yaml"), schema: resumeSchema });

const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "src/content/projects" }),
  schema: projectSchema,
});

export const collections = { resume, projects };
```

`src/lib/content.ts`:
```ts
/** The one way pages read content. */
import { getCollection, getEntry, type CollectionEntry } from "astro:content";
import type { Resume } from "./schema.ts";

export async function getResume(): Promise<Resume> {
  const entry = await getEntry("resume", "resume");
  if (entry === undefined) {
    throw new Error("src/data/resume.yaml must have a top-level `resume:` key");
  }
  return entry.data;
}

export async function getProjects(): Promise<CollectionEntry<"projects">[]> {
  const projects = await getCollection("projects");
  return projects.sort((a, b) => a.data.order - b.data.order);
}
```

- [ ] **Step 4: Convert resume.md to resume.yaml**

`src/data/resume.yaml`:
```yaml
resume:
  name: Chase R. Cartwright
  location: Chesapeake, VA · Open to remote or relocation
  email: chazzychouse.dev@gmail.com
  github: https://github.com/Chazzychouse
  headline: Backend engineer. Databases, testing, and the systems underneath.
  summary: >-
    Backend software engineer with 4 years of professional experience, most of it modernizing a
    long-lived Classic ASP and SQL Server product from the inside: building a modern .NET service
    layer, moving pages onto it one at a time, and shipping the product's public API. Most at
    home where application code meets the database. Interested in databases, operating systems
    and testing that proves software is correct rather than hoping it is. Came to software from
    electrical engineering and C++, after years in sales and hospitality.
  experience:
    - company: Issuetrak
      roles:
        - { title: Software Engineer II, start: 2024-05, end: 2026-05 }
        - { title: Software Engineer I, start: 2023-05, end: 2024-05 }
        - { title: Software Engineer Intern, start: 2022-10, end: 2023-05 }
      bullets:
        - >-
          Designed and built a modern .NET service layer for a Classic ASP product, then moved
          dozens of legacy pages onto React front ends backed by it (strangler fig pattern),
          modernizing the product screen by screen with no rewrite.
        - >-
          Built, tested, shipped and maintained the Issuetrak Public API, and a Zapier
          integration app on top of it that connects customers to third-party tools.
        - Built an internal revenue application with a daily HubSpot sync.
        - >-
          Worked on and oversaw the migration from legacy Entity Framework to Dapper (explicit
          transactions and stored procedure calls), guiding the junior engineer assigned to it.
          This cleared the way to move from .NET Framework to modern .NET.
        - >-
          Wrote and maintained SQL Server stored procedures that held core business logic, from
          calculating an issue's working hours to the commands behind every state transition,
          along with the queries the Classic ASP pages read through ADO.
        - >-
          Hired full-time as Software Engineer I after a 7-month internship; promoted to
          Software Engineer II one year later.
    - company: Telecommunications startup
      roles:
        - { title: Software Engineer, start: 2026-05, end: 2026-10 }
      bullets:
        - >-
          Designed a strategy for enforcing the domain's state machine in the database, so
          invalid state transitions would be rejected by the database itself rather than by
          scattered checks in a Prisma-based application.
        - Helped establish the team's development workflow.
  skills:
    - label: Languages
      items: [C#, "SQL (T-SQL, PostgreSQL)", TypeScript/JavaScript, Python, Go, Rust, C++, VBScript]
    - label: Backend & data
      items:
        [.NET / ASP.NET, Dapper, Entity Framework, ADO, REST API design, FastAPI, NestJS, Effect,
         Prisma, SQL Server, PostgreSQL/PostGIS, SQLite]
    - label: Frontend
      items: [React, jQuery, Classic ASP]
    - label: Integrations
      items: [HubSpot, Zapier]
    - label: Testing
      items:
        ["Property-based testing (Hypothesis, fast-check)", Stateful simulation, Mutation testing,
         Vitest, Playwright, pytest]
    - label: Infrastructure
      items: [Docker, Terraform, Azure, GitHub Actions, GitLab CI, Linux]
  education:
    - school: Tidewater Community College
      program: Electrical Engineering and Computer Science coursework
      start: "2021"
      end: "2022"
      note: >-
        Spring 2021 to Fall 2022, plus credits from earlier study. Two electives short of an
        Associate of Science in Computer Science.
  earlier:
    - title: Real Estate Agent (licensed, independent contractor)
      org: A Better Way Realty
      start: "2018"
      end: "2022"
      detail: >-
        Ran a self-directed sales business: found clients, negotiated contracts and managed
        transactions from listing to closing.
    - title: Head Waiter
      org: Wild Wing Cafe, Chesapeake, VA
      start: "2015"
      end: "2023"
      note: Full time, then part time alongside software work
      detail: Led the floor during high-volume service and trained new staff.
```

Run: `git rm -q resume.md`

- [ ] **Step 5: Add a stub page that reads the resume**

`src/pages/index.astro`:
```astro
---
import { getResume } from "../lib/content.ts";
const resume = await getResume();
---
<p>{resume.name}</p>
```

Create the empty projects directory: `mkdir -p src/content/projects && touch src/content/projects/.gitkeep`

- [ ] **Step 6: Build and check**

Run: `pnpm build`
Expected: `astro check` reports `0 errors`; build reports `1 page(s) built`; `dist/index.html`
contains `Chase R. Cartwright`. A warning that the `projects` collection is empty is fine.

- [ ] **Step 7: Prove the schema rejects bad data**

Temporarily change `start: 2024-05` (the SWE II role) to `start: May 2024`, then run
`pnpm build`.
Expected: FAIL with `InvalidContentEntryDataError` naming `start` and `use YYYY or YYYY-MM`.
Revert the change and run `pnpm build` again. It should pass.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "Scaffold Astro site with schema-checked resume data

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Date range formatting

**Files:**
- Create: `src/lib/dates.ts`, `src/lib/dates.test.ts`, `vitest.config.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: `formatDate(value: string): string` and
  `formatRange(start: string, end: string): string` from `src/lib/dates.ts`.

- [ ] **Step 1: Install Vitest and configure it**

Run: `pnpm add -D vitest@5.0.5`

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["src/**/*.test.ts"] } });
```

Add to `package.json` scripts: `"test": "vitest run"`

- [ ] **Step 2: Write the failing tests**

`src/lib/dates.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { formatDate, formatRange } from "./dates.ts";

describe("formatDate", () => {
  it("formats a year and month", () => expect(formatDate("2024-05")).toBe("May 2024"));
  it("keeps a bare year", () => expect(formatDate("2018")).toBe("2018"));
  it("names the present", () => expect(formatDate("present")).toBe("Present"));
  it("rejects a month that doesn't exist", () =>
    expect(() => formatDate("2024-13")).toThrow(RangeError));
});

describe("formatRange", () => {
  it("joins two dates with a spaced en dash", () =>
    expect(formatRange("2022-10", "2023-05")).toBe("Oct 2022 – May 2023"));
  it("handles bare years", () => expect(formatRange("2018", "2022")).toBe("2018 – 2022"));
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test`
Expected: FAIL, because `./dates.ts` cannot be resolved.

- [ ] **Step 4: Implement**

`src/lib/dates.ts`:
```ts
/** Display formatting for resume dates ("YYYY", "YYYY-MM" or "present"). */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(value: string): string {
  if (value === "present") return "Present";
  const [year, month] = value.split("-");
  if (month === undefined) return value;
  const name = MONTHS[Number(month) - 1];
  if (name === undefined) throw new RangeError(`no month ${month} in "${value}"`);
  return `${name} ${year}`;
}

export function formatRange(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test`
Expected: 6 passed.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Add resume date formatting

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Layout, styles, home page and 404

**Files:**
- Create: `src/styles/global.css`, `src/layouts/Base.astro`, `src/site.ts`,
  `public/favicon.svg`, `src/pages/404.astro`
- Modify: `src/pages/index.astro` (replace the stub)

**Interfaces:**
- Consumes: `getResume()`, `getProjects()` (Task 1).
- Produces: `Base` layout with props `{ title: string; description: string }`. When `title`
  equals the resume name, it is used alone; otherwise it becomes `"<title> · <name>"`.
  `ANALYTICS_TOKEN` comes from `src/site.ts`. CSS classes for later pages: `lede`, `meta`,
  `stack`, `dates`, `project-list`, `roles`, `entry`, `download`, `resume`, `project`.

- [ ] **Step 1: Write `src/site.ts`**

```ts
/**
 * Cloudflare Web Analytics site token: public, safe to commit. Empty disables the beacon.
 * Get it from Cloudflare dashboard → Analytics & Logs → Web Analytics → Add a site.
 */
export const ANALYTICS_TOKEN = "";
```

- [ ] **Step 2: Write `src/styles/global.css`**

```css
:root {
  --bg: #fbfaf7;
  --text: #1d1c1a;
  --muted: #5d5a54;
  --rule: #dedad2;
  --accent: #8a3b12;
  --serif: "Source Serif 4 Variable", Georgia, serif;
  --sans: "Inter Variable", system-ui, sans-serif;
  --measure: 40rem;
  color-scheme: light dark;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #161513;
    --text: #e9e6df;
    --muted: #a8a399;
    --rule: #34312c;
    --accent: #e8955f;
  }
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 1.125rem/1.65 var(--serif);
}

.site-header, main, .site-footer {
  max-width: var(--measure);
  margin-inline: auto;
  padding-inline: 1rem;
}

.site-header nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem 1.5rem;
  padding-block: 1.5rem;
  border-bottom: 1px solid var(--rule);
  font-family: var(--sans);
  font-size: 0.95rem;
}

.site-header ul, .site-footer ul {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.site-header .name { color: var(--text); font-weight: 600; text-decoration: none; }

main { padding-block: 2.5rem 3rem; }

h1, h2, h3 { font-family: var(--sans); line-height: 1.25; letter-spacing: -0.01em; }
h1 { font-size: 2rem; margin: 0 0 0.5rem; }
h2 { font-size: 1.15rem; margin: 2.5rem 0 0.75rem; }
h3 { font-size: 1rem; margin: 1.5rem 0 0.25rem; }

a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 0.15em; }
a:hover { text-decoration-thickness: 2px; }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
[aria-current="page"] { color: var(--text); text-decoration: none; }

.lede { font-size: 1.25rem; }
.meta, .stack, .dates { color: var(--muted); font-family: var(--sans); font-size: 0.9rem; }

.project-list { margin: 0; padding: 0; list-style: none; }
.project-list li { padding-block: 1rem; border-top: 1px solid var(--rule); }
.project-list li > a { font-family: var(--sans); font-size: 1.1rem; font-weight: 600; }
.project-list p { margin: 0.25rem 0 0; }

.roles { margin: 0 0 0.5rem; padding: 0; list-style: none; }

main img { max-width: 100%; height: auto; }

.skip { position: absolute; left: -9999px; }
.skip:focus { top: 1rem; left: 1rem; padding: 0.5rem; background: var(--bg); }

.site-footer {
  padding-block: 2rem;
  border-top: 1px solid var(--rule);
  color: var(--muted);
  font-family: var(--sans);
  font-size: 0.9rem;
}

@media print {
  @page { size: Letter; margin: 0.55in 0.6in; }
  :root { --bg: #fff; --text: #000; --muted: #333; --rule: #999; --accent: #000; }
  body { font-size: 10pt; line-height: 1.4; }
  .site-header, .site-footer, .skip, .download { display: none; }
  main { max-width: none; padding: 0; }
  h1 { font-size: 18pt; margin: 0; }
  h2 {
    margin: 12pt 0 4pt;
    border-bottom: 0.5pt solid var(--rule);
    font-size: 11pt;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  h3 { font-size: 10.5pt; margin: 8pt 0 2pt; }
  ul { margin: 2pt 0; padding-left: 14pt; }
  li { margin: 1pt 0; }
  .resume .entry { break-inside: avoid; }
  a { text-decoration: none; }
  .meta, .stack, .dates { font-size: 9pt; }
}
```

- [ ] **Step 3: Write `src/layouts/Base.astro`**

```astro
---
import "@fontsource-variable/source-serif-4";
import "@fontsource-variable/inter";
import "../styles/global.css";
import { getResume } from "../lib/content.ts";
import { ANALYTICS_TOKEN } from "../site.ts";

interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props;
const resume = await getResume();
const pageTitle = title === resume.name ? title : `${title} · ${resume.name}`;
const canonical = new URL(Astro.url.pathname, Astro.site);
const nav = [
  { href: "/resume/", label: "Resume" },
  { href: "/about/", label: "About" },
];
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>{pageTitle}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    {ANALYTICS_TOKEN && (
      <script
        is:inline
        defer
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon={JSON.stringify({ token: ANALYTICS_TOKEN })}
      />
    )}
  </head>
  <body>
    <a class="skip" href="#main">Skip to content</a>
    <header class="site-header">
      <nav aria-label="Site">
        <a class="name" href="/" aria-current={Astro.url.pathname === "/" ? "page" : undefined}>
          {resume.name}
        </a>
        <ul>
          {nav.map((item) => (
            <li>
              <a
                href={item.href}
                aria-current={Astro.url.pathname === item.href ? "page" : undefined}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
    <main id="main">
      <slot />
    </main>
    <footer class="site-footer">
      <ul>
        <li><a href={`mailto:${resume.email}`}>{resume.email}</a></li>
        <li><a href={resume.github}>GitHub</a></li>
        <li><a href="/resume.pdf">Resume (PDF)</a></li>
      </ul>
    </footer>
  </body>
</html>
```

- [ ] **Step 4: Write `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    rect { fill: #8a3b12; }
    text { fill: #fbfaf7; font: 600 20px system-ui, sans-serif; }
  </style>
  <rect width="32" height="32" rx="6" />
  <text x="16" y="23" text-anchor="middle">C</text>
</svg>
```

- [ ] **Step 5: Replace `src/pages/index.astro`**

```astro
---
import Base from "../layouts/Base.astro";
import { getProjects, getResume } from "../lib/content.ts";

const resume = await getResume();
const projects = await getProjects();
---
<Base title={resume.name} description={resume.headline}>
  <section>
    <h1>{resume.name}</h1>
    <p class="lede">{resume.headline}</p>
    <p>{resume.summary}</p>
  </section>
  <section aria-labelledby="projects">
    <h2 id="projects">Projects</h2>
    <ul class="project-list">
      {projects.map((project) => (
        <li>
          <a href={`/projects/${project.id}/`}>{project.data.title}</a>
          <p>{project.data.tagline}</p>
          <p class="stack">{project.data.stack.join(" · ")}</p>
        </li>
      ))}
    </ul>
  </section>
</Base>
```

- [ ] **Step 6: Write `src/pages/404.astro`**

```astro
---
import Base from "../layouts/Base.astro";
---
<Base title="Page not found" description="This page doesn't exist.">
  <h1>Page not found</h1>
  <p>There's nothing at this address. <a href="/">Go to the home page</a>.</p>
</Base>
```

- [ ] **Step 7: Build and look at it**

Run: `pnpm build && pnpm preview`
Expected: build passes with 0 errors. In a browser at http://localhost:4321/ the page shows the
name, headline and summary in the serif font, and switches theme with the OS setting. At 320px
width there's no horizontal scroll. Confirm there's no `<script>` and no `style=` attribute:
run `grep -c '<script\|style=' dist/index.html` and expect `0`. Stop the preview.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "Add base layout, editorial styles, home and 404 pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Resume page

**Files:**
- Create: `src/pages/resume.astro`

**Interfaces:**
- Consumes: `getResume()`, `getProjects()`, `formatRange()`, `Base`.
- Produces: route `/resume/`, rendered in print as the PDF in Task 7. The headings `h1` (name),
  `h3` (company and project titles) and each role title appear as plain text.

- [ ] **Step 1: Write `src/pages/resume.astro`**

```astro
---
import Base from "../layouts/Base.astro";
import { getProjects, getResume } from "../lib/content.ts";
import { formatRange } from "../lib/dates.ts";

const resume = await getResume();
const projects = await getProjects();
const githubLabel = resume.github.replace(/^https:\/\//, "");
---
<Base title="Resume" description={`Resume of ${resume.name}: ${resume.headline}`}>
  <article class="resume">
    <header>
      <h1>{resume.name}</h1>
      <p class="meta">{resume.location}</p>
      <p class="meta">
        <a href={`mailto:${resume.email}`}>{resume.email}</a> ·
        <a href={resume.github}>{githubLabel}</a>
      </p>
      <p class="download"><a href="/resume.pdf" download>Download PDF</a></p>
    </header>

    <section aria-labelledby="summary">
      <h2 id="summary">Summary</h2>
      <p>{resume.summary}</p>
    </section>

    <section aria-labelledby="experience">
      <h2 id="experience">Experience</h2>
      {resume.experience.map((job) => (
        <div class="entry">
          <h3>{job.company}</h3>
          <ul class="roles">
            {job.roles.map((role) => (
              <li>
                {role.title} <span class="dates">{formatRange(role.start, role.end)}</span>
              </li>
            ))}
          </ul>
          <ul>{job.bullets.map((bullet) => <li>{bullet}</li>)}</ul>
        </div>
      ))}
    </section>

    <section aria-labelledby="projects">
      <h2 id="projects">Projects</h2>
      {projects.map((project) => (
        <div class="entry">
          <h3><a href={`/projects/${project.id}/`}>{project.data.title}</a>: {project.data.tagline}</h3>
          <p class="stack">
            {project.data.stack.join(" · ")} ·
            <a href={project.data.repo}>{project.data.repo.replace(/^https:\/\//, "")}</a>
          </p>
          <ul>{project.data.highlights.map((item) => <li>{item}</li>)}</ul>
        </div>
      ))}
    </section>

    <section aria-labelledby="skills">
      <h2 id="skills">Skills</h2>
      <ul>
        {resume.skills.map((group) => (
          <li><strong>{group.label}:</strong> {group.items.join(", ")}</li>
        ))}
      </ul>
    </section>

    <section aria-labelledby="education">
      <h2 id="education">Education</h2>
      {resume.education.map((school) => (
        <div class="entry">
          <h3>{school.school}</h3>
          <p class="meta">{school.program} · {formatRange(school.start, school.end)}</p>
          {school.note && <p>{school.note}</p>}
        </div>
      ))}
    </section>

    <section aria-labelledby="earlier">
      <h2 id="earlier">Earlier Experience</h2>
      {resume.earlier.map((job) => (
        <div class="entry">
          <h3>{job.title}</h3>
          <p class="meta">
            {job.org} · {formatRange(job.start, job.end)}{job.note && ` · ${job.note}`}
          </p>
          <p>{job.detail}</p>
        </div>
      ))}
    </section>
  </article>
</Base>
```

- [ ] **Step 2: Build and check the screen and print views**

Run: `pnpm build && pnpm preview`
Expected: http://localhost:4321/resume/ shows every section in the order of
`resume.yaml`, with dates like `May 2024 – May 2026`. In the browser's print preview
(Ctrl+P), the nav, footer and "Download PDF" are hidden, the text is black on white, and the
whole resume fits on 2 Letter pages or fewer. The Projects section is empty until Task 5; that's
expected. Stop the preview.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "Add resume page with print layout

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Project pages and the Ingest the World write-up

**Files:**
- Create: `src/pages/projects/[slug].astro`, `src/content/projects/ingest-the-world.md`,
  `public/figures/ingest-pipeline.svg`
- Delete: `src/content/projects/.gitkeep`

**Interfaces:**
- Consumes: `getProjects()`, `Base`, `projectSchema` frontmatter fields.
- Produces: route `/projects/<file name without .md>/`. Every write-up has the `##` sections
  "The problem", "What I built", "Key decisions" and "What I'd do next", and one figure as a
  Markdown image with alt text, served from `/figures/`.

- [ ] **Step 1: Write the project page**

`src/pages/projects/[slug].astro`:
```astro
---
import { render, type CollectionEntry } from "astro:content";
import Base from "../../layouts/Base.astro";
import { getProjects } from "../../lib/content.ts";

export async function getStaticPaths() {
  const projects = await getProjects();
  return projects.map((project) => ({ params: { slug: project.id }, props: { project } }));
}

interface Props {
  project: CollectionEntry<"projects">;
}

const { project } = Astro.props;
const { title, tagline, stack, repo } = project.data;
const { Content } = await render(project);
---
<Base title={title} description={tagline}>
  <article class="project">
    <header>
      <h1>{title}</h1>
      <p class="lede">{tagline}</p>
      <p class="meta">{stack.join(" · ")} · <a href={repo}>Source on GitHub</a></p>
    </header>
    <Content />
    <p><a href="/">← All projects</a></p>
  </article>
</Base>
```

- [ ] **Step 2: Write the figure**

`public/figures/ingest-pipeline.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 492" role="img" aria-labelledby="t">
  <title id="t">Ingest pipeline: a client uploads through a signed URL to landing storage; a
    queue event starts a worker that scans, classifies and extracts metadata; the file is
    promoted to raw storage and cataloged in Postgres; the search API filters every query
    through one authorization function.</title>
  <style>
    rect { fill: #fff; stroke: #5d5a54; }
    text { fill: #1d1c1a; font: 15px system-ui, sans-serif; }
    .sub { fill: #5d5a54; font-size: 13px; }
    line { stroke: #8a3b12; stroke-width: 1.5; }
    .head { fill: #8a3b12; }
    @media (prefers-color-scheme: dark) {
      rect { fill: #1f1d1a; stroke: #a8a399; }
      text { fill: #e9e6df; }
      .sub { fill: #a8a399; }
      line { stroke: #e8955f; }
      .head { fill: #e8955f; }
    }
  </style>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <polygon class="head" points="0,0 10,5 0,10" />
    </marker>
  </defs>
  <g text-anchor="middle">
    <rect x="40" y="20" width="560" height="52" rx="6" />
    <text x="320" y="42">Client</text>
    <text class="sub" x="320" y="61">uploads through a signed URL that limits what it may write</text>

    <rect x="40" y="100" width="560" height="52" rx="6" />
    <text x="320" y="122">Landing storage (Azure Blob)</text>
    <text class="sub" x="320" y="141">untrusted until scanned</text>

    <rect x="40" y="180" width="560" height="52" rx="6" />
    <text x="320" y="202">Queue (Service Bus)</text>
    <text class="sub" x="320" y="221">one "upload finished" event per blob version</text>

    <rect x="40" y="260" width="560" height="52" rx="6" />
    <text x="320" y="282">Worker</text>
    <text class="sub" x="320" y="301">scan · classify · budgeted header reads for metadata</text>

    <rect x="40" y="340" width="560" height="52" rx="6" />
    <text x="320" y="362">Raw storage + catalog (Postgres, PostGIS)</text>
    <text class="sub" x="320" y="381">STAC items with footprints, searchable by place and time</text>

    <rect x="40" y="420" width="560" height="52" rx="6" />
    <text x="320" y="442">Search API (FastAPI)</text>
    <text class="sub" x="320" y="461">every query filtered by one SQL authorization function</text>
  </g>
  <line x1="320" y1="72" x2="320" y2="98" marker-end="url(#arrow)" />
  <line x1="320" y1="152" x2="320" y2="178" marker-end="url(#arrow)" />
  <line x1="320" y1="232" x2="320" y2="258" marker-end="url(#arrow)" />
  <line x1="320" y1="312" x2="320" y2="338" marker-end="url(#arrow)" />
  <line x1="320" y1="392" x2="320" y2="418" marker-end="url(#arrow)" />
</svg>
```

- [ ] **Step 3: Write the Ingest the World write-up**

`src/content/projects/ingest-the-world.md`:
```markdown
---
title: Ingest the World
tagline: A geospatial data platform where the database decides who sees what.
stack: [Python, FastAPI, PostgreSQL/PostGIS, React, TypeScript, Terraform, Azure]
repo: https://github.com/Chazzychouse/ingest-the-world
order: 1
highlights:
  - >-
    Platform that ingests geospatial files of any size (sensor readings up to multi-GB rasters,
    point clouds and 3D models), routes each to the right store, extracts searchable metadata,
    and serves it through a STAC-style search API.
  - >-
    Put authorization in the database: one SQL function decides who can read what, attribute
    (clearance) based and enforced on every query, with an audit event for every catalog access.
  - >-
    Wrote the platform's guarantees as numbered invariants and tested them with Hypothesis state
    machines that drive the real API and Postgres. Fault-injecting fakes are checked against
    Azurite and the Service Bus emulator, and mutation testing proves the suite catches planted
    bugs.
  - >-
    One Terraform module deploys to both commercial Azure and Azure Government. Login uses
    provider-neutral OIDC (Keycloak locally, Entra in the cloud).
---

## The problem

Teams that work with geospatial data receive files of every shape: a few bytes of sensor
readings, multi-gigabyte rasters and point clouds, 3D models too big to open casually. Each one
has to land in the right store, be described well enough to find again, and be visible only to
people cleared to see it, on commercial Azure and on Azure Government alike.

## What I built

![The ingest pipeline, from a signed upload through the queue and worker to the catalog and the search API.](/figures/ingest-pipeline.svg)

A client asks for an upload and gets a signed URL that limits what it may write. When the file
lands, an event goes on a queue. A worker scans it, works out what kind of file it is, reads only
as much of its header as it needs to extract metadata, promotes it to raw storage and catalogs it
as a STAC item in Postgres with PostGIS. A FastAPI service serves search and item reads to a
React app that signs in with OIDC.

## Key decisions

- **The database decides who sees what.** One SQL function works out which collections a user
  may read from their roles and clearance. Every query filters through it, and the Python code
  never re-implements the rule. Every catalog access writes one audit event before responding.
- **Guarantees are written down and tested.** Properties like "no leaks", "every access is
  audited" and "processing an event twice changes nothing" are numbered invariants. Hypothesis
  state machines drive the real API and Postgres with random users and operations, checking the
  invariants after every step. The pipeline simulator runs the worker over a queue and blob store
  that drop, duplicate and fail, then replays every event.
- **Fakes are held to the real thing.** Each external dependency has one behavioural test suite
  that runs against both the seeded fake and the real emulator (Azurite, the Service Bus
  emulator), so the fakes can't drift from reality.
- **The tests are tested.** Mutation testing plants known bugs and checks that the right
  invariant catches each one.
- **One deployment for two clouds.** A single Terraform module targets commercial Azure or
  Azure Government with one variable. Sign-in is provider-neutral OIDC: Keycloak locally, Entra
  ID in the cloud.

## What I'd do next

- Finish the derive stage, which builds derivative files from each cataloged item through
  per-format recipes, under the same replay-everything simulator.
- Build out the map, 3D and AR/VR viewers on top of the search API.
```

Ask Chase to confirm the two "What I'd do next" bullets match their plans; edit to match.

Run: `rm src/content/projects/.gitkeep`

- [ ] **Step 4: Build and check**

Run: `pnpm build && pnpm preview`
Expected: build passes. http://localhost:4321/projects/ingest-the-world/ shows the title,
tagline, stack line, the diagram (readable in both themes) and four sections. The home page lists
the project and links to it. The resume's Projects section shows its four highlights. Stop the
preview.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Add project pages and the Ingest the World write-up

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The other four write-ups

**Files:**
- Create: `src/content/projects/csvql.md`, `src/content/projects/sportal.md`,
  `src/content/projects/gpui-tunes.md`, `src/content/projects/bongocat.md`
- Create (when available): `public/figures/<slug>.png` screenshots

**Interfaces:**
- Consumes: `projectSchema` (Task 1) and the write-up outline (Task 5).

The prose comes from each repo, so read before writing. For each project, read its `README`,
its manifest (`go.mod`, `package.json`, `Cargo.toml`) and its top-level layout, plus
`git log --oneline | head -30`. Write only what the repo shows. Keep each write-up under 400
words, in the same four sections as Ingest the World. Source repos:

| Slug | Source | Repo URL |
|---|---|---|
| csvql | `~/projects/csvQL` | https://github.com/Chazzychouse/csvQL |
| sportal | `~/development/projects/sportal` | https://github.com/Chazzychouse/sportal |
| gpui-tunes | `~/development/projects/gpui-tunes` | https://github.com/Chazzychouse/gpui-tunes |
| bongocat | `~/projects/bongocat` | https://github.com/Chazzychouse/bongocat |

- [ ] **Step 1: Write `csvql.md` with this frontmatter, then the body from the repo**

```markdown
---
title: csvQL
tagline: SQL for spreadsheets, in the terminal.
stack: [Go]
repo: https://github.com/Chazzychouse/csvQL
order: 2
highlights:
  - >-
    Interactive terminal app and CLI for querying CSV and XLSX files with SQL, with
    autocomplete, a schema panel and unpivot support.
---
```

- [ ] **Step 2: Write `sportal.md`**

```markdown
---
title: sportal
tagline: A live football tracker and multi-game viewer for desktop and web.
stack: [TypeScript, Effect, React, pnpm monorepo]
repo: https://github.com/Chazzychouse/sportal
order: 3
highlights:
  - >-
    Live game tracker and multi-game viewer shipped as desktop, web and hub apps from one
    monorepo, with automated tests, dependency-boundary checks and release workflows.
---
```

- [ ] **Step 3: Write `gpui-tunes.md`**

```markdown
---
title: gpui-tunes
tagline: A native desktop music player in Rust, in the spirit of classic iTunes.
stack: [Rust, GPUI, cpal]
repo: https://github.com/Chazzychouse/gpui-tunes
order: 4
highlights:
  - >-
    Desktop player in the style of classic iTunes for a local audio library, written in Rust
    with native GPU-rendered UI and direct audio output.
---
```

- [ ] **Step 4: Write `bongocat.md`**

```markdown
---
title: bongocat
tagline: A Linux daemon that counts your keystrokes straight from the kernel.
stack: [Go, Linux evdev]
repo: https://github.com/Chazzychouse/bongocat
order: 5
highlights:
  - >-
    Daemon that reads keyboard and mouse events straight from the kernel's input devices and
    shows live counts in the Waybar status bar. Ships with an installer.
---
```

- [ ] **Step 5: Figures**

Each write-up needs one figure. A screenshot is best for csvql, sportal and gpui-tunes (these
are terminal and desktop apps), and bongocat suits a small diagram (evdev → daemon → Waybar)
in the same SVG style as `ingest-pipeline.svg`. Ask Chase for screenshots of the three apps.
Save them as `public/figures/<slug>.png` at most 1600px wide, and reference each in its
"What I built" section as `![<what the screenshot shows>](/figures/<slug>.png)`. Leave the
image line out of any write-up whose screenshot isn't ready yet, and tell Chase which ones are
still missing.

- [ ] **Step 6: Build and check**

Run: `pnpm build`
Expected: passes. The home page lists the five projects in order 1–5. The resume fits on 2
pages in print preview; if it doesn't, cut the longest highlights and confirm the cuts with Chase.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Add csvQL, sportal, gpui-tunes and bongocat write-ups

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: About page

**Files:**
- Create: `src/pages/about.astro`

- [ ] **Step 1: Write `src/pages/about.astro`**

```astro
---
import Base from "../layouts/Base.astro";
---
<Base title="About" description="How I got from waiting tables and electrical engineering to backend software.">
  <h1>About</h1>
  <p>
    I came to software sideways. I spent years waiting tables at Wild Wing Cafe in Chesapeake,
    and four years selling real estate as an independent agent. Those jobs taught me to read
    people, keep my word under pressure, and run my own business.
  </p>
  <p>
    In 2021 I went back to school at Tidewater Community College to study electrical
    engineering. Circuits taught me to think of a system as parts with contracts between them.
    Then a C++ course showed me I could build those systems myself, and I was hooked: memory,
    pointers, and what the machine actually does with my code.
  </p>
  <p>
    That got me an internship at Issuetrak in 2022. Seven months later I was a full-time
    engineer, and a year after that a Software Engineer II. I spent most of that time
    modernizing a long-running Classic ASP and SQL Server product from the inside: building a
    .NET service layer next to the legacy code, moving pages onto it one at a time, shipping the
    product's public API, and helping move data access off Entity Framework so the product could
    run on modern .NET.
  </p>
  <p>
    What I care about most is where application code meets the database, and testing that proves
    software is correct rather than hoping it is. Outside work I build things to learn how
    operating systems and databases work underneath. Some of them are <a href="/">on this site</a>.
  </p>
  <p>
    I'm looking for a backend or platform role where correctness matters. I live in Chesapeake,
    Virginia, and I'm open to remote work or relocating. The best way to reach me is by email,
    linked below.
  </p>
</Base>
```

- [ ] **Step 2: Review with Chase**

Show Chase the text. It's their story in their voice, so edit until they're happy with it.

- [ ] **Step 3: Build and commit**

Run: `pnpm build`
Expected: passes; `/about/` renders, and "About" in the nav is marked as the current page.

```bash
git add -A && git commit -m "Add about page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Resume PDF: render and check

**Files:**
- Create: `src/lib/pdf.ts`, `src/lib/pdf.test.ts`, `scripts/render-pdf.ts`,
  `scripts/check-pdf.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `resumeSchema`, `type Resume` (Task 1).
- Produces: `pdfProblems(facts: PdfFacts, expected: PdfExpectations): string[]`,
  `requiredPhrases(resume: Resume): string[]`, and the types
  `PdfFacts = { pages: number; text: string }` and
  `PdfExpectations = { maxPages: number; phrases: string[] }`. The file `dist/resume.pdf`
  exists after `pnpm build`.

- [ ] **Step 1: Install**

Run:
```bash
pnpm add -D @playwright/test@1.64.1 unpdf@1.9.1 yaml@2.9.1 && pnpm exec playwright install chromium
```

- [ ] **Step 2: Write the failing tests**

`src/lib/pdf.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { pdfProblems, requiredPhrases } from "./pdf.ts";
import type { Resume } from "./schema.ts";

const expected = { maxPages: 2, phrases: ["Chase R. Cartwright", "Software Engineer II"] };

describe("pdfProblems", () => {
  it("accepts a PDF within the page limit that has every phrase", () => {
    const text = "Chase R. Cartwright\nIssuetrak Software Engineer II";
    expect(pdfProblems({ pages: 2, text }, expected)).toEqual([]);
  });

  it("reports a PDF over the page limit", () => {
    const text = "Chase R. Cartwright Software Engineer II";
    expect(pdfProblems({ pages: 3, text }, expected)).toEqual([
      "PDF has 3 pages; the limit is 2",
    ]);
  });

  it("reports each missing phrase", () => {
    expect(pdfProblems({ pages: 1, text: "Chase R. Cartwright" }, expected)).toEqual([
      'PDF text is missing "Software Engineer II"',
    ]);
  });

  it("matches phrases split across lines", () => {
    const text = "Chase R.\nCartwright  Software\n Engineer II";
    expect(pdfProblems({ pages: 1, text }, expected)).toEqual([]);
  });
});

describe("requiredPhrases", () => {
  it("lists the name, email and every role title", () => {
    const resume = {
      name: "A",
      email: "a@b.c",
      experience: [
        { company: "X", bullets: ["b"], roles: [{ title: "T1" }, { title: "T2" }] },
        { company: "Y", bullets: ["b"], roles: [{ title: "T3" }] },
      ],
    } as unknown as Resume;
    expect(requiredPhrases(resume)).toEqual(["A", "a@b.c", "T1", "T2", "T3"]);
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `pnpm test`
Expected: FAIL, because `./pdf.ts` cannot be resolved.

- [ ] **Step 4: Implement `src/lib/pdf.ts`**

```ts
/** What the resume PDF must satisfy: a page limit, and the facts a reader must not lose. */
import type { Resume } from "./schema.ts";

export interface PdfFacts {
  pages: number;
  text: string;
}

export interface PdfExpectations {
  maxPages: number;
  phrases: string[];
}

export function pdfProblems(facts: PdfFacts, expected: PdfExpectations): string[] {
  const problems: string[] = [];
  if (facts.pages > expected.maxPages) {
    problems.push(`PDF has ${facts.pages} pages; the limit is ${expected.maxPages}`);
  }
  const text = normalize(facts.text);
  for (const phrase of expected.phrases) {
    if (!text.includes(normalize(phrase))) problems.push(`PDF text is missing "${phrase}"`);
  }
  return problems;
}

export function requiredPhrases(resume: Resume): string[] {
  const titles = resume.experience.flatMap((job) => job.roles.map((role) => role.title));
  return [resume.name, resume.email, ...titles];
}

/** PDF text extraction breaks lines anywhere, so compare with whitespace collapsed. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
```

- [ ] **Step 5: Run to verify they pass**

Run: `pnpm test`
Expected: all pass (dates + pdf).

- [ ] **Step 6: Write `scripts/render-pdf.ts`**

```ts
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
```

- [ ] **Step 7: Write `scripts/check-pdf.ts`**

```ts
/** Fails if dist/resume.pdf is too long or has lost the name, email or a job title. */
import { readFile } from "node:fs/promises";
import { extractText, getDocumentProxy } from "unpdf";
import { parse } from "yaml";
import { pdfProblems, requiredPhrases } from "../src/lib/pdf.ts";
import { resumeSchema } from "../src/lib/schema.ts";

const MAX_PAGES = 2;

const raw: unknown = parse(await readFile("src/data/resume.yaml", "utf8"));
const resume = resumeSchema.parse((raw as { resume: unknown }).resume);
const pdf = await getDocumentProxy(new Uint8Array(await readFile("dist/resume.pdf")));
const { totalPages, text } = await extractText(pdf, { mergePages: true });

const problems = pdfProblems(
  { pages: totalPages, text },
  { maxPages: MAX_PAGES, phrases: requiredPhrases(resume) },
);
if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(`✓ resume.pdf: ${totalPages} page(s), all required text present`);
```

- [ ] **Step 8: Wire the scripts**

In `package.json` scripts, set:
```json
"build": "astro check && astro build && node scripts/render-pdf.ts",
"check:pdf": "node scripts/check-pdf.ts"
```

- [ ] **Step 9: Run end to end**

Run: `pnpm build && pnpm check:pdf`
Expected: `wrote dist/resume.pdf`, then `✓ resume.pdf: 2 page(s), all required text present`
(1 page is fine too). Open `dist/resume.pdf` and check it looks right: fonts embedded, no nav or
footer, nothing cut off at page breaks.

- [ ] **Step 10: Prove the check catches a problem**

Temporarily add `h1 { display: none; }` inside the `@media print` block of
`src/styles/global.css`, then run `pnpm build && pnpm check:pdf`.
Expected: FAIL with `✗ PDF text is missing "Chase R. Cartwright"`. Revert, rebuild and confirm
it passes.

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "Render the resume PDF at build time and check its contents

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Link checking

**Files:**
- Create: `src/lib/dist.ts`, `src/lib/links.ts`, `src/lib/links.test.ts`,
  `scripts/check-links.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces from `src/lib/dist.ts`:
  - `readSite(dir: string): Map<string, string>`: each file's path relative to `dir`
    (`/`-separated) mapped to its contents, with HTML files read and others mapped to `""`.
  - `routeOf(file: string): string`: `resume/index.html` → `/resume/`.
  - `pageRoutes(site: ReadonlyMap<string, string>): string[]`: the sorted routes of the HTML
    files.
- Produces from `src/lib/links.ts`:
  - `interface Problem { page: string; href: string; reason: string }`
  - `checkSite(site: ReadonlyMap<string, string>): Problem[]`
  - `externalLinks(site: ReadonlyMap<string, string>): string[]`
  - `extractLinks(html: string): string[]`

- [ ] **Step 1: Write `src/lib/dist.ts`**

```ts
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
```

- [ ] **Step 2: Write the failing tests**

`src/lib/links.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { routeOf } from "./dist.ts";
import { checkSite, externalLinks, extractLinks } from "./links.ts";

const site = (pages: Record<string, string>) => new Map(Object.entries(pages));

describe("extractLinks", () => {
  it("finds href and src values", () => {
    expect(extractLinks('<a href="/a/">x</a><img src="/i.svg" alt="">')).toEqual(["/a/", "/i.svg"]);
  });
});

describe("checkSite", () => {
  it("accepts links to pages, files and existing anchors", () => {
    const pages = site({
      "index.html": '<a href="/resume/">r</a><a href="/resume.pdf">p</a><a href="/resume/#skills">s</a><a href="#top">t</a><h1 id="top">x</h1>',
      "resume/index.html": '<h2 id="skills">Skills</h2>',
      "resume.pdf": "",
    });
    expect(checkSite(pages)).toEqual([]);
  });

  it("ignores external and mailto links", () => {
    const pages = site({ "index.html": '<a href="https://github.com/x">g</a><a href="mailto:a@b.c">m</a>' });
    expect(checkSite(pages)).toEqual([]);
  });

  it("reports a missing page", () => {
    const pages = site({ "index.html": '<a href="/nope/">n</a>' });
    expect(checkSite(pages)).toEqual([{ page: "index.html", href: "/nope/", reason: "no such page" }]);
  });

  it("reports a missing anchor", () => {
    const pages = site({ "index.html": '<a href="/about/#story">a</a>', "about/index.html": "<p>x</p>" });
    expect(checkSite(pages)).toEqual([
      { page: "index.html", href: "/about/#story", reason: 'no element with id "story"' },
    ]);
  });

  it("reports relative links", () => {
    const pages = site({ "index.html": '<a href="about/">a</a>' });
    expect(checkSite(pages)).toEqual([
      { page: "index.html", href: "about/", reason: "relative link; use a root-relative path" },
    ]);
  });
});

describe("externalLinks", () => {
  it("lists each http(s) link once", () => {
    const pages = site({
      "index.html": '<a href="https://github.com/x">g</a><a href="/a/">a</a>',
      "a/index.html": '<a href="https://github.com/x">g</a><a href="mailto:a@b.c">m</a>',
    });
    expect(externalLinks(pages)).toEqual(["https://github.com/x"]);
  });
});

describe("routeOf", () => {
  it("maps index files to directory routes", () => {
    expect(routeOf("index.html")).toBe("/");
    expect(routeOf("projects/csvql/index.html")).toBe("/projects/csvql/");
    expect(routeOf("404.html")).toBe("/404");
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `pnpm test`
Expected: FAIL, because `./links.ts` cannot be resolved.

- [ ] **Step 4: Implement `src/lib/links.ts`**

```ts
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
```

- [ ] **Step 5: Run to verify they pass**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 6: Write `scripts/check-links.ts`**

```ts
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
```

Add to `package.json` scripts: `"check:links": "node scripts/check-links.ts"`

- [ ] **Step 7: Run against the real build**

Run: `pnpm build && pnpm check:links`
Expected: `✓ all links resolve`. If it reports a problem, fix the page, not the checker.

Run: `pnpm check:links --external`
Expected: GitHub links for repos that are still private fail with status 404. That's the
reminder to make them public (Task 11 prerequisites). The rest pass.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "Add internal and external link checks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Accessibility tests

**Files:**
- Create: `playwright.config.ts`, `tests/a11y.spec.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `readSite()`, `pageRoutes()` (Task 9).

- [ ] **Step 1: Install**

Run: `pnpm add -D @axe-core/playwright@4.14.0`

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  use: { baseURL: "http://localhost:4321" },
  webServer: {
    command: "pnpm exec astro preview --port 4321",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
```

- [ ] **Step 3: Write `tests/a11y.spec.ts`**

```ts
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
```

Add to `package.json` scripts: `"test:a11y": "playwright test"`

- [ ] **Step 4: Run**

Run: `pnpm build && pnpm test:a11y`
Expected: 2 tests per page (light and dark), all passing. If contrast fails, adjust the color
tokens in `global.css` rather than excluding the rule.

- [ ] **Step 5: Prove it catches a violation**

Temporarily set `--muted: #c8c4bc;` in the light `:root` block, then rebuild and rerun.
Expected: FAIL with rule `color-contrast`. Revert, rebuild and confirm it passes.

- [ ] **Step 6: Add the combined verify script and commit**

Add to `package.json` scripts:
```json
"verify": "pnpm test && pnpm build && pnpm check:links && pnpm check:pdf && pnpm test:a11y"
```

Run: `pnpm verify`
Expected: everything passes.

```bash
git add -A && git commit -m "Add accessibility tests in light and dark themes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Security headers, Cloudflare config and smoke test

**Files:**
- Create: `public/_headers`, `wrangler.jsonc`, `src/lib/headers.ts`, `src/lib/headers.test.ts`,
  `scripts/smoke.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `readSite()`, `pageRoutes()` (Task 9).
- Produces: `headerNames(headersFile: string): string[]`, the lowercased header names set
  for `/*` in `public/_headers`. Also `pnpm smoke <base-url>`.

- [ ] **Step 1: Write the failing test**

`src/lib/headers.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { headerNames } from "./headers.ts";

describe("headerNames", () => {
  it("lists the lowercased headers set for every path", () => {
    const file = "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n\n/fonts/*\n  Cache-Control: max-age=1\n";
    expect(headerNames(file)).toEqual(["x-content-type-options", "referrer-policy"]);
  });
});
```

Run: `pnpm test`
Expected: FAIL, because `./headers.ts` cannot be resolved.

- [ ] **Step 2: Implement `src/lib/headers.ts`**

```ts
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
```

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 3: Write `public/_headers`**

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; img-src 'self'; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=(), magnetometer=()
  Cross-Origin-Opener-Policy: same-origin

/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 4: Write `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "chazzychouse-dev",
  "compatibility_date": "2026-10-01",
  "assets": { "directory": "./dist", "not_found_handling": "404-page" },
  "routes": [{ "pattern": "chazzychouse.dev", "custom_domain": true }],
  "workers_dev": false
}
```

Run: `pnpm add -D wrangler@4.152.0`

- [ ] **Step 5: Write `scripts/smoke.ts`**

```ts
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
```

Add to `package.json` scripts: `"smoke": "node scripts/smoke.ts"`

- [ ] **Step 6: Run against wrangler locally**

Run: `pnpm build`, then in a second terminal `pnpm exec wrangler dev --port 8787`, then
`pnpm smoke http://localhost:8787`.
Expected: `✓ http://localhost:8787: N pages, PDF and 404 behave`. (`wrangler dev` serves `dist/`
with `_headers` and the 404 page, the same way production does.) Stop wrangler.

Also open http://localhost:8787/ in Chrome with DevTools → Console open, and confirm there are no
CSP violation messages.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Add security headers, Cloudflare config and smoke test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: CI, first deploy and go-live

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/external-links.yml`, `README.md`

**Prerequisites (Chase does these; walk them through each one):**
1. Make the featured repos public on GitHub: sportal, gpui-tunes and bongocat (bongocat needs
   `git remote add origin` and a first push). Confirm ingest-the-world and csvQL are public.
   Before making a repo public, check its history for secrets:
   `git log -p | grep -iE 'api[_-]?key|secret|password|token' | head`.
2. Create the public repo `Chazzychouse/chazzychouse.dev` and push `main` from `~/resume`.
3. In Cloudflare, go to My Profile → API Tokens → Create Token, start from the
   "Edit Cloudflare Workers" template, and limit it to Chase's account and the chazzychouse.dev
   zone. Copy the account ID from the dashboard's account home.
4. In the GitHub repo, go to Settings → Environments → New environment `production`, then add
   the secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to it.
5. In Cloudflare DNS for chazzychouse.dev, check whether there's an existing `A`, `AAAA` or
   `CNAME` record on the apex. A custom domain can't be attached while one exists. If there is
   one, ask Chase what it's for before removing it.

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm verify
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist
          retention-days: 7

  deploy:
    needs: verify
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist
      - run: pnpm exec wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      - run: pnpm smoke https://chazzychouse.dev
```

- [ ] **Step 2: Write `.github/workflows/external-links.yml`**

```yaml
name: External links

on:
  schedule:
    - cron: "0 13 * * 1"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec astro build
      - run: pnpm check:links --external
```

- [ ] **Step 3: Write `README.md`**

````markdown
# chazzychouse.dev

My portfolio and resume. Astro static site on Cloudflare Workers.

- Resume content: `src/data/resume.yaml` (the only copy; the page and PDF are built from it)
- Project write-ups: `src/content/projects/*.md`

```sh
pnpm install
pnpm dev       # http://localhost:4321
pnpm verify    # unit tests, build + PDF, link, PDF and accessibility checks
```

Pushing to `main` runs the checks and deploys. Take the site down with
`pnpm exec wrangler delete`.
````

- [ ] **Step 4: Push and watch the first run**

```bash
git add -A && git commit -m "Add CI, deploy workflow and README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push
```

Run: `gh run watch --exit-status`
Expected: `verify` and `deploy` both succeed, and the smoke step prints
`✓ https://chazzychouse.dev: N pages, PDF and 404 behave`. If the first deploy's smoke test
times out while the certificate is provisioned, re-run the job after a few minutes.

- [ ] **Step 5: Check the live site**

Open https://chazzychouse.dev on a phone and a desktop, in light and dark mode. Download the
PDF. Run `gh workflow run "External links"` followed by `gh run watch --exit-status` and expect
it to pass now that the repos are public.

- [ ] **Step 6: Optional follow-ups for Chase**

- Once Email Routing for `chase@chazzychouse.dev` is verified, change `email:` in
  `src/data/resume.yaml` and push.
- Turn on Web Analytics: in Cloudflare, go to Web Analytics → Add a site → chazzychouse.dev,
  choose the manual JS snippet, and copy the token into `ANALYTICS_TOKEN` in `src/site.ts`.
  Push, then confirm the console shows no CSP errors.
