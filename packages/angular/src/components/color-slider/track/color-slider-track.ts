import { Directive, inject } from "@angular/core";
import { DATA_DISABLED, DATA_ORIENTATION } from "@urcolor/primitives";
import { ColorSliderRoot } from "../root/color-slider-root";

/**
 * The rail the thumb travels along. Positioning is the consumer's; this part
 * only publishes the state attributes the thumb and range are styled against.
 */
@Directive({
  selector: "[urcColorSliderTrack]",
  exportAs: "urcColorSliderTrack",
  host: {
    [`[attr.${DATA_ORIENTATION}]`]: "root.orientation()",
    [`[attr.${DATA_DISABLED}]`]: "root.isDisabled() ? '' : null",
  },
})
export class ColorSliderTrack {
  protected readonly root = inject(ColorSliderRoot);
}
