import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitepress";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import llmstxt from "vitepress-plugin-llms";
import { withMermaid } from "vitepress-plugin-mermaid";
import { navFor, searchFor, sidebarFor, themeChromeFor } from "./i18n/nav";
import { homeFrontmatter } from "./i18n/strings";
import { pageTitleRow } from "./plugins/pageTitleRow";

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

export default withMermaid(defineConfig({
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
      // Puts a `<CopyPageButtons />` on the same row as every page's first
      // `<h1>`; the component itself is registered in `theme/index.ts`.
      md.use(pageTitleRow, "CopyPageButtons");
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
      // `mermaid` has to be pre-bundled: its diagram chunks import dayjs's UMD
      // build with a default import, which the dev server otherwise serves raw
      // and rejects with "does not provide an export named 'default'".
      include: ["reka-ui", "@vueuse/core", "react", "react-dom", "mermaid"],
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
  /**
   * `withMermaid` renders every ```mermaid fence through a client component.
   * The theme itself is not set here: the component swaps to mermaid's `dark`
   * theme whenever `<html>` carries VitePress's `dark` class, and an explicit
   * `theme` would override that on both sides of the toggle.
   */
  mermaid: {
    /*
     * A concrete stack rather than `var(--vp-font-family-base)`: mermaid sizes a
     * node box by measuring its label off-document, where a custom property has
     * nothing to resolve against, and the boxes come out too small for the text.
     */
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    // mermaid measures a node's label with `fontSize` and renders it with the
    // theme's own value, so the two are set from one number here. Splitting them
    // leaves labels drawn larger than the box that was sized for them.
    fontSize: 16,
    // HTML labels lay a multi-line node out in a `foreignObject`, which sizes
    // itself. mermaid's plain SVG labels size the box for one line fewer than
    // they draw, so the last line of a `<br/>` label falls outside its border.
    flowchart: { htmlLabels: true, useMaxWidth: true },
    themeVariables: {
      /*
       * mermaid paints an opaque plate behind an xychart and derives its text
       * colors from that plate, so a transparent background alone leaves black
       * labels on the dark theme. These colors are stated once for both themes:
       * the same neutral grey clears contrast on the light and the dark page
       * background, and the bars take the brand pink.
       */
      xyChart: {
        backgroundColor: "transparent",
        plotColorPalette: "#ff4081",
        dataLabelColor: "#8e8e96",
        titleColor: "#8e8e96",
        xAxisLabelColor: "#8e8e96",
        xAxisTitleColor: "#8e8e96",
        xAxisTickColor: "#8e8e96",
        xAxisLineColor: "#8e8e96",
        yAxisLabelColor: "#8e8e96",
        yAxisTitleColor: "#8e8e96",
        yAxisTickColor: "#8e8e96",
        yAxisLineColor: "#8e8e96",
      },
    },
    xyChart: {
      width: 760,
      height: 360,
      plotReservedSpacePercent: 55,
      showDataLabel: true,
      showDataLabelOutsideBar: true,
    },
  },
}));
