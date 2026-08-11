import { describe, it, expect } from "bun:test";
import { createDragController, type DragPoint, type PointerLike } from "../src/drag";

function makeElement(rect: { left: number; top: number; width: number; height: number }) {
  const captured = new Set<number>();
  return {
    el: {
      getBoundingClientRect: () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => ({}) }) as DOMRect,
      setPointerCapture: (id: number) => { captured.add(id); },
      releasePointerCapture: (id: number) => { captured.delete(id); },
      hasPointerCapture: (id: number) => captured.has(id),
    } as unknown as HTMLElement,
    captured,
  };
}

function makeEvent(clientX: number, clientY: number, target: unknown): PointerLike {
  return { pointerId: 1, clientX, clientY, target: target as EventTarget, preventDefault: () => {} };
}

describe("createDragController", () => {
  it("normalizes a pointer position against the element rect", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 200, height: 100 });
    const moves: DragPoint[] = [];
    const c = createDragController({ getElement: () => el, onMove: p => moves.push(p) });
    c.pointerDown(makeEvent(100, 50, el));
    expect(moves).toHaveLength(1);
    expect(moves[0]!.normalizedX).toBeCloseTo(0.5, 5);
    expect(moves[0]!.normalizedY).toBeCloseTo(0.5, 5);
  });

  it("clamps a position outside the element into 0-1", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 200, height: 100 });
    const moves: DragPoint[] = [];
    const c = createDragController({ getElement: () => el, onMove: p => moves.push(p) });
    c.pointerDown(makeEvent(-50, 500, el));
    expect(moves[0]!.normalizedX).toBe(0);
    expect(moves[0]!.normalizedY).toBe(1);
  });

  it("reports dragging state across the gesture", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    const c = createDragController({ getElement: () => el, onMove: () => {} });
    expect(c.isDragging).toBe(false);
    c.pointerDown(makeEvent(5, 5, el));
    expect(c.isDragging).toBe(true);
    c.pointerUp(makeEvent(5, 5, el));
    expect(c.isDragging).toBe(false);
  });

  it("captures and releases the pointer", () => {
    const { el, captured } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    const c = createDragController({ getElement: () => el, onMove: () => {} });
    c.pointerDown(makeEvent(5, 5, el));
    expect(captured.has(1)).toBe(true);
    c.pointerUp(makeEvent(5, 5, el));
    expect(captured.has(1)).toBe(false);
  });

  it("does nothing when disabled", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    const moves: DragPoint[] = [];
    const c = createDragController({ getElement: () => el, onMove: p => moves.push(p), isDisabled: () => true });
    c.pointerDown(makeEvent(5, 5, el));
    expect(moves).toHaveLength(0);
    expect(c.isDragging).toBe(false);
  });

  it("aborts when hitTest rejects the point", () => {
    const { el, captured } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    const moves: DragPoint[] = [];
    const c = createDragController({ getElement: () => el, onMove: p => moves.push(p), hitTest: () => false });
    c.pointerDown(makeEvent(5, 5, el));
    expect(moves).toHaveLength(0);
    expect(captured.has(1)).toBe(false);
    expect(c.isDragging).toBe(false);
  });

  it("fires onStart and onEnd exactly once per gesture", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    let starts = 0, ends = 0;
    const c = createDragController({
      getElement: () => el,
      onMove: () => {},
      onStart: () => { starts++; },
      onEnd: () => { ends++; },
    });
    c.pointerDown(makeEvent(5, 5, el));
    c.pointerUp(makeEvent(5, 5, el));
    expect(starts).toBe(1);
    expect(ends).toBe(1);
  });

  it("ignores pointerup without a matching capture", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    let ends = 0;
    const c = createDragController({
      getElement: () => el,
      onMove: () => {},
      onEnd: () => { ends++; },
    });
    c.pointerUp(makeEvent(5, 5, el));
    expect(ends).toBe(0);
  });

  it("cancel clears dragging state", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 10, height: 10 });
    const c = createDragController({ getElement: () => el, onMove: () => {} });
    c.pointerDown(makeEvent(5, 5, el));
    c.cancel();
    expect(c.isDragging).toBe(false);
  });
});

describe("createDragController: releasing a stranded gesture", () => {
  it("ends the drag on pointerup even when capture was already lost", () => {
    const { el, captured } = makeElement({ left: 0, top: 0, width: 100, height: 100 });
    const ends: DragPoint[] = [];
    const c = createDragController({ getElement: () => el, onMove: () => {}, onEnd: p => ends.push(p) });

    c.pointerDown(makeEvent(50, 50, el));
    expect(c.isDragging).toBe(true);

    // The browser dropped the capture before the release reached us.
    captured.clear();
    c.pointerUp(makeEvent(60, 60, el));

    expect(c.isDragging).toBe(false);
    expect(ends).toHaveLength(1);
  });

  it("reports a cancelled gesture through onEnd, at the last delivered position", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 100, height: 100 });
    const ends: DragPoint[] = [];
    const c = createDragController({ getElement: () => el, onMove: () => {}, onEnd: p => ends.push(p) });

    c.pointerDown(makeEvent(50, 50, el));
    c.pointerCancel();

    expect(c.isDragging).toBe(false);
    expect(ends).toHaveLength(1);
    expect(ends[0]!.normalizedX).toBeCloseTo(0.5, 5);
  });

  it("stays silent when a teardown drops the gesture", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 100, height: 100 });
    const ends: DragPoint[] = [];
    const c = createDragController({ getElement: () => el, onMove: () => {}, onEnd: p => ends.push(p) });

    c.pointerDown(makeEvent(50, 50, el));
    // `cancel` is what a root calls as it is destroyed. Emitting from there
    // would hand a change event to an application that has already thrown the
    // control away.
    c.cancel();

    expect(c.isDragging).toBe(false);
    expect(ends).toHaveLength(0);
  });

  it("ignores a cancel for a gesture that never started", () => {
    const { el } = makeElement({ left: 0, top: 0, width: 100, height: 100 });
    const ends: DragPoint[] = [];
    const c = createDragController({ getElement: () => el, onMove: () => {}, onEnd: p => ends.push(p) });

    c.pointerCancel();

    expect(c.isDragging).toBe(false);
    expect(ends).toHaveLength(0);
  });
});
