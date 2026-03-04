import { forwardRef, useEffect, type ComponentPropsWithoutRef } from "react";
import { useColorTriangleContext } from "./ColorTriangleContext";

export interface ColorTriangleThumbXProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorTriangleThumbX = forwardRef<HTMLSpanElement, ColorTriangleThumbXProps>(
  function ColorTriangleThumbX({ style, children, ...props }, ref) {
    const ctx = useColorTriangleContext();

    useEffect(() => {
      return () => { ctx.thumbXElement.current = undefined; };
    }, []);

    return (
      <span
        ref={(el) => {
          if (el) ctx.thumbXElement.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        role="slider"
        tabIndex={ctx.disabled ? undefined : (ctx.isThreeChannel ? 0 : (ctx.activeDirection === "x" ? 0 : -1))}
        data-disabled={ctx.disabled ? "" : undefined}
        aria-orientation="horizontal"
        aria-label={ctx.xChannelKey}
        aria-valuenow={ctx.currentXValue}
        aria-valuemin={ctx.xMin}
        aria-valuemax={ctx.xMax}
        onFocus={() => ctx.setActiveDirection("x")}
        style={{ position: "absolute", display: "block", width: "100%", height: "100%", ...style }}
        {...props}
      >
        {children}
      </span>
    );
  },
);
