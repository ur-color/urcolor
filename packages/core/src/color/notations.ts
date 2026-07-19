/**
 * The notation table: for every CSS functional color notation, the space it
 * denotes and its three channels' unit metadata.
 *
 * This is the single source of truth for CSS-unit <-> native-unit conversion.
 * Both the built-in parsers and out-of-package plugins (e.g. relative-color
 * support) read it, so the two cannot drift — a drift here would produce
 * plausible-but-wrong colors that no type checker catches.
 */

import type { SpaceId } from "./types";

/** One channel's unit metadata within a notation. */
export interface NotationChannel {
  /** Keyword as written in CSS, e.g. "r", "h", "l". */
  name: string;
  /** CSS-unit value -> native storage value. */
  toNative: (css: number) => number;
  /** Native storage value -> CSS-unit value. */
  fromNative: (native: number) => number;
  /** What `100%` means for this channel, in CSS units. */
  percentRef: number;
  /** True for hue channels, which accept deg/grad/rad/turn. */
  angle?: boolean;
}

/** A notation: the space it denotes plus its three channels. */
export interface NotationDef {
  space: SpaceId;
  channels: [NotationChannel, NotationChannel, NotationChannel];
}

const identity = (n: number): number => n;

/** A channel whose CSS and native units coincide. */
const plain = (name: string, percentRef: number): NotationChannel => ({
  name,
  toNative: identity,
  fromNative: identity,
  percentRef,
});

/** A channel stored as `0..1` but written in `0..scale`. */
const scaled = (name: string, scale: number): NotationChannel => ({
  name,
  toNative: (css) => css / scale,
  fromNative: (native) => native * scale,
  percentRef: scale,
});

/** A hue channel: degrees in, degrees stored. */
const hue = (name = "h"): NotationChannel => ({
  name,
  toNative: identity,
  fromNative: identity,
  percentRef: 360,
  angle: true,
});

export const NOTATIONS: Readonly<Record<string, NotationDef>> = {
  rgb: {
    space: "srgb",
    channels: [scaled("r", 255), scaled("g", 255), scaled("b", 255)],
  },
  hsl: {
    space: "hsl",
    channels: [hue(), scaled("s", 100), scaled("l", 100)],
  },
  hwb: {
    space: "hwb",
    channels: [hue(), scaled("w", 100), scaled("b", 100)],
  },
  lab: {
    space: "lab",
    channels: [plain("l", 100), plain("a", 125), plain("b", 125)],
  },
  lch: {
    space: "lch",
    channels: [plain("l", 100), plain("c", 150), hue()],
  },
  oklab: {
    space: "oklab",
    channels: [plain("l", 1), plain("a", 0.4), plain("b", 0.4)],
  },
  oklch: {
    space: "oklch",
    channels: [plain("l", 1), plain("c", 0.4), hue()],
  },
  // Every color() space shares the same 0..1 channel triple; `space` here is a
  // placeholder, since the real space comes from the keyword in the string.
  color: {
    space: "srgb",
    channels: [plain("r", 1), plain("g", 1), plain("b", 1)],
  },
};
