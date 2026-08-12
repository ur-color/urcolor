import { DATA_DISABLED, DATA_ORIENTATION } from "@urcolor/shared";
import { define } from "../../base/define";
import { UrcolorPart } from "../../base/UrcolorPart";
import type { UrcolorSliderRoot } from "./UrcolorSliderRoot";

/** The rail. Carries data attributes and nothing else. */
export class UrcolorSliderTrack extends UrcolorPart {
  override connectedCallback(): void {
    super.connectedCallback();
    this.bindRoot("urcolor-slider-root");
  }

  protected override update(changed: Map<string, unknown>): void {
    const root = this.rootElement as UrcolorSliderRoot;
    this.setAttribute(DATA_ORIENTATION, root.orientation);
    this.toggleAttribute(DATA_DISABLED, root.disabled);
    super.update(changed);
  }
}

define("urcolor-slider-track", UrcolorSliderTrack);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-slider-track": UrcolorSliderTrack;
  }
}
