import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from "react";
import { DATA_DISABLED, DATA_DRAGGING, DATA_ORIENTATION, sliderAria } from "@urcolor/shared";
import { useSliderContext } from "./SliderContext";

export interface SliderThumbProps extends ComponentPropsWithoutRef<"div"> {}

/**
 * The focusable handle.
 *
 * It is only focusable: `keydown` bubbles to `Slider.Control`, which owns
 * every value change.
 */
export const SliderThumb = forwardRef<HTMLDivElement, SliderThumbProps>(
  function SliderThumb({ style, children, ...rest }, ref) {
    const { state, position, dragging } = useSliderContext();
    const aria = sliderAria(state);
    const offset = `${position * 100}%`;

    const layout: CSSProperties = state.orientation === "vertical"
      ? { position: "absolute", top: offset, left: "50%", translate: "-50% -50%" }
      : { position: "absolute", left: offset, top: "50%", translate: "-50% -50%" };

    // `tabindex` is the DOM attribute name; React spells the prop `tabIndex`.
    const { tabindex, ...ariaProps } = aria;

    return (
      <div
        ref={ref}
        {...ariaProps}
        tabIndex={tabindex}
        style={{ ...layout, ...style }}
        {...{ [DATA_ORIENTATION]: state.orientation }}
        {...(state.disabled ? { [DATA_DISABLED]: "" } : {})}
        {...(dragging ? { [DATA_DRAGGING]: "" } : {})}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
