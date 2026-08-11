import { forwardRef, useMemo, type ComponentPropsWithoutRef } from "react";
import type { Color } from "@urcolor/core";
import { swatchPaint, swatchStyle } from "@urcolor/shared";

export interface ColorSwatchRootProps extends ComponentPropsWithoutRef<"div"> {
  /** The color value to display. */
  value?: Color | string | null;
  /**
   * The checkerboard size in pixels. Left unset, the grid reads
   * `--urcolor-checkerboard-size` and falls back to `16px`.
   */
  checkerSize?: number;
  /** When true, reflects the color's alpha channel. When false, displays the color as fully opaque. */
  alpha?: boolean;
  /** Render as a different element. */
  as?: React.ElementType;
}

export const ColorSwatchRoot = forwardRef<HTMLDivElement, ColorSwatchRootProps>(
  function ColorSwatchRoot({ value, checkerSize, alpha: showAlpha = false, as: Component = "div", style, ...props }, ref) {
    const paintStyle = useMemo(
      () => swatchStyle({ ...swatchPaint(value, showAlpha), checkerSize }) as React.CSSProperties,
      [value, checkerSize, showAlpha],
    );

    return (
      <Component
        ref={ref}
        role="img"
        style={{ ...paintStyle, ...style }}
        {...props}
      />
    );
  },
);
