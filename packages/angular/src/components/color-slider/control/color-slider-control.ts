import { Directive, inject } from "@angular/core";
import { DATA_DISABLED, DATA_ORIENTATION } from "@urcolor/shared";
import { ColorSliderRoot } from "../root/color-slider-root";

/**
 * Optional wrapper between the root and the track. Carries no behaviour of its
 * own; it exists so consumers have a styling hook that mirrors the other
 * packages' part list.
 */
@Directive({
  selector: "[urcColorSliderControl]",
  exportAs: "urcColorSliderControl",
  host: {
    [`[attr.${DATA_ORIENTATION}]`]: "root.orientation()",
    [`[attr.${DATA_DISABLED}]`]: "root.isDisabled() ? '' : null",
  },
})
export class ColorSliderControl {
  protected readonly root = inject(ColorSliderRoot);
}
