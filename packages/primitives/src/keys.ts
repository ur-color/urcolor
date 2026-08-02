export const PAGE_KEYS = ["PageUp", "PageDown"] as const;
export const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const;

export type Axis = "x" | "y";

export interface ArrowResolution {
  axis: Axis;
  sign: 1 | -1;
}

export interface ResolveArrowOptions {
  key: string;
  /** Accepted so 1D callers can discard an off-axis result; does not change the mapping. */
  orientation?: "horizontal" | "vertical";
  dir?: "ltr" | "rtl";
  inverted?: boolean;
}

const BASE: Record<string, ArrowResolution> = {
  ArrowRight: { axis: "x", sign: 1 },
  ArrowLeft: { axis: "x", sign: -1 },
  ArrowUp: { axis: "y", sign: 1 },
  ArrowDown: { axis: "y", sign: -1 },
};

export function resolveArrowKey(options: ResolveArrowOptions): ArrowResolution | undefined {
  const base = BASE[options.key];
  if (!base) return undefined;
  let sign: number = base.sign;
  // RTL mirrors the horizontal axis only; the vertical axis is unaffected by
  // reading direction.
  if (options.dir === "rtl" && base.axis === "x") sign = -sign;
  if (options.inverted) sign = -sign;
  return { axis: base.axis, sign: sign as 1 | -1 };
}

export function stepMultiplier(event: { shiftKey?: boolean }): number {
  return event.shiftKey ? 10 : 1;
}
