import type { MarkdownRenderer } from "vitepress";

/**
 * Wraps a page's first `<h1>` and the copy/download control in one flex row.
 *
 * `vitepress-plugin-llms` ships its own markdown-it plugin for this, but it
 * only splices the component in *after* the closing `</h1>` — leaving it as a
 * sibling block that always renders on its own line. This does the same splice
 * and additionally opens a wrapper before the heading and closes it after the
 * component, so `.page-title-row` in `theme/custom.css` can lay the two out
 * side by side.
 */
export function pageTitleRow(md: MarkdownRenderer, componentName = "CopyPageButtons") {
  const orig = md.renderer.render.bind(md.renderer);

  md.renderer.render = (tokens, options, env) => {
    for (let i = 0; i < tokens.length; i += 1) {
      const open = tokens[i];
      if (open?.tag !== "h1" || open.type !== "heading_open") continue;

      const closeIndex = tokens.findIndex(
        (token, j) => j > i && token.tag === "h1" && token.type === "heading_close",
      );
      if (closeIndex === -1) break;

      // `render` can be called more than once for the same token array; without
      // this the wrapper would nest one level deeper on every pass.
      if (tokens[i - 1]?.content.includes("page-title-row")) break;

      // `markdown-it` is not a direct dependency here, so the Token class comes
      // off a token the parser already produced rather than from an import.
      const Token = open.constructor as new (
        type: string,
        tag: string,
        nesting: number,
      ) => typeof open;

      const closeHtml = new Token("html_block", "", 0);
      closeHtml.content = `<${componentName} />\n</div>\n`;
      tokens.splice(closeIndex + 1, 0, closeHtml);

      const openHtml = new Token("html_block", "", 0);
      openHtml.content = "<div class=\"page-title-row\">\n";
      tokens.splice(i, 0, openHtml);
      break;
    }

    return orig(tokens, options, env);
  };
}
