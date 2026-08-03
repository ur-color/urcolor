import { describe, expect, it } from "bun:test";
import * as core from "../src/index";

describe("@urcolor/core exports", () => {
  it("exposes the color library", () => {
    for (const name of [
      "Color",
      "parse",
      "tryParse",
      "serialize",
      "convert",
      "gamutMap",
      "inGamut",
      "interpolate",
      "mix",
      "lighten",
      "darken",
      "saturate",
      "desaturate",
      "rotateHue",
      "negate",
      "complement",
      "alpha",
      "deltaE",
      "deltaEOK",
      "contrast",
      "NAMED_COLORS",
      "parseNamed",
      "SPACES",
      "spaceDef",
      "hueIndexOf",
      "channelIndexOf",
    ]) {
      expect(core).toHaveProperty(name);
    }
  });

  it("no longer exposes the gradient, geometry or space-config surface", () => {
    for (const name of [
      "drawGradient",
      "drawLinearGradient",
      "interpolateStops",
      "sampleBilinearGrid",
      "sampleChannelGrid",
      "sampleTriangleGrid",
      "samplePolarGrid",
      "sampleConicRing",
      "polarToCartesian",
      "cartesianToPolar",
      "clampToCircle",
      "normalizeAngle",
      "triangleVertices",
      "barycentricCoords",
      "barycentricToCartesian",
      "pointInTriangle",
      "clampToTriangle",
      "insetTriangle",
      "colorSpaces",
      "getChannelConfig",
      "displayToNative",
      "nativeToDisplay",
    ]) {
      expect(core).not.toHaveProperty(name);
    }
  });

  it("round-trips a color through the public surface", () => {
    expect(core.Color.parse("#ff0000")?.to("hsl").toString()).toBe("hsl(0 100% 50%)");
  });
});
