export interface ChannelConfig {
  /** culori channel key (e.g. 'h', 's', 'l') */
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
  /** culori internal minimum (defaults to min if not set) */
  culoriMin?: number;
  /** culori internal maximum (defaults to max if not set) */
  culoriMax?: number;
}

export interface ColorSpaceConfig {
  /** culori mode identifier */
  mode: string;
  /** Human-readable label */
  label: string;
  /** Channel definitions */
  channels: ChannelConfig[];
}

/** Convert a display value to culori internal value */
export function displayToCulori(config: ChannelConfig, displayValue: number): number {
  const cMin = config.culoriMin ?? config.min;
  const cMax = config.culoriMax ?? config.max;
  if (cMin === config.min && cMax === config.max) return displayValue;
  // Linear interpolation: display [min, max] → culori [cMin, cMax]
  const t = (displayValue - config.min) / (config.max - config.min);
  return cMin + t * (cMax - cMin);
}

/** Convert a culori internal value to display value, rounded to step precision */
export function culoriToDisplay(config: ChannelConfig, culoriValue: number): number {
  const cMin = config.culoriMin ?? config.min;
  const cMax = config.culoriMax ?? config.max;
  let display: number;
  if (cMin === config.min && cMax === config.max) {
    display = culoriValue;
  } else {
    const t = (culoriValue - cMin) / (cMax - cMin);
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

export const colorSpaces: Record<string, ColorSpaceConfig> = {
  hsl: {
    mode: "hsl",
    label: "HSL",
    channels: [
      { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" },
      { key: "s", label: "Saturation", min: 0, max: 100, step: 1, format: "percentage", culoriMin: 0, culoriMax: 1 },
      { key: "l", label: "Lightness", min: 0, max: 100, step: 1, format: "percentage", culoriMin: 0, culoriMax: 1 },
    ],
  },
  hsv: {
    mode: "hsv",
    label: "HSV",
    channels: [
      { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" },
      { key: "s", label: "Saturation", min: 0, max: 100, step: 1, format: "percentage", culoriMin: 0, culoriMax: 1 },
      { key: "v", label: "Value", min: 0, max: 100, step: 1, format: "percentage", culoriMin: 0, culoriMax: 1 },
    ],
  },
  hwb: {
    mode: "hwb",
    label: "HWB",
    channels: [
      { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" },
      { key: "w", label: "Whiteness", min: 0, max: 100, step: 1, format: "percentage", culoriMin: 0, culoriMax: 1 },
      { key: "b", label: "Blackness", min: 0, max: 100, step: 1, format: "percentage", culoriMin: 0, culoriMax: 1 },
    ],
  },
  oklch: {
    mode: "oklch",
    label: "OKLCh",
    channels: [
      { key: "l", label: "Lightness", min: 0, max: 100, step: 1, format: "percentage", culoriMin: 0, culoriMax: 1 },
      { key: "c", label: "Chroma", min: 0, max: 0.4, step: 0.01, format: "number" },
      { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" },
    ],
  },
  oklab: {
    mode: "oklab",
    label: "OKLab",
    channels: [
      { key: "l", label: "Lightness", min: 0, max: 100, step: 1, format: "percentage", culoriMin: 0, culoriMax: 1 },
      { key: "a", label: "a", min: -0.4, max: 0.4, step: 0.01, format: "number" },
      { key: "b", label: "b", min: -0.4, max: 0.4, step: 0.01, format: "number" },
    ],
  },
  lch: {
    mode: "lch",
    label: "LCh",
    channels: [
      { key: "l", label: "Lightness", min: 0, max: 100, step: 1, format: "percentage" },
      { key: "c", label: "Chroma", min: 0, max: 150, step: 1, format: "number" },
      { key: "h", label: "Hue", min: 0, max: 360, step: 1, format: "degree" },
    ],
  },
  lab: {
    mode: "lab",
    label: "Lab",
    channels: [
      { key: "l", label: "Lightness", min: 0, max: 100, step: 1, format: "percentage" },
      { key: "a", label: "a", min: -125, max: 125, step: 1, format: "number" },
      { key: "b", label: "b", min: -125, max: 125, step: 1, format: "number" },
    ],
  },
  rgb: {
    mode: "rgb",
    label: "RGB",
    channels: [
      { key: "r", label: "Red", min: 0, max: 255, step: 1, format: "number", culoriMin: 0, culoriMax: 1 },
      { key: "g", label: "Green", min: 0, max: 255, step: 1, format: "number", culoriMin: 0, culoriMax: 1 },
      { key: "b", label: "Blue", min: 0, max: 255, step: 1, format: "number", culoriMin: 0, culoriMax: 1 },
    ],
  },
  p3: {
    mode: "p3",
    label: "Display P3",
    channels: [
      { key: "r", label: "Red", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "g", label: "Green", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "b", label: "Blue", min: 0, max: 1, step: 0.01, format: "number" },
    ],
  },
  a98: {
    mode: "a98",
    label: "A98 RGB",
    channels: [
      { key: "r", label: "Red", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "g", label: "Green", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "b", label: "Blue", min: 0, max: 1, step: 0.01, format: "number" },
    ],
  },
  prophoto: {
    mode: "prophoto",
    label: "ProPhoto RGB",
    channels: [
      { key: "r", label: "Red", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "g", label: "Green", min: 0, max: 1, step: 0.01, format: "number" },
      { key: "b", label: "Blue", min: 0, max: 1, step: 0.01, format: "number" },
    ],
  },
  rec2020: {
    mode: "rec2020",
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
export function getChannelConfig(colorSpace: string, channel: string): ChannelConfig | undefined {
  return colorSpaces[colorSpace]?.channels.find(c => c.key === channel);
}
