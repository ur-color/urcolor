<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorRingGradientProps extends HTMLAttributes<HTMLSpanElement> {
    /**
     * Lock channels to fixed values in the gradient.
     * - `{ alpha: 1 }` (default) — lock alpha to 1
     * - `false` — no overrides
     */
    channelOverrides?: Record<string, number> | false;
    /**
     * Replaces the default `<canvas>`; receives its props, including the paint
     * attachment. The checkerboard-and-mask wrapper is always rendered by this part.
     */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { createAttachmentKey } from "svelte/attachments";
  import { getChannelConfig, sampleConicRing, type Color } from "@urcolor/core";
  import { CHECKERBOARD_BACKGROUND, DATA_DISABLED, renderToCanvas } from "@urcolor/primitives";
  import type { ChildProps } from "../../../shared/child.js";
  import { gradientAttachment } from "../../../shared/gradient.svelte.js";
  import { colorRingContext } from "../root/context.svelte.js";

  const SAMPLE_SIZE = 128;

  let {
    channelOverrides = { alpha: 1 },
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorRingGradientProps = $props();

  const context = colorRingContext.get();

  /**
   * The annulus is cut here and nowhere else: the canvas paints the full square
   * and this mask — which applies to the element and every descendant, canvas
   * included — hides the hole and the corners. Clipping the canvas as well left
   * a seam, because the two edges rasterise independently and their partial
   * coverage multiplies along the boundary.
   *
   * The ±0.5px on the stops is what antialiases the edges: a gradient hard stop
   * (two stops at one position) rasterises without any, so both circles came
   * out visibly stepped.
   */
  const mask = $derived.by(() => {
    const p = context.innerRadius * 100;
    return `radial-gradient(circle closest-side at center, transparent calc(${p}% - 0.5px), #000 calc(${p}% + 0.5px), #000 calc(100% - 0.5px), transparent 100%)`;
  });

  /** Applies the alpha and non-alpha overrides to a base colour. */
  function withOverrides(base: Color): Color {
    if (channelOverrides === false) return base;
    let result = base;
    const applicable: Record<string, number> = {};
    for (const [key, value] of Object.entries(channelOverrides)) {
      if (key === "alpha") result = result.withAlpha(value);
      else if (getChannelConfig(context.colorSpace, key)) applicable[key] = value;
    }
    if (Object.keys(applicable).length > 0) {
      result = result.with({ space: context.colorSpace, ...applicable });
    }
    return result;
  }

  function paint(canvas: HTMLCanvasElement): void {
    const config = getChannelConfig(context.colorSpace, context.channel);
    if (!config) return;
    const base = withOverrides(context.color);
    const channelMin = config.nativeMin ?? config.min;
    const channelMax = config.nativeMax ?? config.max;
    const pixels = sampleConicRing(
      base,
      context.colorSpace,
      context.channel,
      channelMin,
      channelMax,
      SAMPLE_SIZE,
      SAMPLE_SIZE,
      context.startAngle,
    );
    // `innerRadius` is deliberately not read: it only moves the mask, and the
    // pixels the canvas paints are the same at every radius.
    renderToCanvas({ canvas, pixels, sampleWidth: SAMPLE_SIZE, sampleHeight: SAMPLE_SIZE });
  }

  const paintCanvas = gradientAttachment(paint);
  const attachmentKey = createAttachmentKey();

  /**
   * Stable identity, so the attachment is not torn down on every render; it
   * still re-runs whenever the reactive state `paint` reads changes.
   */
  function canvasAttachment(node: HTMLCanvasElement): () => void {
    const cleanup = paintCanvas(node);
    return () => {
      cleanup();
      // WebGL contexts are a capped per-document resource; release ours.
      node.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }

  const canvasProps = $derived<ChildProps>({
    style: "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;",
    [attachmentKey]: canvasAttachment,
  });

  const elementProps = $derived<ChildProps>({
    ...rest,
    class: className,
    // The caller's declarations come last so they win the cascade.
    style: `background:${CHECKERBOARD_BACKGROUND};mask-image:${mask};-webkit-mask-image:${mask};${style ?? ""}`,
    [DATA_DISABLED]: context.disabled ? "" : undefined,
  });
</script>

<span {...elementProps}>
  {#if child}
    {@render child({ props: canvasProps })}
  {:else}
    <canvas {...canvasProps}></canvas>
  {/if}
  {@render children?.()}
</span>
