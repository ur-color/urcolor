import { clamp } from "./math";
import { measureBox, type BoxMeasure } from "./transform";

export interface DragPoint {
  clientX: number;
  clientY: number;
  rect: DOMRect;
  /** 0-1 across the element, left to right. */
  normalizedX: number;
  /** 0-1 down the element, top to bottom. */
  normalizedY: number;
}

export interface PointerLike {
  pointerId: number;
  clientX: number;
  clientY: number;
  target: EventTarget | null;
  preventDefault(): void;
}

export interface DragControllerOptions {
  getElement(): HTMLElement | null | undefined;
  onMove(point: DragPoint): void;
  onStart?(point: DragPoint): void;
  onEnd?(point: DragPoint): void;
  /** Return false to reject a pointerdown, e.g. outside a circular hit area. */
  hitTest?(point: DragPoint): boolean;
  isDisabled?(): boolean;
}

export interface DragController {
  readonly isDragging: boolean;
  pointerDown(event: PointerLike): void;
  pointerMove(event: PointerLike): void;
  pointerUp(event: PointerLike): void;
  /**
   * Ends a gesture the browser took over, reporting it through `onEnd`.
   *
   * The value stays where the last delivered move put it: a cancellation is
   * not a position, and the one the pointer was at when the browser stepped in
   * was never shown to the user.
   */
  pointerCancel(): void;
  /**
   * Drops the gesture without reporting it, for teardown.
   *
   * Kept apart from `pointerCancel` because a component being destroyed must
   * not emit anything: an `onEnd` from a disposed root fires a change event at
   * an application that has already thrown the control away.
   */
  cancel(): void;
}

function toPoint(box: BoxMeasure, clientX: number, clientY: number): DragPoint {
  const { x, y } = box.normalize(clientX, clientY);
  return {
    clientX,
    clientY,
    rect: box.rect,
    normalizedX: clamp(x, 0, 1),
    normalizedY: clamp(y, 0, 1),
  };
}

/** `measureBox` over a possibly-absent element. */
function measureFrom(el: HTMLElement | null | undefined): BoxMeasure | undefined {
  return el ? measureBox(el) : undefined;
}

export function createDragController(options: DragControllerOptions): DragController {
  let dragging = false;
  let activePointerId: number | undefined;
  // The element is measured once per gesture; re-measuring on every move forces
  // layout and is the dominant cost of a drag.
  let cachedBox: BoxMeasure | undefined;
  let rafPending = false;
  /** The last point delivered to `onMove`, so a cancelled gesture can commit it. */
  let lastPoint: DragPoint | undefined;

  /**
   * Releases pointer capture when the element still holds it.
   *
   * A gesture must never *depend* on the capture to end. A browser that takes
   * one over (a touch that becomes a scroll, a context menu, a pointer leaving
   * the window) drops the capture first, and a release that insisted on it
   * returned early and left `isDragging` stuck at `true`. Every gradient
   * suppresses its repaints while a drag is in flight, so a stranded flag
   * silently stopped the surface from ever repainting again.
   */
  function reset(): void {
    dragging = false;
    activePointerId = undefined;
    cachedBox = undefined;
    rafPending = false;
    lastPoint = undefined;
  }

  function releaseCapture(event: PointerLike): void {
    const target = event.target as HTMLElement | null;
    if (!target || typeof target.hasPointerCapture !== "function") return;
    if (!target.hasPointerCapture(event.pointerId)) return;
    target.releasePointerCapture(event.pointerId);
  }

  return {
    get isDragging() {
      return dragging;
    },

    pointerDown(event) {
      if (options.isDisabled?.()) return;
      const el = options.getElement();
      if (!el) return;

      const box = measureBox(el);
      const point = toPoint(box, event.clientX, event.clientY);
      if (options.hitTest && !options.hitTest(point)) return;

      cachedBox = box;
      activePointerId = event.pointerId;
      dragging = true;

      const target = event.target as HTMLElement | null;
      if (target && typeof target.setPointerCapture === "function") {
        target.setPointerCapture(event.pointerId);
      }
      event.preventDefault();

      lastPoint = point;
      options.onStart?.(point);
      options.onMove(point);
    },

    pointerMove(event) {
      if (!dragging || event.pointerId !== activePointerId) return;
      if (rafPending) return;
      rafPending = true;
      const { clientX, clientY } = event;
      const run = () => {
        rafPending = false;
        const box = cachedBox ?? measureFrom(options.getElement());
        if (!box) return;
        lastPoint = toPoint(box, clientX, clientY);
        options.onMove(lastPoint);
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
      else run();
    },

    pointerUp(event) {
      if (!dragging) return;
      releaseCapture(event);
      const box = cachedBox ?? measureFrom(options.getElement());
      const point = box ? toPoint(box, event.clientX, event.clientY) : lastPoint;
      reset();
      if (point) options.onEnd?.(point);
    },

    pointerCancel() {
      if (!dragging) return;
      // The gesture is over even though nothing released it, so the consumer
      // still needs its end event: the value moved during the drag, and the
      // commit is what tells the application it settled.
      const point = lastPoint;
      reset();
      if (point) options.onEnd?.(point);
    },

    cancel() {
      reset();
    },
  };
}
