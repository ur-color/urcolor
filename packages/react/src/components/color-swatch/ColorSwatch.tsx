import { forwardRef, useContext, useMemo, type ComponentPropsWithoutRef } from "react";
import type { Color } from "@urcolor/core";
import { swatchPaint, swatchStyle } from "@urcolor/shared";
import { Toggle } from "@base-ui-components/react/toggle";
import { ColorSwatchGroupContext } from "../color-swatch-group/root/ColorSwatchGroupRootContext";

export interface ColorSwatchProps extends Omit<ComponentPropsWithoutRef<"div">, "value"> {
  /** The color value to display. When inside a ColorSwatchGroup, also serves as the toggle selection key. */
  value?: string | Color | null;
  /**
   * The checkerboard size in pixels. Left unset, the grid reads
   * `--urcolor-checkerboard-size` and falls back to `16px`.
   */
  checkerSize?: number;
  /** When true, reflects the color's alpha channel. When false, displays the color as fully opaque. */
  alpha?: boolean;
  /** When true, prevents interaction with this swatch (only relevant inside a group). */
  disabled?: boolean;
  /** Render as a different element. */
  as?: React.ElementType;
}

function useSwatchStyle(value: string | Color | null | undefined, checkerSize: number | undefined, showAlpha: boolean) {
  return useMemo(
    () => swatchStyle({ ...swatchPaint(value, showAlpha), checkerSize }) as React.CSSProperties,
    [value, checkerSize, showAlpha],
  );
}

export const ColorSwatch = forwardRef<HTMLDivElement, ColorSwatchProps>(
  function ColorSwatch({ value, checkerSize, alpha: showAlpha = false, disabled: disabledProp = false, as: Component = "div", style, ...props }, ref) {
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
