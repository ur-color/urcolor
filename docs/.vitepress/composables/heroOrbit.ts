/**
 * Pure geometry for the hero orbit. Nothing here touches the DOM, so it is
 * unit-testable and safe to import during SSR.
 */

/* ---------- responsive mode ---------- */

export type OrbitMode = "orbit" | "compact" | "stack";

/**
 * `width` is the stage's own width, not the viewport's. The hero is two
 * columns, so the stage is roughly half the page: a 1440px viewport gives it
 * about 630px, and a 1080px viewport about 470px. The thresholds are set
 * against those numbers, not against page breakpoints.
 */
export function orbitModeForWidth(width: number): OrbitMode {
  if (width < 420) return "stack";
  if (width < 620) return "compact";
  return "orbit";
}

/* ---------- docks ---------- */

export interface Dock {
  id: "hex" | "formats" | "swatches" | "sliders" | "fields";
  /** Degrees counterclockwise from the positive x-axis. */
  angle: number;
  /** Parallax layer. 1 moves least, 3 moves most. */
  depth: 1 | 2 | 3;
}

export const DOCKS: readonly Dock[] = [
  { id: "hex", angle: 135, depth: 1 },
  { id: "formats", angle: 45, depth: 1 },
  { id: "swatches", angle: 180, depth: 3 },
  { id: "sliders", angle: 0, depth: 3 },
  { id: "fields", angle: 270, depth: 2 },
];

/**
 * Compact mode drops the standalone formats dock — its content is folded into
 * the hex satellite instead. Stack mode keeps everything, because vertical
 * flow has room for it.
 */
export function docksForMode(mode: OrbitMode): Dock[] {
  if (mode === "compact") return DOCKS.filter(d => d.id !== "formats");
  return [...DOCKS];
}

/* ---------- path geometry ---------- */

export interface Point { x: number; y: number }

/**
 * A point on a circle in screen coordinates: x grows right, y grows *down*,
 * so the sine term is subtracted.
 */
export function edgePoint(center: Point, radius: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: center.x + Math.cos(rad) * radius,
    y: center.y - Math.sin(rad) * radius,
  };
}

/** A quadratic bezier from `from` to `to`, bowed perpendicular by `bow` × length. */
export function connectorPath(from: Point, to: Point, bow = 0.08): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  const cx = (from.x + to.x) / 2 + (-dy / len) * len * bow;
  const cy = (from.y + to.y) / 2 + (dx / len) * len * bow;
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

/* ---------- swatch ramp ---------- */

const RAMP_LIGHTNESS = [12, 24, 36, 48, 60, 72, 84, 92] as const;

/** A tint-to-shade ramp at the given hue, for the swatch picker satellite. */
export function hueRamp(hue: number): string[] {
  const h = Math.round(hue) % 360;
  return RAMP_LIGHTNESS.map(l => `hsl(${h}, 85%, ${l}%)`);
}
