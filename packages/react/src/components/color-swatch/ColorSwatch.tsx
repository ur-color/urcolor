import { forwardRef, useContext, useMemo, type ComponentPropsWithoutRef } from "react";
import { Color } from "internationalized-color";
import { Toggle } from "@base-ui-components/react/toggle";
import { ColorSwatchGroupContext } from "../color-swatch-group/root/ColorSwatchGroupRootContext";

export interface ColorSwatchProps extends Omit<ComponentPropsWithoutRef<"div">, "value"> {
  /** The color value to display. When inside a ColorSwatchGroup, also serves as the toggle selection key. */
  value?: string | Color | null;
  /** The checkerboard size in pixels. */
  checkerSize?: number;
  /** When true, reflects the color's alpha channel. When false, displays the color as fully opaque. */
  alpha?: boolean;
  /** When true, prevents interaction with this swatch (only relevant inside a group). */
  disabled?: boolean;
  /** Render as a different element. */
  as?: React.ElementType;
}

function useSwatchStyle(value: string | Color | null | undefined, checkerSize: number, showAlpha: boolean) {
  return useMemo(() => {
    const color = (() => {
      if (!value) return null;
      if (value instanceof Color) return value;
      return Color.parse(value as string) ?? null;
    })();

    if (!color) {
      const checkerboard = `repeating-conic-gradient(rgb(230, 230, 230) 0%, rgb(230, 230, 230) 25%, white 0%, white 50%) 0% 50% / ${checkerSize}px ${checkerSize}px`;
      return {
        "--swatch-color": "transparent",
        "--swatch-checkerboard": checkerboard,
        background: `linear-gradient(transparent, transparent), ${checkerboard}`,
      } as React.CSSProperties;
    }

    const opaque = color.set({ alpha: 1 });
    const srgbOpaque = opaque?.to("rgb");
    const opaqueStr = srgbOpaque?.toString("css") ?? "transparent";

    let colorStr: string;
    if (!showAlpha) {
      colorStr = opaqueStr;
    } else {
      const srgb = color.to("rgb");
      colorStr = srgb?.toString("css") ?? "transparent";
    }

    const checkerboard = `repeating-conic-gradient(rgb(230, 230, 230) 0%, rgb(230, 230, 230) 25%, white 0%, white 50%) 0% 50% / ${checkerSize}px ${checkerSize}px`;

    return {
      "--swatch-color-opaque": opaqueStr,
      "--swatch-alpha": color.alpha ?? 1,
      "--swatch-checkerboard": checkerboard,
      "--swatch-color": colorStr,
      background: `linear-gradient(${colorStr}, ${colorStr}), ${checkerboard}`,
    } as React.CSSProperties;
  }, [value, checkerSize, showAlpha]);
}

export const ColorSwatch = forwardRef<HTMLDivElement, ColorSwatchProps>(
  function ColorSwatch({ value, checkerSize = 16, alpha: showAlpha = false, disabled: disabledProp = false, as: Component = "div", style, ...props }, ref) {
    const groupCtx = useContext(ColorSwatchGroupContext);
    const swatchStyle = useSwatchStyle(value, checkerSize, showAlpha);

    // Inside a group: render as a Toggle button
    if (groupCtx) {
      const isDisabled = disabledProp || groupCtx.disabled;

      return (
        <Toggle
          ref={ref as React.Ref<HTMLButtonElement>}
          value={value as string}
          disabled={isDisabled}
          render={(renderProps, state) => {
            const { style: renderStyle, ...restRenderProps } = renderProps as any;
            return (
              <button
                role="img"
                style={{ ...swatchStyle, ...renderStyle, ...style }}
                data-state={state.pressed ? "on" : "off"}
                data-disabled={isDisabled ? "" : undefined}
                {...props}
                {...restRenderProps}
              />
            );
          }}
        />
      );
    }

    // Standalone: render as a simple swatch
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
