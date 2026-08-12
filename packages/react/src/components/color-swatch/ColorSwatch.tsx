import { forwardRef, useContext, useMemo, type ComponentPropsWithoutRef, type CSSProperties, type ElementType, type Ref } from "react";
import type { Color } from "@urcolor/core";
import { swatchPaint, swatchStyle } from "@urcolor/shared";
import { Toggle } from "../../primitives/toggle/Toggle";
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
  as?: ElementType;
}

function useSwatchStyle(value: string | Color | null | undefined, checkerSize: number | undefined, showAlpha: boolean) {
  return useMemo(
    () => swatchStyle({ ...swatchPaint(value, showAlpha), checkerSize }) as CSSProperties,
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
      const isSelected = groupCtx.isSelected(value as string);

      return (
        <Toggle
          ref={ref as Ref<HTMLButtonElement>}
          value={value as string}
          disabled={isDisabled}
          role="img"
          // `data-state` is documented in docs/components/react/color-swatch.md
          // and survives the move off base-ui. `data-pressed` and
          // `data-disabled` come from `toggleAria` inside Toggle.
          data-state={isSelected ? "on" : "off"}
          style={{ ...swatchStyle, ...style }}
          // `ColorSwatchProps` is declared against the standalone `<div>`, so
          // its event handlers are typed for one. Inside a group the element is
          // a `<button>`; the handlers are structurally identical and only
          // their `currentTarget` differs, which no caller reads through here.
          {...(props as Omit<ComponentPropsWithoutRef<"button">, "value">)}
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
