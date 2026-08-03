import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { computed, defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { provideDocsLang } from "../.vitepress/composables/useDocsLang";
import { provideHeroColor } from "../.vitepress/composables/useHeroColor";
import SatFields from "../.vitepress/components/hero/SatFields.vue";
import SatSliders from "../.vitepress/components/hero/SatSliders.vue";

// ColorSliderGradient paints through WebGL, which happy-dom does not
// implement — `canvas.getContext("webgl")` returns null and
// `drawLinearGradient` throws. Thrown from a post-flush watcher, that also
// wedges Vue's scheduler, so a *later*, unrelated `mount()` comes back with a
// null `vm`. Stub the same slice of the API surface `packages/vue/test/
// ColorSlider.test.ts` stubs, so the gradient paints quietly.
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
  if (originalGetContext)
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", originalGetContext);
});

function harness(Inner: unknown, lang = "en") {
  return defineComponent({
    setup() {
      const color = provideHeroColor();
      provideDocsLang(computed(() => lang));
      return { color };
    },
    render() {
      return h("div", [h(Inner as never)]);
    },
  });
}

describe("SatSliders", () => {
  it("renders one slider per channel: h, s, v, alpha", () => {
    const wrapper = mount(harness(SatSliders));
    expect(wrapper.findAll("[role='slider']")).toHaveLength(4);
  });

  it("reflects the shared color", async () => {
    const wrapper = mount(harness(SatSliders));
    wrapper.vm.color = new Color("hsv", [120, 1, 1]);
    await wrapper.vm.$nextTick();
    const hue = wrapper.findAll("[role='slider']")[0]!;
    expect(Number(hue.attributes("aria-valuenow"))).toBeCloseTo(120, 0);
  });
});

describe("SatFields", () => {
  it("renders four channel inputs labelled from @urcolor/i18n", () => {
    const wrapper = mount(harness(SatFields));
    expect(wrapper.findAll("input")).toHaveLength(4);
    const labels = wrapper.findAll(".sat-field-label").map(l => l.text());
    expect(labels).toEqual(["Hue", "Saturation", "Value", "Alpha"]);
  });

  it("translates the channel labels with the page language", () => {
    const wrapper = mount(harness(SatFields, "ru"));
    const labels = wrapper.findAll(".sat-field-label").map(l => l.text());
    expect(labels).toEqual(["Тон", "Насыщенность", "Значение", "Альфа"]);
    // The accessible name travels with the visible label.
    expect(wrapper.findAll("input")[0]!.attributes("aria-label")).toBe("Тон");
  });

  it("writes a typed value back into the shared color", async () => {
    const wrapper = mount(harness(SatFields));
    const hue = wrapper.findAll("input")[0]!;
    await hue.setValue("200");
    await hue.trigger("blur");
    expect(wrapper.vm.color.to("hsv").get("h")).toBeCloseTo(200, 0);
  });
});
