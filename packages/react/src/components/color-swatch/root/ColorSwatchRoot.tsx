import { forwardRef, useMemo, type ComponentPropsWithoutRef } from "react";
import { Color } from "@urcolor/core";

export interface ColorSwatchRootProps extends ComponentPropsWithoutRef<"div"> {
  /** The color value to display. */
  value?: Color | string | null;
  /** The checkerboard size in pixels. */
  checkerSize?: number;
  /** When true, reflects the color's alpha channel. When false, displays the color as fully opaque. */
  alpha?: boolean;
  /** Render as a different element. */
  as?: React.ElementType;
}

export const ColorSwatchRoot = forwardRef<HTMLDivElement, ColorSwatchRootProps>(
  function ColorSwatchRoot({ value, checkerSize = 16, alpha: showAlpha = false, as: Component = "div", style, ...props }, ref) {
    const color = useMemo(() => {
      if (!value) return null;
      if (value instanceof Color) return value;
      return Color.parse(value as string) ?? null;
    }, [value]);

    const swatchStyle = useMemo(() => {
      if (!color) {
        const checkerboard = `repeating-conic-gradient(rgb(230, 230, 230) 0%, rgb(230, 230, 230) 25%, white 0%, white 50%) 0% 50% / ${checkerSize}px ${checkerSize}px`;
        return {
          "--swatch-color": "transparent",
          "--swatch-checkerboard": checkerboard,
          background: `linear-gradient(transparent, transparent), ${checkerboard}`,
        } as React.CSSProperties;
      }

      const opaque = color.withAlpha(1);
      const srgbOpaque = opaque.to("srgb");
      const opaqueStr = srgbOpaque.toString();

      let colorStr: string;
      if (!showAlpha) {
        colorStr = opaqueStr;
      } else {
        const srgb = color.to("srgb");
        colorStr = srgb.toString();
      }

      const checkerboard = `repeating-conic-gradient(rgb(230, 230, 230) 0%, rgb(230, 230, 230) 25%, white 0%, white 50%) 0% 50% / ${checkerSize}px ${checkerSize}px`;

      return {
        "--swatch-color-opaque": opaqueStr,
        "--swatch-alpha": color.alpha,
        "--swatch-checkerboard": checkerboard,
        "--swatch-color": colorStr,
        background: `linear-gradient(${colorStr}, ${colorStr}), ${checkerboard}`,
      } as React.CSSProperties;
    }, [color, checkerSize, showAlpha]);

    return (
      <Component
        ref={ref}
        role="img"
        style={{ ...swatchStyle, ...style }}
        {...props}
      />
    );
  },
);
