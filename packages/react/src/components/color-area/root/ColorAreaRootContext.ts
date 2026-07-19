import { createContext, useContext } from "react";
import type { Color, SpaceId } from "@urcolor/core";

export interface ColorAreaContextValue {
  disabled: boolean;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  currentModelValue: number[][];
  valueIndexToChange: number;
  setValueIndexToChange: (index: number) => void;
  thumbRef: React.MutableRefObject<HTMLElement | null>;
  isSlidingFromLeft: boolean;
  isSlidingFromTop: boolean;
  thumbAlignment: "contain" | "overflow";
  colorSpace: SpaceId;
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
