import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { provideHeroColor } from "../.vitepress/composables/useHeroColor";
import { useBrandHue } from "../.vitepress/composables/useBrandHue";
import HeroGrid from "../.vitepress/components/HeroGrid.vue";

// The stage mounts SatSliders, whose ColorSliderGradient paints through WebGL.
// happy-dom returns null from `canvas.getContext("webgl")`, so
// `drawLinearGradient` throws out of a post-flush watcher. Same stub as
// `docs/test/SatControls.test.ts` and `packages/vue/test/ColorSlider.test.ts`.
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

const Harness = defineComponent({
  setup() {
    const color = provideHeroColor();
    return { color };
  },
  render() {
    return h("div", [h(HeroGrid)]);
  },
});

describe("HeroGrid", () => {
  it("renders every panel", () => {
    const wrapper = mount(Harness);
    for (const id of ["hex", "name", "formats", "swatches", "sliders", "fields"]) {
      expect(wrapper.find(`[data-panel-id="${id}"]`).exists()).toBe(true);
    }
  });

  it("renders the instrument in a chromeless panel", () => {
    const wrapper = mount(Harness);
    expect(wrapper.find("[data-core-mode]").exists()).toBe(true);
    expect(wrapper.find("[data-panel-id=\"instrument\"]").classes()).toContain("hero-panel-plain");
  });

  it("exposes the responsive mode on the stage", () => {
    const stage = mount(Harness).find(".hero-grid");
    // `attributes()` is `string | undefined`; the fallback keeps the assertion
    // failing (rather than not type-checking) when the attribute is absent.
    expect(["grid", "compact", "stack"]).toContain(stage.attributes("data-mode") ?? "");
  });

  it("pushes the color hue into the shared brand hue", async () => {
    const wrapper = mount(Harness);
    wrapper.vm.color = new Color("hsv", [120, 1, 1]);
    await wrapper.vm.$nextTick();
    expect(useBrandHue().value).toBeCloseTo(120, 0);
  });
});
