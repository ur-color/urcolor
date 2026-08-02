<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { SpaceId } from "@urcolor/core";
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
     * Replaces the default `<canvas>`; receives its props, including the paint
     * attachment. The checkerboard wrapper is always rendered by this part.
     */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { createAttachmentKey } from "svelte/attachments";
  import {
    Color,
    drawGradient,
    getChannelConfig,
    sampleBilinearGrid,
    sampleChannelGrid,
  } from "@urcolor/core";
  import { CHECKERBOARD_BACKGROUND, DATA_DISABLED, renderToCanvas } from "@urcolor/primitives";
  import type { ChildProps } from "../../../shared/child.js";
  import { gradientAttachment } from "../../../shared/gradient.svelte.js";
  import { colorAreaContext } from "../root/context.svelte.js";

  /** Both axes are sampled at this resolution and then smoothly upscaled. */
  const GRID = 64;

  let {
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
    interpolationSpace,
    channelOverrides = { alpha: 1 },
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorAreaGradientProps = $props();

  const context = colorAreaContext.get();

  const xIsAlpha = $derived(context.xChannel === "alpha");
  const yIsAlpha = $derived(context.yChannel === "alpha");
  /** One axis being alpha means the surface itself must be drawn with transparency. */
  const hasAlphaAxis = $derived(xIsAlpha || yIsAlpha);
  const hasCorners = $derived(
    topLeft !== undefined || topRight !== undefined
    || bottomLeft !== undefined || bottomRight !== undefined,
  );

  const canvasOpacity = $derived.by(() => {
    if (hasAlphaAxis) return 1;
    if (channelOverrides === false || channelOverrides.alpha === undefined) return context.color.alpha;
    return 1;
  });

  /** Applies the caller's fixed channel values on top of a base colour. */
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

  /** The four explicit corner colours, or null when any of them fails to parse. */
  function cornerColors(): [Color, Color, Color, Color] | null {
    const tl = Color.parse(topLeft ?? "black");
    const tr = Color.parse(topRight ?? "black");
    const bl = Color.parse(bottomLeft ?? "black");
    const br = Color.parse(bottomRight ?? "black");
    if (!tl || !tr || !bl || !br) return null;
    return [tl, tr, bl, br];
  }

  function paintCorners(canvas: HTMLCanvasElement): void {
    const corners = cornerColors();
    if (!corners) return;

    if (!interpolationSpace) {
      // The GPU path mirrors in the shader, so the corners are passed as authored.
      drawGradient(
        canvas, corners[0], corners[1], corners[2], corners[3],
        hasAlphaAxis, !context.isSlidingFromLeft, !context.isSlidingFromTop,
      );
      return;
    }

    // The CPU path has no mirror flags, so the corners are swapped instead.
    let [a, b, c, d] = corners;
    if (!context.isSlidingFromLeft) [a, b, c, d] = [b, a, d, c];
    if (!context.isSlidingFromTop) [a, b, c, d] = [c, d, a, b];
    const pixels = sampleBilinearGrid(a, b, c, d, GRID, GRID, interpolationSpace, hasAlphaAxis);
    renderToCanvas({ canvas, pixels, sampleWidth: GRID, sampleHeight: GRID });
  }

  /** Both axes carry a real channel: the core sampler covers it directly. */
  function paintChannelGrid(canvas: HTMLCanvasElement, base: Color): void {
    const xCfg = getChannelConfig(context.colorSpace, context.xChannel);
    const yCfg = getChannelConfig(context.colorSpace, context.yChannel);
    if (!xCfg || !yCfg) return;

    const xMin = xCfg.nativeMin ?? xCfg.min;
    const xMax = xCfg.nativeMax ?? xCfg.max;
    const yMin = yCfg.nativeMin ?? yCfg.min;
    const yMax = yCfg.nativeMax ?? yCfg.max;

    const pixels = sampleChannelGrid(
      base, context.colorSpace,
      context.xChannel, context.yChannel,
      context.isSlidingFromLeft ? xMin : xMax, context.isSlidingFromLeft ? xMax : xMin,
      context.isSlidingFromTop ? yMin : yMax, context.isSlidingFromTop ? yMax : yMin,
      GRID, GRID, hasAlphaAxis,
    );
    renderToCanvas({ canvas, pixels, sampleWidth: GRID, sampleHeight: GRID });
  }

  /**
   * One axis is alpha, so only the other carries a channel. The core samplers
   * take two real channels, so this surface is built pixel by pixel instead.
   */
  function paintAlphaAxisGrid(canvas: HTMLCanvasElement, base: Color, channelKey: string): void {
    const config = getChannelConfig(context.colorSpace, channelKey);
    if (!config) return;

    const cMin = config.nativeMin ?? config.min;
    const cMax = config.nativeMax ?? config.max;
    const realIsX = !xIsAlpha;
    const realForward = realIsX ? context.isSlidingFromLeft : context.isSlidingFromTop;
    const alphaForward = realIsX ? context.isSlidingFromTop : context.isSlidingFromLeft;
    const realMin = realForward ? cMin : cMax;
    const realMax = realForward ? cMax : cMin;
    const alphaMin = alphaForward ? 0 : 1;
    const alphaMax = alphaForward ? 1 : 0;

    const pixels = new Uint8ClampedArray(GRID * GRID * 4);
    for (let y = 0; y < GRID; y++) {
      const vy = y / (GRID - 1);
      for (let x = 0; x < GRID; x++) {
        const vx = x / (GRID - 1);
        const realValue = realIsX
          ? realMin + vx * (realMax - realMin)
          : realMin + vy * (realMax - realMin);
        const alphaValue = realIsX
          ? alphaMin + vy * (alphaMax - alphaMin)
          : alphaMin + vx * (alphaMax - alphaMin);
        const rgb = base.with({ space: context.colorSpace, [channelKey]: realValue }).to("srgb");
        const index = (y * GRID + x) * 4;
        pixels[index] = Math.round(Math.max(0, Math.min(1, rgb.get("r"))) * 255);
        pixels[index + 1] = Math.round(Math.max(0, Math.min(1, rgb.get("g"))) * 255);
        pixels[index + 2] = Math.round(Math.max(0, Math.min(1, rgb.get("b"))) * 255);
        pixels[index + 3] = Math.round(Math.max(0, Math.min(1, alphaValue)) * 255);
      }
    }
    renderToCanvas({ canvas, pixels, sampleWidth: GRID, sampleHeight: GRID });
  }

  function paint(canvas: HTMLCanvasElement): void {
    if (hasCorners) {
      paintCorners(canvas);
      return;
    }

    const base = withOverrides(context.color);
    if (!xIsAlpha && !yIsAlpha) {
      paintChannelGrid(canvas, base);
      return;
    }
    // Both axes being alpha leaves no channel to sample, so nothing is painted.
    const channelKey = xIsAlpha ? (yIsAlpha ? undefined : context.yChannel) : context.xChannel;
    if (channelKey === undefined) return;
    paintAlphaAxisGrid(canvas, base, channelKey);
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
    style: `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:${canvasOpacity};`,
    [attachmentKey]: canvasAttachment,
  });

  const elementProps = $derived<ChildProps>({
    ...rest,
    class: className,
    // The caller's declarations come last so they win the cascade.
    style: `background:${CHECKERBOARD_BACKGROUND};${style ?? ""}`,
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
