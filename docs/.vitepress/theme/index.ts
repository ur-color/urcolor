import DefaultTheme from "vitepress/theme";
import "./custom.css";
import "./icons.css";
import type { Theme } from "vitepress";
import CopyPageButtons from "../components/CopyPageButtons.vue";
import Layout from "../components/Layout.vue";
import { installCodeGroupSync } from "./codeGroupSync";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    // The markdown-it plugin in `config.ts` injects this after every page's
    // first `<h1>`, so it has to be registered globally rather than imported.
    app.component("CopyPageButtons", CopyPageButtons);

    if (typeof window === "undefined") return;

    // One framework choice for the whole page — and the whole site.
    installCodeGroupSync();

    // Load analytics lazily and non-blockingly. A privacy/ad-blocking
    // extension can block the "@vercel/analytics" request; keeping this off
    // the theme's static import graph means such a failure never prevents the
    // app from mounting.
    import("@vercel/analytics")
      .then(({ inject }) => inject())
      .catch(() => {});
  },
} satisfies Theme;
