import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Color } from "@urcolor/core";

export type ColorInput = Color | string | null | undefined;

export interface UseColorReturn {
  color: Color;
  setColor: (color: Color | ((prev: Color) => Color)) => void;
  hex: string;
  setHex: (hex: string) => void;
  alpha: number;
  setAlpha: (alpha: number) => void;
}

const FALLBACK = Color.parse("hsl(0, 0%, 0%)")!;

export function parseColor(input: ColorInput): Color {
  if (input instanceof Color) return input;
  if (typeof input === "string") return Color.parse(input) ?? FALLBACK;
  return FALLBACK;
}

export function useColor(input: ColorInput): UseColorReturn {
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

  return { color, setColor, hex, setHex, alpha, setAlpha };
}
