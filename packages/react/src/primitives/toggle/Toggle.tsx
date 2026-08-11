import { forwardRef, useState, type ComponentPropsWithoutRef, type MouseEvent } from "react";
import { toggleAria } from "@urcolor/shared";
import { useToggleGroupContext } from "./ToggleGroupContext";

export interface ToggleProps extends Omit<ComponentPropsWithoutRef<"button">, "value" | "onChange"> {
  /** Selection key when inside a ToggleGroup. */
  value?: string;
  /** The controlled pressed state. */
  pressed?: boolean;
  /** The pressed state used until the first interaction when uncontrolled. */
  defaultPressed?: boolean;
  disabled?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

/**
 * A pressed-state button.
 *
 * Space and Enter need no handler: a native `<button>` already turns both
 * into a click, which is why `isToggleActivationKey` is not used here.
 */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  function Toggle(props, ref) {
    const {
      value,
      pressed: pressedProp,
      defaultPressed = false,
      disabled: disabledProp = false,
      onPressedChange,
      onClick,
      children,
      ...rest
    } = props;

    const group = useToggleGroupContext();
    const [internalPressed, setInternalPressed] = useState(defaultPressed);

    // A group owns the selection; outside one the toggle falls back to its own.
    const pressed = group && value !== undefined
      ? group.isSelected(value)
      : pressedProp ?? internalPressed;
    const disabled = disabledProp || (group?.disabled ?? false);

    const aria = toggleAria(pressed, disabled);
    // `tabindex` is the DOM attribute name; React spells the prop `tabIndex`.
    const { tabindex, ...ariaProps } = aria;

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
      onClick?.(event);
      if (disabled) return;
      if (group && value !== undefined) {
        group.toggle(value);
        return;
      }
      if (pressedProp === undefined) setInternalPressed(!pressed);
      onPressedChange?.(!pressed);
    }

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || undefined}
        {...ariaProps}
        tabIndex={tabindex}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
