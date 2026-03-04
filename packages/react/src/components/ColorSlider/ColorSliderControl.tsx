import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Slider } from "@base-ui-components/react/slider";

export interface ColorSliderControlProps extends ComponentPropsWithoutRef<"div"> {}

export const ColorSliderControl = forwardRef<HTMLDivElement, ColorSliderControlProps>(
  function ColorSliderControl(props, ref) {
    return <Slider.Control ref={ref} {...props} />;
  },
);
