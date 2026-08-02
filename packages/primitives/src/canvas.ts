/** CSS `background` value that paints the transparency checkerboard. */
export const CHECKERBOARD_BACKGROUND
  = "repeating-conic-gradient(rgb(230, 230, 230) 0% 25%, white 0% 50%) 0% 50% / 16px 16px";

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
