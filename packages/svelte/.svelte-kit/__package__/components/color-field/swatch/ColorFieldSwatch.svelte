<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Color } from "@urcolor/core";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorFieldSwatchProps extends Omit<HTMLAttributes<HTMLSpanElement>, "value"> {
    /** The colour to display. */
    value?: Color | string | null;
    /** The checkerboard square size, in pixels. */
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
  import { CHECKERBOARD_BACKGROUND, DATA_DISABLED, parseColor } from "@urcolor/primitives";
  import type { ChildProps } from "../../../shared/child.js";

  /** The size `CHECKERBOARD_BACKGROUND` is already tiled at. */
  const DEFAULT_CHECKER_SIZE = 16;

  let {
    value,
    checkerSize = DEFAULT_CHECKER_SIZE,
    alpha = false,
    disabled = false,
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorFieldSwatchProps = $props();

  const swatchColor = $derived(parseColor(value));
  const checkerboard = $derived(
    checkerSize === DEFAULT_CHECKER_SIZE
      ? CHECKERBOARD_BACKGROUND
      : `repeating-conic-gradient(rgb(230, 230, 230) 0% 25%, white 0% 50%) 0% 50% / ${checkerSize}px ${checkerSize}px`,
  );

  /**
   * The colour is painted as a flat `linear-gradient` layered over the
   * checkerboard, so a translucent value shows the checks through it. The custom
   * properties are published for callers styling their own overlays.
   */
  const layout = $derived.by(() => {
    const current = swatchColor;
    if (!current) {
      return `--swatch-color:transparent;--swatch-checkerboard:${checkerboard};`
        + `background:linear-gradient(transparent, transparent), ${checkerboard};`;
    }
    const opaque = current.withAlpha(1).to("srgb").toString();
    const colorStr = alpha ? current.to("srgb").toString() : opaque;
    return `--swatch-color-opaque:${opaque};--swatch-alpha:${current.alpha};`
      + `--swatch-checkerboard:${checkerboard};--swatch-color:${colorStr};`
      + `background:linear-gradient(${colorStr}, ${colorStr}), ${checkerboard};`;
  });

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
