<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { GradientRenderer } from "@urcolor/shared";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorTriangleGradientProps extends HTMLAttributes<HTMLSpanElement> {
    /**
     * Lock channels to fixed values in the gradient.
     * - `{ alpha: 1 }` (default) — lock alpha to 1
     * - `false` — no overrides
     */
    channelOverrides?: Record<string, number> | false;
    /**
     * Which painter to use. A barycentric sweep has no CSS equivalent, so this
     * component always paints into a canvas — the prop exists for symmetry with
     * the other gradients, and `"css"` warns and falls back.
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
  import { CHECKERBOARD_CSS, DATA_DISABLED, paintTriangleSurface, surfaceOpacity } from "@urcolor/shared";
  import { warnNoCssRecipe } from "../../../shared/cssGradient.svelte.js";
  import type { ChildProps } from "../../../shared/child.js";
  import { gradientAttachment } from "../../../shared/gradient.svelte.js";
  import { colorTriangleContext } from "../root/context.svelte.js";

  /** Both axes are sampled at this resolution and then smoothly upscaled. */

  let {
    channelOverrides = { alpha: 1 },
    class: className,
    style,
    renderer = "auto",
    children,
    child,
    ...rest
  }: ColorTriangleGradientProps = $props();

  const context = colorTriangleContext.get();

  // The triangle has no alpha axis, so the surface never paints its own
  // transparency and the flag is always false.
  const canvasOpacity = $derived(surfaceOpacity(context.color, false, channelOverrides));

  /**
   * Cut once, on the wrapper — it clips the canvas with it. Clipping the canvas
   * to the same polygon as well left a seam along the three edges: each clip
   * antialiases independently and the two partial coverages multiply.
   * `sampleTriangleGrid` clamps its barycentric coordinates, so the canvas is
   * coloured out to its corners and nothing translucent can show through.
   */
  const clipPath = $derived.by(() => {
    const [v0, v1, v2] = context.vertices;
    return `clip-path:polygon(${v0.x * 100}% ${v0.y * 100}%, ${v1.x * 100}% ${v1.y * 100}%, ${v2.x * 100}% ${v2.y * 100}%);`;
  });

  /** Applies the caller's fixed channel values on top of a base colour. */
  function paint(canvas: HTMLCanvasElement): void {
    // Sampling a triangle is the most expensive of the five grids, and a drag
    // only moves the channels the surface already spans, so the pixels cannot
    // change while one is in flight.
    if (context.dragging) return;

    paintTriangleSurface({
      canvas,
      color: context.color,
      colorSpace: context.colorSpace,
      xChannel: context.xChannelKey,
      yChannel: context.yChannelKey,
      zChannel: context.isThreeChannel ? context.zChannelKey : undefined,
      vertices: context.vertices,
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

  // A barycentric sweep has no CSS equivalent, so there is nothing to resolve —
  // only the same warning the other gradients emit when asked for the impossible.
  $effect(() => {
    if (renderer === "css") warnNoCssRecipe("ColorTriangleGradient");
  });

  const canvasProps = $derived<ChildProps>({
    style: `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:${canvasOpacity};`,
    [attachmentKey]: canvasAttachment,
  });

  const elementProps = $derived<ChildProps>({
    ...rest,
    class: className,
    // The caller's declarations come last so they win the cascade.
    style: `${CHECKERBOARD_CSS}${clipPath}${style ?? ""}`,
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
