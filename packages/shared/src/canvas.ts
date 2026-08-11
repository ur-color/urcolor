/**
 * The custom properties that restyle the transparency grid. A component never
 * writes them inline unless a prop asks for it, so a rule at any level of the
 * cascade wins and each one falls back to the default check.
 */
export const CHECKERBOARD_VARS = {
  dark: "--urcolor-checkerboard-dark",
  light: "--urcolor-checkerboard-light",
  size: "--urcolor-checkerboard-size",
} as const;

/** The tile size `CHECKERBOARD_BACKGROUND` falls back to. */
export const DEFAULT_CHECKER_SIZE = 16;

/**
 * CSS `background` value that paints the transparency checkerboard.
 *
 * Every part of the recipe reads from {@link CHECKERBOARD_VARS}, so setting one
 * of those properties anywhere above the element retiles or recolours the grid
 * without the component re-rendering. An invalid override makes the whole
 * `background` invalid at computed-value time rather than only its own layer.
 */
export const CHECKERBOARD_BACKGROUND
  = "repeating-conic-gradient("
    + `var(${CHECKERBOARD_VARS.dark}, rgb(230, 230, 230)) 0% 25%, `
    + `var(${CHECKERBOARD_VARS.light}, white) 0% 50%`
    + ") 0% 50% / "
    + `var(${CHECKERBOARD_VARS.size}, ${DEFAULT_CHECKER_SIZE}px) `
    + `var(${CHECKERBOARD_VARS.size}, ${DEFAULT_CHECKER_SIZE}px)`;

/** The property {@link CHECKERBOARD_BACKGROUND} is parked in. */
export const CHECKERBOARD_VAR = "--urcolor-checkerboard";

/**
 * Every declaration that paints the transparency grid.
 *
 * The recipe goes into a custom property and `background` only references it.
 * That is invisible in a browser, but it keeps the declaration intact under the
 * partial CSSOM implementations test environments ship: happy-dom and jsdom
 * both mis-parse a multi-layer `background` shorthand once a `var()` appears in
 * its position/size slot, whereas a custom property is stored verbatim.
 */
export const CHECKERBOARD_STYLE: Readonly<Record<string, string>> = {
  [CHECKERBOARD_VAR]: CHECKERBOARD_BACKGROUND,
  background: `var(${CHECKERBOARD_VAR})`,
};

/** What a `background` referencing {@link CHECKERBOARD_VAR} holds. */
export const CHECKERBOARD_REF = `var(${CHECKERBOARD_VAR})`;

/** {@link CHECKERBOARD_STYLE} as an inline `style` string. */
export const CHECKERBOARD_CSS = `${CHECKERBOARD_VAR}:${CHECKERBOARD_BACKGROUND};background:${CHECKERBOARD_REF};`;

export interface RenderToCanvasOptions {
  canvas: HTMLCanvasElement;
  pixels: Uint8ClampedArray;
  sampleWidth: number;
  sampleHeight: number;
  /** Defaults to globalThis.devicePixelRatio, or 1 when unavailable. */
  dpr?: number;
}

export function renderToCanvas(options: RenderToCanvasOptions): void {
  const { canvas, pixels, sampleWidth, sampleHeight } = options;

  // Guards, in order: no DOM canvas API at all (SSR), no OffscreenCanvas, an
  // unlaid-out or detached element, no 2D context. Each is a legitimate
  // runtime state rather than an error, so all of them return quietly.
  if (typeof ImageData === "undefined" || typeof OffscreenCanvas === "undefined") return;
  if (!canvas.clientWidth || !canvas.clientHeight) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = options.dpr ?? (typeof devicePixelRatio !== "undefined" ? devicePixelRatio : 1);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const pixelData = new Uint8ClampedArray(pixels.buffer) as unknown as Uint8ClampedArray<ArrayBuffer>;
  const imageData = new ImageData(pixelData, sampleWidth, sampleHeight);
  const offscreen = new OffscreenCanvas(sampleWidth, sampleHeight);
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;
  offCtx.putImageData(imageData, 0, 0);

  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(offscreen, 0, 0, w, h);
}

let checkerboardWarned = false;

/**
 * Emit a one-time deprecation warning for the standalone Checkerboard
 * components. Silent in production builds.
 */
export function warnCheckerboardDeprecated(): void {
  if (checkerboardWarned) return;
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "production") return;
  checkerboardWarned = true;
  console.warn(
    "[urcolor] The Checkerboard components are deprecated. The Gradient components now paint the checkerboard themselves; remove the standalone Checkerboard from your markup.",
  );
}
