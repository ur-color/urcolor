import { clamp, snapToStep } from "./math";
import { resolveArrowKey, stepMultiplier } from "./keys";

export interface SliderState {
  value: number;
  min: number;
  max: number;
  step: number;
  orientation: "horizontal" | "vertical";
  dir: "ltr" | "rtl";
  inverted: boolean;
  disabled: boolean;
}

export interface SliderKeyEvent {
  key: string;
  shiftKey?: boolean;
}

export interface SliderAriaAttributes {
  "role": "slider";
  "aria-valuenow": number;
  "aria-valuemin": number;
  "aria-valuemax": number;
  "aria-orientation": "horizontal" | "vertical";
  "aria-disabled": true | undefined;
  "tabindex": 0 | undefined;
}

/**
 * Whether a 0-1 track position runs opposite to increasing value.
 *
 * Vertical tracks are inverted by default: CSS measures downward, but a
 * vertical slider's maximum is at the top. RTL mirrors horizontal tracks only.
 * `inverted` composes on top of both, so a horizontal RTL inverted slider
 * reads left-to-right again.
 */
function isFlipped(state: SliderState): boolean {
  let flipped = state.orientation === "vertical";
  if (state.orientation === "horizontal" && state.dir === "rtl") flipped = !flipped;
  if (state.inverted) flipped = !flipped;
  return flipped;
}

export function valueFromPosition(state: SliderState, position: number): number {
  const p = clamp(position, 0, 1);
  const ratio = isFlipped(state) ? 1 - p : p;
  return snapToStep(state.min + ratio * (state.max - state.min), state.min, state.max, state.step);
}

export function positionFromValue(state: SliderState): number {
  const range = state.max - state.min;
  if (range === 0) return 0;
  const ratio = clamp((state.value - state.min) / range, 0, 1);
  return isFlipped(state) ? 1 - ratio : ratio;
}

export function valueFromKey(state: SliderState, event: SliderKeyEvent): number | undefined {
  if (state.disabled) return undefined;

  // Home and End address value bounds, not visual ends, so `inverted` and `dir`
  // deliberately do not apply.
  if (event.key === "Home") return state.min;
  if (event.key === "End") return state.max;

  if (event.key === "PageUp" || event.key === "PageDown") {
    const delta = state.step * 10 * (event.key === "PageUp" ? 1 : -1);
    return snapToStep(state.value + delta, state.min, state.max, state.step);
  }

  const arrow = resolveArrowKey({ key: event.key, dir: state.dir, inverted: state.inverted });
  if (!arrow) return undefined;

  // A 1D slider responds to both axes; the axis only matters for 2D controls.
  const delta = state.step * stepMultiplier(event) * arrow.sign;
  return snapToStep(state.value + delta, state.min, state.max, state.step);
}

export function sliderAria(state: SliderState): SliderAriaAttributes {
  return {
    "role": "slider",
    "aria-valuenow": state.value,
    "aria-valuemin": state.min,
    "aria-valuemax": state.max,
    "aria-orientation": state.orientation,
    "aria-disabled": state.disabled ? true : undefined,
    "tabindex": state.disabled ? undefined : 0,
  };
}
