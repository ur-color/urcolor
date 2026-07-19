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
    ]) {
      expect(core).toHaveProperty(name);
    }
  });

  it("still exposes the gradient, geometry and space-config surface", () => {
    for (const name of [
      "drawGradient",
      "sampleChannelGrid",
      "polarToCartesian",
      "colorSpaces",
      "getChannelConfig",
    ]) {
      expect(core).toHaveProperty(name);
    }
  });

  it("round-trips a color through the public surface", () => {
    expect(core.Color.parse("#ff0000")?.to("hsl").toString()).toBe("hsl(0 100% 50%)");
  });
});
