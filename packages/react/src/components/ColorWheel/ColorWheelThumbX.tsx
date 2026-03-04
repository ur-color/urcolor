import { forwardRef, useCallback, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { useColorWheelContext } from "./ColorWheelContext";

export interface ColorWheelThumbXProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorWheelThumbX = forwardRef<HTMLSpanElement, ColorWheelThumbXProps>(
  function ColorWheelThumbX(props, ref) {
    const ctx = useColorWheelContext();
    const elRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      if (elRef.current) ctx.thumbXElement.current = elRef.current;
      return () => { if (ctx.thumbXElement.current === elRef.current) ctx.thumbXElement.current = undefined; };
    }, [ctx]);

    const handleFocus = useCallback(() => ctx.setActiveDirection("x"), [ctx]);

    return (
      <span
        ref={(el) => { (elRef as React.MutableRefObject<HTMLSpanElement | null>).current = el; if (typeof ref === "function") ref(el); else if (ref) ref.current = el; }}
        role="slider" tabIndex={ctx.disabled ? undefined : (ctx.activeDirection === "x" ? 0 : -1)}
        aria-orientation="horizontal" aria-valuenow={ctx.currentAngleValue}
        aria-valuemin={ctx.angleMin} aria-valuemax={ctx.angleMax}
        data-disabled={ctx.disabled ? "" : undefined}
        onFocus={handleFocus}
        style={{ position: "absolute", display: "block", width: "100%", height: "100%" }}
        {...props}
      />
    );
  },
);
