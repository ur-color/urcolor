import { forwardRef, useCallback, useEffect, useMemo, useRef, type ComponentPropsWithoutRef } from "react";
import {
  createDragController,
  DATA_DISABLED,
  DATA_ORIENTATION,
  valueFromKey,
  valueFromPosition,
} from "@urcolor/shared";
import { useSliderContext } from "./SliderContext";

export interface SliderControlProps extends ComponentPropsWithoutRef<"div"> {}

/**
 * The measured, interactive area of the slider.
 *
 * Every listener the family needs lives here: pointer capture converts a
 * position to a value against this element's box, and `keydown` from the
 * focused thumb bubbles up to it, so one host covers both input paths.
 */
export const SliderControl = forwardRef<HTMLDivElement, SliderControlProps>(
  function SliderControl({ children, ...rest }, forwardedRef) {
    const ctx = useSliderContext();
    const nodeRef = useRef<HTMLDivElement | null>(null);

    // Live view of the context for listeners attached once on mount.
    const ctxRef = useRef(ctx);
    ctxRef.current = ctx;

    const setRefs = useCallback((node: HTMLDivElement | null) => {
      nodeRef.current = node;
      ctxRef.current.controlRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }, [forwardedRef]);

    const drag = useMemo(() => createDragController({
      getElement: () => nodeRef.current,
      isDisabled: () => ctxRef.current.state.disabled,
      onStart: () => ctxRef.current.setDragging(true),
      onMove: (point) => {
        const current = ctxRef.current;
        const position = current.state.orientation === "vertical" ? point.normalizedY : point.normalizedX;
        current.setValue(valueFromPosition(current.state, position));
      },
      onEnd: () => {
        ctxRef.current.setDragging(false);
        ctxRef.current.commit();
      },
    }), []);

    useEffect(() => {
      const node = nodeRef.current;
      if (!node) return;
      let keyboardActive = false;

      const onPointerDown = (event: PointerEvent) => {
        drag.pointerDown(event);
        // `pointerDown` calls `preventDefault`, which suppresses the focus the
        // browser would have moved to the thumb; do it explicitly instead.
        if (drag.isDragging) node.querySelector<HTMLElement>("[role='slider']")?.focus();
      };
      const onPointerMove = (event: PointerEvent) => drag.pointerMove(event);
      const onPointerUp = (event: PointerEvent) => drag.pointerUp(event);
      const onPointerCancel = () => {
        drag.pointerCancel();
        ctxRef.current.setDragging(false);
      };
      const onKeyDown = (event: KeyboardEvent) => {
        const next = valueFromKey(ctxRef.current.state, event);
        if (next === undefined) return;
        event.preventDefault();
        keyboardActive = true;
        ctxRef.current.setValue(next);
      };
      const onKeyUp = () => {
        if (!keyboardActive) return;
        keyboardActive = false;
        ctxRef.current.commit();
      };

      node.addEventListener("pointerdown", onPointerDown);
      node.addEventListener("pointermove", onPointerMove);
      node.addEventListener("pointerup", onPointerUp);
      node.addEventListener("pointercancel", onPointerCancel);
      node.addEventListener("keydown", onKeyDown);
      node.addEventListener("keyup", onKeyUp);

      return () => {
        node.removeEventListener("pointerdown", onPointerDown);
        node.removeEventListener("pointermove", onPointerMove);
        node.removeEventListener("pointerup", onPointerUp);
        node.removeEventListener("pointercancel", onPointerCancel);
        node.removeEventListener("keydown", onKeyDown);
        node.removeEventListener("keyup", onKeyUp);
        drag.cancel();
      };
    }, [drag]);

    return (
      <div
        ref={setRefs}
        {...{ [DATA_ORIENTATION]: ctx.state.orientation }}
        {...(ctx.state.disabled ? { [DATA_DISABLED]: "" } : {})}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
