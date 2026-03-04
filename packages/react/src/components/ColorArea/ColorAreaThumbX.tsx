import { forwardRef, useCallback, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { useColorAreaContext, useColorAreaThumbContext } from "./ColorAreaContext";

export interface ColorAreaThumbXProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorAreaThumbX = forwardRef<HTMLSpanElement, ColorAreaThumbXProps>(
  function ColorAreaThumbX(props, ref) {
    const ctx = useColorAreaContext();
    const thumbCtx = useColorAreaThumbContext();
    const elRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      const el = elRef.current;
      if (el) ctx.thumbXElements.current.push(el);
      return () => {
        const i = ctx.thumbXElements.current.indexOf(el!);
        if (i >= 0) ctx.thumbXElements.current.splice(i, 1);
      };
    }, [ctx]);

    const value = ctx.currentModelValue[thumbCtx.index];

    const handleFocus = useCallback(() => {
      ctx.setValueIndexToChange(thumbCtx.index);
      ctx.setActiveDirection("x");
    }, [ctx, thumbCtx.index]);

    return (
      <span
        ref={(el) => {
          (elRef as React.MutableRefObject<HTMLSpanElement | null>).current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        role="slider"
        tabIndex={ctx.disabled ? undefined : (ctx.activeDirection === "x" ? 0 : -1)}
        data-disabled={ctx.disabled ? "" : undefined}
        aria-orientation="horizontal"
        aria-valuenow={value ? value[0] : undefined}
        aria-valuemin={ctx.minX}
        aria-valuemax={ctx.maxX}
        onFocus={handleFocus}
        style={{ position: "absolute", display: "block", width: "100%", height: "100%" }}
        {...props}
      />
    );
  },
);
