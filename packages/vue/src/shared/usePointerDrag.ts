import type { Ref } from "vue";
import { getCurrentScope, onScopeDispose, ref } from "vue";

export interface UsePointerDragOptions {
  disabled: Ref<boolean>;
  /**
   * Element the pointer coordinates are measured against. Optional: a caller
   * whose own root already caches a rect (e.g. ColorArea, which measures the
   * area element from its root) can omit this so the composable doesn't do a
   * `getBoundingClientRect()` whose result is never read.
   */
  target?: Ref<HTMLElement | undefined>;
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
  /** Ends a gesture the browser took over, without committing a pending move. */
  onPointerCancel: (event: PointerEvent) => void;
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

  // A component that unmounts mid-drag would otherwise leave a scheduled
  // frame to fire against a torn-down component. Only register the cleanup
  // when there is an active effect scope to own it - the composable's own
  // tests call it bare, and a scope-less `onScopeDispose` would emit a Vue
  // warning.
  if (getCurrentScope()) {
    onScopeDispose(() => {
      if (frame === undefined) return;
      cancelAnimationFrame(frame);
      frame = undefined;
      pendingMove = undefined;
    });
  }

  /**
   * Run a move the throttle has not delivered yet, then drop the frame.
   *
   * Release flushes rather than discards so the last position before the
   * pointer went up is never lost to the throttle — a fast flick that ends
   * immediately after a move still commits where it ended.
   */
  /** Drop a throttled move without delivering it. */
  function discardFrame() {
    if (frame === undefined) return;
    cancelAnimationFrame(frame);
    frame = undefined;
    pendingMove = undefined;
  }

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

    rect.value = options.target?.value?.getBoundingClientRect();
    isDragging.value = true;
    options.onMove(event, "start");
  }

  function onPointerMove(event: PointerEvent) {
    if (!isDragging.value) return;
    const target = event.target as HTMLElement;
    if (!target.hasPointerCapture(event.pointerId)) return;

    // Snapshot before the coalescing guard below so every move updates the
    // pending position - last-wins, not first-wins. Several moves can land
    // within one frame (pointermove fires faster than 60 Hz in a real
    // browser), and the freshest position is the one that should be
    // delivered when the frame fires or is flushed on release.
    const { clientX, clientY, pointerId } = event;
    pendingMove = { clientX, clientY, pointerId } as PointerEvent;
    // Coalesce every move within a frame into one call: only the first move
    // in a frame schedules it.
    if (frame !== undefined) return;

    frame = requestAnimationFrame(() => {
      frame = undefined;
      const move = pendingMove;
      pendingMove = undefined;
      if (move) options.onMove(move, "move");
    });
  }

  /**
   * Ends the gesture: flush any throttled move, drop the cached rect, clear the
   * flag and commit.
   *
   * Capture is released only when the element still holds it. Requiring it in
   * order to end the gesture is what used to strand `isDragging` at `true`: a
   * browser that takes a gesture over (a touch that becomes a scroll, a
   * context menu, a pointer leaving the window) drops the capture first, and
   * the release that follows then found nothing to release and returned early.
   * Nothing cleared the flag afterwards, and because every gradient suppresses
   * its repaints while a drag is in flight, the surface silently stopped
   * updating for the rest of the component's life.
   */
  function end(event: PointerEvent, flush: boolean) {
    if (!isDragging.value) return;

    const target = event.target as HTMLElement | null;
    if (target?.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }

    if (flush) flushFrame();
    else discardFrame();

    rect.value = undefined;
    isDragging.value = false;
    options.onEnd();
  }

  /** Release: the last throttled move still counts. */
  function onPointerUp(event: PointerEvent) {
    end(event, true);
  }

  /**
   * Cancellation: the browser has taken the gesture over, so a move it never
   * showed the user is not committed. The value stays where the last delivered
   * move put it.
   */
  function onPointerCancel(event: PointerEvent) {
    end(event, false);
  }

  return { isDragging, rect, onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
