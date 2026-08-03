import { describe, expect, it } from "bun:test";
import * as shared from "../src/index";

describe("@urcolor/shared exports", () => {
  it("exposes the picker behavior surface", () => {
    for (const name of [
      "clamp",
      "snapToStep",
      "renderToCanvas",
      "CHECKERBOARD_BACKGROUND",
      "resolveChannelConfig",
      "ALPHA_CONFIG",
    ]) {
      expect(shared).toHaveProperty(name);
    }
  });

  it("exposes the gradient surface", () => {
    for (const name of [
      "drawGradient",
      "drawLinearGradient",
      "interpolateStops",
      "sampleBilinearGrid",
      "sampleChannelGrid",
      "sampleTriangleGrid",
      "samplePolarGrid",
      "sampleConicRing",
    ]) {
      expect(shared).toHaveProperty(name);
    }
  });

  it("exposes the geometry surface", () => {
    for (const name of [
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
    ]) {
      expect(shared).toHaveProperty(name);
    }
  });

  it("exposes the space-config surface", () => {
    for (const name of [
      "colorSpaces",
      "getChannelConfig",
      "displayToNative",
      "nativeToDisplay",
    ]) {
      expect(shared).toHaveProperty(name);
    }
  });
});
