import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Color, type SpaceId } from "@urcolor/core";
import { channelsOf, type ChannelConfig } from "@urcolor/shared";

export type ColorInput = Color | string | null | undefined;

export interface UseColorReturn {
  color: Color;
  setColor: (color: Color | ((prev: Color) => Color)) => void;
  hex: string;
  setHex: (hex: string) => void;
  alpha: number;
  setAlpha: (alpha: number) => void;
  /**
   * The channels of the color's own space, ready to render one field per
   * channel. Pass `space` to `useColor` to pin them instead.
   */
  channels: readonly ChannelConfig[];
}

const FALLBACK = Color.parse("hsl(0, 0%, 0%)")!;

export function parseColor(input: ColorInput): Color {
  if (input instanceof Color) return input;
  if (typeof input === "string") return Color.parse(input) ?? FALLBACK;
  return FALLBACK;
}

/**
 * Reactive color state.
 *
 * `space` decides what `channels` describes. Left out, it follows the color's
 * own space, which is what a single-space editor wants. A picker that mixes
 * spaces should pass one: writing through a control converts the color into
 * that control's space, so an HSV area would otherwise renumber a set of HSL
 * fields under the user mid-drag.
 */
export function useColor(input: ColorInput, space?: SpaceId): UseColorReturn {
  const [color, setColor] = useState<Color>(() => parseColor(input));

  // Resync when `input` changes, mirroring Vue's `watch(() => toValue(input), ...)`.
  // Skips the initial mount (the `useState` initializer already covers it) so this
  // never fires on mount and never fights an in-flight user edit unless `input` itself changes.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setColor(parseColor(input));
  }, [input]);

  const hex = useMemo(() => color.toString("hex"), [color]);

  const setHex = useCallback((v: string) => {
    const parsed = Color.parse(v);
    if (parsed) setColor(parsed);
  }, []);

  const alpha = useMemo(() => Math.round(color.alpha * 100), [color]);

  const setAlpha = useCallback((v: number) => {
    setColor(prev => prev.withAlpha(v / 100));
  }, []);

  const channels = useMemo(() => channelsOf(space ?? color.space), [space, color]);

  return { color, setColor, hex, setHex, alpha, setAlpha, channels };
}
