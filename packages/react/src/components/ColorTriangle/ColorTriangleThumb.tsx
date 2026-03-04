import { forwardRef, useMemo, useEffect, type ComponentPropsWithoutRef } from "react";
import { barycentricToCartesian } from "@urcolor/core";
import { useColorTriangleContext } from "./ColorTriangleContext";

export interface ColorTriangleThumbProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorTriangleThumb = forwardRef<HTMLSpanElement, ColorTriangleThumbProps>(
  function ColorTriangleThumb({ style, children, ...props }, ref) {
    const ctx = useColorTriangleContext();

    // Register thumb element
    useEffect(() => {
      if (ref && typeof ref === "object" && ref.current) {
        ctx.thumbElement.current = ref.current;
      }
    });

    const thumbPosition = useMemo(() => {
      const xVal = ctx.currentXValue;
      const yVal = ctx.currentYValue;
      const xRange = ctx.xMax - ctx.xMin;
      const yRange = ctx.yMax - ctx.yMin;

      let u: number, v: number, w: number;

      if (ctx.isThreeChannel) {
        const zVal = ctx.currentZValue;
        const zRange = ctx.zMax - ctx.zMin;
        const rawU = xRange === 0 ? 0 : (xVal - ctx.xMin) / xRange;
        const rawV = yRange === 0 ? 0 : (yVal - ctx.yMin) / yRange;
        const rawW = zRange === 0 ? 0 : (zVal - ctx.zMin) / zRange;
        const sum = rawU + rawV + rawW || 1;
        u = rawU / sum;
        v = rawV / sum;
        w = rawW / sum;
      } else {
        u = xRange === 0 ? 0 : (xVal - ctx.xMin) / xRange;
        w = yRange === 0 ? 0 : 1 - (yVal - ctx.yMin) / yRange;
        v = Math.max(0, 1 - u - w);
      }

      const [v0, v1, v2] = ctx.vertices;
      const pos = barycentricToCartesian(u, v, w, v0, v1, v2);

      return {
        left: `${pos.x * 100}%`,
        top: `${pos.y * 100}%`,
      };
    }, [ctx.currentXValue, ctx.currentYValue, ctx.currentZValue, ctx.xMin, ctx.xMax, ctx.yMin, ctx.yMax, ctx.zMin, ctx.zMax, ctx.isThreeChannel, ctx.vertices]);

    return (
      <span
        ref={(el) => {
          if (el) ctx.thumbElement.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        aria-roledescription="2D slider"
        aria-disabled={ctx.disabled}
        data-disabled={ctx.disabled ? "" : undefined}
        style={{
          position: "absolute",
          left: thumbPosition.left,
          top: thumbPosition.top,
          transform: "translate(-50%, -50%)",
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    );
  },
);
