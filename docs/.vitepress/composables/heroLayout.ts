/**
 * Pure layout data for the hero. Nothing here touches the DOM, so it is
 * unit-testable and safe to import during SSR.
 */

/* ---------- responsive mode ---------- */

export type LayoutMode = "grid" | "compact" | "stack";

/**
 * `width` is the stage's own width, not the viewport's. The hero is two
 * columns inside VitePress's own 1152px container, so the stage gets about
 * 510px on a 1440px viewport and about 470px on a 1080px one. The thresholds
 * are set against those numbers, not against page breakpoints — and grid mode
 * has to reach down to them, because the taller compact stack would push the
 * rest of the landing page off the fold.
 */
export function layoutModeForWidth(width: number): LayoutMode {
  if (width < 380) return "stack";
  if (width < 460) return "compact";
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
