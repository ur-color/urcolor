/**
 * CSS gradient recipes — the paint path that works without a canvas.
 *
 * A canvas paints nothing on a server: `renderToCanvas` returns quietly when
 * `ImageData` is undefined and the WebGL painters need a real context, so a
 * server-rendered picker ships an empty canvas and only fills in after mount.
 * Every recipe here is an exact algebraic equivalent of the sampler it
 * replaces, expressed as layered CSS that the browser paints from the markup
 * itself.
 *
 * The gate is a `null` return, not a table of supported spaces: a builder
 * returns `null` exactly when no exact recipe exists, so there is nothing to
 * drift out of sync with the recipes themselves.
 *
 * Nothing in this module touches the DOM.
 */

import { Color, serialize, type SpaceId } from "@urcolor/core";
import { getChannelConfig } from "./color-spaces";

/** Which painter a gradient component should use. */
export type GradientRenderer = "auto" | "css" | "canvas";

/**
 * One paint layer.
 *
 * `mask` is set only by the recipes that lerp two gradients across a second
 * axis — the alpha ramp *is* the interpolation there, so it cannot collapse
 * into a sibling layer's `background-image`.
 */
export interface CssGradientLayer {
  /** A `background-image` value. */
  image: string;
  /** A `mask-image` value. Also needs `-webkit-mask-image` for older Safari. */
  mask?: string;
}

export interface StopOptions {
  /**
   * Number of stops to emit. Defaults to {@link CYCLIC_STEPS} for cyclic
   * channels and {@link DEFAULT_STEPS} for everything else.
   */
  steps?: number;
}

/**
 * Hue at 10° increments. A rainbow is where sRGB-lerp banding between stops is
 * most visible, so the cyclic channels get more than twice the stops of a
 * monotonic sweep.
 */
export const CYCLIC_STEPS = 36;

/** Stops for a monotonic channel sweep. */
export const DEFAULT_STEPS = 16;

/**
 * Serialise to `rgb()`, never to the color's own notation.
 *
 * Two reasons. An out-of-gamut `oklch()` in a CSS gradient is gamut-mapped by
 * the browser and browsers disagree on how, whereas `serialize(…, "srgb")`
 * clamps each channel to `0..1` — byte-for-byte what the canvas samplers write.
 * And `rgb()` parses everywhere the gradient syntax itself does, so the CSS
 * path needs no wide-gamut feature detection.
 */
function css(color: Color): string {
  return serialize(color.toObject(), "srgb");
}

/** The same color at zero alpha, for the transparent end of an overlay ramp. */
function fade(color: Color): string {
  return css(color.withAlpha(0));
}

const TRANSPARENT_WHITE = "rgb(255 255 255 / 0)";
const TRANSPARENT_BLACK = "rgb(0 0 0 / 0)";

/** Trim a fixed-point number to its shortest exact form. */
function num(value: number): string {
  return value.toFixed(4).replace(/\.?0+$/, "");
}

/** `t` in `0..1` as a CSS percentage. */
function pct(t: number): string {
  return `${num(t * 100)}%`;
}

/**
 * The gradient direction that puts an axis' *low* end at the start.
 *
 * The samplers take the value at x=0 / y=0 as their first bound, and the
 * components pass the channel minimum there when sliding forward — so
 * "forward" means low-at-left for x and low-at-top for y, and a CSS gradient
 * lists its first stop at the start of its direction.
 */
function axisDirection(onX: boolean, forward: boolean): string {
  if (onX) return forward ? "to right" : "to left";
  return forward ? "to bottom" : "to top";
}

/** Native `[min, max]` for a channel, or `null` when the space has no such channel. */
function channelRange(space: SpaceId, channel: string): [number, number] | null {
  const cfg = getChannelConfig(space, channel);
  if (!cfg) return null;
  return [cfg.nativeMin ?? cfg.min, cfg.nativeMax ?? cfg.max];
}

/** Whether a channel wraps — hue, in every space that has one. */
export function isCyclicChannel(space: SpaceId, channel: string): boolean {
  return getChannelConfig(space, channel)?.format === "degree";
}

/** How many stops a channel sweep needs by default. */
export function defaultStepsFor(space: SpaceId, channel: string): number {
  return isCyclicChannel(space, channel) ? CYCLIC_STEPS : DEFAULT_STEPS;
}

/**
 * Sweep one channel across its native range, returning evenly spaced colors.
 *
 * `alpha` is handled separately because it is not a coordinate channel: every
 * space has it, and no space declares it in `colorSpaces`.
 */
export function channelStops(
  base: Color,
  space: SpaceId,
  channel: string,
  options: StopOptions = {},
): Color[] | null {
  if (channel === "alpha") {
    const steps = options.steps ?? 2;
    return Array.from({ length: steps }, (_, i) => base.withAlpha(i / (steps - 1)));
  }
  const range = channelRange(space, channel);
  if (!range) return null;
  const [min, max] = range;
  const steps = options.steps ?? defaultStepsFor(space, channel);
  return Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return base.with({ space, [channel]: min + t * (max - min) });
  });
}

