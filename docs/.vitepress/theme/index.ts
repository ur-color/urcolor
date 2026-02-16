import DefaultTheme from "vitepress/theme";
import "./custom.css";
import "./icons.css";
import type { Theme } from "vitepress";
import Layout from "../components/Layout.vue";

export default {
  extends: DefaultTheme,
  Layout,
} satisfies Theme;
