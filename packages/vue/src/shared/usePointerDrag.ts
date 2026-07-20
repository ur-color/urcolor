import type { Ref } from "vue";
import { ref } from "vue";

export interface UsePointerDragOptions {
  disabled: Ref<boolean>;
  /** Element the pointer coordinates are measured against. */
  target: Ref<HTMLElement | undefined>;
  /** Called on pointerdown and on every throttled move, with client coordinates. */
  onMove: (event: PointerEvent, phase: "start" | "move") => void;
  /** Called once on release. */
  onEnd: () => void;
  /** Return false from pointerdown to reject the gesture (used for the ring annulus hit test). */
  canStart?: (event: PointerEvent) => boolean;
}

export interface UsePointerDragReturn {
  isDragging: Ref<boolean>;
  /** Cached bounding rect for the current gesture; cleared on release. */
  rect: Ref<DOMRect | undefined>;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
}

/**
 * The pointer-drag lifecycle shared by the circular/planar roots: pointer
 * capture on the event target, a bounding rect cached for the duration of the
 * gesture, `requestAnimationFrame`-throttled moves, and a single `onEnd` on
 * release.
 *
 * The coordinate maths stays with the caller — `onMove` receives the raw client
 * coordinates and the phase, and reads `rect` for the cached measurement.
 */
export function usePointerDrag(options: UsePointerDragOptions): UsePointerDragReturn {
  const isDragging = ref(false);
  const rect = ref<DOMRect>();

  /** Handle of the frame a pending move is scheduled on, if any. */
  let frame: number | undefined;
  /** The move the pending frame will deliver. */
  let pendingMove: PointerEvent | undefined;

  /**
   * Run a move the throttle has not delivered yet, then drop the frame.
   *
   * Release flushes rather than discards so the last position before the
   * pointer went up is never lost to the throttle — a fast flick that ends
   * immediately after a move still commits where it ended.
   */
  function flushFrame() {
    if (frame === undefined) return;
    cancelAnimationFrame(frame);
    frame = undefined;
    const move = pendingMove;
    pendingMove = undefined;
    if (move) options.onMove(move, "move");
  }

  function onPointerDown(event: PointerEvent) {
    if (options.disabled.value) return;
    // The hit test runs before any state is touched, so a rejected gesture
    // leaves nothing behind — no capture, no cached rect, no dragging flag.
    if (options.canStart && !options.canStart(event)) return;

    const target = event.target as HTMLElement;
    target.setPointerCapture(event.pointerId);
    event.preventDefault();

    rect.value = options.target.value?.getBoundingClientRect();
    isDragging.value = true;
    options.onMove(event, "start");
  }

  function onPointerMove(event: PointerEvent) {
    if (!isDragging.value) return;
    const target = event.target as HTMLElement;
    if (!target.hasPointerCapture(event.pointerId)) return;
    // Coalesce every move within a frame into one call.
    if (frame !== undefined) return;

    const { clientX, clientY, pointerId } = event;
    pendingMove = { clientX, clientY, pointerId } as PointerEvent;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      const move = pendingMove;
      pendingMove = undefined;
      if (move) options.onMove(move, "move");
    });
  }

  function onPointerUp(event: PointerEvent) {
    if (!isDragging.value) return;
    const target = event.target as HTMLElement;
    if (!target.hasPointerCapture(event.pointerId)) return;
    target.releasePointerCapture(event.pointerId);

    flushFrame();
    rect.value = undefined;
    isDragging.value = false;
    options.onEnd();
  }

  return { isDragging, rect, onPointerDown, onPointerMove, onPointerUp };
}
