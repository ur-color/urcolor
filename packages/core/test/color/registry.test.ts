import { describe, expect, it } from "bun:test";
import { registerParser, tryParse } from "../../src/color/parse";
import type { ColorObject } from "../../src/color/types";

const magenta = (input: string): ColorObject | null =>
  input === "test-magenta" ? { space: "srgb", coords: [1, 0, 1], alpha: 1 } : null;

describe("registerParser", () => {
  it("does not parse an unknown notation before registration", () => {
    expect(tryParse("test-magenta")).toBeNull();
  });

  it("parses it after registration, and stops after dispose", () => {
    const dispose = registerParser(magenta);
    expect(tryParse("test-magenta")?.coords).toEqual([1, 0, 1]);
    dispose();
    expect(tryParse("test-magenta")).toBeNull();
  });

  it("treats a second dispose as a no-op", () => {
    const dispose = registerParser(magenta);
    dispose();
    expect(() => dispose()).not.toThrow();
    expect(tryParse("test-magenta")).toBeNull();
  });

  it("never lets a registered parser shadow a built-in", () => {
    // This parser would claim every input; built-ins must still win.
    const dispose = registerParser(() => ({ space: "srgb", coords: [0, 1, 0], alpha: 1 }));
    expect(tryParse("#ff0000")?.coords).toEqual([1, 0, 0]);
    expect(tryParse("red")?.coords).toEqual([1, 0, 0]);
    dispose();
  });

  it("consults multiple parsers in registration order", () => {
    const first = registerParser((i) => (i === "dup" ? { space: "srgb", coords: [1, 0, 0], alpha: 1 } : null));
    const second = registerParser((i) => (i === "dup" ? { space: "srgb", coords: [0, 0, 1], alpha: 1 } : null));
    expect(tryParse("dup")?.coords).toEqual([1, 0, 0]);
    first();
    expect(tryParse("dup")?.coords).toEqual([0, 0, 1]);
    second();
  });
});
