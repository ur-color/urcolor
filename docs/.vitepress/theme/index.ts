import DefaultTheme from "vitepress/theme";
import "./custom.css";
import "./icons.css";
import type { Theme } from "vitepress";
import Layout from "../components/Layout.vue";
import { installCodeGroupSync } from "./codeGroupSync";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp() {
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
