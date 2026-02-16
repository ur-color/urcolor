import { resolve, dirname } from "node:path";
import { readFile } from "node:fs/promises";
import { createHighlighter, type Highlighter } from "shiki";
import type { Plugin } from "vite";

const SUFFIX = "?highlight";

export function highlightPlugin(): Plugin {
  let highlighter: Highlighter;

  return {
    name: "vitepress-demo-highlight",
    enforce: "pre",
    async configResolved() {
      highlighter = await createHighlighter({
        themes: ["github-light", "github-dark"],
        langs: ["vue"],
      });
    },
    async transform(code, _id) {
      // Intercept .vue files imported with ?highlight query before Vue plugin
      // by rewriting the import specifiers in the importer
      if (!code.includes(SUFFIX)) return;

      const rewritten = code.replace(
        new RegExp(
          "(from\\s+['\"])([^'\"]+)\\?highlight(['\"])",
          "g",
        ),
        (_, pre, path, post) => `${pre}virtual:highlight:${path}${post}`,
      );
      if (rewritten === code) return;
      return { code: rewritten, map: null };
    },
    resolveId(source, importer) {
      if (!source.startsWith("virtual:highlight:")) return;

      const path = source.slice("virtual:highlight:".length);
      const resolved = importer
        ? resolve(dirname(importer.replace(/\?.*$/, "")), path)
        : path;

      return `\0highlight:${resolved}`;
    },
    async load(id) {
      if (!id.startsWith("\0highlight:")) return;

      const filePath = id.slice("\0highlight:".length);
      const source = await readFile(filePath, "utf-8");

      const html = highlighter.codeToHtml(source, {
        lang: "vue",
        themes: {
          light: "github-light",
          dark: "github-dark",
        },
      });

      return `export default ${JSON.stringify(html)}`;
    },
  };
}
