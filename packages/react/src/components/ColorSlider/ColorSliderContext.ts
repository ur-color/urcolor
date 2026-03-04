import { createContext, useContext } from "react";
import type { Color } from "internationalized-color";

export interface ColorSliderContextValue {
  colorRef: Color | undefined;
  channel: string;
  colorSpace: string;
  orientation: "horizontal" | "vertical";
  inverted: boolean;
}

export const ColorSliderContext = createContext<ColorSliderContextValue | null>(null);

export function useColorSliderContext() {
  const ctx = useContext(ColorSliderContext);
  if (!ctx) throw new Error("ColorSlider.* must be used within ColorSliderRoot");
  return ctx;
}
