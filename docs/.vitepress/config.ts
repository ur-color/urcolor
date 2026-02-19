import { defineConfig } from "vitepress";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  title: "urcolor",
  description: "Universal color picker component library",
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@urcolor/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
        "@urcolor/vue": path.resolve(__dirname, "../../packages/vue/src/index.ts"),
      },
      dedupe: ["vue"],
    },
    optimizeDeps: {
      include: ["reka-ui", "@vueuse/core", "internationalized-color", "internationalized-color/css"],
    },
  },
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "Components", link: "/components/" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/guide/" },
            { text: "Features", link: "/guide/features" },
            { text: "Installation", link: "/guide/installation" },
          ],
        },
        {
          text: "How to",
          items: [
            { text: "Build Color Area Picker", link: "/guide/vue/build-color-area-picker" },
            { text: "Build Color Channel Slider", link: "/guide/vue/build-color-channel-slider" },
            { text: "Build Color Fields", link: "/guide/vue/build-color-fields" },
            { text: "Build Color Swatches", link: "/guide/vue/build-color-swatches" },
            { text: "Build Color Swatch Group", link: "/guide/vue/build-color-swatch-group" },
            { text: "Build Color Ring", link: "/guide/vue/build-color-ring" },
            { text: "Build Color Triangle", link: "/guide/vue/build-color-triangle" },
            { text: "Build Color Wheel", link: "/guide/vue/build-color-wheel" },
            { text: "Build Color Picker", link: "/guide/vue/build-color-picker" },
          ],
        },
      ],
      "/components/": [
        {
          text: "Components",
          items: [
            { text: "Overview", link: "/components/" },
            { text: "Preview", link: "/components/vue/preview" },
          ],
        },
        {
          text: "Vue",
          items: [
            { text: "Color Area", link: "/components/vue/color-area" },
            { text: "Color Slider", link: "/components/vue/color-slider" },
            { text: "Color Field", link: "/components/vue/color-field" },
            { text: "Color Swatch", link: "/components/vue/color-swatch" },
            { text: "Color Swatch Group", link: "/components/vue/color-swatch-group" },
            { text: "Color Wheel", link: "/components/vue/color-wheel" },
            { text: "Color Triangle", link: "/components/vue/color-triangle" },
            { text: "Color Ring", link: "/components/vue/color-ring" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/user/urcolor" },
    ],
  },
});
