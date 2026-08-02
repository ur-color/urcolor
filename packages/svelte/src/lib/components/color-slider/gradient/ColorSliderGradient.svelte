<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { SpaceId } from "@urcolor/core";
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
     * Replaces the default `<canvas>`; receives its props, including the paint
     * attachment. The checkerboard wrapper is always rendered by this part.
     */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { createAttachmentKey } from "svelte/attachments";
  import { Color, drawLinearGradient, getChannelConfig, interpolateStops } from "@urcolor/core";
  import { CHECKERBOARD_BACKGROUND } from "@urcolor/primitives";
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

  const autoColors = $derived.by<Color[] | null>(() => {
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
    for (let i = 0; i < AUTO_STEPS; i++) {
      const t = i / (AUTO_STEPS - 1);
      stops.push(base.with({ space: context.colorSpace, [context.channel]: min + t * (max - min) }));
    }
    return stops;
  });

  function paint(canvas: HTMLCanvasElement): void {
    let stops: Color[];
    if (colorsProp) {
      const parsed = colorsProp.map(entry => Color.parse(entry));
      if (parsed.length < 2 || parsed.some(entry => !entry)) return;
      stops = parsed as Color[];
    } else if (autoColors && autoColors.length >= 2) {
      stops = autoColors;
    } else {
      return;
    }

    if (mirrored) stops = [...stops].reverse();
    const resolved = interpolationSpace
      ? interpolateStops(stops, INTERPOLATION_STEPS, interpolationSpace)
      : stops;
    drawLinearGradient(canvas, resolved, effectiveAngle, isAlphaChannel);
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
