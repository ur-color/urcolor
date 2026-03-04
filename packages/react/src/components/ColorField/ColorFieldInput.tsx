import { forwardRef, useCallback, type ComponentPropsWithoutRef } from "react";
import { useColorFieldContext } from "./ColorFieldContext";

export interface ColorFieldInputProps extends ComponentPropsWithoutRef<"input"> {}

export const ColorFieldInput = forwardRef<HTMLInputElement, ColorFieldInputProps>(
  function ColorFieldInput(props, ref) {
    const ctx = useColorFieldContext();

    const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      ctx.onInputChange(e.target.value);
    }, [ctx]);

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      requestAnimationFrame(() => e.target.select());
    }, []);

    const handleBlur = useCallback(() => {
      ctx.commitValue(ctx.modelValue);
    }, [ctx]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (ctx.disabled || ctx.readOnly) return;
      if (e.key === "Enter") { ctx.commitValue(ctx.modelValue); return; }
      switch (e.key) {
        case "ArrowUp": e.preventDefault(); ctx.handleIncrease(); break;
        case "ArrowDown": e.preventDefault(); ctx.handleDecrease(); break;
        case "PageUp": e.preventDefault(); ctx.handleIncrease(10); break;
        case "PageDown": e.preventDefault(); ctx.handleDecrease(10); break;
        case "Home": e.preventDefault(); ctx.handleMinMaxValue("min"); break;
        case "End": e.preventDefault(); ctx.handleMinMaxValue("max"); break;
      }
    }, [ctx]);

    return (
      <input
        ref={(el) => {
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
          (ctx.inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
        }}
        type="text"
        role="spinbutton"
        aria-valuenow={ctx.modelValue}
        value={ctx.displayValue}
        disabled={ctx.disabled || undefined}
        readOnly={ctx.readOnly || undefined}
        data-disabled={ctx.disabled ? "" : undefined}
        data-readonly={ctx.readOnly ? "" : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        onChange={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  },
);
