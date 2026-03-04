import { forwardRef, useMemo, type ComponentPropsWithoutRef } from "react";
import { convertValueToPercentage, getThumbInBoundsOffset } from "../../utils";
import { useColorAreaContext, ColorAreaThumbContext } from "./ColorAreaContext";

export interface ColorAreaThumbProps extends ComponentPropsWithoutRef<"span"> {
  /** The thumb index (for multi-thumb scenarios). Defaults to 0. */
  index?: number;
}

export const ColorAreaThumb = forwardRef<HTMLSpanElement, ColorAreaThumbProps>(
  function ColorAreaThumb({ index = 0, style, children, ...props }, ref) {
    const ctx = useColorAreaContext();

    const value = ctx.currentModelValue[index];
    const percentX = value !== undefined ? convertValueToPercentage(value[0] ?? 0, ctx.minX, ctx.maxX) : 0;
    const percentY = value !== undefined ? convertValueToPercentage(value[1] ?? 0, ctx.minY, ctx.maxY) : 0;

    const thumbCtxValue = useMemo(() => ({ index }), [index]);

    return (
      <ColorAreaThumbContext.Provider value={thumbCtxValue}>
        <span
          ref={ref}
          aria-roledescription="2D slider"
          data-disabled={ctx.disabled ? "" : undefined}
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
      </ColorAreaThumbContext.Provider>
    );
  },
);
