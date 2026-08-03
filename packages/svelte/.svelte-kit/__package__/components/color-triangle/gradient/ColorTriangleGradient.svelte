<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorTriangleGradientProps extends HTMLAttributes<HTMLSpanElement> {
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
  import { Color, getChannelConfig, sampleTriangleGrid } from "@urcolor/core";
  import { CHECKERBOARD_BACKGROUND, DATA_DISABLED, renderToCanvas } from "@urcolor/shared";
  import type { ChildProps } from "../../../shared/child.js";
  import { gradientAttachment } from "../../../shared/gradient.svelte.js";
  import { colorTriangleContext } from "../root/context.svelte.js";

  /** Both axes are sampled at this resolution and then smoothly upscaled. */
  const GRID = 64;

  let {
    channelOverrides = { alpha: 1 },
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorTriangleGradientProps = $props();

  const context = colorTriangleContext.get();

  const canvasOpacity = $derived.by(() => {
    if (channelOverrides === false || channelOverrides.alpha === undefined) return context.color.alpha;
    return 1;
  });

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
    // Sampling a triangle is the most expensive of the five grids, and a drag
    // only moves the channels the surface already spans, so the pixels cannot
    // change while one is in flight.
    if (context.dragging) return;

    const xConfig = getChannelConfig(context.colorSpace, context.xChannelKey);
    const yConfig = getChannelConfig(context.colorSpace, context.yChannelKey);
    if (!xConfig || !yConfig) return;

    let zChannel: string | undefined;
    let zMin: number | undefined;
    let zMax: number | undefined;
    if (context.isThreeChannel && context.zChannelKey !== undefined) {
      const zConfig = getChannelConfig(context.colorSpace, context.zChannelKey);
      if (zConfig) {
        zChannel = context.zChannelKey;
        zMin = zConfig.nativeMin ?? zConfig.min;
        zMax = zConfig.nativeMax ?? zConfig.max;
      }
    }

    const [v0, v1, v2] = context.vertices;
    const pixels = sampleTriangleGrid(
      withOverrides(context.color),
      context.colorSpace,
      context.xChannelKey,
      context.yChannelKey,
      xConfig.nativeMin ?? xConfig.min,
      xConfig.nativeMax ?? xConfig.max,
      yConfig.nativeMin ?? yConfig.min,
      yConfig.nativeMax ?? yConfig.max,
      v0,
      v1,
      v2,
      GRID,
      GRID,
      false,
      zChannel,
      zMin,
      zMax,
    );
    renderToCanvas({ canvas, pixels, sampleWidth: GRID, sampleHeight: GRID });
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
    style: `background:${CHECKERBOARD_BACKGROUND};${clipPath}${style ?? ""}`,
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
