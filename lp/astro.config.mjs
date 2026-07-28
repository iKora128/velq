import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://velq.sh",
  // `i18n` makes the sitemap carry xhtml:link alternates, so Google sees /x/ and
  // /ja/x/ as one page in two languages instead of two unrelated URLs. Mirrors the
  // hreflang tags in BaseLayout; the locale keys must match the path segment.
  integrations: [sitemap({ i18n: { defaultLocale: "en", locales: { en: "en", ja: "ja" } } })],
  build: { format: "directory" },
});
