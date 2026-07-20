import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { defineComponent, h, nextTick, reactive, ref } from "vue";
import { Color } from "@urcolor/core";
import { ColorTriangleGradient, ColorTriangleRoot } from "../src/components/ColorTriangle";
import { applyChannelOverrides, useGradientCanvas } from "../src/shared/useGradientCanvas";

/**
 * A ResizeObserver that never fires, so a paint can only come from a watcher.
 * The real one invokes its callback as soon as `observe()` is called, which
 * would otherwise mask which trigger did the painting.
 */
function inertResizeObserver() {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/** Reproduces the real observer's paint-on-observe. */
function firingResizeObserver() {
  globalThis.ResizeObserver = class ResizeObserver {
    callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback([{ target } as ResizeObserverEntry], this as unknown as globalThis.ResizeObserver);
    }

    unobserve() {}
    disconnect() {}
  };
}

/**
 * Mount a component that does nothing but drive `useGradientCanvas` over a real
 * canvas, so the composable runs through the same lifecycle the gradients give
 * it — template ref, mount, unmount — rather than bare.
 */
function mountHarness(options: {
  sources: () => unknown;
  paint: (canvas: HTMLCanvasElement) => void;
  isDragging?: ReturnType<typeof ref<boolean>>;
  usesWebGL?: boolean;
  deep?: boolean;
}) {
  return mount(defineComponent({
    setup() {
      const canvasRef = ref<HTMLCanvasElement | null>(null);
      useGradientCanvas({
        canvas: canvasRef,
        sources: options.sources,
        paint: options.paint,
        isDragging: options.isDragging as never,
        usesWebGL: options.usesWebGL,
        deep: options.deep,
      });
      return () => h("canvas", { ref: canvasRef });
    },
  }), { attachTo: document.body });
}

describe("useGradientCanvas", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    inertResizeObserver();
  });

  // The source watch is not `immediate` (it used to be, on this composable
  // and on the two pre-refactor components that carried it): an immediate
  // callback runs synchronously during setup, before the template ref is
  // assigned, so `render()` would always bail and it could never be the
  // first paint regardless. The resize observer is the only first-paint
  // mechanism, and a real one always fires on `observe()`. This is pinned
  // here so a future change to either trigger has to face it.
  it("delivers the first paint from the resize observer, not the immediate watch", async () => {
    const withoutObserver = mock(() => {});
    mountHarness({ sources: () => [1], paint: withoutObserver });
    await nextTick();
    await nextTick();
    expect(withoutObserver).not.toHaveBeenCalled();

    firingResizeObserver();
    const withObserver = mock(() => {});
    mountHarness({ sources: () => [1], paint: withObserver });
    await nextTick();
    await nextTick();
    expect(withObserver).toHaveBeenCalledTimes(1);
  });

  it("repaints when a tracked source changes", async () => {
    const source = ref(1);
    const paint = mock(() => {});
    mountHarness({ sources: () => [source.value], paint });
    await nextTick();
    await nextTick();
    const afterMount = paint.mock.calls.length;

    source.value = 2;
    await nextTick();
    await nextTick();

    expect(paint.mock.calls.length).toBe(afterMount + 1);
  });

  it("does not repaint while dragging, and repaints exactly once on the falling edge", async () => {
    const source = ref(1);
    const isDragging = ref(false);
    const paint = mock(() => {});
    mountHarness({ sources: () => [source.value], paint, isDragging });
    await nextTick();
    await nextTick();
    const afterMount = paint.mock.calls.length;

    isDragging.value = true;
    source.value = 2;
    await nextTick();
    source.value = 3;
    await nextTick();
    await nextTick();
    expect(paint.mock.calls.length).toBe(afterMount);

    isDragging.value = false;
    await nextTick();
    await nextTick();
    expect(paint.mock.calls.length).toBe(afterMount + 1);
  });

  it("repaints freely when no isDragging ref is supplied", async () => {
    const source = ref(1);
    const paint = mock(() => {});
    mountHarness({ sources: () => [source.value], paint });
    await nextTick();
    const afterMount = paint.mock.calls.length;

    source.value = 2;
    await nextTick();
    await nextTick();

    expect(paint.mock.calls.length).toBe(afterMount + 1);
  });

  // `Color` instances (the real payload every gradient's `sources` carries)
  // are not reactive, so `deep` cannot be pinned through a real gradient's
  // repaint count — a plain reactive object stands in here as a source that
  // *can* expose the difference `deep` makes. `sources` returns the same
  // array reference on every read (`state.items`, not a rebuilt literal), so
  // only a traversal-based dependency — the thing `deep: true` adds — sees
  // the nested mutation. `ColorSliderGradient` passes `deep: true` for
  // fidelity to its pre-refactor watch, not because this scenario occurs
  // there; see the comment beside its `deep: true` for why it is likely inert
  // in practice.
  it("reaches the `deep` option through to the watch: a nested mutation without a reference change still triggers a repaint", async () => {
    const state = reactive({ items: [{ v: 1 }] });
    const paint = mock(() => {});
    mountHarness({ sources: () => [state.items], paint, deep: true });
    await nextTick();
    await nextTick();
    const afterMount = paint.mock.calls.length;

    state.items[0]!.v = 2; // same array reference — only a deep watch sees this
    await nextTick();
    await nextTick();

    expect(paint.mock.calls.length).toBe(afterMount + 1);
  });

  it("does not paint when the canvas ref is never populated", async () => {
    firingResizeObserver();
    const paint = mock(() => {});
    const source = ref(1);
    mount(defineComponent({
      setup() {
        const canvasRef = ref<HTMLCanvasElement | null>(null);
        useGradientCanvas({ canvas: canvasRef, sources: () => [source.value], paint });
        return () => h("div");
      },
    }), { attachTo: document.body });
    await nextTick();
    source.value = 2;
    await nextTick();
    await nextTick();

    expect(paint).not.toHaveBeenCalled();
  });

  describe("WebGL teardown", () => {
    let originalGetContext: PropertyDescriptor | undefined;
    let loseContext: ReturnType<typeof mock>;
    let webglRequests: string[];

    beforeEach(() => {
      loseContext = mock(() => {});
      webglRequests = [];
      originalGetContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "getContext");
      const inner = originalGetContext?.value as ((type: string, options?: unknown) => unknown) | undefined;
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        configurable: true,
        value(this: HTMLCanvasElement, type: string, options?: unknown) {
          if (type === "webgl") {
            webglRequests.push(type);
            return { getExtension: () => ({ loseContext }) } as unknown as WebGLRenderingContext;
          }
          return inner?.call(this, type, options);
        },
      });
    });

    afterEach(() => {
      if (originalGetContext)
        Object.defineProperty(HTMLCanvasElement.prototype, "getContext", originalGetContext);
    });

    it("loses the WebGL context on unmount when usesWebGL is set", async () => {
      const wrapper = mountHarness({ sources: () => [1], paint: () => {}, usesWebGL: true });
      await nextTick();

      wrapper.unmount();

      expect(loseContext).toHaveBeenCalledTimes(1);
    });

    // Acquiring a context purely to destroy it is what the old per-component
    // teardown did on four 2D-only canvases.
    it("never asks for a WebGL context when usesWebGL is unset", async () => {
      const wrapper = mountHarness({ sources: () => [1], paint: () => {} });
      await nextTick();

      wrapper.unmount();

      expect(webglRequests).toEqual([]);
      expect(loseContext).not.toHaveBeenCalled();
    });
  });
});

