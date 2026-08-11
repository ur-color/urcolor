<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Color } from "@urcolor/core";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorFieldSwatchProps extends Omit<HTMLAttributes<HTMLSpanElement>, "value"> {
    /** The colour to display. */
    value?: Color | string | null;
    /**
     * The checkerboard square size, in pixels. Left unset, the grid reads
     * `--urcolor-checkerboard-size` and falls back to `16px`.
     */
    checkerSize?: number;
    /** When true, reflects the colour's alpha; when false, paints it opaque. */
    alpha?: boolean;
    /** When true, marks the swatch as non-interactive. */
    disabled?: boolean;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { DATA_DISABLED, styleToString, swatchPaint, swatchStyle } from "@urcolor/shared";
  import type { ChildProps } from "../../../shared/child.js";

  let {
    value,
    checkerSize,
    alpha = false,
    disabled = false,
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorFieldSwatchProps = $props();

  /**
   * The colour is painted as a flat `linear-gradient` layered over the
   * checkerboard, so a translucent value shows the checks through it. The custom
   * properties are published for callers styling their own overlays.
   */
  const layout = $derived(styleToString(swatchStyle({ ...swatchPaint(value, alpha), checkerSize })));

  const elementProps = $derived<ChildProps>({
    ...rest,
    "role": "img",
    "aria-label": rest["aria-label"] ?? "Colour swatch",
    "class": className,
    // The caller's declarations come last so they win the cascade.
    "style": style ? `${layout}${style}` : layout,
    [DATA_DISABLED]: disabled ? "" : undefined,
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <span {...elementProps}>{@render children?.()}</span>
{/if}
