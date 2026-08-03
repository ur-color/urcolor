import { Color } from "@urcolor/core";
import { parseColor } from "@urcolor/shared";

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
}

const FALLBACK = Color.parse("hsl(0, 0%, 0%)")!;

/**
 * Reactive colour state.
 *
 * `input` seeds the initial value only. Unlike React's `useColor`, there is no
 * resync effect: the caller owns the input and can call `setColor` to push a new
 * one, which keeps an in-flight edit from being overwritten.
 */
export function useColor(input?: ColorInput): UseColorReturn {
  let color = $state<Color>(parseColor(input) ?? FALLBACK);

  const hex = $derived(color.toString("hex"));
  const alpha = $derived(Math.round(color.alpha * 100));

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
  };
}
