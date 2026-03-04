import { forwardRef, useEffect, useMemo, useRef, type ComponentPropsWithoutRef } from "react";
import { useColorRingContext } from "./ColorRingContext";

export interface ColorRingThumbProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorRingThumb = forwardRef<HTMLSpanElement, ColorRingThumbProps>(
  function ColorRingThumb({ style, ...props }, ref) {
    const ctx = useColorRingContext();
    const elRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      if (elRef.current) ctx.thumbElement.current = elRef.current;
      return () => {
        if (ctx.thumbElement.current === elRef.current) ctx.thumbElement.current = undefined;
      };
    }, [ctx]);

    const angleDeg = useMemo(() => {
      const range = ctx.max - ctx.min;
      if (range === 0) return ctx.startAngle;
      const normalized = (ctx.currentValue - ctx.min) / range;
      return normalized * 360 + ctx.startAngle;
    }, [ctx.currentValue, ctx.min, ctx.max, ctx.startAngle]);

    return (
      <span
        ref={(el) => {
          (elRef as React.MutableRefObject<HTMLSpanElement | null>).current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        role="slider"
        tabIndex={0}
        aria-valuenow={ctx.currentValue}
        aria-valuemin={ctx.min}
        aria-valuemax={ctx.max}
        aria-disabled={ctx.disabled}
        data-disabled={ctx.disabled ? "" : undefined}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `rotate(${angleDeg}deg) translateY(-${(1 + ctx.innerRadius) / 2 * 50}cqmin) translate(-50%, -50%)`,
          transformOrigin: "0 0",
          ...style,
        }}
        {...props}
      />
    );
  },
);
