import {
  channelLabel,
  DATA_DISABLED,
  DATA_DRAGGING,
  DATA_ORIENTATION,
  formatChannelValue,
  sliderAria,
} from "@urcolor/shared";
import { define } from "../../base/define";
import { UrcolorPart } from "../../base/UrcolorPart";
import type { UrcolorSliderRoot } from "./UrcolorSliderRoot";

/**
 * The focusable handle.
 *
 * It is only focusable: `keydown` bubbles to `urcolor-slider-control`, which
 * owns every value change.
 */
export class UrcolorSliderThumb extends UrcolorPart {
  override connectedCallback(): void {
    super.connectedCallback();
    this.bindRoot("urcolor-slider-root");
  }

  protected override update(changed: Map<string, unknown>): void {
    const root = this.rootElement as UrcolorSliderRoot;
    const state = root.sliderState;
    const aria = sliderAria(state);

    this.setAttribute("role", aria.role);
    this.setAttribute("aria-valuenow", String(aria["aria-valuenow"]));
    this.setAttribute("aria-valuemin", String(aria["aria-valuemin"]));
    this.setAttribute("aria-valuemax", String(aria["aria-valuemax"]));
    this.setAttribute("aria-orientation", aria["aria-orientation"]);

    if (aria["aria-disabled"]) this.setAttribute("aria-disabled", "true");
    else this.removeAttribute("aria-disabled");

    if (aria.tabindex === undefined) this.removeAttribute("tabindex");
    else this.setAttribute("tabindex", String(aria.tabindex));

    // A caller's own label wins; the channel name is only the fallback.
    if (!this.hasAttribute("aria-label")) {
      this.setAttribute("aria-label", channelLabel(root.colorSpace, root.channel));
    }
    this.setAttribute("aria-valuetext", formatChannelValue(root.colorSpace, root.channel, state.value));

    const offset = `${root.position * 100}%`;
    this.style.position = "absolute";
    if (state.orientation === "vertical") {
      this.style.top = offset;
      this.style.left = "50%";
    } else {
      this.style.left = offset;
      this.style.top = "50%";
    }
    this.style.translate = "-50% -50%";

    this.setAttribute(DATA_ORIENTATION, state.orientation);
    this.toggleAttribute(DATA_DISABLED, state.disabled);
    this.toggleAttribute(DATA_DRAGGING, root.dragging);
    super.update(changed);
  }
}

define("urcolor-slider-thumb", UrcolorSliderThumb);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-slider-thumb": UrcolorSliderThumb;
  }
}
