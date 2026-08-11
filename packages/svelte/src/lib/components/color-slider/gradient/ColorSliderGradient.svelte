<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { SpaceId } from "@urcolor/core";
  import type { GradientRenderer } from "@urcolor/shared";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorSliderGradientProps extends HTMLAttributes<HTMLSpanElement> {
    /** Explicit colour stops. When omitted, they are computed from the channel and the current colour. */
    colors?: string[];
    /** Rotation in degrees. Defaults to 90 for a vertical slider, 0 otherwise. */
    angle?: number;
    /** Interpolate the stops in this space for perceptual accuracy. */
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
  import { Color } from "@urcolor/core";
  import { CHECKERBOARD_CSS, cssLinearStops, defaultStepsFor, drawLinearGradient, getChannelConfig, interpolateStops } from "@urcolor/shared";
  import { CSS_GRADIENT_ROOT_STYLE, cssLayerStyle, resolveCssGradient } from "../../../shared/cssGradient.svelte.js";
  import type { ChildProps } from "../../../shared/child.js";
  import { gradientAttachment } from "../../../shared/gradient.svelte.js";
  import { colorSliderContext } from "../root/context.svelte.js";

  const AUTO_STEPS = 12;
  const INTERPOLATION_STEPS = 32;

  let {
    colors: colorsProp,
    angle,
    interpolationSpace,
    channelOverrides = { alpha: 1 },
    class: className,
    style,
    renderer = "auto",
    children,
    child,
    ...rest
  }: ColorSliderGradientProps = $props();

  const context = colorSliderContext.get();

  const isAlphaChannel = $derived(context.channel === "alpha");
  const effectiveAngle = $derived(angle ?? (context.orientation === "vertical" ? 90 : 0));
  /** Horizontal and vertical both mirror along their own axis when inverted. */
  const mirrored = $derived(context.inverted);

  const canvasOpacity = $derived.by(() => {
    if (isAlphaChannel) return 1;
    if (channelOverrides === false || channelOverrides.alpha === undefined) return context.color.alpha;
    return 1;
  });

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

  function buildAutoColors(steps: number): Color[] | null {
    if (colorsProp) return null;

    if (isAlphaChannel) {
      const base = withOverrides(context.color);
      return [base.withAlpha(0), base.withAlpha(1)];
    }

    const config = getChannelConfig(context.colorSpace, context.channel);
    if (!config) return null;

    const base = withOverrides(context.color);
    const min = config.nativeMin ?? config.min;
    const max = config.nativeMax ?? config.max;
    const stops: Color[] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      stops.push(base.with({ space: context.colorSpace, [context.channel]: min + t * (max - min) }));
    }
    return stops;
  }

  /**
   * The stop list both painters draw, differing only in how many stops they can
   * hold: the shader has 16 uniform slots, CSS has no ceiling. Mirroring
   * reverses the stops rather than flipping the gradient, as the WebGL path has
   * always done.
   */
  function resolveStops(steps: number): Color[] | null {
    let stops: Color[];
    if (colorsProp) {
      const parsed = colorsProp.map(entry => Color.parse(entry));
      if (parsed.length < 2 || parsed.some(entry => !entry)) return null;
      stops = parsed as Color[];
    } else {
      const auto = buildAutoColors(steps);
      if (!auto || auto.length < 2) return null;
      stops = auto;
    }

    if (mirrored) stops = [...stops].reverse();
    return interpolationSpace
      ? interpolateStops(stops, INTERPOLATION_STEPS, interpolationSpace)
      : stops;
  }

  function paint(canvas: HTMLCanvasElement): void {
    const stops = resolveStops(AUTO_STEPS);
    if (!stops) return;
    drawLinearGradient(canvas, stops, effectiveAngle, isAlphaChannel);
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
   * `interpolationSpace` does not force the canvas here: a 1D sweep is fully
   * expressible as stops, and `resolveStops` already densifies to 32 of them
   * computed in that space.
   */
  const cssLayers = $derived.by(() => resolveCssGradient(renderer, "ColorSliderGradient", !!child, () => {
    const stops = resolveStops(colorsProp ? AUTO_STEPS : defaultStepsFor(context.colorSpace, context.channel));
    return stops && cssLinearStops(stops, effectiveAngle);
  }));

  const canvasProps = $derived<ChildProps>({
    style: `position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:${canvasOpacity};`,
    [attachmentKey]: canvasAttachment,
  });

  const elementProps = $derived<ChildProps>({
    ...rest,
    class: className,
    // The caller's declarations come last so they win the cascade.
    style: `${CHECKERBOARD_CSS}${style ?? ""}`,
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
