import { createContext, useContext } from "react";
import type { Color } from "internationalized-color";

export type ActiveDirection = "x" | "y";

export interface ColorWheelContextValue {
  disabled: boolean;
  colorSpace: string;
  angleChannelKey: string;
  radiusChannelKey: string;
  colorRef: Color | undefined;
  currentAngleValue: number;
  currentRadiusValue: number;
  angleMin: number;
  angleMax: number;
  radiusMin: number;
  radiusMax: number;
  startAngle: number;
  activeDirection: ActiveDirection;
  setActiveDirection: (dir: ActiveDirection) => void;
  thumbXElement: React.MutableRefObject<HTMLElement | undefined>;
  thumbYElement: React.MutableRefObject<HTMLElement | undefined>;
  isDragging: boolean;
}

export const ColorWheelContext = createContext<ColorWheelContextValue | null>(null);

export function useColorWheelContext() {
  const ctx = useContext(ColorWheelContext);
  if (!ctx) throw new Error("ColorWheel.* must be used within ColorWheelRoot");
  return ctx;
}
