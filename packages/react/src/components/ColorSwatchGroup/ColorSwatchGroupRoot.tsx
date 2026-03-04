import { forwardRef, useCallback, useMemo, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { ColorSwatchGroupContext, type ColorSwatchGroupContextValue, type SelectionType } from "./ColorSwatchGroupContext";

export interface ColorSwatchGroupRootProps extends ComponentPropsWithoutRef<"div"> {
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
  /** Callback fired when the selection changes. */
  onValueChange?: (value: string[]) => void;
}

export const ColorSwatchGroupRoot = forwardRef<HTMLDivElement, ColorSwatchGroupRootProps>(
  function ColorSwatchGroupRoot(props, ref) {
    const {
      type = "single",
      value: valueProp,
      defaultValue = [],
      disabled = false,
      orientation = "horizontal",
      onValueChange,
      children,
      ...rest
    } = props;

    const isControlled = valueProp !== undefined;
    const [internalValue, setInternalValue] = useState<string[]>(valueProp ?? defaultValue);

    const prevValueRef = useRef(valueProp);
    if (valueProp !== prevValueRef.current) {
      prevValueRef.current = valueProp;
      if (valueProp !== undefined) setInternalValue(valueProp);
    }

    const modelValue = isControlled ? (valueProp ?? internalValue) : internalValue;

    const changeModelValue = useCallback((value: string) => {
      let next: string[];
      if (type === "single") {
        next = modelValue.includes(value) ? [] : [value];
      } else {
        next = modelValue.includes(value)
          ? modelValue.filter(v => v !== value)
          : [...modelValue, value];
      }
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    }, [type, modelValue, isControlled, onValueChange]);

    const ctxValue = useMemo<ColorSwatchGroupContextValue>(() => ({
      modelValue,
      type,
      disabled,
      changeModelValue,
    }), [modelValue, type, disabled, changeModelValue]);

    return (
      <ColorSwatchGroupContext.Provider value={ctxValue}>
        <div
          ref={ref}
          role="group"
          data-orientation={orientation}
          {...rest}
        >
          {children}
        </div>
      </ColorSwatchGroupContext.Provider>
    );
  },
);
