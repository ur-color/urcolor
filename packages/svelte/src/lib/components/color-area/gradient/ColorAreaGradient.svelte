<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { SpaceId } from "@urcolor/core";
  import type { GradientRenderer } from "@urcolor/shared";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorAreaGradientProps extends HTMLAttributes<HTMLSpanElement> {
    /** Explicit top-left corner colour. Supplying any corner switches to corner mode. */
    topLeft?: string;
    /** Explicit top-right corner colour. */
    topRight?: string;
    /** Explicit bottom-left corner colour. */
    bottomLeft?: string;
    /** Explicit bottom-right corner colour. */
    bottomRight?: string;
    /** Interpolate the surface in this space for perceptual accuracy. */
    interpolationSpace?: SpaceId;
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
  import {
    areaCssLayers,
    CHECKERBOARD_CSS,
    DATA_DISABLED,
    paintAreaSurface,
    surfaceOpacity,
    type SurfaceCorners,
  } from "@urcolor/shared";
  import { CSS_GRADIENT_ROOT_STYLE, cssLayerStyle, resolveCssGradient } from "../../../shared/cssGradient.svelte.js";
  import type { ChildProps } from "../../../shared/child.js";
  import { gradientAttachment } from "../../../shared/gradient.svelte.js";
  import { colorAreaContext } from "../root/context.svelte.js";

  let {
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
    interpolationSpace,
    channelOverrides = { alpha: 1 },
    class: className,
    style,
    renderer = "auto",
    children,
    child,
    ...rest
  }: ColorAreaGradientProps = $props();

  const context = colorAreaContext.get();

  const xIsAlpha = $derived(context.xChannelKey === "alpha");
  const yIsAlpha = $derived(context.yChannelKey === "alpha");
  /** One axis being alpha means the surface itself must be drawn with transparency. */
  const hasAlphaAxis = $derived(xIsAlpha || yIsAlpha);
  const hasCorners = $derived(
    topLeft !== undefined || topRight !== undefined
    || bottomLeft !== undefined || bottomRight !== undefined,
  );

  const canvasOpacity = $derived(surfaceOpacity(context.color, hasAlphaAxis, channelOverrides));

  /** The four corners, or undefined when the caller gave none. */
  const corners = $derived<SurfaceCorners | undefined>(
    hasCorners
      ? [topLeft ?? "black", topRight ?? "black", bottomLeft ?? "black", bottomRight ?? "black"]
      : undefined,
  );

  /** The axes as `@urcolor/shared` describes them, shared by both painters. */
  const axes = $derived({
    colorSpace: context.colorSpace,
    xChannel: context.xChannelKey,
    yChannel: context.yChannelKey,
    slidingFromLeft: context.isSlidingFromLeft,
    slidingFromTop: context.isSlidingFromTop,
  });

  const surface = $derived({
    ...axes,
    color: context.color,
    overrides: channelOverrides,
    corners,
    interpolationSpace,
  });

  function paint(canvas: HTMLCanvasElement): void {
    paintAreaSurface({ ...surface, canvas });
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

  /**
   * The four corners in screen order, with the mirror swap the CPU path applies.
   * `hasAlphaAxis` decides whether the corners keep their own alpha, matching
   * the flag `drawGradient` and `sampleBilinearGrid` are handed.
   */
  const cssLayers = $derived.by(
    () => resolveCssGradient(renderer, "ColorAreaGradient", !!child, () => areaCssLayers(surface)),
  );

  const canvasProps = $derived<ChildProps>({
    style: `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:${canvasOpacity};`,
    [attachmentKey]: canvasAttachment,
  });

  const elementProps = $derived<ChildProps>({
    ...rest,
    class: className,
    // The caller's declarations come last so they win the cascade.
    style: `${CHECKERBOARD_CSS}${style ?? ""}`,
    [DATA_DISABLED]: context.disabled ? "" : undefined,
  });
</script>

<span {...elementProps}>
  {#if cssLayers}
    <span style={`${CSS_GRADIENT_ROOT_STYLE}opacity:${canvasOpacity};`}>
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
