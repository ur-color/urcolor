import { defineConfig } from "vitepress";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  title: "urcolor",
  description: "Universal color picker component library",
  vite: {
    plugins: [tailwindcss()],
    resolve: {
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
            { text: "Installation", link: "/guide/installation" },
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
            { text: "ColorArea", link: "/components/vue/color-area" },
            { text: "ColorSlider", link: "/components/vue/color-slider" },
            { text: "ColorField", link: "/components/vue/color-field" },
            { text: "ColorSwatch", link: "/components/vue/color-swatch" },
            { text: "ColorSwatchGroup", link: "/components/vue/color-swatch-group" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/user/urcolor" },
    ],
  },
});
