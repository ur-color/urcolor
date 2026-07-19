import { forwardRef, useMemo, type ComponentPropsWithoutRef } from "react";
import { ToggleGroup } from "@base-ui-components/react/toggle-group";
import { ColorSwatchGroupContext, type ColorSwatchGroupContextValue, type SelectionType } from "./ColorSwatchGroupRootContext";

export interface ColorSwatchGroupRootProps extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue"> {
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

    const ctxValue = useMemo<ColorSwatchGroupContextValue>(() => ({
      type,
      disabled,
    }), [type, disabled]);

    return (
      <ColorSwatchGroupContext.Provider value={ctxValue}>
        <ToggleGroup
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange ? (val) => onValueChange(val as string[]) : undefined}
          disabled={disabled}
          orientation={orientation}
          loopFocus={loopFocus}
          multiple={type === "multiple"}
          {...rest}
        >
          {children}
        </ToggleGroup>
      </ColorSwatchGroupContext.Provider>
    );
  },
);
