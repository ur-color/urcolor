import { describe, expect, it, mock } from "bun:test";
import { ref } from "vue";
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
});
