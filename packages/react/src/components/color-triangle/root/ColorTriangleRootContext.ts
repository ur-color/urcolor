import { createContext, useContext } from "react";
import type { Color, SpaceId } from "@urcolor/core";
import type { Point } from "@urcolor/core";

export interface ColorTriangleContextValue {
  disabled: boolean;
  colorSpace: SpaceId;
  xChannelKey: string;
  yChannelKey: string;
  zChannelKey: string | undefined;
  colorRef: Color | undefined;
  currentXValue: number;
  currentYValue: number;
  currentZValue: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
  isThreeChannel: boolean;
  rotation: number;
  vertices: [Point, Point, Point];
  isDragging: boolean;
  thumbAlignment: "contain" | "overflow";
  thumbElement: React.MutableRefObject<HTMLElement | undefined>;
}

export const ColorTriangleContext = createContext<ColorTriangleContextValue | null>(null);

export function useColorTriangleContext() {
  const ctx = useContext(ColorTriangleContext);
  if (!ctx) throw new Error("ColorTriangle.* must be used within ColorTriangleRoot");
  return ctx;
}
