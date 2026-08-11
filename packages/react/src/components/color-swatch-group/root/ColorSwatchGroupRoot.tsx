import { forwardRef, useMemo, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ToggleGroup, useToggleGroupContext } from "../../../primitives/toggle";
import { ColorSwatchGroupContext, type ColorSwatchGroupContextValue, type SelectionType } from "./ColorSwatchGroupRootContext";

export interface ColorSwatchGroupRootProps extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "dir"> {
  /** The reading direction, which mirrors horizontal arrow navigation. */
  dir?: "ltr" | "rtl";
  /** Whether to allow single or multiple selection. */
  type?: SelectionType;
  /** The controlled selected value(s). */
  value?: string[];
  /** The default selected value(s) when uncontrolled. */
  defaultValue?: string[];
  /** When true, prevents the user from interacting with the group. */
  disabled?: boolean;
  /** The orientation of the group for arrow key navigation. */
  orientation?: "horizontal" | "vertical";
  /** Whether to loop keyboard focus back to the first item when the end of the list is reached. */
  loopFocus?: boolean;
  /** Callback fired when the selection changes. */
  onValueChange?: (value: string[]) => void;
}

export const ColorSwatchGroupRoot = forwardRef<HTMLDivElement, ColorSwatchGroupRootProps>(
  function ColorSwatchGroupRoot(props, ref) {
    const {
      type = "single",
      value,
      defaultValue = [],
      disabled = false,
      orientation = "horizontal",
      loopFocus = true,
      onValueChange,
      children,
      ...rest
    } = props;

    return (
      <ToggleGroup
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        orientation={orientation}
        loopFocus={loopFocus}
        multiple={type === "multiple"}
        {...rest}
      >
        <ColorSwatchGroupProvider type={type} disabled={disabled}>
          {children}
        </ColorSwatchGroupProvider>
      </ToggleGroup>
    );
  },
);

/**
 * Bridges the toggle group's selection into the swatch-group context.
 *
 * It sits inside `ToggleGroup` rather than around it so the selection lives in
 * exactly one place: a swatch needs `isSelected` to emit its documented
 * `data-state`, and duplicating the state to supply it would let the two
 * disagree.
 */
function ColorSwatchGroupProvider(
  { type, disabled, children }: { type: SelectionType; disabled: boolean; children?: ReactNode },
) {
  const toggleCtx = useToggleGroupContext();
  const ctxValue = useMemo<ColorSwatchGroupContextValue>(() => ({
    type,
    disabled,
    isSelected: (value: string) => toggleCtx?.isSelected(value) ?? false,
  }), [type, disabled, toggleCtx]);

  return (
    <ColorSwatchGroupContext.Provider value={ctxValue}>
      {children}
    </ColorSwatchGroupContext.Provider>
  );
}
