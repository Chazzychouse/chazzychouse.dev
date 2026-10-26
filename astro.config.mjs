import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://chazzychouse.dev",
  trailingSlash: "always",
  build: { inlineStylesheets: "never" },
});
