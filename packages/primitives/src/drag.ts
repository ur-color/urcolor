import { clamp } from "./math";

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
  cancel(): void;
}

function toPoint(rect: DOMRect, clientX: number, clientY: number): DragPoint {
  return {
    clientX,
    clientY,
    rect,
    normalizedX: rect.width === 0 ? 0 : clamp((clientX - rect.left) / rect.width, 0, 1),
    normalizedY: rect.height === 0 ? 0 : clamp((clientY - rect.top) / rect.height, 0, 1),
  };
}

export function createDragController(options: DragControllerOptions): DragController {
  let dragging = false;
  let activePointerId: number | undefined;
  // The rect is measured once per gesture; re-measuring on every move forces
  // layout and is the dominant cost of a drag.
  let cachedRect: DOMRect | undefined;
  let rafPending = false;

  function capturedTarget(event: PointerLike): (HTMLElement & { releasePointerCapture(id: number): void }) | undefined {
    const target = event.target as HTMLElement | null;
    if (!target || typeof target.hasPointerCapture !== "function") return undefined;
    if (!target.hasPointerCapture(event.pointerId)) return undefined;
    return target as HTMLElement & { releasePointerCapture(id: number): void };
  }

  return {
    get isDragging() {
      return dragging;
    },

    pointerDown(event) {
      if (options.isDisabled?.()) return;
      const el = options.getElement();
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const point = toPoint(rect, event.clientX, event.clientY);
      if (options.hitTest && !options.hitTest(point)) return;

      cachedRect = rect;
      activePointerId = event.pointerId;
      dragging = true;

      const target = event.target as HTMLElement | null;
      if (target && typeof target.setPointerCapture === "function") {
        target.setPointerCapture(event.pointerId);
      }
      event.preventDefault();

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
        const rect = cachedRect ?? options.getElement()?.getBoundingClientRect();
        if (!rect) return;
        options.onMove(toPoint(rect, clientX, clientY));
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
      else run();
    },

    pointerUp(event) {
      const target = capturedTarget(event);
      if (!dragging || !target) return;
      target.releasePointerCapture(event.pointerId);
      const rect = cachedRect ?? options.getElement()?.getBoundingClientRect();
      dragging = false;
      activePointerId = undefined;
      cachedRect = undefined;
      if (rect) options.onEnd?.(toPoint(rect, event.clientX, event.clientY));
    },

    cancel() {
      dragging = false;
      activePointerId = undefined;
      cachedRect = undefined;
      rafPending = false;
    },
  };
}
