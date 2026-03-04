import { createContext, useContext } from "react";
import type { Color } from "internationalized-color";

export type ActiveDirection = "x" | "y";

export interface ColorAreaContextValue {
  disabled: boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  currentModelValue: number[][];
  valueIndexToChange: number;
  setValueIndexToChange: (index: number) => void;
  thumbXElements: React.MutableRefObject<HTMLElement[]>;
  thumbYElements: React.MutableRefObject<HTMLElement[]>;
  activeDirection: ActiveDirection;
  setActiveDirection: (dir: ActiveDirection) => void;
  isSlidingFromLeft: boolean;
  isSlidingFromTop: boolean;
  thumbAlignment: "contain" | "overflow";
  colorSpace: string;
  xChannelKey: string;
  yChannelKey: string;
  colorRef: Color | undefined;
  isDragging: boolean;
}

export const ColorAreaContext = createContext<ColorAreaContextValue | null>(null);

export function useColorAreaContext() {
  const ctx = useContext(ColorAreaContext);
  if (!ctx) throw new Error("ColorArea.* must be used within ColorAreaRoot");
  return ctx;
}

export interface ColorAreaThumbContextValue {
  index: number;
}

export const ColorAreaThumbContext = createContext<ColorAreaThumbContextValue | null>(null);

export function useColorAreaThumbContext() {
  const ctx = useContext(ColorAreaThumbContext);
  if (!ctx) throw new Error("ColorArea.ThumbX/ThumbY must be used within ColorArea.Thumb");
  return ctx;
}
