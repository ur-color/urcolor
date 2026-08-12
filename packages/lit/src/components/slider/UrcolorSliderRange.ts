import { clamp, DATA_DISABLED, DATA_ORIENTATION, positionFromValue } from "@urcolor/shared";
import { define } from "../../base/define";
import { UrcolorPart } from "../../base/UrcolorPart";
import type { UrcolorSliderRoot } from "./UrcolorSliderRoot";

/** The filled share of the track, measured from the minimum end. */
export class UrcolorSliderRange extends UrcolorPart {
  override connectedCallback(): void {
    super.connectedCallback();
    this.bindRoot("urcolor-slider-root");
  }

  protected override update(changed: Map<string, unknown>): void {
    const state = (this.rootElement as UrcolorSliderRoot).sliderState;
    const fraction = state.max === state.min
      ? 0
      : clamp((state.value - state.min) / (state.max - state.min), 0, 1);
    /**
     * Whether the minimum sits at the track's CSS start edge. Asking the
     * primitive where `min` renders keeps `dir`, `inverted` and vertical
     * flipping in one place instead of re-deriving them here.
     */
    const fillsFromStart = positionFromValue({ ...state, value: state.min }) === 0;

    this.style.position = "absolute";
    if (state.orientation === "vertical") {
      this.style.left = "0";
      this.style.right = "0";
      this.style.height = `${fraction * 100}%`;
      this.style.top = fillsFromStart ? "0" : "";
      this.style.bottom = fillsFromStart ? "" : "0";
    } else {
      this.style.top = "0";
      this.style.bottom = "0";
      this.style.width = `${fraction * 100}%`;
      this.style.left = fillsFromStart ? "0" : "";
      this.style.right = fillsFromStart ? "" : "0";
    }

    this.setAttribute(DATA_ORIENTATION, state.orientation);
    this.toggleAttribute(DATA_DISABLED, state.disabled);
    super.update(changed);
  }
}

define("urcolor-slider-range", UrcolorSliderRange);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-slider-range": UrcolorSliderRange;
  }
}
