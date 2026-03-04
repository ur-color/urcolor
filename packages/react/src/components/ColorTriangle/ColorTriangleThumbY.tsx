import { forwardRef, useEffect, type ComponentPropsWithoutRef } from "react";
import { useColorTriangleContext } from "./ColorTriangleContext";

export interface ColorTriangleThumbYProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorTriangleThumbY = forwardRef<HTMLSpanElement, ColorTriangleThumbYProps>(
  function ColorTriangleThumbY({ style, children, ...props }, ref) {
    const ctx = useColorTriangleContext();

    useEffect(() => {
      return () => { ctx.thumbYElement.current = undefined; };
    }, []);

    return (
      <span
        ref={(el) => {
          if (el) ctx.thumbYElement.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        role="slider"
        tabIndex={ctx.disabled ? undefined : (ctx.isThreeChannel ? 0 : (ctx.activeDirection === "y" ? 0 : -1))}
        data-disabled={ctx.disabled ? "" : undefined}
        aria-orientation="vertical"
        aria-label={ctx.yChannelKey}
        aria-valuenow={ctx.currentYValue}
        aria-valuemin={ctx.yMin}
        aria-valuemax={ctx.yMax}
        onFocus={() => ctx.setActiveDirection("y")}
        style={{ position: "absolute", display: "block", width: "100%", height: "100%", ...style }}
        {...props}
      >
        {children}
      </span>
    );
  },
);
