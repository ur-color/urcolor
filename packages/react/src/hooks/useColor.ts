import { useCallback, useMemo, useState } from "react";
import { Color } from "internationalized-color";

export type ColorInput = Color | string | null | undefined;

export interface UseColorReturn {
  color: Color;
  setColor: (color: Color) => void;
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

  const hex = useMemo(() => color.toHex() ?? "#000000", [color]);

  const setHex = useCallback((v: string) => {
    const parsed = Color.parse(v);
    if (parsed) setColor(parsed);
  }, []);

  const alpha = useMemo(() => Math.round((color.alpha ?? 1) * 100), [color]);

  const setAlpha = useCallback((v: number) => {
    setColor(prev => prev.set({ alpha: v / 100 }));
  }, []);

  return { color, setColor, hex, setHex, alpha, setAlpha };
}
