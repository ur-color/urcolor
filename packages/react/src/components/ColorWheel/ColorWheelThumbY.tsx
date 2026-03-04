import { forwardRef, useCallback, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { useColorWheelContext } from "./ColorWheelContext";

export interface ColorWheelThumbYProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorWheelThumbY = forwardRef<HTMLSpanElement, ColorWheelThumbYProps>(
  function ColorWheelThumbY(props, ref) {
    const ctx = useColorWheelContext();
    const elRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      if (elRef.current) ctx.thumbYElement.current = elRef.current;
      return () => { if (ctx.thumbYElement.current === elRef.current) ctx.thumbYElement.current = undefined; };
    }, [ctx]);

    const handleFocus = useCallback(() => ctx.setActiveDirection("y"), [ctx]);

    return (
      <span
        ref={(el) => { (elRef as React.MutableRefObject<HTMLSpanElement | null>).current = el; if (typeof ref === "function") ref(el); else if (ref) ref.current = el; }}
        role="slider" tabIndex={ctx.disabled ? undefined : (ctx.activeDirection === "y" ? 0 : -1)}
        aria-orientation="vertical" aria-valuenow={ctx.currentRadiusValue}
        aria-valuemin={ctx.radiusMin} aria-valuemax={ctx.radiusMax}
        data-disabled={ctx.disabled ? "" : undefined}
        onFocus={handleFocus}
        style={{ position: "absolute", display: "block", width: "100%", height: "100%" }}
        {...props}
      />
    );
  },
);
