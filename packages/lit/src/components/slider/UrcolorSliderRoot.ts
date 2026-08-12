import { Color, type SpaceId } from "@urcolor/core";
import {
  applyDisplayValue,
  colorToDisplayValue,
  DATA_DISABLED,
  DATA_DRAGGING,
  DATA_ORIENTATION,
  FEEDBACK_EPSILON,
  parseColor,
  positionFromValue,
  resolveChannelConfig,
  type SliderState,
} from "@urcolor/shared";
import { define } from "../../base/define";
import { RootHostMixin } from "../../base/RootHost";
import { UrcolorPart } from "../../base/UrcolorPart";

const DEFAULT_COLOR = Color.parse("hsl(210, 80%, 50%)")!;

/**
 * The slider family's root: it holds the color, publishes the derived state
 * its parts read, and is the element `closest()` finds.
 *
 * Interaction does not live here. `urcolor-slider-control` owns the pointer
 * and keyboard listeners, because it is the element position-to-value is
 * measured against, and `keydown` from the focused thumb bubbles to it.
 */
export class UrcolorSliderRoot extends RootHostMixin(UrcolorPart) {
  static override properties = {
    value: {},
    colorSpace: { type: String, attribute: "color-space" },
    channel: { type: String },
    disabled: { type: Boolean },
    inverted: { type: Boolean },
    orientation: { type: String },
  };

  /** The color, as a `Color` or any string `Color.parse` accepts. */
  declare value: Color | string | null;
  declare colorSpace: SpaceId;
  declare channel: string;
  declare disabled: boolean;
  declare inverted: boolean;
  declare orientation: "horizontal" | "vertical";

  #internal: Color = DEFAULT_COLOR;
  #dragging = false;

  constructor() {
    super();
    this.value = null;
    this.colorSpace = "hsl";
    this.channel = "h";
    this.disabled = false;
    this.inverted = false;
    this.orientation = "horizontal";
  }

  get color(): Color {
    return parseColor(this.value) ?? this.#internal;
  }

  /** True while a pointer drag is in flight. */
  get dragging(): boolean {
    return this.#dragging;
  }

  set dragging(next: boolean) {
    if (this.#dragging === next) return;
    this.#dragging = next;
    this.requestUpdate();
  }

  /** The channel in display units, plus its bounds and axis flags. */
  get sliderState(): SliderState {
    const config = resolveChannelConfig(this.colorSpace, this.channel);
    return {
      value: colorToDisplayValue(this.color, this.colorSpace, this.channel),
      min: config?.min ?? 0,
      max: config?.max ?? 100,
      step: config?.step ?? 1,
      orientation: this.orientation,
      // `dir` is HTMLElement's own reflected property, so the attribute on
      // the element is already the source of truth.
      dir: this.dir === "rtl" ? "rtl" : "ltr",
      inverted: this.inverted,
      disabled: this.disabled,
    };
  }

  /** 0-1 offset of the thumb from the track's CSS start edge. */
  get position(): number {
    return positionFromValue(this.sliderState);
  }

  /** Writes one display-space channel value back as a color. */
  setDisplayValue(next: number): void {
    if (Math.abs(next - this.sliderState.value) < FEEDBACK_EPSILON) return;
    const nextColor = applyDisplayValue(this.color, this.colorSpace, this.channel, next);
    this.#internal = nextColor;
    // Only overwrite `value` when the consumer set one, so an uncontrolled
    // element keeps its own state and a controlled one stays in step.
    if (this.value !== null && this.value !== undefined) this.value = nextColor;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent("colorchange", {
      detail: { color: nextColor },
      bubbles: true,
      composed: true,
    }));
  }

  /** Reports the end of an interaction. */
  commit(): void {
    this.dispatchEvent(new CustomEvent("colorcommit", {
      detail: { color: this.color },
      bubbles: true,
      composed: true,
    }));
  }

  protected override update(changed: Map<string, unknown>): void {
    // `data-*` is the library's styling contract across every framework, so it
    // is written explicitly rather than relying on property reflection.
    this.setAttribute(DATA_ORIENTATION, this.orientation);
    this.toggleAttribute(DATA_DISABLED, this.disabled);
    this.toggleAttribute(DATA_DRAGGING, this.#dragging);
    super.update(changed);
  }
}

define("urcolor-slider-root", UrcolorSliderRoot);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-slider-root": UrcolorSliderRoot;
  }
}
