import { createContext, useContext } from "react";
import type { Color } from "internationalized-color";

export interface ColorRingContextValue {
  disabled: boolean;
  min: number;
  max: number;
  step: number;
  colorSpace: string;
  channelKey: string;
  colorRef: Color | undefined;
  currentValue: number;
  startAngle: number;
  innerRadius: number;
  isDragging: boolean;
  thumbElement: React.MutableRefObject<HTMLElement | undefined>;
}

export const ColorRingContext = createContext<ColorRingContextValue | null>(null);

export function useColorRingContext() {
  const ctx = useContext(ColorRingContext);
  if (!ctx) throw new Error("ColorRing.* must be used within ColorRingRoot");
  return ctx;
}
