/* eslint-disable import-x/no-named-as-default, import-x/no-named-as-default-member */
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import importX from "eslint-plugin-import-x";
import vue from "eslint-plugin-vue";
import unusedImports from "eslint-plugin-unused-imports";
import tailwindcss from "eslint-plugin-better-tailwindcss";
import tseslint from "typescript-eslint";

export default [
  {
    ...tailwindcss.configs.recommended,
    settings: {
      "better-tailwindcss": {
        entryPoint: "docs/.vitepress/theme/custom.css",
      },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...vue.configs["flat/recommended"],
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  stylistic.configs.customize({
    quotes: "double",
    semi: true,
    indent: 2,
    braceStyle: "1tbs",
  }),
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        sourceType: "module",
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: [".vue"],
      },
    },
  },
  {
    rules: {
      "import-x/order": ["error", {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "never",
      }],
      "import-x/no-duplicates": "error",
      "import-x/no-unresolved": "off",
      "@stylistic/quotes": ["error", "double"],
      "@stylistic/semi": ["error", "always"],
      "vue/html-quotes": ["error", "double"],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": ["warn", { vars: "all", varsIgnorePattern: "^_", args: "after-used", argsIgnorePattern: "^_" }],
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    files: ["**/*.ts"],
    rules: {
      "vue/one-component-per-file": "off",
      "vue/require-prop-types": "off",
    },
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      globals: {
        document: "readonly",
        HTMLElement: "readonly",
        PointerEvent: "readonly",
        KeyboardEvent: "readonly",
        DOMRect: "readonly",
        Element: "readonly",
        ResizeObserver: "readonly",
        ResizeObserverEntry: "readonly",
        HTMLCanvasElement: "readonly",
        OffscreenCanvas: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        devicePixelRatio: "readonly",
        window: "readonly",
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/one-component-per-file": "off",
      "vue/require-default-prop": "off",
      "import-x/order": "off",
    },
  },
  {
    files: ["docs/**/*.vue", "docs/**/*.ts"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ["docs/**/*.vue"],
    rules: {
      "better-tailwindcss/no-unknown-classes": "off",
    },
  },
  {
    ignores: ["node_modules/", "**/dist/", ".nuxt/", ".output/", "bun.lock", "docs/.vitepress/dist/", "docs/.vitepress/cache/", "**/*.md", "**/*.d.ts"],
  },
];
