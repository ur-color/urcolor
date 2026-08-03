import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

// `HeroBgCanvas` calls `useData()` from "vitepress". Under `bun test` the
// "vitepress" specifier resolves to the *node* build, which exports neither
// `useData` nor `inBrowser`, so the import throws before any test runs. Mock
// the client surface, then load `HeroSection` dynamically so the mock is in
// place first (static imports are hoisted above it).
mock.module("vitepress", () => ({
  useData: () => ({ isDark: ref(false) }),
  inBrowser: true,
}));

const HeroSection = (await import("../.vitepress/components/HeroSection.vue")).default;

// The orbit mounts SatSliders, whose ColorSliderGradient paints through WebGL.
// happy-dom returns null from `canvas.getContext("webgl")`, so
// `drawLinearGradient` throws out of a post-flush watcher. Same stub as
// `docs/test/HeroOrbitStage.test.ts` and `packages/vue/test/ColorSlider.test.ts`.
let originalGetContext: PropertyDescriptor | undefined;

// `HeroBgCanvas` runs its own shader on top of the slider gradients and calls a
// wider slice of the GL surface, so unknown members fall through to a noop
// rather than being enumerated one by one.
function stubGl() {
  return new Proxy(baseGl(), {
    get(target: Record<string, unknown>, key: string) {
      if (key in target) return target[key];
      return () => ({});
    },
  });
}

function baseGl(): Record<string, unknown> {
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

describe("HeroSection", () => {
  it("provides the hero color to the grid", () => {
    const wrapper = mount(HeroSection);
    expect(wrapper.find(".hero-grid").exists()).toBe(true);
    expect(wrapper.find("[data-core-mode]").exists()).toBe(true);
  });

  it("titles the hero with the wordmark alone", () => {
    expect(mount(HeroSection).find("h1.hero-title").text()).toBe("Color");
  });

  it("keeps both calls to action", () => {
    const wrapper = mount(HeroSection);
    const hrefs = wrapper.findAll("a.hero-btn").map(a => a.attributes("href"));
    expect(hrefs).toContain("/guide/");
    expect(hrefs).toContain("/components/");
  });

  it("still renders the features grid", () => {
    expect(mount(HeroSection).find(".feature-grid").exists()).toBe(true);
  });
});
