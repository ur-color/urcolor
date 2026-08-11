import { Color, type SpaceId } from "@urcolor/core";
import { channelsOf, parseColor, type ChannelConfig } from "@urcolor/shared";

/** Anything accepted as the initial colour of a hook. */
export type ColorInput = Color | string | null | undefined;

export interface UseColorReturn {
  /** The current colour. */
  readonly color: Color;
  /** Replaces the colour, either directly or from the previous value. */
  setColor(next: Color | ((prev: Color) => Color)): void;
  /** The current colour as a hex string. */
  readonly hex: string;
  /** Parses `hex` and replaces the colour when it is valid; ignores it otherwise. */
  setHex(hex: string): void;
  /** The current alpha as a percentage in `0..100`. */
  readonly alpha: number;
  /** Sets the alpha from a percentage in `0..100`. */
  setAlpha(alpha: number): void;
  /**
   * The channels of the colour's own space, ready to render one field per
   * channel. Pass `space` to `useColor` to pin them instead.
   */
  readonly channels: readonly ChannelConfig[];
}

const FALLBACK = Color.parse("hsl(0, 0%, 0%)")!;

/**
 * Reactive colour state.
 *
 * `input` seeds the initial value only. Unlike React's `useColor`, there is no
 * resync effect: the caller owns the input and can call `setColor` to push a new
 * one, which keeps an in-flight edit from being overwritten.
 *
 * `space` decides what `channels` describes. Left out, it follows the colour's
 * own space, which is what a single-space editor wants. A picker that mixes
 * spaces should pass one: writing through a control converts the colour into
 * that control's space, so an HSV area would otherwise renumber a set of HSL
 * fields under the user mid-drag.
 */
export function useColor(input?: ColorInput, space?: SpaceId): UseColorReturn {
  let color = $state<Color>(parseColor(input) ?? FALLBACK);

  const hex = $derived(color.toString("hex"));
  const alpha = $derived(Math.round(color.alpha * 100));
  const channels = $derived(channelsOf(space ?? color.space));

  return {
    get color() {
      return color;
    },
    setColor(next: Color | ((prev: Color) => Color)): void {
      color = typeof next === "function" ? next(color) : next;
    },
    get hex() {
      return hex;
    },
    setHex(next: string): void {
      const parsed = Color.parse(next);
      if (parsed) color = parsed;
    },
    get alpha() {
      return alpha;
    },
    setAlpha(next: number): void {
      color = color.withAlpha(next / 100);
    },
    get channels() {
      return channels;
    },
  };
}