describe("applyChannelOverrides", () => {
  const base = Color.parse("hsl(210, 80%, 50%)")!;

  it("returns the color untouched for `false`", () => {
    expect(applyChannelOverrides(base, "hsl", false)).toBe(base);
  });

  it("applies alpha and coordinate channels together", () => {
    const result = applyChannelOverrides(base, "hsl", { s: 1, alpha: 0.5 });
    expect(result.space).toBe("hsl");
    expect(result.get("s")).toBeCloseTo(1, 6);
    expect(result.alpha).toBeCloseTo(0.5, 6);
  });

  it("drops override keys the target space does not define", () => {
    // `v` is HSV-only; forwarding it to `Color#with()` in HSL throws a
    // RangeError, which is how this used to break from the documented example.
    expect(() => applyChannelOverrides(base, "hsl", { s: 1, v: 1 })).not.toThrow();
    expect(applyChannelOverrides(base, "hsl", { v: 1 }).get("s")).toBeCloseTo(base.get("s"), 6);
  });

  it("converts into the target space when a coordinate override is applied", () => {
    const result = applyChannelOverrides(base, "hsv", { v: 1 });
    expect(result.space).toBe("hsv");
    expect(result.get("v")).toBeCloseTo(1, 6);
  });
});

describe("ColorTriangleGradient first paint", () => {
  const originals: [object, string, PropertyDescriptor | undefined][] = [];
  let drawImageCalls: number;

  function override(target: object, key: string, descriptor: PropertyDescriptor) {
    originals.push([target, key, Object.getOwnPropertyDescriptor(target, key)]);
    Object.defineProperty(target, key, { configurable: true, ...descriptor });
  }

  beforeEach(() => {
    document.body.innerHTML = "";
    firingResizeObserver();
    drawImageCalls = 0;

    // happy-dom implements neither a 2D context nor OffscreenCanvas, so the
    // gradients silently paint nothing here. Stub the narrow surface
    // `renderToCanvas` touches and count `drawImage` — one call per frame that
    // actually reached the canvas.
    const ctx2d = {
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      arc: () => {},
      clip: () => {},
      putImageData: () => {},
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
      drawImage: () => { drawImageCalls++; },
    };
    override(HTMLCanvasElement.prototype, "getContext", { value: () => ctx2d });
    override(HTMLElement.prototype, "clientWidth", { get: () => 100 });
    override(HTMLElement.prototype, "clientHeight", { get: () => 100 });
    (globalThis as Record<string, unknown>).OffscreenCanvas = class {
      getContext() { return ctx2d; }
    };
    (globalThis as Record<string, unknown>).ImageData = class {
      constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
    };
  });

  afterEach(() => {
    for (const [target, key, descriptor] of originals.reverse()) {
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else Reflect.deleteProperty(target, key);
    }
    originals.length = 0;
    Reflect.deleteProperty(globalThis as Record<string, unknown>, "OffscreenCanvas");
    Reflect.deleteProperty(globalThis as Record<string, unknown>, "ImageData");
  });

  it("paints on mount", async () => {
    mount(defineComponent({
      setup() {
        return () =>
          // `hsv(...)` is not a CSS colour function and does not parse; the
          // equivalent sRGB literal is what the other triangle tests use.
          h(ColorTriangleRoot, { defaultValue: "rgb(64 128 128)", colorSpace: "hsv", xChannel: "s", yChannel: "v" }, {
            default: () => h(ColorTriangleGradient),
          });
      },
    }), { attachTo: document.body });

    await nextTick();
    await nextTick();

    expect(drawImageCalls).toBeGreaterThan(0);
  });
});
