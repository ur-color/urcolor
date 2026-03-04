import { createContext, useContext } from "react";
import type { Color } from "internationalized-color";
import type { Point } from "@urcolor/core";

export type ActiveDirection = "x" | "y" | "z";

export interface ColorTriangleContextValue {
  disabled: boolean;
  colorSpace: string;
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
  activeDirection: ActiveDirection;
  setActiveDirection: (dir: ActiveDirection) => void;
  thumbXElement: React.MutableRefObject<HTMLElement | undefined>;
  thumbYElement: React.MutableRefObject<HTMLElement | undefined>;
  thumbZElement: React.MutableRefObject<HTMLElement | undefined>;
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
