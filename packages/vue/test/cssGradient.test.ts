import { describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { ColorAreaGradient, ColorAreaRoot } from "../src/components/ColorArea";
import { ColorRingGradient, ColorRingRoot } from "../src/components/ColorRing";
import { ColorSliderGradient, ColorSliderRoot } from "../src/components/ColorSlider";
import { ColorTriangleGradient, ColorTriangleRoot } from "../src/components/ColorTriangle";
import { ColorWheelGradient, ColorWheelRoot } from "../src/components/ColorWheel";

type Renderer = "auto" | "css" | "canvas";

function mountGradient(
  root: unknown,
  rootProps: Record<string, unknown>,
  gradient: unknown,
  gradientProps: Record<string, unknown> = {},
) {
  return mount(defineComponent({
    setup() {
      return () => h(root as never, rootProps, {
        default: () => h(gradient as never, gradientProps),
      });
    },
  }));
}

describe("ColorSliderGradient", () => {
  function slider(renderer: Renderer, channel = "h", colorSpace = "hsl") {
    return mountGradient(
      ColorSliderRoot,
      { defaultValue: "hsl(210, 80%, 50%)", colorSpace, channel },
      ColorSliderGradient,
      { renderer },
    );
  }

  it("paints with CSS in every color space, including the perceptual ones", () => {
    for (const [space, channel] of [["hsl", "h"], ["oklch", "c"], ["lab", "a"]] as const) {
      const wrapper = slider("auto", channel, space);
      expect(wrapper.find("canvas").exists()).toBe(false);
      expect(wrapper.html()).toContain("linear-gradient(90deg");
    }
  });

  it("emits more stops for a hue sweep than for a monotonic one", () => {
    // Count inside the gradient only — the checkerboard behind it also uses rgb().
    const stops = (renderer: Renderer, channel: string) =>
      /linear-gradient\(90deg,[^;]*/.exec(slider(renderer, channel).html())![0]
        .match(/rgb\(/g)!.length;
    expect(stops("auto", "h")).toBe(36);
    expect(stops("auto", "l")).toBe(16);
  });

  it("falls back to the canvas when forced", () => {
    expect(slider("canvas").find("canvas").exists()).toBe(true);
  });
});

describe("ColorRingGradient", () => {
  function ring(renderer: Renderer) {
    return mountGradient(
      ColorRingRoot,
      { defaultValue: "hsl(210, 80%, 50%)", colorSpace: "hsl", channel: "h" },
      ColorRingGradient,
      { renderer },
    );
  }

  it("paints a conic gradient with no canvas", () => {
    const wrapper = ring("auto");
    expect(wrapper.find("canvas").exists()).toBe(false);
    expect(wrapper.html()).toContain("conic-gradient(from 0deg");
  });

  it("falls back to the canvas when forced", () => {
    expect(ring("canvas").find("canvas").exists()).toBe(true);
  });
});

describe("ColorAreaGradient", () => {
  function area(renderer: Renderer, colorSpace: string, value: string, extra: Record<string, unknown> = {}) {
    return mountGradient(
      ColorAreaRoot,
      { defaultValue: value, colorSpace, ...extra },
      ColorAreaGradient,
      { renderer },
    );
  }

  it("paints the default HSV area — hue × saturation — with CSS", () => {
    const wrapper = area("auto", "hsv", "hsl(210, 80%, 55%)");
    expect(wrapper.find("canvas").exists()).toBe(false);
    const html = wrapper.html();
    // A hue row under a white saturation ramp, with the fixed value flattened
    // into one translucent black layer.
    expect(html).toContain("linear-gradient(to right, rgb(255 0 0)");
    expect(html).toContain("rgb(255 255 255 / 0)");
  });

  it("stacks white and black over the hue for an HSV saturation × value area", () => {
    const wrapper = area("auto", "hsv", "hsl(210, 80%, 55%)", { xChannel: "s", yChannel: "v" });
    expect(wrapper.find("canvas").exists()).toBe(false);
    const html = wrapper.html();
    expect(html).toContain("rgb(255 255 255 / 0)");
    expect(html).toContain("#000");
  });

  it("paints an HSL saturation × lightness area with the gray ramp", () => {
    const wrapper = area("auto", "hsl", "hsl(210, 80%, 50%)", { xChannel: "s", yChannel: "l" });
    expect(wrapper.find("canvas").exists()).toBe(false);
    expect(wrapper.html()).toContain("rgb(128 128 128)");
  });

  it("keeps the canvas for a perceptual two-channel area", () => {
    const wrapper = area("auto", "oklch", "oklch(0.6 0.15 250)", {
      xChannel: "c",
      yChannel: "l",
    });
    expect(wrapper.find("canvas").exists()).toBe(true);
  });

  it("paints corner colors with CSS", () => {
    const wrapper = mountGradient(
      ColorAreaRoot,
      { defaultValue: "hsl(210, 80%, 50%)", colorSpace: "hsl" },
      ColorAreaGradient,
      { topLeft: "red", topRight: "blue", bottomLeft: "lime", bottomRight: "yellow" },
    );
    expect(wrapper.find("canvas").exists()).toBe(false);
    // The bottom row and the masked top row, in that order.
    const html = wrapper.html();
    expect(html).toContain("linear-gradient(to right, rgb(0 255 0), rgb(255 255 0))");
    expect(html).toContain("linear-gradient(to right, rgb(255 0 0), rgb(0 0 255))");
  });

  it("keeps the canvas for corner colors with an interpolation space", () => {
    const wrapper = mountGradient(
      ColorAreaRoot,
      { defaultValue: "hsl(210, 80%, 50%)", colorSpace: "hsl" },
      ColorAreaGradient,
      { topLeft: "red", bottomRight: "blue", interpolationSpace: "oklab" },
    );
    expect(wrapper.find("canvas").exists()).toBe(true);
  });

  it("falls back to the canvas when forced", () => {
    expect(area("canvas", "hsv", "hsl(210, 80%, 55%)").find("canvas").exists()).toBe(true);
  });
});

describe("ColorWheelGradient", () => {
  function wheel(renderer: Renderer, colorSpace: string, value: string) {
    return mountGradient(
      ColorWheelRoot,
      { defaultValue: value, colorSpace },
      ColorWheelGradient,
      { renderer },
    );
  }

  it("paints a hue conic under a saturation radial with no canvas", () => {
    const wrapper = wheel("auto", "hsv", "hsl(210, 80%, 55%)");
    expect(wrapper.find("canvas").exists()).toBe(false);
    const html = wrapper.html();
    expect(html).toContain("conic-gradient(from 0deg");
    expect(html).toContain("radial-gradient(circle closest-side");
  });

  it("keeps the canvas for a perceptual wheel", () => {
    expect(wheel("auto", "oklch", "oklch(0.6 0.15 250)").find("canvas").exists()).toBe(true);
  });

  it("falls back to the canvas when forced", () => {
    expect(wheel("canvas", "hsv", "hsl(210, 80%, 55%)").find("canvas").exists()).toBe(true);
  });
});

describe("ColorTriangleGradient", () => {
  it("always paints into a canvas", () => {
    for (const renderer of ["auto", "css", "canvas"] as const) {
      const wrapper = mountGradient(
        ColorTriangleRoot,
        { defaultValue: "hsl(210, 80%, 55%)", colorSpace: "hsv" },
        ColorTriangleGradient,
        { renderer },
      );
      expect(wrapper.find("canvas").exists()).toBe(true);
    }
  });
});
