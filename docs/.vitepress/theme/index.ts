import DefaultTheme from "vitepress/theme";
import "./custom.css";
import "./icons.css";
import type { Theme } from "vitepress";
import Layout from "../components/Layout.vue";
import { inject } from "@vercel/analytics";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp() {
    inject();
  },
} satisfies Theme;
