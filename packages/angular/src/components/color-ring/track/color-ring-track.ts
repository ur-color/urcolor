import { Directive, inject } from "@angular/core";
import { DATA_DISABLED, DATA_DRAGGING } from "@urcolor/shared";
import { ColorRingRoot } from "../root/color-ring-root";

/**
 * The annulus the thumb travels around. Sizing and positioning are the
 * consumer's; this part only publishes the state attributes the gradient and
 * thumb are styled against.
 */
@Directive({
  selector: "[urcColorRingTrack]",
  exportAs: "urcColorRingTrack",
  host: {
    [`[attr.${DATA_DISABLED}]`]: "root.isDisabled() ? '' : null",
    [`[attr.${DATA_DRAGGING}]`]: "root.dragging() ? '' : null",
  },
})
export class ColorRingTrack {
  protected readonly root = inject(ColorRingRoot);
}
