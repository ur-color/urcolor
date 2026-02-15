import DefaultTheme from "vitepress/theme";
import "./custom.css";
import "./icons.css";
import Layout from "../components/Layout.vue";
import type { Theme } from "vitepress";

export default {
  extends: DefaultTheme,
  Layout,
} satisfies Theme;
