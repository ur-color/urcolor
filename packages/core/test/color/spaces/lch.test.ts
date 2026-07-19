import { describe, expect, test } from "bun:test";
import type { Coords } from "../../../src/color/types";
import { labToLch, lchToLab, parseLch, serializeLch } from "../../../src/color/spaces/lch";
import { parseOklch, serializeOklch } from "../../../src/color/spaces/oklch";

const close = (a: Coords, b: Coords, d = 4): void => {
  for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i] as number, d);
};

describe("labToLch", () => {
  test("converts a/b to chroma/hue", () => {
    // a=b -> hue 45deg, chroma = sqrt(2)*|a|.
    close(labToLch([50, 30, 30]), [50, Math.hypot(30, 30), 45]);
  });
  test("achromatic -> chroma 0", () => {
    const [, c] = labToLch([50, 0, 0]);
    expect(c).toBe(0);
  });
  test("round-trips", () => {
    const lab: Coords = [54, 80, 69];
    close(lchToLab(labToLch(lab)), lab);
  });
});

describe("parseLch", () => {
  test("parses lch()", () => {
    const c = parseLch("lch(54.29 106.84 40.85)");
    expect(c?.space).toBe("lch");
    close((c as { coords: Coords }).coords, [54.29, 106.84, 40.85]);
  });
  test("hue accepts deg units", () => {
    expect(parseLch("lch(50 20 90deg)")?.coords[2]).toBe(90);
  });
});

describe("serializeLch / oklch", () => {
  test("serializes lch()", () => {
    expect(serializeLch({ space: "lch", coords: [54.29, 106.84, 40.85], alpha: 1 })).toBe("lch(54.29 106.84 40.85)");
  });
  test("parses and serializes oklch()", () => {
    expect(parseOklch("oklch(0.628 0.258 29.23)")?.space).toBe("oklch");
    expect(serializeOklch({ space: "oklch", coords: [0.628, 0.258, 29.23], alpha: 1 })).toBe(
      "oklch(0.628 0.258 29.23)",
    );
  });
});
