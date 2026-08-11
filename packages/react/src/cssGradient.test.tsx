import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ColorAreaGradient } from "./components/color-area/gradient/ColorAreaGradient";
import { ColorAreaRoot } from "./components/color-area/root/ColorAreaRoot";
import { ColorRingGradient } from "./components/color-ring/gradient/ColorRingGradient";
import { ColorRingRoot } from "./components/color-ring/root/ColorRingRoot";
import { ColorSliderGradient } from "./components/color-slider/gradient/ColorSliderGradient";
import { ColorSliderRoot } from "./components/color-slider/root/ColorSliderRoot";
import { ColorTriangleGradient } from "./components/color-triangle/gradient/ColorTriangleGradient";
import { ColorTriangleRoot } from "./components/color-triangle/root/ColorTriangleRoot";
import { ColorWheelGradient } from "./components/color-wheel/gradient/ColorWheelGradient";
import { ColorWheelRoot } from "./components/color-wheel/root/ColorWheelRoot";

/**
 * Server rendering is the point of the CSS path, so these assert the markup a
 * server actually produces — `renderToStaticMarkup` runs with no DOM at all,
 * which is exactly the environment the canvas painters cannot work in.
 */

const BLUE = "hsl(210, 80%, 55%)";

describe("ColorSliderGradient", () => {
  const slider = (renderer: "auto" | "css" | "canvas", channel = "h", colorSpace = "hsl") =>
    renderToStaticMarkup(
      <ColorSliderRoot defaultValue={BLUE} colorSpace={colorSpace as "hsl"} channel={channel}>
        <ColorSliderGradient renderer={renderer} />
      </ColorSliderRoot>,
    );

  it("server-renders a gradient in every color space, including the perceptual ones", () => {
    for (const [space, channel] of [["hsl", "h"], ["oklch", "c"], ["lab", "a"]] as const) {
      const html = slider("auto", channel, space);
      expect(html).not.toContain("<canvas");
      expect(html).toContain("linear-gradient(90deg");
    }
  });

  it("emits more stops for a hue sweep than for a monotonic one", () => {
    // Count inside the gradient only — the checkerboard behind it also uses rgb().
    const stops = (channel: string) =>
      /linear-gradient\(90deg,[^"]*/.exec(slider("auto", channel))![0].match(/rgb\(/g)!.length;
    expect(stops("h")).toBe(36);
    expect(stops("l")).toBe(16);
  });

  it("falls back to the canvas when forced", () => {
    expect(slider("canvas")).toContain("<canvas");
  });
});

describe("ColorRingGradient", () => {
  const ring = (renderer: "auto" | "canvas") =>
    renderToStaticMarkup(
      <ColorRingRoot defaultValue={BLUE} colorSpace="hsl" channel="h">
        <ColorRingGradient renderer={renderer} />
      </ColorRingRoot>,
    );

  it("server-renders a conic gradient with no canvas", () => {
    const html = ring("auto");
    expect(html).not.toContain("<canvas");
    expect(html).toContain("conic-gradient(from 0deg");
  });

  it("falls back to the canvas when forced", () => {
    expect(ring("canvas")).toContain("<canvas");
  });
});

describe("ColorAreaGradient", () => {
  const area = (
    renderer: "auto" | "canvas",
    colorSpace: string,
    props: Record<string, unknown> = {},
  ) => renderToStaticMarkup(
    <ColorAreaRoot defaultValue={BLUE} colorSpace={colorSpace as "hsl"} {...props}>
      <ColorAreaGradient renderer={renderer} />
    </ColorAreaRoot>,
  );

  it("server-renders the default HSV area — hue × saturation", () => {
    const html = area("auto", "hsv");
    expect(html).not.toContain("<canvas");
    expect(html).toContain("linear-gradient(to right, rgb(255 0 0)");
  });

  it("server-renders an HSV saturation × value area", () => {
    const html = area("auto", "hsv", { xChannel: "s", yChannel: "v" });
    expect(html).not.toContain("<canvas");
    expect(html).toContain("#000");
  });

  it("server-renders an HSL saturation × lightness area", () => {
    const html = area("auto", "hsl", { xChannel: "s", yChannel: "l" });
    expect(html).not.toContain("<canvas");
    expect(html).toContain("rgb(128 128 128)");
  });

  it("keeps the canvas for a perceptual two-channel area", () => {
    const html = area("auto", "oklch", { xChannel: "c", yChannel: "l" });
    expect(html).toContain("<canvas");
  });

  it("server-renders corner colors as two masked rows", () => {
    const html = renderToStaticMarkup(
      <ColorAreaRoot defaultValue={BLUE} colorSpace="hsl">
        <ColorAreaGradient topLeft="red" topRight="blue" bottomLeft="lime" bottomRight="yellow" />
      </ColorAreaRoot>,
    );
    expect(html).not.toContain("<canvas");
    expect(html).toContain("linear-gradient(to right, rgb(0 255 0), rgb(255 255 0))");
    expect(html).toContain("mask-image");
  });

  it("keeps the canvas for corner colors with an interpolation space", () => {
    const html = renderToStaticMarkup(
      <ColorAreaRoot defaultValue={BLUE} colorSpace="hsl">
        <ColorAreaGradient topLeft="red" bottomRight="blue" interpolationSpace="oklab" />
      </ColorAreaRoot>,
    );
    expect(html).toContain("<canvas");
  });

  it("falls back to the canvas when forced", () => {
    expect(area("canvas", "hsv")).toContain("<canvas");
  });
});

describe("ColorWheelGradient", () => {
  const wheel = (renderer: "auto" | "canvas", colorSpace: string) =>
    renderToStaticMarkup(
      <ColorWheelRoot defaultValue={BLUE} colorSpace={colorSpace as "hsv"}>
        <ColorWheelGradient renderer={renderer} />
      </ColorWheelRoot>,
    );

  it("server-renders a hue conic under a saturation radial", () => {
    const html = wheel("auto", "hsv");
    expect(html).not.toContain("<canvas");
    expect(html).toContain("conic-gradient(from 0deg");
    expect(html).toContain("radial-gradient(circle closest-side");
  });

  it("keeps the canvas for a perceptual wheel", () => {
    expect(wheel("auto", "oklch")).toContain("<canvas");
  });

  it("falls back to the canvas when forced", () => {
    expect(wheel("canvas", "hsv")).toContain("<canvas");
  });
});

describe("ColorTriangleGradient", () => {
  it("always renders a canvas", () => {
    for (const renderer of ["auto", "css", "canvas"] as const) {
      const html = renderToStaticMarkup(
        <ColorTriangleRoot defaultValue={BLUE} colorSpace="hsv">
          <ColorTriangleGradient renderer={renderer} />
        </ColorTriangleRoot>,
      );
      expect(html).toContain("<canvas");
    }
  });
});
