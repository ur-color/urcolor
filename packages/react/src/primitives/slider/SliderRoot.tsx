import { forwardRef, useCallback, useMemo, useRef, useState, type ComponentPropsWithoutRef } from "react";
import {
  DATA_DISABLED,
  DATA_DRAGGING,
  DATA_ORIENTATION,
  FEEDBACK_EPSILON,
  positionFromValue,
  type SliderState,
} from "@urcolor/shared";
import { SliderContext, type SliderContextValue } from "./SliderContext";

export interface SliderRootProps
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange" | "defaultValue"> {
  /** The value in display units. Always controlled: the color components own the state. */
  value: number;
  /** Called on every change, including mid-drag. */
  onValueChange?: (value: number) => void;
  /** Called once at the end of an interaction. */
  onValueCommitted?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  /** The reading direction, which mirrors horizontal tracks. */
  dir?: "ltr" | "rtl";
  /** Whether the track runs opposite to its natural direction. */
  inverted?: boolean;
}

/**
 * The slider family's root: it holds the derived state its parts read and is
 * the context provider they find.
 *
 * Interaction does not live here. `Slider.Control` owns the pointer and
 * keyboard listeners, because it is the element position-to-value is measured
 * against, and `keydown` from the focused thumb bubbles to it.
 */
export const SliderRoot = forwardRef<HTMLDivElement, SliderRootProps>(
  function SliderRoot(props, ref) {
    const {
      value,
      onValueChange,
      onValueCommitted,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      orientation = "horizontal",
      dir,
      inverted = false,
      children,
      ...rest
    } = props;

    const [dragging, setDragging] = useState(false);
    const controlRef = useRef<HTMLElement | null>(null);

    const state = useMemo<SliderState>(
      () => ({ value, min, max, step, orientation, dir: dir ?? "ltr", inverted, disabled }),
      [value, min, max, step, orientation, dir, inverted, disabled],
    );

    // Handlers read live state through refs so the control's DOM listeners,
    // attached once, never see a stale closure.
    const stateRef = useRef(state);
    stateRef.current = state;
    const changeRef = useRef(onValueChange);
    changeRef.current = onValueChange;
    const commitRef = useRef(onValueCommitted);
    commitRef.current = onValueCommitted;

    const setValue = useCallback((next: number) => {
      const current = stateRef.current;
      if (Math.abs(next - current.value) < FEEDBACK_EPSILON) return;
      changeRef.current?.(next);
    }, []);

    const commit = useCallback(() => {
      commitRef.current?.(stateRef.current.value);
    }, []);

    const ctx = useMemo<SliderContextValue>(() => ({
      state,
      position: positionFromValue(state),
      dragging,
      setValue,
      commit,
      setDragging,
      controlRef,
    }), [state, dragging, setValue, commit]);

    return (
      <SliderContext.Provider value={ctx}>
        <div
          ref={ref}
          dir={dir}
          {...{ [DATA_ORIENTATION]: orientation }}
          {...(disabled ? { [DATA_DISABLED]: "" } : {})}
          {...(dragging ? { [DATA_DRAGGING]: "" } : {})}
          {...rest}
        >
          {children}
        </div>
      </SliderContext.Provider>
    );
  },
);
