export interface ToggleAriaAttributes {
  "aria-pressed": boolean;
  "aria-disabled": true | undefined;
  "data-pressed": "" | undefined;
  "data-disabled": "" | undefined;
  "tabindex": 0 | undefined;
}

export function toggleAria(pressed: boolean, disabled: boolean): ToggleAriaAttributes {
  return {
    "aria-pressed": pressed,
    "aria-disabled": disabled ? true : undefined,
    "data-pressed": pressed ? "" : undefined,
    "data-disabled": disabled ? "" : undefined,
    "tabindex": disabled ? undefined : 0,
  };
}

/** True when the key should flip a toggle: Enter or Space. */
export function isToggleActivationKey(key: string): boolean {
  return key === "Enter" || key === " ";
}

export interface ToggleGroupState {
  /** Index of the item that currently owns the group's single tab stop. */
  activeIndex: number;
  count: number;
  orientation: "horizontal" | "vertical";
  dir: "ltr" | "rtl";
  loop: boolean;
}

/** Next active index for a roving-focus key, or undefined if unhandled. */
export function rovingIndexFromKey(state: ToggleGroupState, key: string): number | undefined {
  if (state.count <= 0) return undefined;
  if (key === "Home") return 0;
  if (key === "End") return state.count - 1;

  const forward = state.orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
  const backward = state.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
  if (key !== forward && key !== backward) return undefined;

  let delta = key === forward ? 1 : -1;
  // Unlike a slider, a roving group mirrors only its horizontal traversal.
  if (state.orientation === "horizontal" && state.dir === "rtl") delta = -delta;

  const next = state.activeIndex + delta;
  if (state.loop) return (next % state.count + state.count) % state.count;
  return Math.max(0, Math.min(state.count - 1, next));
}

/** tabindex for an item in a roving-focus group. */
export function rovingTabIndex(state: ToggleGroupState, index: number): 0 | -1 {
  return index === state.activeIndex ? 0 : -1;
}
