import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitepress";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import llmstxt, { copyOrDownloadAsMarkdownButtons } from "vitepress-plugin-llms";
import { navFor, searchFor, sidebarFor, themeChromeFor } from "./i18n/nav";
import { homeFrontmatter } from "./i18n/strings";

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

/**
 * The plan and spec archive is a build artefact of how the library was written,
 * not documentation of what it does — it is worth nothing to an LLM reading up
 * on the API, and it is a large share of the corpus.
 */
const LLM_IGNORE = ["superpowers/**"];

/**
 * `llms.txt` and `llms-full.txt` cover English only: seven translations of the
 * same pages would bloat the bundle without adding information. Per-page `.md`
 * files are still generated for every locale, because the "Copy page" button
 * next to each `<h1>` fetches them.
 */
const LLM_IGNORE_NON_EN = ALL_LANGS.filter(l => l !== "en").map(l => `${l}/**`);

/** `ru/index.md` → `ru`; the root `index.md` → `en`. */
function langForPath(relativePath: string): string {
  const first = relativePath.split("/")[0]!;
  return (ALL_LANGS as readonly string[]).includes(first) ? first : "en";
}

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
    ["meta", { property: "og:url", content: "https://urcolor.vercel.app" }],
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
    ["link", { rel: "canonical", href: "https://urcolor.vercel.app" }],
  ],
  sitemap: {
    hostname: "https://urcolor.vercel.app",
  },
  /**
   * Every locale's `index.md` declares nothing but `layout: home`; the hero and
   * the feature cards are filled in from the shared string tables so the copy
   * lives in one place. Anything a page sets itself still wins.
   */
  transformPageData(pageData) {
    if (pageData.frontmatter.layout !== "home") return;
    const home = homeFrontmatter(langForPath(pageData.relativePath));
    pageData.frontmatter = { ...home, ...pageData.frontmatter };
  },
  markdown: {
    config(md) {
      // Drops a `<CopyPageButtons />` in right after the first `<h1>` of every
      // page; the component itself is registered in `theme/index.ts`.
      md.use(copyOrDownloadAsMarkdownButtons, "CopyPageButtons");
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
      react(),
      llmstxt({
        domain: "https://urcolor.vercel.app",
        ignoreFiles: LLM_IGNORE,
        ignoreFilesPerOutput: {
          llmsTxt: LLM_IGNORE_NON_EN,
          llmsFullTxt: LLM_IGNORE_NON_EN,
        },
      }),
    ],
    resolve: {
      alias: {
        "@urcolor/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
        "@urcolor/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
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
          search: searchFor(lang),
          socialLinks: SOCIAL_LINKS,
        },
      },
    ]),
  ),
  themeConfig: {
    // The local-search index is built off the *root* theme config, so the
    // provider has to be declared here as well as per locale — the locale
    // entries only carry the modal's translations.
    search: searchFor("en"),
    socialLinks: SOCIAL_LINKS,
  },
});
