import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  use: { baseURL: "http://localhost:4323" },
  webServer: {
    // Astro 7 detaches `preview` into a background daemon when it detects an AI agent
    // (CLAUDECODE), which would outlive the test run; unsetting it keeps the server in the
    // foreground so Playwright stops it. A no-op in CI and in a person's terminal.
    command: "env -u CLAUDECODE pnpm exec astro preview --port 4323",
    url: "http://localhost:4323",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
