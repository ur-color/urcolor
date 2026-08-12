import type { Ref } from "vue";
import { useResizeObserver } from "@vueuse/core";
import { getCurrentInstance, onBeforeUnmount, watch } from "vue";

/**
 * Re-exported so the four other gradient components keep their import path.
 * The implementation lives in `@urcolor/shared`, where every framework's
 * gradients now read it from.
 */
export { applyChannelOverrides } from "@urcolor/shared";

/**
 * Blit a sampled RGBA grid onto a canvas, scaled to the canvas' device-pixel
 * backing store.
 *
 * The gradients sample a small grid (64×64 or 128×128) and let the canvas
 * upscale it with smoothing, rather than sampling at full resolution — colour
 * conversion per pixel is far more expensive than the interpolation.
 *
 * Every gradient fills its whole canvas; the non-rectangular ones (ring,
 * wheel, triangle) are cut to shape by a mask or `clip-path` on their wrapper
 * element. Cutting the canvas here as well is what used to leave a seam along
 * the boundary — two independently antialiased edges whose partial coverage
 * multiplies.
 *
 * The implementation lives in `@urcolor/shared`, shared with the other
 * framework packages; it is re-exported here because every gradient in this
 * package already imports it from this module.
 */
export { renderToCanvas } from "@urcolor/shared";

export interface UseGradientCanvasOptions {
  canvas: Ref<HTMLCanvasElement | null | undefined>;
  /** Reactive sources that should trigger a repaint. */
  sources: () => unknown;
  /**
   * Paints one frame.
   *
   * Receives the canvas rather than a 2D context: `ColorAreaGradient` and
   * `ColorSliderGradient` paint through WebGL, and acquiring a 2D context here
   * would permanently deny them one. 2D painters call `renderToCanvas`, which
   * owns the device-pixel sizing.
   */
  paint: (canvas: HTMLCanvasElement) => void;
  /** Repaints are suppressed while this is true, then run once on the falling edge. */
  isDragging?: Ref<boolean>;
  /**
   * Watch `sources` deeply. A pass-through to `watch`'s own `deep` option,
   * kept only because `ColorSliderGradient`'s pre-refactor watch carried it —
   * see the comment beside its `deep: true` for why it likely adds no
   * dependency in practice (its `sources` payload is `Color` instances,
   * which are not reactive).
   */
  deep?: boolean;
  /** Set when `paint` acquires a WebGL context, so teardown only runs where it applies. */
  usesWebGL?: boolean;
}

/**
 * The canvas lifecycle shared by every gradient: paint on mount, on resize and
 * whenever the tracked sources change, but never mid-drag — a drag moves the
 * thumb, not the gradient, and repainting per pointer move is the single most
 * expensive thing these components can do. The falling-edge watch commits the
 * one repaint the drag deferred.
 */
export function useGradientCanvas(options: UseGradientCanvasOptions): { render: () => void } {
  function render() {
    const canvas = options.canvas.value;
    if (!canvas) return;
    options.paint(canvas);
  }

  // A real ResizeObserver fires once as soon as `observe()` is called — that
  // first callback is the actual first paint for all five gradients. The
  // source watch below cannot deliver it: an `immediate` callback runs
  // synchronously during `setup()`, before the template ref is assigned, so
  // `render()` would bail on `if (!canvas)` every time. (`immediate` was
  // carried by the pre-refactor `ColorAreaGradient`/`ColorSliderGradient` and
  // proven inert for exactly this reason; it has been dropped here rather
  // than kept as dead weight — see `useGradientCanvas.test.ts`, "delivers the
  // first paint from the resize observer, not the immediate watch".)
  //
  // Known gap, not fixed by anything below: a canvas that is zero-sized or
  // `display: none` at mount never gets a ResizeObserver entry, so it never
  // gets a first paint at all. It will only paint once it is laid out and
  // either resizes or a tracked source changes.
  useResizeObserver(options.canvas, () => render());

  watch(
    options.sources,
    () => { if (!options.isDragging?.value) render(); },
    { flush: "post", deep: options.deep },
  );

  watch(
    () => options.isDragging?.value,
    (dragging, wasDragging) => {
      if (wasDragging && !dragging) render();
    },
  );

  // Browsers cap the number of live WebGL contexts (~16) and drop the oldest
  // when the cap is hit, so a page that mounts and unmounts gradients would
  // silently kill contexts still in use. Only the WebGL painters need this:
  // calling `getContext("webgl")` on a 2D canvas allocates a context purely to
  // destroy it.
  if (options.usesWebGL && getCurrentInstance()) {
    onBeforeUnmount(() => {
      const canvas = options.canvas.value;
      if (!canvas) return;
      const gl = canvas.getContext("webgl");
      if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
    });
  }

  return { render };
}
