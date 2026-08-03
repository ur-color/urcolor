/**
 * Pure layout data for the hero. Nothing here touches the DOM, so it is
 * unit-testable and safe to import during SSR.
 */

/* ---------- responsive mode ---------- */

export type LayoutMode = "grid" | "compact" | "stack";

/**
 * `width` is the stage's own width, not the viewport's. The hero is two
 * columns, so the stage is roughly half the page: a 1440px viewport gives it
 * about 630px, and a 1080px viewport about 470px. The thresholds are set
 * against those numbers, not against page breakpoints.
 */
export function layoutModeForWidth(width: number): LayoutMode {
  if (width < 420) return "stack";
  if (width < 620) return "compact";
  return "grid";
}

/* ---------- panels ---------- */

export type PanelId
  = | "hex"
    | "name"
    | "formats"
    | "swatches"
    | "sliders"
    | "fields";

/**
 * Panel order is the source order of the grid cells; placement itself is CSS
 * (`grid-template-areas` keyed on the mode), so this list only decides what
 * exists, not where it sits.
 */
export const PANELS: readonly PanelId[] = [
  "hex",
  "name",
  "formats",
  "swatches",
  "sliders",
  "fields",
];

/**
 * Compact mode drops the standalone formats panel — its content is folded into
 * the hex panel instead. Stack mode keeps everything, because vertical flow has
 * room for it.
 */
export function panelsForMode(mode: LayoutMode): PanelId[] {
  if (mode === "compact") return PANELS.filter(p => p !== "formats");
  return [...PANELS];
}

/* ---------- swatch ramp ---------- */

const RAMP_LIGHTNESS = [12, 24, 36, 48, 60, 72, 84, 92] as const;

/** A tint-to-shade ramp at the given hue, for the swatch picker panel. */
export function hueRamp(hue: number): string[] {
  const h = Math.round(hue) % 360;
  return RAMP_LIGHTNESS.map(l => `hsl(${h}, 85%, ${l}%)`);
}
