import { forwardRef, useMemo, type ComponentPropsWithoutRef } from "react";
import { convertValueToPercentage } from "../../utils";
import { useColorAreaContext } from "./ColorAreaContext";

export interface ColorAreaRegionProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorAreaRegion = forwardRef<HTMLSpanElement, ColorAreaRegionProps>(
  function ColorAreaRegion({ style, children, ...props }, ref) {
    const ctx = useColorAreaContext();

    const regionStyle = useMemo(() => {
      const pctX = ctx.currentModelValue.map(v => convertValueToPercentage(v[0] ?? 0, ctx.minX, ctx.maxX));
      const pctY = ctx.currentModelValue.map(v => convertValueToPercentage(v[1] ?? 0, ctx.minY, ctx.maxY));

      let bounds: { startX: number; startY: number; endX: number; endY: number };
      if (pctX.length === 0) {
        bounds = { startX: 0, startY: 0, endX: 0, endY: 0 };
      } else if (pctX.length === 1) {
        bounds = { startX: 0, startY: 0, endX: pctX[0]!, endY: pctY[0]! };
      } else {
        bounds = { startX: Math.min(...pctX), startY: Math.min(...pctY), endX: Math.max(...pctX), endY: Math.max(...pctY) };
      }

      const startEdgeX = ctx.isSlidingFromLeft ? "left" : "right";
      const endEdgeX = ctx.isSlidingFromLeft ? "right" : "left";
      const startEdgeY = ctx.isSlidingFromTop ? "top" : "bottom";
      const endEdgeY = ctx.isSlidingFromTop ? "bottom" : "top";

      return {
        position: "absolute" as const,
        [startEdgeX]: `${bounds.startX}%`,
        [endEdgeX]: `${100 - bounds.endX}%`,
        [startEdgeY]: `${bounds.startY}%`,
        [endEdgeY]: `${100 - bounds.endY}%`,
        ...style,
      };
    }, [ctx, style]);

    return (
      <span ref={ref} data-disabled={ctx.disabled ? "" : undefined} style={regionStyle} {...props}>
        {children}
      </span>
    );
  },
);
