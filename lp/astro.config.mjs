import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://velq.sh",
  integrations: [sitemap()],
  build: { format: "directory" },
});