/**
 * Merge each run of consecutive mask-free layers into one `background-image`.
 *
 * Layers arrive bottom-first, which is the opposite of how CSS stacks them —
 * the first `background-image` in a comma list paints on top — so a merged run
 * is reversed. Every recipe except the two mask-carrying ones collapses to a
 * single element this way.
 */
export function collapseLayers(layers: CssGradientLayer[]): CssGradientLayer[] {
  const out: CssGradientLayer[] = [];
  let run: string[] = [];

  function flush(): void {
    if (run.length === 0) return;
    out.push({ image: run.reverse().join(", ") });
    run = [];
  }

  for (const layer of layers) {
    if (layer.mask) {
      flush();
      out.push(layer);
    } else {
      run.push(layer.image);
    }
  }
  flush();
  return out;
}

/**
 * A 1D sweep as a `linear-gradient`.
 *
 * Not an approximation: `drawLinearGradient` uploads these same stops and lerps
 * between them in sRGB in the fragment shader, which is what a CSS
 * `linear-gradient` does. Mirroring is applied by the caller reversing
 * `colors`, exactly as the WebGL path does.
 *
 * @param angle - The components' convention: 0 is left-to-right, 90 is
 *   top-to-bottom. CSS measures clockwise from "to top", so this is `angle + 90`.
 */
export function cssLinearStops(colors: Color[], angle = 0): CssGradientLayer[] | null {
  if (colors.length < 2) return null;
  const cssAngle = (((angle + 90) % 360) + 360) % 360;
  const stops = colors.map((c, i) => `${css(c)} ${pct(i / (colors.length - 1))}`);
  return [{ image: `linear-gradient(${num(cssAngle)}deg, ${stops.join(", ")})` }];
}

/**
 * A 1D sweep around a circle as a `conic-gradient`.
 *
 * `sampleConicRing` measures `atan2(dx, -dy) - startRad`, which starts at the
 * top and advances clockwise; `conic-gradient(from Xdeg)` uses the same origin
 * and direction, so `startAngle` passes through unchanged.
 */
export function cssConicStops(colors: Color[], startAngle = 0): CssGradientLayer[] | null {
  if (colors.length < 2) return null;
  const stops = colors.map((c, i) => `${css(c)} ${num((i / (colors.length - 1)) * 360)}deg`);
  return [{ image: `conic-gradient(from ${num(startAngle)}deg, ${stops.join(", ")})` }];
}

/**
 * Bilinear interpolation of four corners.
 *
 * `lerp(bottomRow(x), topRow(x), y)` — the mask ramp sets the top layer's alpha
 * to `y`, and source-over compositing of a premultiplied layer at alpha `y` is
 * exactly that lerp. Replaces `drawGradient`.
 *
 * Callers swap the corners for mirroring before calling, as the CPU path does.
 */
export function cssAreaBilinear(tl: Color, tr: Color, bl: Color, br: Color): CssGradientLayer[] {
  return [
    { image: `linear-gradient(to right, ${css(bl)}, ${css(br)})` },
    {
      image: `linear-gradient(to right, ${css(tl)}, ${css(tr)})`,
      mask: `linear-gradient(to top, ${TRANSPARENT_BLACK}, #000)`,
    },
  ];
}

/**
 * A 2D channel area, when the space's mapping to sRGB factors into layered
 * compositing. `null` otherwise — `oklch`, `oklab`, `lab`, `lch`, `hwb` and the
 * RGB-family pairs all stay on the canvas.
 *
 * A `null` channel means that axis is alpha, matching the components' own
 * convention. An alpha axis is CSS-able in *every* space, because the other
 * axis becomes pre-computed stops and the alpha ramp becomes a mask.
 */
export function cssAreaChannels(
  base: Color,
  space: SpaceId,
  xChannel: string | null,
  yChannel: string | null,
  slidingFromLeft: boolean,
  slidingFromTop: boolean,
  options: StopOptions = {},
): CssGradientLayer[] | null {
  // The canvas path paints opaque and lets the component apply the color's
  // alpha to the whole element; the layers do the same.
  const opaque = base.withAlpha(1);

  if (xChannel && yChannel) {
    return cssAreaChannelPair(opaque, space, xChannel, yChannel, slidingFromLeft, slidingFromTop);
  }
  if (!xChannel && !yChannel) return null;

  // One axis is alpha: sweep the real channel into stops, ramp the alpha with a
  // mask. This is what the components' hand-rolled loop writes into the pixel
  // alpha byte, and it works in any space because the stops are computed here.
  const realIsX = xChannel != null;
  const realChannel = (xChannel ?? yChannel)!;
  const stops = channelStops(opaque, space, realChannel, options);
  if (!stops) return null;

  const realDir = axisDirection(realIsX, realIsX ? slidingFromLeft : slidingFromTop);
  const alphaDir = axisDirection(!realIsX, realIsX ? slidingFromTop : slidingFromLeft);
  return [{
    image: `linear-gradient(${realDir}, ${stops.map(c => css(c)).join(", ")})`,
    mask: `linear-gradient(${alphaDir}, ${TRANSPARENT_BLACK}, #000)`,
  }];
}

