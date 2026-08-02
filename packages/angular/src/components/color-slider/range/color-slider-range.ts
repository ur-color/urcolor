import { computed, Directive, inject } from "@angular/core";
import { clamp, DATA_DISABLED, DATA_ORIENTATION, positionFromValue } from "@urcolor/primitives";
import { ColorSliderRoot } from "../root/color-slider-root";

/**
 * The filled portion of the track, measured from the channel's minimum end.
 *
 * Every layout declaration is a host style binding, so a consumer's own
 * `style` attribute — a template-level binding — still wins the cascade.
 */
@Directive({
  selector: "[urcColorSliderRange]",
  exportAs: "urcColorSliderRange",
  host: {
    [`[attr.${DATA_ORIENTATION}]`]: "root.orientation()",
    [`[attr.${DATA_DISABLED}]`]: "root.isDisabled() ? '' : null",
    "[style.position]": "'absolute'",
    "[style.top]": "top()",
    "[style.bottom]": "bottom()",
    "[style.left]": "left()",
    "[style.right]": "right()",
    "[style.width]": "width()",
    "[style.height]": "height()",
  },
})
export class ColorSliderRange {
  protected readonly root = inject(ColorSliderRoot);

  private readonly vertical = computed(() => this.root.sliderState().orientation === "vertical");

  /** Filled share of the track, 0-1. */
  private readonly fraction = computed(() => {
    const state = this.root.sliderState();
    if (state.max === state.min) return 0;
    return clamp((state.value - state.min) / (state.max - state.min), 0, 1);
  });

  /**
   * Whether the minimum sits at the track's CSS start edge. Asking the
   * primitive where `min` renders keeps `dir`, `inverted` and vertical
   * flipping in one place instead of re-deriving them here.
   */
  private readonly fillsFromStart = computed(() => {
    const state = this.root.sliderState();
    return positionFromValue({ ...state, value: state.min }) === 0;
  });

  private readonly extent = computed(() => `${this.fraction() * 100}%`);

  protected readonly top = computed(() =>
    this.vertical() ? (this.fillsFromStart() ? "0" : null) : "0",
  );

  protected readonly bottom = computed(() =>
    this.vertical() ? (this.fillsFromStart() ? null : "0") : "0",
  );

  protected readonly left = computed(() =>
    this.vertical() ? "0" : this.fillsFromStart() ? "0" : null,
  );

  protected readonly right = computed(() =>
    this.vertical() ? "0" : this.fillsFromStart() ? null : "0",
  );

  protected readonly width = computed(() => (this.vertical() ? null : this.extent()));

  protected readonly height = computed(() => (this.vertical() ? this.extent() : null));
}
