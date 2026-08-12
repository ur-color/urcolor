<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { GradientRenderer } from "@urcolor/shared";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorWheelGradientProps extends HTMLAttributes<HTMLSpanElement> {
    /**
     * Lock channels to fixed values in the gradient.
     * - `{ alpha: 1 }` (default) — lock alpha to 1
     * - `false` — no overrides
     */
    channelOverrides?: Record<string, number> | false;
    /**
     * Which painter to use.
     * - `"auto"` (default) — CSS when an exact recipe exists, canvas otherwise
     * - `"css"` — force CSS; falls back to the canvas with a dev warning if none exists
     * - `"canvas"` — force the canvas painter
     */
    renderer?: GradientRenderer;
    /**
     * Replaces the default `<canvas>`; receives its props, including the paint
     * attachment. The checkerboard wrapper is always rendered by this part.
     */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { createAttachmentKey } from "svelte/attachments";
  import { applyChannelOverrides, CHECKERBOARD_CSS, cssWheelPolar, DATA_DISABLED, paintWheelSurface } from "@urcolor/shared";
  import { CSS_GRADIENT_ROOT_STYLE, cssLayerStyle, resolveCssGradient } from "../../../shared/cssGradient.svelte.js";
  import type { ChildProps } from "../../../shared/child.js";
  import { gradientAttachment } from "../../../shared/gradient.svelte.js";
  import { colorWheelContext } from "../root/context.svelte.js";

  /** Edge length of the sampled square the disc is cut from. */

  let {
    channelOverrides = { alpha: 1 },
    class: className,
    style,
    renderer = "auto",
    children,
    child,
    ...rest
  }: ColorWheelGradientProps = $props();

  const context = colorWheelContext.get();

  function paint(canvas: HTMLCanvasElement): void {
    // Both axes sweep their full range, so nothing the disc shows depends on
    // the values a drag is changing. Reading `dragging` still subscribes this
    // attachment to it, so the disc repaints once the gesture ends.
    if (context.dragging) return;

    paintWheelSurface({
      canvas,
      color: context.color,
      colorSpace: context.colorSpace,
      angleChannel: context.angleChannel,
      radiusChannel: context.radiusChannel,
      startAngle: context.startAngle,
      overrides: channelOverrides,
    });
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
  const cssLayers = $derived.by(() => resolveCssGradient(renderer, "ColorWheelGradient", !!child, () =>
    cssWheelPolar(
      applyChannelOverrides(context.color, context.colorSpace, channelOverrides), context.colorSpace,
      context.angleChannel, context.radiusChannel, context.startAngle,
    )));

  const canvasProps = $derived<ChildProps>({
    style:
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;clip-path:circle(50%);",
    [attachmentKey]: canvasAttachment,
  });

  const elementProps = $derived<ChildProps>({
    ...rest,
    class: className,
    // The caller's declarations come last so they win the cascade.
    style: `${CHECKERBOARD_CSS}border-radius:50%;${style ?? ""}`,
    [DATA_DISABLED]: context.disabled ? "" : undefined,
  });
</script>

<span {...elementProps}>
  {#if cssLayers}
    <span style={`${CSS_GRADIENT_ROOT_STYLE}clip-path:circle(50%);`}>
      {#each cssLayers as layer, index (index)}
        <span style={cssLayerStyle(layer)}></span>
      {/each}
    </span>
  {:else if child}
    {@render child({ props: canvasProps })}
  {:else}
    <canvas {...canvasProps}></canvas>
  {/if}
  {@render children?.()}
</span>
