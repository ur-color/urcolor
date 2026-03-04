import { forwardRef, useMemo, type ComponentPropsWithoutRef } from "react";
import { useColorWheelContext } from "./ColorWheelContext";

export interface ColorWheelThumbProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorWheelThumb = forwardRef<HTMLSpanElement, ColorWheelThumbProps>(
  function ColorWheelThumb({ style, children, ...props }, ref) {
    const ctx = useColorWheelContext();

    const angleDeg = useMemo(() => {
      const range = ctx.angleMax - ctx.angleMin;
      if (range === 0) return ctx.startAngle;
      return ((ctx.currentAngleValue - ctx.angleMin) / range) * 360 + ctx.startAngle;
    }, [ctx.currentAngleValue, ctx.angleMin, ctx.angleMax, ctx.startAngle]);

    const radiusPercent = useMemo(() => {
      const range = ctx.radiusMax - ctx.radiusMin;
      if (range === 0) return 0;
      return ((ctx.currentRadiusValue - ctx.radiusMin) / range) * 50;
    }, [ctx.currentRadiusValue, ctx.radiusMin, ctx.radiusMax]);

    return (
      <span
        ref={ref}
        aria-roledescription="2D slider"
        data-disabled={ctx.disabled ? "" : undefined}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `rotate(${angleDeg}deg) translateY(-${radiusPercent}cqmin) translate(-50%, -50%)`,
          transformOrigin: "0 0",
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    );
  },
);
