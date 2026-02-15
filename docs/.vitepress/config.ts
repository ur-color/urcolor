import { defineConfig } from "vitepress";

export default defineConfig({
  title: "urcolor",
  description: "Universal color picker component library",
  vite: {
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
          ],
        },
        {
          text: "Vue",
          items: [
            { text: "ColorArea", link: "/components/vue/color-area" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/user/urcolor" },
    ],
  },
});
