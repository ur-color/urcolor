import path from "node:path";
import { defineConfig } from "vitepress";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

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
      },
      dedupe: ["vue", "react", "react-dom", "internationalized-color"],
    },
    optimizeDeps: {
      include: ["reka-ui", "@vueuse/core", "react", "react-dom", "internationalized-color", "internationalized-color/css"],
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
          text: "Vue How to",
          items: [
            { text: "Build Color Area Picker", link: "/guide/vue/build-color-area-picker" },
            { text: "Build Color Channel Slider", link: "/guide/vue/build-color-channel-slider" },
            { text: "Build Color Fields", link: "/guide/vue/build-color-fields" },
            { text: "Build Color Swatches", link: "/guide/vue/build-color-swatches" },
            { text: "Build Color Swatch Group", link: "/guide/vue/build-color-swatch-group" },
            { text: "Build Color Ring", link: "/guide/vue/build-color-ring" },
            { text: "Build Color Triangle", link: "/guide/vue/build-color-triangle" },
            { text: "Build Color Wheel", link: "/guide/vue/build-color-wheel" },
            { text: "Build Color Picker (Triangle in Ring)", link: "/guide/vue/build-color-picker-triangle-in-ring" },
            { text: "Build Color Picker (Square in Ring)", link: "/guide/vue/build-color-picker-square-in-ring" },
            { text: "Build Material UI Color Picker", link: "/guide/vue/build-material-ui-color-picker" },
          ],
        },
        {
          text: "React How to",
          items: [
            { text: "Build Color Channel Slider", link: "/guide/react/build-color-channel-slider" },
            { text: "Build Color Area Picker", link: "/guide/react/build-color-area-picker" },
            { text: "Build Color Fields", link: "/guide/react/build-color-fields" },
            { text: "Build Color Swatches", link: "/guide/react/build-color-swatches" },
            { text: "Build Color Swatch Group", link: "/guide/react/build-color-swatch-group" },
            { text: "Build Color Ring", link: "/guide/react/build-color-ring" },
            { text: "Build Color Triangle", link: "/guide/react/build-color-triangle" },
            { text: "Build Color Wheel", link: "/guide/react/build-color-wheel" },
          ],
        },
      ],
      "/components/": [
        {
          text: "Components",
          items: [
            { text: "Overview", link: "/components/" },
            { text: "Preview", link: "/components/vue/preview" },
            { text: "Stories", link: "/components/vue/stories" },
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
        {
          text: "React",
          items: [
            { text: "Color Slider", link: "/components/react/color-slider" },
            { text: "Color Area", link: "/components/react/color-area" },
            { text: "Color Field", link: "/components/react/color-field" },
            { text: "Color Swatch", link: "/components/react/color-swatch" },
            { text: "Color Swatch Group", link: "/components/react/color-swatch-group" },
            { text: "Color Wheel", link: "/components/react/color-wheel" },
            { text: "Color Triangle", link: "/components/react/color-triangle" },
            { text: "Color Ring", link: "/components/react/color-ring" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/GrandMagus02/urcolor" },
    ],
  },
});
