import { describe, expect, test } from "bun:test";
import { deltaE } from "../../src/color/deltaE";
import { parse } from "../../src/color/parse";
import type { ColorObject } from "../../src/color/types";

describe("deltaE", () => {
  test("identical colors have zero difference (all methods)", () => {
    const c = parse("#3366cc");
    expect(deltaE(c, c, "76")).toBeCloseTo(0, 6);
    expect(deltaE(c, c, "2000")).toBeCloseTo(0, 6);
    expect(deltaE(c, c, "ok")).toBeCloseTo(0, 6);
  });

  test("CIE76 is Euclidean distance in Lab", () => {
    const a = { space: "lab", coords: [50, 0, 0], alpha: 1 } satisfies ColorObject;
    const b = { space: "lab", coords: [50, 3, 4], alpha: 1 } satisfies ColorObject;
    expect(deltaE(a, b, "76")).toBeCloseTo(5, 6);
  });

  test("CIEDE2000 matches a Sharma reference pair", () => {
    // Sharma et al. test data: pair yields dE2000 = 2.0425.
    const a = { space: "lab", coords: [50, 2.6772, -79.7751], alpha: 1 } satisfies ColorObject;
    const b = { space: "lab", coords: [50, 0, -82.7485], alpha: 1 } satisfies ColorObject;
    expect(deltaE(a, b, "2000")).toBeCloseTo(2.0425, 3);
  });

  test("deltaEOK is Euclidean distance in Oklab", () => {
    const a = { space: "oklab", coords: [0.5, 0, 0], alpha: 1 } satisfies ColorObject;
    const b = { space: "oklab", coords: [0.5, 0.03, 0.04], alpha: 1 } satisfies ColorObject;
    expect(deltaE(a, b, "ok")).toBeCloseTo(0.05, 6);
  });

  test("defaults to CIEDE2000", () => {
    const a = parse("red");
    const b = parse("blue");
    expect(deltaE(a, b)).toBeCloseTo(deltaE(a, b, "2000"), 6);
  });
});
