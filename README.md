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