function cssAreaChannelPair(
  base: Color,
  space: SpaceId,
  xChannel: string,
  yChannel: string,
  slidingFromLeft: boolean,
  slidingFromTop: boolean,
): CssGradientLayer[] | null {
  const pair = new Set([xChannel, yChannel]);

  // HSV, saturation × value. At v = 1 the color is `lerp(white, pureHue, s)`,
  // which is the white layer at alpha `1 - s`; multiplying by `v` scales every
  // channel uniformly, which is the black layer at alpha `1 - v`. Both exact.
  //
  // Layer order is load-bearing: white must composite before black, or the
  // result is `hue·v·s + white·(1-s)` instead of `(hue·s + white·(1-s))·v`.
  if (space === "hsv" && pair.size === 2 && pair.has("s") && pair.has("v")) {
    const sOnX = xChannel === "s";
    const hue = base.with({ space: "hsv", s: 1, v: 1 });
    const sDir = axisDirection(sOnX, sOnX ? slidingFromLeft : slidingFromTop);
    const vDir = axisDirection(!sOnX, sOnX ? slidingFromTop : slidingFromLeft);
    return [
      { image: `linear-gradient(${css(hue)}, ${css(hue)})` },
      { image: `linear-gradient(${sDir}, #fff, ${TRANSPARENT_WHITE})` },
      { image: `linear-gradient(${vDir}, #000, ${TRANSPARENT_BLACK})` },
    ];
  }

  // HSL, saturation × lightness. For l > 0.5 the overlay applies white at alpha
  // `2l - 1`, giving `l + 2s(1-l)(hue - 0.5)`, which is HSL's own
  // `l + s·(1 - |2l - 1|)·(hue - 0.5)` on that half. For l < 0.5 it applies
  // black at alpha `1 - 2l`, giving `l + 2ls(hue - 0.5)` — HSL again. Exact on
  // both halves.
  //
  // The doubled stop at 50% pairs transparent black with transparent white so
  // neither half interpolates through the other's premultiplied color. Both are
  // fully transparent, so the hard stop is invisible.
  if (space === "hsl" && pair.size === 2 && pair.has("s") && pair.has("l")) {
    const sOnX = xChannel === "s";
    const gray = base.with({ space: "hsl", s: 0, l: 0.5 });
    const hue = base.with({ space: "hsl", s: 1, l: 0.5 });
    const sDir = axisDirection(sOnX, sOnX ? slidingFromLeft : slidingFromTop);
    const lDir = axisDirection(!sOnX, sOnX ? slidingFromTop : slidingFromLeft);
    return [
      { image: `linear-gradient(${sDir}, ${css(gray)}, ${css(hue)})` },
      {
        image: `linear-gradient(${lDir}, #000 0%, ${TRANSPARENT_BLACK} 50%, `
          + `${TRANSPARENT_WHITE} 50%, #fff 100%)`,
      },
    ];
  }

  return null;
}

/**
 * A polar hue × saturation wheel. `null` for any other channel pair or space.
 *
 * Saturation is a linear lerp toward gray at fixed `v` or `l` in both HSV and
 * HSL, so the radial overlay is exact. `samplePolarGrid` clamps `r` to 1 and a
 * radial gradient holds its final color past 100%, so the corners match.
 *
 * `samplePolarGrid` normalises `dx` and `dy` independently, which is an
 * ellipse; `closest-side` on a circle is not. The two agree for a square wheel,
 * which is what the root's `border-radius: 50%` and the canvas' `clip-path:
 * circle(50%)` already assume.
 */
export function cssWheelPolar(
  base: Color,
  space: SpaceId,
  angleChannel: string,
  radiusChannel: string,
  startAngle = 0,
  options: StopOptions = {},
): CssGradientLayer[] | null {
  if (space !== "hsv" && space !== "hsl") return null;
  if (angleChannel !== "h" || radiusChannel !== "s") return null;

  const radius = channelRange(space, radiusChannel);
  if (!radius) return null;
  const [sMin, sMax] = radius;

  const opaque = base.withAlpha(1);
  const rim = channelStops(opaque.with({ space, s: sMax }), space, angleChannel, options);
  if (!rim) return null;
  const conic = cssConicStops(rim, startAngle);
  if (!conic) return null;

  const center = opaque.with({ space, s: sMin });
  return [
    ...conic,
    { image: `radial-gradient(circle closest-side, ${css(center)}, ${fade(center)})` },
  ];
}
