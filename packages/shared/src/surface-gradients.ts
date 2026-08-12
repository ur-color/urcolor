import { Color, type SpaceId } from "@urcolor/core";
import { renderToCanvas } from "./canvas";
import { getChannelConfig } from "./color-spaces";
import { cssAreaBilinear, cssAreaChannels, type CssGradientLayer } from "./css-gradient";
import { applyChannelOverrides, type ChannelOverrides } from "./gradient-stops";
import { drawGradient, sampleBilinearGrid, sampleChannelGrid } from "./gradient";

/**
 * Sample resolution of every two-dimensional surface.
 *
 * The gradients sample a small grid and let the canvas upscale it with
 * smoothing: color conversion per pixel is far more expensive than the
 * interpolation.
 */
export const SURFACE_GRID = 64;

/** The four explicit corner colors, as `[topLeft, topRight, bottomLeft, bottomRight]`. */
export type SurfaceCorners = readonly [string, string, string, string];

export interface AreaAxes {
  colorSpace: SpaceId;
  /** The channel on the horizontal axis, or `"alpha"`. */
  xChannel: string;
  /** The channel on the vertical axis, or `"alpha"`. */
  yChannel: string;
  /** False when the horizontal axis is mirrored by `dir` or `xInverted`. */
  slidingFromLeft: boolean;
  /** False when the vertical axis is mirrored by `yInverted`. */
  slidingFromTop: boolean;
}

export interface AreaSurfaceOptions extends AreaAxes {
  color: Color;
  overrides: ChannelOverrides;
  /** Explicit corners. When given they replace the channel sweep entirely. */
  corners?: SurfaceCorners;
  /** Interpolate in this space for perceptual accuracy. */
  interpolationSpace?: SpaceId;
}

/**
 * Opacity the painted surface carries.
 *
 * The generalisation of `gradientOpacity` to two dimensions: a surface with an
 * alpha *axis* paints its own transparency, exactly as an alpha slider does,
 * but the condition is an axis flag rather than a channel name.
 */
export function surfaceOpacity(
  color: Color,
  hasAlphaAxis: boolean,
  overrides: ChannelOverrides,
): number {
  if (hasAlphaAxis) return 1;
  if (overrides === false || overrides.alpha === undefined) return color.alpha;
  return 1;
}

/** Whether either axis of an area is the alpha channel. */
function hasAlphaAxis(axes: AreaAxes): boolean {
  return axes.xChannel === "alpha" || axes.yChannel === "alpha";
}

/** The four corners parsed, or null when any of them fails. */
function parseCorners(corners: SurfaceCorners): [Color, Color, Color, Color] | null {
  const parsed = corners.map(entry => Color.parse(entry));
  if (parsed.some(entry => !entry)) return null;
  return parsed as [Color, Color, Color, Color];
}

/**
 * The four corners in screen order, with the mirror swap the CPU path applies.
 *
 * `alphaAxis` decides whether the corners keep their own alpha, matching the
 * flag `drawGradient` and `sampleBilinearGrid` are handed.
 */
function orientCorners(
  corners: [Color, Color, Color, Color],
  axes: AreaAxes,
  alphaAxis: boolean,
): [Color, Color, Color, Color] {
  let [a, b, c, d] = corners;
  if (!alphaAxis) [a, b, c, d] = [a.withAlpha(1), b.withAlpha(1), c.withAlpha(1), d.withAlpha(1)];
  if (!axes.slidingFromLeft) [a, b, c, d] = [b, a, d, c];
  if (!axes.slidingFromTop) [a, b, c, d] = [c, d, a, b];
  return [a, b, c, d];
}

function paintCorners(
  canvas: HTMLCanvasElement,
  corners: [Color, Color, Color, Color],
  axes: AreaAxes,
  alphaAxis: boolean,
  interpolationSpace: SpaceId | undefined,
): void {
  if (!interpolationSpace) {
    // The GPU path mirrors in the shader, so the corners are passed as authored.
    drawGradient(
      canvas, corners[0], corners[1], corners[2], corners[3],
      alphaAxis, !axes.slidingFromLeft, !axes.slidingFromTop,
    );
    return;
  }

  // The CPU path has no mirror flags, so the corners are swapped instead.
  let [a, b, c, d] = corners;
  if (!axes.slidingFromLeft) [a, b, c, d] = [b, a, d, c];
  if (!axes.slidingFromTop) [a, b, c, d] = [c, d, a, b];
  const pixels = sampleBilinearGrid(
    a, b, c, d, SURFACE_GRID, SURFACE_GRID, interpolationSpace, alphaAxis,
  );
  renderToCanvas({ canvas, pixels, sampleWidth: SURFACE_GRID, sampleHeight: SURFACE_GRID });
}

