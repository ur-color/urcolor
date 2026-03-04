import { forwardRef, useCallback, useMemo, type ComponentPropsWithoutRef } from "react";
import { ColorSwatchRoot, type ColorSwatchRootProps } from "../ColorSwatch/ColorSwatchRoot";
import { useColorSwatchGroupContext } from "./ColorSwatchGroupContext";

export interface ColorSwatchGroupItemProps extends Omit<ComponentPropsWithoutRef<"div">, "value"> {
  /** The color value. Serves as both the selection value and the displayed color. */
  value: string;
  /** When true, prevents interaction with this item. */
  disabled?: boolean;
  /** Checkerboard size passed to the inner swatch. */
  checkerSize?: number;
  /** Whether to show alpha channel. */
  alpha?: boolean;
}

export const ColorSwatchGroupItem = forwardRef<HTMLButtonElement, ColorSwatchGroupItemProps>(
  function ColorSwatchGroupItem({ value, disabled: disabledProp = false, checkerSize, alpha, ...props }, ref) {
    const ctx = useColorSwatchGroupContext();
    const isDisabled = disabledProp || ctx.disabled;
    const isPressed = ctx.modelValue.includes(value);
    const dataState = isPressed ? "on" : "off";
    const role = ctx.type === "single" ? "radio" : "checkbox";

    const handleClick = useCallback(() => {
      if (isDisabled) return;
      ctx.changeModelValue(value);
    }, [isDisabled, ctx, value]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    }, [handleClick]);

    return (
      <ColorSwatchRoot
        ref={ref as any}
        as="button"
        value={value}
        checkerSize={checkerSize}
        alpha={alpha}
        role={role}
        aria-checked={isPressed}
        aria-pressed={isPressed}
        aria-disabled={isDisabled || undefined}
        data-state={dataState}
        data-disabled={isDisabled ? "" : undefined}
        onClick={handleClick as any}
        onKeyDown={handleKeyDown as any}
        {...props}
      />
    );
  },
);
