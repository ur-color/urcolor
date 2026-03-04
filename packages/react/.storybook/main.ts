import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  async viteFinal(config) {
    config.plugins = [
      ...(config.plugins || []),
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
