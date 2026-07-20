import { describe, expect, it, mock, spyOn } from "bun:test";
import { effectScope, ref } from "vue";
import { usePointerDrag } from "../src/shared/usePointerDrag";

function makeEvent(overrides: Partial<PointerEvent> = {}) {
  const el = document.createElement("div");
  el.setPointerCapture = mock(() => {});
  el.releasePointerCapture = mock(() => {});
  el.hasPointerCapture = mock(() => true);
  return {
    pointerId: 1,
    clientX: 10,
    clientY: 10,
    target: el,
    preventDefault: mock(() => {}),
    ...overrides,
  } as unknown as PointerEvent;
}

describe("usePointerDrag", () => {
  it("marks dragging between down and up", () => {
    const drag = usePointerDrag({
      disabled: ref(false),
      target: ref(document.createElement("div")),
      onMove: () => {},
      onEnd: () => {},
    });
    expect(drag.isDragging.value).toBe(false);
    drag.onPointerDown(makeEvent());
    expect(drag.isDragging.value).toBe(true);
    drag.onPointerUp(makeEvent());
    expect(drag.isDragging.value).toBe(false);
  });

  it("ignores pointerdown when disabled", () => {
    const onMove = mock(() => {});
    const drag = usePointerDrag({
      disabled: ref(true),
      target: ref(document.createElement("div")),
      onMove,
      onEnd: () => {},
    });
    drag.onPointerDown(makeEvent());
    expect(drag.isDragging.value).toBe(false);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("rejects the gesture when canStart returns false", () => {
    const onMove = mock(() => {});
    const drag = usePointerDrag({
      disabled: ref(false),
      target: ref(document.createElement("div")),
      onMove,
      onEnd: () => {},
      canStart: () => false,
    });
    drag.onPointerDown(makeEvent());
    expect(drag.isDragging.value).toBe(false);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("calls onEnd once on release", () => {
    const onEnd = mock(() => {});
    const drag = usePointerDrag({
      disabled: ref(false),
      target: ref(document.createElement("div")),
      onMove: () => {},
      onEnd,
    });
    drag.onPointerDown(makeEvent());
    drag.onPointerUp(makeEvent());
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("commits the second move's position, not the first, when two moves land before the frame flushes (last-wins coalescing)", () => {
    // Two pointermoves land within the same rAF-throttled frame (the normal
    // case for any drag ending in motion, since pointermove fires faster than
    // 60 Hz in a real browser). The frame is still pending when release
    // flushes it, so whichever position flushFrame delivers is whatever
    // onPointerMove last recorded as pending - it must be the SECOND move
    // (x=180), not the first (x=100) that happened to schedule the frame.
    // The first-wins bug snapshots the coordinates only on the call that
    // schedules the frame, so a second move landing before that frame fires
    // is silently dropped; this test fails under that bug with x=100.
    const moves: number[] = [];
    const drag = usePointerDrag({
      disabled: ref(false),
      target: ref(document.createElement("div")),
      onMove: (event, phase) => {
        if (phase === "move") moves.push(event.clientX);
      },
      onEnd: () => {},
    });
    drag.onPointerDown(makeEvent({ clientX: 10 }));
    drag.onPointerMove(makeEvent({ clientX: 100 }));
    drag.onPointerMove(makeEvent({ clientX: 180 }));
    drag.onPointerUp(makeEvent({ clientX: 180 }));
    expect(moves).toEqual([180]);
  });

  it("completes a drag that started while enabled even if disabled flips mid-gesture", () => {
    // The composable only checks `disabled` on pointerdown, by design: an
    // earlier ColorAreaArea returned early on `disabled` in onPointerUp
    // BEFORE releasePointerCapture(), which left the pointer permanently
    // captured and the root's drag state stuck - an unrecoverable state, not
    // a safe freeze. So once a gesture is underway, disabled flipping mid-way
    // must not block its move or its release.
    const disabled = ref(false);
    const onMove = mock(() => {});
    const onEnd = mock(() => {});
    const drag = usePointerDrag({
      disabled,
      target: ref(document.createElement("div")),
      onMove,
      onEnd,
    });

    drag.onPointerDown(makeEvent());
    expect(onMove).toHaveBeenCalledTimes(1);

    disabled.value = true;
    drag.onPointerMove(makeEvent({ clientX: 50 }));
    drag.onPointerUp(makeEvent({ clientX: 50 }));

    // The buffered move is flushed on release, and onEnd still fires - the
    // gesture completed rather than freezing mid-drag.
    expect(onMove).toHaveBeenCalledTimes(2);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(drag.isDragging.value).toBe(false);
  });

  it("cancels a pending frame's rAF when the owning effect scope is disposed", () => {
    // A component unmounting mid-drag tears down the effect scope it was set
    // up in; a frame scheduled before that must not be left to fire against
    // the torn-down component. Assert via the actual browser API rather than
    // internal state, since the internal `frame` handle isn't exposed.
    const cafSpy = spyOn(globalThis, "cancelAnimationFrame");
    let drag!: ReturnType<typeof usePointerDrag>;
    const scope = effectScope();
    scope.run(() => {
      drag = usePointerDrag({
        disabled: ref(false),
        target: ref(document.createElement("div")),
        onMove: () => {},
        onEnd: () => {},
      });
    });

    drag.onPointerDown(makeEvent());
    drag.onPointerMove(makeEvent({ clientX: 50 }));
    cafSpy.mockClear();

    scope.stop();

    expect(cafSpy).toHaveBeenCalledTimes(1);
    cafSpy.mockRestore();
  });
});
