import { forwardRef, useCallback, useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { useColorFieldContext } from "./ColorFieldContext";

export interface ColorFieldIncrementProps extends ComponentPropsWithoutRef<"button"> {}

export const ColorFieldIncrement = forwardRef<HTMLButtonElement, ColorFieldIncrementProps>(
  function ColorFieldIncrement(props, ref) {
    const ctx = useColorFieldContext();
    const isDisabled = ctx.disabled || ctx.readOnly || ctx.isIncreaseDisabled;
    const [isPressed, setIsPressed] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

    const startPress = useCallback((delay: number) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (isDisabled) return;
      ctx.handleIncrease();
      timeoutRef.current = setTimeout(() => startPress(60), delay);
    }, [isDisabled, ctx]);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
      if (e.button !== 0 || isDisabled) return;
      e.preventDefault();
      setIsPressed(true);
      startPress(400);
      const onUp = () => {
        setIsPressed(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    }, [isDisabled, startPress]);

    return (
      <button
        ref={ref}
        type="button"
        tabIndex={-1}
        aria-label="Increase"
        disabled={isDisabled || undefined}
        data-pressed={isPressed ? "" : undefined}
        data-disabled={isDisabled ? "" : undefined}
        onPointerDown={handlePointerDown}
        onContextMenu={(e) => e.preventDefault()}
        {...props}
      />
    );
  },
);
