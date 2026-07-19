import { forwardRef, useCallback, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { convertValueToPercentage } from "../../../utils";
import { useColorAreaContext } from "../root/ColorAreaRootContext";

export interface ColorAreaThumbProps extends ComponentPropsWithoutRef<"span"> {
  /** The thumb index (for multi-thumb scenarios). Defaults to 0. */
  index?: number;
}

export const ColorAreaThumb = forwardRef<HTMLSpanElement, ColorAreaThumbProps>(
  function ColorAreaThumb({ index = 0, style, children, ...props }, ref) {
    const ctx = useColorAreaContext();
    const elRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      const el = elRef.current;
      if (el) ctx.thumbRef.current = el;
      return () => {
        if (ctx.thumbRef.current === el) ctx.thumbRef.current = null;
      };
    }, [ctx]);

    const value = ctx.currentModelValue[index];
    const percentX = value !== undefined ? convertValueToPercentage(value[0] ?? 0, ctx.minX, ctx.maxX) : 0;
    const percentY = value !== undefined ? convertValueToPercentage(value[1] ?? 0, ctx.minY, ctx.maxY) : 0;

    const handleFocus = useCallback(() => {
      ctx.setValueIndexToChange(index);
    }, [ctx, index]);

    return (
      <span
        ref={(el) => {
          (elRef as React.MutableRefObject<HTMLSpanElement | null>).current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        role="slider"
        tabIndex={ctx.disabled ? undefined : 0}
        aria-roledescription="2D slider"
        aria-valuenow={value ? value[0] : undefined}
        aria-valuemin={ctx.minX}
        aria-valuemax={ctx.maxX}
        data-disabled={ctx.disabled ? "" : undefined}
        onFocus={handleFocus}
        style={{
          transform: "var(--reka-slider-area-thumb-transform)",
          position: "absolute",
          [ctx.isSlidingFromLeft ? "left" : "right"]: `${percentX}%`,
          [ctx.isSlidingFromTop ? "top" : "bottom"]: `${percentY}%`,
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    );
  },
);
