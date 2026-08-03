import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitepress";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { navFor, sidebarFor, themeChromeFor } from "./i18n/nav";

const DOCS_ROOT = path.resolve(__dirname, "..");

/** Docs-root-relative existence check, used to keep sidebars free of 404s. */
function pageExists(relativePath: string): boolean {
  return fs.existsSync(path.join(DOCS_ROOT, relativePath));
}

/**
 * A locale ships as soon as it has a home page. Translation lands page by page
 * after that, and the sidebar generators filter themselves against what is
 * actually on disk, so a half-translated locale never links into thin air.
 */
const ALL_LANGS = ["en", "zh", "ja", "es", "fr", "de", "ru"] as const;
const READY_LANGS = ALL_LANGS.filter(
  lang => lang === "en" || pageExists(`${lang}/index.md`),
);

const LOCALE_NAMES: Record<string, string> = {
  en: "English",
  zh: "简体中文",
  ja: "日本語",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ru: "Русский",
};

const BCP47: Record<string, string> = {
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  ru: "ru-RU",
};

const SOCIAL_LINKS = [
  { icon: "github" as const, link: "https://github.com/GrandMagus02/urcolor" },
];

export default defineConfig({
  cleanUrls: true,
  title: "urcolor",
  description:
    "Unstyled, accessible color picker components for Vue. Build color areas, sliders, swatches, wheels, and more with full keyboard navigation and ARIA support.",
  head: [
    ["meta", { name: "author", content: "GrandMagus" }],
    [
      "meta",
      {
        name: "keywords",
        content:
          "color picker, vue, vue3, color area, color slider, color wheel, color swatch, accessible, unstyled, headless ui, component library",
      },
    ],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "urcolor" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "Unstyled, accessible color picker components for Vue. Build color areas, sliders, swatches, wheels, and more.",
      },
    ],
    ["meta", { property: "og:url", content: "https://urcolor.dev" }],
    ["meta", { property: "og:site_name", content: "urcolor" }],
    ["meta", { property: "og:locale", content: "en_US" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ["meta", { name: "twitter:title", content: "urcolor" }],
    [
      "meta",
      {
        name: "twitter:description",
        content:
          "Unstyled, accessible color picker components for Vue. Build color areas, sliders, swatches, wheels, and more.",
      },
    ],
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    ["link", { rel: "canonical", href: "https://urcolor.dev" }],
  ],
  sitemap: {
    hostname: "https://urcolor.dev",
  },
  vite: {
    plugins: [tailwindcss(), react()],
    resolve: {
      alias: {
        "@urcolor/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
        "@urcolor/vue": path.resolve(__dirname, "../../packages/vue/src/index.ts"),
        "@urcolor/react": path.resolve(__dirname, "../../packages/react/src/index.ts"),
        "@urcolor/i18n": path.resolve(__dirname, "../../packages/i18n/src/index.ts"),
      },
      dedupe: ["vue", "react", "react-dom"],
    },
    optimizeDeps: {
      include: ["reka-ui", "@vueuse/core", "react", "react-dom"],
    },
  },
  locales: Object.fromEntries(
    READY_LANGS.map(lang => [
      lang === "en" ? "root" : lang,
      {
        label: LOCALE_NAMES[lang]!,
        lang: BCP47[lang]!,
        themeConfig: {
          nav: navFor(lang, pageExists),
          sidebar: sidebarFor(lang, pageExists),
          ...themeChromeFor(lang),
          socialLinks: SOCIAL_LINKS,
        },
      },
    ]),
  ),
  themeConfig: {
    socialLinks: SOCIAL_LINKS,
  },
});
