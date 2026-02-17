import type { StorybookConfig } from "@storybook/vue3-vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: {
    name: "@storybook/vue3-vite",
    options: {
      docgen: "none",
    },
  },
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  async viteFinal(config) {
    config.plugins = [
      ...(config.plugins || []).filter((plugin) => {
        const name = plugin && typeof plugin === "object" && "name" in plugin ? plugin.name : "";
        return name !== "storybook:vue-docgen-plugin";
      }),
      tailwindcss(),
    ];
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "@urcolor/core": path.resolve(__dirname, "../../core/src/index.ts"),
      },
    };
    return config;
  },
};

export default config;
