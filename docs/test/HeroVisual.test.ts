import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import HeroVisual from "../.vitepress/components/HeroVisual.vue";

// The grid mounts SatSliders, whose ColorSliderGradient paints through WebGL.
// happy-dom returns null from `canvas.getContext("webgl")`, so
// `drawLinearGradient` throws out of a post-flush watcher. Same stub as
// `docs/test/HeroGridStage.test.ts` and `packages/vue/test/ColorSlider.test.ts`.
let originalGetContext: PropertyDescriptor | undefined;

function stubGl() {
  return {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    ARRAY_BUFFER: 3,
    STATIC_DRAW: 4,
    TRIANGLE_STRIP: 5,
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    useProgram: () => {},
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    getAttribLocation: () => 0,
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    getUniformLocation: () => ({}),
    uniform4fv: () => {},
    uniform1fv: () => {},
    uniform1i: () => {},
    uniform1f: () => {},
    viewport: () => {},
    drawArrays: () => {},
  };
}

beforeEach(() => {
  (window as unknown as Record<string, unknown>).matchMedia = () => ({
    matches: true,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
  });

  originalGetContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "getContext");
  const real = originalGetContext?.value as ((type: string, options?: unknown) => unknown) | undefined;
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value(this: HTMLCanvasElement, type: string, options?: unknown) {
      if (type === "webgl") return stubGl() as unknown as WebGLRenderingContext;
      return real?.call(this, type, options);
    },
  });
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).matchMedia;
  if (originalGetContext)
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", originalGetContext);
});

describe("HeroVisual", () => {
  it("provides the hero color to the grid it wraps", () => {
    const wrapper = mount(HeroVisual);
    expect(wrapper.find(".hero-grid").exists()).toBe(true);
    expect(wrapper.find("[data-core-mode]").exists()).toBe(true);
  });
});
