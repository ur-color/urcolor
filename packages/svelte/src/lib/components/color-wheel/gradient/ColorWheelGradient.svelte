<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorWheelGradientProps extends HTMLAttributes<HTMLSpanElement> {
    /**
     * Lock channels to fixed values in the gradient.
     * - `{ alpha: 1 }` (default) — lock alpha to 1
     * - `false` — no overrides
     */
    channelOverrides?: Record<string, number> | false;
    /**
     * Replaces the default `<canvas>`; receives its props, including the paint
     * attachment. The checkerboard wrapper is always rendered by this part.
     */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { createAttachmentKey } from "svelte/attachments";
  import { Color, getChannelConfig, samplePolarGrid } from "@urcolor/core";
  import { CHECKERBOARD_BACKGROUND, DATA_DISABLED, renderToCanvas } from "@urcolor/shared";
  import type { ChildProps } from "../../../shared/child.js";
  import { gradientAttachment } from "../../../shared/gradient.svelte.js";
  import { colorWheelContext } from "../root/context.svelte.js";

  /** Edge length of the sampled square the disc is cut from. */
  const SAMPLE_SIZE = 128;

  let {
    channelOverrides = { alpha: 1 },
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorWheelGradientProps = $props();

  const context = colorWheelContext.get();

  /** Applies the non-alpha overrides, then alpha, to a base colour. */
  function withOverrides(base: Color): Color {
    if (channelOverrides === false) return base;
    const applicable: Record<string, number> = {};
    for (const [key, value] of Object.entries(channelOverrides)) {
      if (key !== "alpha" && getChannelConfig(context.colorSpace, key)) applicable[key] = value;
    }
    let result = base;
    if (Object.keys(applicable).length > 0) {
      result = result.with({ space: context.colorSpace, ...applicable });
    }
    if (channelOverrides.alpha !== undefined) result = result.withAlpha(channelOverrides.alpha);
    return result;
  }

  function paint(canvas: HTMLCanvasElement): void {
    // Both axes sweep their full range, so nothing the disc shows depends on
    // the values a drag is changing. Reading `dragging` still subscribes this
    // attachment to it, so the disc repaints once the gesture ends.
    if (context.dragging) return;

    const angleConfig = getChannelConfig(context.colorSpace, context.angleChannel);
    const radiusConfig = getChannelConfig(context.colorSpace, context.radiusChannel);
    if (!angleConfig || !radiusConfig) return;

    const base = withOverrides(context.color);
    const pixels = samplePolarGrid(
      base,
      context.colorSpace,
      context.angleChannel,
      context.radiusChannel,
      angleConfig.nativeMin ?? angleConfig.min,
      angleConfig.nativeMax ?? angleConfig.max,
      radiusConfig.nativeMin ?? radiusConfig.min,
      radiusConfig.nativeMax ?? radiusConfig.max,
      SAMPLE_SIZE,
      SAMPLE_SIZE,
      context.startAngle,
    );
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

  // The disc is cut here rather than inside `renderToCanvas`: the sampled grid
  // fills its whole square, and clipping in-canvas as well as on the wrapper
  // leaves a seam along the boundary.
  const canvasProps = $derived<ChildProps>({
    style:
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;clip-path:circle(50%);",
    [attachmentKey]: canvasAttachment,
  });

  const elementProps = $derived<ChildProps>({
    ...rest,
    class: className,
    // The caller's declarations come last so they win the cascade.
    style: `background:${CHECKERBOARD_BACKGROUND};border-radius:50%;${style ?? ""}`,
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
