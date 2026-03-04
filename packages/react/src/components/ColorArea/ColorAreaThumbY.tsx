import { forwardRef, useCallback, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { useColorAreaContext, useColorAreaThumbContext } from "./ColorAreaContext";

export interface ColorAreaThumbYProps extends ComponentPropsWithoutRef<"span"> {}

export const ColorAreaThumbY = forwardRef<HTMLSpanElement, ColorAreaThumbYProps>(
  function ColorAreaThumbY(props, ref) {
    const ctx = useColorAreaContext();
    const thumbCtx = useColorAreaThumbContext();
    const elRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      const el = elRef.current;
      if (el) ctx.thumbYElements.current.push(el);
      return () => {
        const i = ctx.thumbYElements.current.indexOf(el!);
        if (i >= 0) ctx.thumbYElements.current.splice(i, 1);
      };
    }, [ctx]);

    const value = ctx.currentModelValue[thumbCtx.index];

    const handleFocus = useCallback(() => {
      ctx.setValueIndexToChange(thumbCtx.index);
      ctx.setActiveDirection("y");
    }, [ctx, thumbCtx.index]);

    return (
      <span
        ref={(el) => {
          (elRef as React.MutableRefObject<HTMLSpanElement | null>).current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        role="slider"
        tabIndex={ctx.disabled ? undefined : (ctx.activeDirection === "y" ? 0 : -1)}
        data-disabled={ctx.disabled ? "" : undefined}
        aria-orientation="vertical"
        aria-valuenow={value ? value[1] : undefined}
        aria-valuemin={ctx.minY}
        aria-valuemax={ctx.maxY}
        onFocus={handleFocus}
        style={{ position: "absolute", display: "block", width: "100%", height: "100%" }}
        {...props}
      />
    );
  },
);
