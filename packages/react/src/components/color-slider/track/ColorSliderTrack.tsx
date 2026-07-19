import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Slider } from "@base-ui-components/react/slider";

export interface ColorSliderTrackProps extends ComponentPropsWithoutRef<"div"> {}

export const ColorSliderTrack = forwardRef<HTMLDivElement, ColorSliderTrackProps>(
  function ColorSliderTrack(props, ref) {
    return <Slider.Track ref={ref} {...props} />;
  },
);
