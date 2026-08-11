import { afterEach, describe, it, expect } from "bun:test";
import { measureBox } from "../src/transform";

/**
 * A real element, so `getComputedStyle` resolves, with its measurements stubbed
 * — layout never runs in this environment, so every box would otherwise be 0.
 *
 * `rect` is what `getBoundingClientRect` reports, which for a transformed
 * element is the axis-aligned bounds of the transformed box, not the box.
 */
function element(options: {
  width: number;
  height: number;
  rect: { left: number; top: number; width: number; height: number };
  transform?: string;
  origin?: string;
}): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  if (options.transform) el.style.transform = options.transform;
  // happy-dom leaves `transform-origin` unresolved unless it is set outright; a
  // browser always reports it in pixels.
  el.style.transformOrigin = options.origin ?? `${options.width / 2}px ${options.height / 2}px`;

  Object.defineProperty(el, "offsetWidth", { value: options.width, configurable: true });
  Object.defineProperty(el, "offsetHeight", { value: options.height, configurable: true });
  const { left, top, width, height } = options.rect;
  el.getBoundingClientRect = () => ({
    left, top, width, height, right: left + width, bottom: top + height, x: left, y: top,
    toJSON: () => ({}),
  }) as DOMRect;
  return el;
}

describe("measureBox", () => {
  it("normalizes against the rect when there is no transform", () => {
    const el = element({ width: 200, height: 100, rect: { left: 20, top: 10, width: 200, height: 100 } });
    const box = measureBox(el);

    expect(box.width).toBe(200);
    expect(box.height).toBe(100);
    expect(box.normalize(120, 60)).toEqual({ x: 0.5, y: 0.5 });
    expect(box.normalize(20, 10)).toEqual({ x: 0, y: 0 });
  });

  it("leaves a point outside the box unclamped", () => {
    const el = element({ width: 200, height: 100, rect: { left: 0, top: 0, width: 200, height: 100 } });
    const { x, y } = measureBox(el).normalize(-100, 200);

    expect(x).toBeCloseTo(-0.5, 5);
    expect(y).toBeCloseTo(2, 5);
  });

  it("undoes a half turn, so the corners swap", () => {
    // A 180° rotation about the centre maps the box onto itself, so the rect is
    // unchanged — only the mapping into it is inverted.
    const el = element({
      width: 200, height: 100,
      rect: { left: 0, top: 0, width: 200, height: 100 },
      transform: "rotate(180deg)",
    });
    const box = measureBox(el);

    expect(box.normalize(200, 100).x).toBeCloseTo(0, 5);
    expect(box.normalize(200, 100).y).toBeCloseTo(0, 5);
    expect(box.normalize(0, 0).x).toBeCloseTo(1, 5);
    expect(box.normalize(0, 0).y).toBeCloseTo(1, 5);
    expect(box.normalize(100, 50).x).toBeCloseTo(0.5, 5);
  });

  it("undoes a quarter turn, so the axes swap", () => {
    // A square turned 90° about its centre also keeps its bounds.
    const el = element({
      width: 100, height: 100,
      rect: { left: 0, top: 0, width: 100, height: 100 },
      transform: "rotate(90deg)",
    });
    const box = measureBox(el);

    // Screen top-right is local top-left once the turn is undone.
    expect(box.normalize(100, 0).x).toBeCloseTo(0, 5);
    expect(box.normalize(100, 0).y).toBeCloseTo(0, 5);
    expect(box.normalize(0, 0).x).toBeCloseTo(0, 5);
    expect(box.normalize(0, 0).y).toBeCloseTo(1, 5);
  });

  it("undoes a scale, which grows the reported rect", () => {
    // Scaling 2x about the centre of a 100x100 box leaves bounds twice the size.
    const el = element({
      width: 100, height: 100,
      rect: { left: -50, top: -50, width: 200, height: 200 },
      transform: "scale(2)",
    });
    const box = measureBox(el);

    expect(box.width).toBe(100);
    expect(box.normalize(-50, -50).x).toBeCloseTo(0, 5);
    expect(box.normalize(150, 150).x).toBeCloseTo(1, 5);
    expect(box.normalize(50, 50).x).toBeCloseTo(0.5, 5);
  });

  it("falls back to the plain mapping for a 3D transform", () => {
    // A projection cannot be inverted back onto the element's plane.
    const el = element({
      width: 200, height: 100,
      rect: { left: 0, top: 0, width: 200, height: 100 },
      transform: "perspective(500px) rotateY(40deg)",
    });

    expect(measureBox(el).normalize(100, 50)).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe("measureBox, independent transform properties", () => {
  /**
   * `rotate`, `scale` and `translate` are their own properties, and an element
   * using them reports `transform: none`. Tailwind's `rotate-*` utilities emit
   * the independent property, so this is the common case, not the exotic one.
   *
   * `getComputedStyle` is stubbed because happy-dom does not implement any of
   * the three: it reports them as `undefined`, which would silently exercise
   * the no-transform path instead of the one under test.
   */
  function withComputed(
    computed: { rotate?: string; scale?: string; translate?: string; transform?: string },
    rect: { left: number; top: number; width: number; height: number },
    size = { width: 100, height: 100 },
  ): HTMLElement {
    const el = document.createElement("div");
    Object.defineProperty(el, "offsetWidth", { value: size.width, configurable: true });
    Object.defineProperty(el, "offsetHeight", { value: size.height, configurable: true });
    el.getBoundingClientRect = () => ({
      ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height,
      x: rect.left, y: rect.top, toJSON: () => ({}),
    }) as DOMRect;

    const real = globalThis.getComputedStyle;
    (globalThis as { getComputedStyle: unknown }).getComputedStyle = (target: Element) =>
      target === el
        ? {
            transform: "none",
            transformOrigin: `${size.width / 2}px ${size.height / 2}px`,
            ...computed,
          }
        : real(target);
    restore = () => {
      (globalThis as { getComputedStyle: unknown }).getComputedStyle = real;
    };
    return el;
  }

  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it("undoes `rotate` even though `transform` is none", () => {
    // A square turned 90° about its centre keeps its bounds.
    const box = measureBox(withComputed({ rotate: "90deg" }, { left: 0, top: 0, width: 100, height: 100 }));

    // Screen right-middle is local top-centre once the quarter turn is undone.
    expect(box.normalize(100, 50).x).toBeCloseTo(0.5, 5);
    expect(box.normalize(100, 50).y).toBeCloseTo(0, 5);
  });

  it("undoes `translate`, which shifts the reported rect with it", () => {
    const box = measureBox(withComputed({ translate: "10px 20px" }, { left: 10, top: 20, width: 100, height: 100 }));

    expect(box.normalize(10, 20).x).toBeCloseTo(0, 5);
    expect(box.normalize(10, 20).y).toBeCloseTo(0, 5);
    expect(box.normalize(110, 120).x).toBeCloseTo(1, 5);
  });

  it("resolves a percentage `translate` against the element's own box", () => {
    const box = measureBox(withComputed({ translate: "50%" }, { left: 50, top: 0, width: 100, height: 100 }));

    expect(box.normalize(50, 0).x).toBeCloseTo(0, 5);
    expect(box.normalize(150, 0).x).toBeCloseTo(1, 5);
  });

  it("composes `rotate` with `scale`", () => {
    // Scaled 2x about the centre, then the bounds double either way the square turns.
    const box = measureBox(
      withComputed({ rotate: "90deg", scale: "2" }, { left: -50, top: -50, width: 200, height: 200 }),
    );

    expect(box.normalize(150, 50).x).toBeCloseTo(0.5, 5);
    expect(box.normalize(150, 50).y).toBeCloseTo(0, 5);
  });

  it("falls back to the plain mapping for a rotation off the plane", () => {
    const box = measureBox(withComputed({ rotate: "x 45deg" }, { left: 0, top: 0, width: 100, height: 100 }));

    expect(box.normalize(50, 50)).toEqual({ x: 0.5, y: 0.5 });
  });
});