/** Both axes carry a real channel: the core sampler covers it directly. */
function paintChannelGrid(
  canvas: HTMLCanvasElement,
  base: Color,
  axes: AreaAxes,
  alphaAxis: boolean,
): void {
  const xCfg = getChannelConfig(axes.colorSpace, axes.xChannel);
  const yCfg = getChannelConfig(axes.colorSpace, axes.yChannel);
  if (!xCfg || !yCfg) return;

  const xMin = xCfg.nativeMin ?? xCfg.min;
  const xMax = xCfg.nativeMax ?? xCfg.max;
  const yMin = yCfg.nativeMin ?? yCfg.min;
  const yMax = yCfg.nativeMax ?? yCfg.max;

  const pixels = sampleChannelGrid(
    base, axes.colorSpace,
    axes.xChannel, axes.yChannel,
    axes.slidingFromLeft ? xMin : xMax, axes.slidingFromLeft ? xMax : xMin,
    axes.slidingFromTop ? yMin : yMax, axes.slidingFromTop ? yMax : yMin,
    SURFACE_GRID, SURFACE_GRID, alphaAxis,
  );
  renderToCanvas({ canvas, pixels, sampleWidth: SURFACE_GRID, sampleHeight: SURFACE_GRID });
}

/**
 * One axis is alpha, so only the other carries a channel. The core samplers
 * take two real channels, so this surface is built pixel by pixel instead.
 *
 * Exported because it is the only hand-rolled sampler in the library, and the
 * only one whose axis mirroring can be checked without a canvas.
 */
export function alphaAxisPixels(
  base: Color,
  axes: AreaAxes,
  channelKey: string,
): Uint8ClampedArray | null {
  const config = getChannelConfig(axes.colorSpace, channelKey);
  if (!config) return null;

  const cMin = config.nativeMin ?? config.min;
  const cMax = config.nativeMax ?? config.max;
  const realIsX = axes.xChannel !== "alpha";
  const realForward = realIsX ? axes.slidingFromLeft : axes.slidingFromTop;
  const alphaForward = realIsX ? axes.slidingFromTop : axes.slidingFromLeft;
  const realMin = realForward ? cMin : cMax;
  const realMax = realForward ? cMax : cMin;
  const alphaMin = alphaForward ? 0 : 1;
  const alphaMax = alphaForward ? 1 : 0;

  const pixels = new Uint8ClampedArray(SURFACE_GRID * SURFACE_GRID * 4);
  for (let y = 0; y < SURFACE_GRID; y++) {
    const vy = y / (SURFACE_GRID - 1);
    for (let x = 0; x < SURFACE_GRID; x++) {
      const vx = x / (SURFACE_GRID - 1);
      const realValue = realIsX
        ? realMin + vx * (realMax - realMin)
        : realMin + vy * (realMax - realMin);
      const alphaValue = realIsX
        ? alphaMin + vy * (alphaMax - alphaMin)
        : alphaMin + vx * (alphaMax - alphaMin);
      const rgb = base.with({ space: axes.colorSpace, [channelKey]: realValue }).to("srgb");
      const index = (y * SURFACE_GRID + x) * 4;
      pixels[index] = Math.round(Math.max(0, Math.min(1, rgb.get("r"))) * 255);
      pixels[index + 1] = Math.round(Math.max(0, Math.min(1, rgb.get("g"))) * 255);
      pixels[index + 2] = Math.round(Math.max(0, Math.min(1, rgb.get("b"))) * 255);
      pixels[index + 3] = Math.round(Math.max(0, Math.min(1, alphaValue)) * 255);
    }
  }
  return pixels;
}

/** Paints a color area onto a canvas, choosing the path its axes call for. */
export function paintAreaSurface(options: AreaSurfaceOptions & { canvas: HTMLCanvasElement }): void {
  const { canvas, color, overrides, corners, interpolationSpace } = options;
  const alphaAxis = hasAlphaAxis(options);

  if (corners) {
    const parsed = parseCorners(corners);
    if (!parsed) return;
    paintCorners(canvas, parsed, options, alphaAxis, interpolationSpace);
    return;
  }

  const base = applyChannelOverrides(color, options.colorSpace, overrides);
  if (options.xChannel !== "alpha" && options.yChannel !== "alpha") {
    paintChannelGrid(canvas, base, options, alphaAxis);
    return;
  }

  // Both axes being alpha leaves no channel to sample, so nothing is painted.
  const channelKey = options.xChannel === "alpha"
    ? (options.yChannel === "alpha" ? undefined : options.yChannel)
    : options.xChannel;
  if (channelKey === undefined) return;
  const pixels = alphaAxisPixels(base, options, channelKey);
  if (!pixels) return;
  renderToCanvas({ canvas, pixels, sampleWidth: SURFACE_GRID, sampleHeight: SURFACE_GRID });
}

/**
 * The CSS recipe for an area, or null when the canvas is the one that paints.
 *
 * Interpolated corners stay on the canvas: the two row gradients could be
 * densified into stops in that space, but the vertical lerp is an sRGB alpha
 * composite either way, so the result would be perceptual on one axis and not
 * the other, which is worse than not taking this path.
 */
export function areaCssLayers(options: AreaSurfaceOptions): CssGradientLayer[] | null {
  const alphaAxis = hasAlphaAxis(options);

  if (options.corners) {
    if (options.interpolationSpace) return null;
    const parsed = parseCorners(options.corners);
    if (!parsed) return null;
    return cssAreaBilinear(...orientCorners(parsed, options, alphaAxis));
  }

  return cssAreaChannels(
    applyChannelOverrides(options.color, options.colorSpace, options.overrides),
    options.colorSpace,
    options.xChannel === "alpha" ? null : options.xChannel,
    options.yChannel === "alpha" ? null : options.yChannel,
    options.slidingFromLeft,
    options.slidingFromTop,
  );
}
