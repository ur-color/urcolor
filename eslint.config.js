/* eslint-disable import-x/no-named-as-default, import-x/no-named-as-default-member */
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import importX from "eslint-plugin-import-x";
import vue from "eslint-plugin-vue";
import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
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
  ...svelte.configs.recommended,
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
        sourceType: "module",
        projectService: false,
        project: false,
        extraFileExtensions: [".svelte"],
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
    // Must be the LAST rules block for these files — several earlier configs
    // enable type-aware rules globally, and in flat config the later entry wins.
    //
    // The root tsconfig excludes packages/svelte and packages/angular: vue-tsc
    // cannot resolve `.svelte` named type exports (it falls back to a generic
    // module shim), and Angular needs ngtsc rather than plain tsc. That leaves
    // the project service with no project for these files, so every rule needing
    // type information is turned off here. Both packages still get a full type
    // check from the root `lint` script — svelte-check for one, `tsc -p
    // tsconfig.lib.json` for the other.
    files: [
      "packages/svelte/**/*.ts",
      "packages/svelte/**/*.js",
      "packages/svelte/**/*.svelte",
      "packages/angular/**/*.ts",
    ],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: false,
      },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      // TypeScript resolves DOM lib globals itself, and svelte-check enforces
      // it. Without type information ESLint cannot see them, so this would
      // otherwise flag every HTMLElement and PointerEvent annotation.
      "no-undef": "off",
      // Svelte's subpath exports (`svelte` and `svelte/attachments`) resolve to
      // the same declaration file, so this rule reports them as duplicates and
      // its autofix merges them — moving `createAttachmentKey` onto the wrong
      // module and breaking the build. The reports are false positives.
      "import-x/no-duplicates": "off",
    },
  },
  {
    ignores: ["node_modules/", "**/dist/", ".nuxt/", ".output/", "bun.lock", "docs/.vitepress/dist/", "docs/.vitepress/cache/", "**/storybook-static/", "**/*.md", "**/*.d.ts", "**/.storybook/", "packages/i18n/src/data/**", "packages/i18n/src/sources/uwdata/chunks.ts", "**/.svelte-kit/"],
  },
];
