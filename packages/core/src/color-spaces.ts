import type { SpaceId } from "./color/types";

export interface ChannelConfig {
  /** Channel key (e.g. 'h', 's', 'l') */
  key: string;
  /** Human-readable label */
  label: string;
  /** Display minimum value */
  min: number;
  /** Display maximum value */
  max: number;
  /** Step increment (in display units) */
  step: number;
  /** Display format */
  format: "number" | "degree" | "percentage";
  /** Native internal minimum (defaults to `min` when unset) */
  nativeMin?: number;
  /** Native internal maximum (defaults to `max` when unset) */
  nativeMax?: number;
}

export interface ColorSpaceConfig {
  /** CSS Color 4 space identifier */
  space: SpaceId;
  /** Human-readable label */
  label: string;
  /** Channel definitions */
  channels: ChannelConfig[];
}

/** Convert a display value to native internal value */
export function displayToNative(config: ChannelConfig, displayValue: number): number {
  const cMin = config.nativeMin ?? config.min;
  const cMax = config.nativeMax ?? config.max;
  if (cMin === config.min && cMax === config.max) return displayValue;
  // Linear interpolation: display [min, max] → native [cMin, cMax]
  const t = (displayValue - config.min) / (config.max - config.min);
  return cMin + t * (cMax - cMin);
}

/** Convert a native internal value to display value, rounded to step precision */
export function nativeToDisplay(config: ChannelConfig, nativeValue: number): number {
  const cMin = config.nativeMin ?? config.min;
  const cMax = config.nativeMax ?? config.max;
  let display: number;
  if (cMin === config.min && cMax === config.max) {
    display = nativeValue;
  } else {
    const t = (nativeValue - cMin) / (cMax - cMin);
    display = config.min + t * (config.max - config.min);
  }
  // Round to step precision to eliminate floating-point artifacts
  const decimals = stepDecimals(config.step);
  return roundTo(display, decimals);
}

function stepDecimals(step: number): number {
  const s = String(step);
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export const colorSpaces: Partial<Record<SpaceId, ColorSpaceConfig>> = {
  hsl: {
    space: "hsl",
    label: "HSL",
    channels: [
      { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" },
      { key: "s", label: "Saturation", min: 0, max: 100, step: 1, format: "percentage", nativeMin: 0, nativeMax: 1 },
      { key: "l", label: "Lightness", min: 0, max: 100, step: 1, format: "percentage", nativeMin: 0, nativeMax: 1 },
    ],
  },
  hsv: {
    space: "hsv",
    label: "HSV",
    channels: [
      { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" },
      { key: "s", label: "Saturation", min: 0, max: 100, step: 1, format: "percentage", nativeMin: 0, nativeMax: 1 },
      { key: "v", label: "Brightness", min: 0, max: 100, step: 1, format: "percentage", nativeMin: 0, nativeMax: 1 },
    ],
  },
  hwb: {
    space: "hwb",
    label: "HWB",
    channels: [
      { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" },
      { key: "w", label: "Whiteness", min: 0, max: 100, step: 1, format: "percentage", nativeMin: 0, nativeMax: 1 },
      { key: "b", label: "Blackness", min: 0, max: 100, step: 1, format: "percentage", nativeMin: 0, nativeMax: 1 },
    ],
  },
  oklch: {
    space: "oklch",
    label: "OKLCh",
    channels: [
      { key: "l", label: "Lightness", min: 0, max: 100, step: 1, format: "percentage", nativeMin: 0, nativeMax: 1 },
      { key: "c", label: "Chroma", min: 0, max: 0.4, step: 0.01, format: "number" },
      { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" },
    ],
  },
  oklab: {
    space: "oklab",
    label: "OKLab",
    channels: [
      { key: "l", label: "Lightness", min: 0, max: 100, step: 1, format: "percentage", nativeMin: 0, nativeMax: 1 },
      { key: "a", label: "a", min: -0.4, max: 0.4, step: 0.01, format: "number" },
      { key: "b", label: "b", min: -0.4, max: 0.4, step: 0.01, format: "number" },
    ],
  },
  lch: {
    space: "lch",
    label: "LCh",
    channels: [
      { key: "l", label: "Lightness", min: 0, max: 100, step: 1, format: "percentage" },
      { key: "c", label: "Chroma", min: 0, max: 150, step: 1, format: "number" },
      { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" },
    ],
  },
  lab: {
    space: "lab",
    label: "Lab",
    channels: [
      { key: "l", label: "Lightness", min: 0, max: 100, step: 1, format: "percentage" },
      { key: "a", label: "a", min: -125, max: 125, step: 1, format: "number" },
      { key: "b", label: "b", min: -125, max: 125, step: 1, format: "number" },
    ],
  },
  srgb: {
    space: "srgb",
    label: "RGB",
    channels: [
      { key: "r", label: "Red", min: 0, max: 255, step: 1, format: "number", nativeMin: 0, nativeMax: 1 },
      { key: "g", label: "Green", min: 0, max: 255, step: 1, format: "number", nativeMin: 0, nativeMax: 1 },
      { key: "b", label: "Blue", min: 0, max: 255, step: 1, format: "number", nativeMin: 0, nativeMax: 1 },
    ],
  },
  "display-p3": {
    space: "display-p3",
    label: "Display P3",
    channels: [
      { key: "r", label: "Red", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "g", label: "Green", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "b", label: "Blue", min: 0, max: 1, step: 0.01, format: "number" },
    ],
  },
  "a98-rgb": {
    space: "a98-rgb",
    label: "A98 RGB",
    channels: [
      { key: "r", label: "Red", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "g", label: "Green", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "b", label: "Blue", min: 0, max: 1, step: 0.01, format: "number" },
    ],
  },
  "prophoto-rgb": {
    space: "prophoto-rgb",
    label: "ProPhoto RGB",
    channels: [
      { key: "r", label: "Red", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "g", label: "Green", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "b", label: "Blue", min: 0, max: 1, step: 0.01, format: "number" },
    ],
  },
  rec2020: {
    space: "rec2020",
    label: "Rec. 2020",
    channels: [
      { key: "r", label: "Red", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "g", label: "Green", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "b", label: "Blue", min: 0, max: 1, step: 0.01, format: "number" },
    ],
  },
};

/**
 * Get channel config for a specific channel in a color space.
 */
export function getChannelConfig(colorSpace: SpaceId, channel: string): ChannelConfig | undefined {
  return colorSpaces[colorSpace]?.channels.find(c => c.key === channel);
}
