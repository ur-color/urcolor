import { forwardRef, useEffect, type ComponentPropsWithoutRef } from "react";
import { useColorTriangleContext } from "./ColorTriangleContext";

export interface ColorTriangleThumbZProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorTriangleThumbZ = forwardRef<HTMLSpanElement, ColorTriangleThumbZProps>(
  function ColorTriangleThumbZ({ style, children, ...props }, ref) {
    const ctx = useColorTriangleContext();

    useEffect(() => {
      return () => { ctx.thumbZElement.current = undefined; };
    }, []);

    return (
      <span
        ref={(el) => {
          if (el) ctx.thumbZElement.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        role="slider"
        tabIndex={ctx.disabled ? undefined : (ctx.isThreeChannel ? 0 : (ctx.activeDirection === "z" ? 0 : -1))}
        data-disabled={ctx.disabled ? "" : undefined}
        aria-orientation="horizontal"
        aria-label={ctx.zChannelKey}
        aria-valuenow={ctx.currentZValue}
        aria-valuemin={ctx.zMin}
        aria-valuemax={ctx.zMax}
        onFocus={() => ctx.setActiveDirection("z")}
        style={{ position: "absolute", display: "block", width: "100%", height: "100%", ...style }}
        {...props}
      >
        {children}
      </span>
    );
  },
);
