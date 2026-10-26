# Portfolio and resume site: design

Date: 2026-10-26 · Status: approved in conversation, awaiting spec review

## Goal

A public site at **chazzychouse.dev** that presents Chase Cartwright's resume and portfolio
projects to recruiters and hiring managers. It must be cheap to run, quick to put up and take
down, and secure by construction.

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Projects | Static write-ups, no live demos | Clearer in a 1-minute skim; nothing to host or secure |
| Look | Editorial, like a well-set technical paper | Fits a backend engineer focused on correctness |
| Generator | Astro, static output | Plain HTML/CSS output, schema-checked content, one source for page and PDF |
| Hosting | Cloudflare Workers static assets | Domain is in the same account; free; Pages is being folded into Workers |
| Domain | chazzychouse.dev | Matches GitHub handle and Gmail; in an account Chase controls; `.dev` is HTTPS-only |
| Contact | Links only (email, GitHub), no form | Nothing to spam or secure |
| Analytics | Cloudflare Web Analytics | Free, no cookies |

## Repository and content

`~/resume` is the site repository, published as the public GitHub repo
`Chazzychouse/chazzychouse.dev`.

```
src/content/resume.yaml         the resume as structured data; replaces resume.md
src/content/projects/*.md       one file per project: frontmatter + write-up
src/pages/index.astro           intro + project list
src/pages/resume.astro          the resume, with a print stylesheet for the PDF
src/pages/about.astro           the EE → C++ → software story
src/pages/projects/[slug].astro one page per project
src/pages/404.astro             not-found page linking Home
public/                         images, GIFs, _headers
projects/                       Chase's code repos; git-ignored, never deployed
```

- **`resume.yaml` is the only copy of the resume.** The resume page, the PDF and the home page
  all read from it. `resume.md` is deleted once its content is converted.
- **Astro content collections validate both files with schemas.** `resume.yaml` covers contact,
  summary, jobs (company, titles with date ranges, bullets), projects order, skills, education
  and earlier experience. Project frontmatter is title, tagline, stack list, repo URL and order.
  A missing or malformed field fails the build.
- **Featured projects, in order:** Ingest the World, csvQL, sportal, gpui-tunes, bongocat.
  Each repo is made public on GitHub before its page goes live. Repos committed under the
  RoboCent work email (universe, Eventually, audio-classifier) are excluded as possible
  employer property.
- **Every write-up follows the same outline:** the problem, what I built, key decisions, and
  what I'd do next. Each has one figure (a diagram or screenshot) and a repo link, and reads in
  about two minutes.

## Pages and visual design

- **Home:** name, a two-line positioning statement, then the projects as a plain list (name,
  tagline, stack). Footer links to Resume, GitHub and email.
- **Project:** title, tagline, stack and repo link, then the four-part write-up and its figure.
- **Resume:** single column matching the PDF, with a "Download PDF" link at the top. Printing
  the page from a browser produces the same PDF.
- **About:** about 250 words: electrical engineering, C++, the Issuetrak internship, where Chase
  is now, and what Chase is looking for.
- **Look:** serif body text (e.g. Source Serif), sans serif headings and metadata, a narrow
  reading width, one quiet accent color, generous whitespace. Light and dark themes follow the
  system setting. No motion beyond link hover states. Pages work at phone width.

## Build and deploy

A GitHub Actions workflow, triggered on every push to `main`:

1. Install dependencies, run `astro check`, and build to `dist/`.
2. Render `/resume` to `dist/resume.pdf` with headless Chromium (Playwright), using the print
   stylesheet. The PDF is never committed.
3. Run the checks below.
4. Deploy with `wrangler deploy` to chazzychouse.dev, then run the post-deploy smoke test.

Pull requests run steps 1–3 without deploying.

- **Security headers** go in `public/_headers` and apply to every response:
  - a strict Content-Security-Policy: no inline scripts; scripts only from self and
    `static.cloudflareinsights.com`, with `frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - a `Permissions-Policy` that disables every feature the site doesn't use
- **The only secret** is a Cloudflare API token scoped to deploying Workers, plus the account ID,
  both stored as GitHub Actions secrets.
- **Takedown:** `wrangler delete`, or detach the domain in the dashboard. To bring the site back,
  re-run the workflow.

## Checks

| Check | Fails CI when |
|---|---|
| `astro check` | Types or content schemas don't validate |
| Internal link check on `dist/` | Any internal link or `#anchor` doesn't resolve |
| External link check (weekly, separate workflow) | Never blocks deploys; reports broken repo links |
| Playwright + axe-core on every page, light and dark | Any serious or critical accessibility violation |
| PDF check | `resume.pdf` is over 2 pages, or its text is missing the name, email or any job title from `resume.yaml` |
| Vitest unit tests | A formatting helper (e.g. date ranges) misbehaves |
| Post-deploy smoke test | Any page isn't 200, `/resume.pdf` isn't `application/pdf`, or a security header is missing |

## Prerequisites (Chase, outside the repo)

- Cloudflare Email Routing for chazzychouse.dev: `chase@chazzychouse.dev` forwarding to
  `chazzychouse.dev@gmail.com`. Until it is verified, the resume shows the Gmail address.
- Make the featured repos public: sportal, gpui-tunes and bongocat (bongocat needs a remote).
  Ingest the World is in `~/resume/projects/` and needs a GitHub repo too.
- Create the Cloudflare API token and add it, with the account ID, to the repo's secrets.

## Out of scope

Live demos, a contact form, a blog, comments, multiple languages and a CMS.
