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

  it("treats a throwing registered parser as a miss, leaving built-ins unaffected", () => {
    const dispose = registerParser(() => {
      throw new Error("plugin boom");
    });
    try {
      expect(tryParse("#ff0000")?.coords).toEqual([1, 0, 0]);
    } finally {
      dispose();
    }
  });

  it("still consults a later registered parser after an earlier one throws", () => {
    const throwing = registerParser(() => {
      throw new Error("plugin boom");
    });
    try {
      const working = registerParser(input =>
        input === "plugin-red" ? { space: "srgb", coords: [1, 0, 0], alpha: 1 } : null,
      );
      try {
        expect(tryParse("plugin-red")?.coords).toEqual([1, 0, 0]);
      } finally {
        working();
      }
    } finally {
      throwing();
    }
  });

  it("resolves the dispose index at dispose time, not at registration time", () => {
    const a = registerParser(i => (i === "a" ? { space: "srgb", coords: [1, 0, 0], alpha: 1 } : null));
    try {
      const b = registerParser(i => (i === "b" ? { space: "srgb", coords: [0, 1, 0], alpha: 1 } : null));
      try {
        const c = registerParser(i => (i === "c" ? { space: "srgb", coords: [0, 0, 1], alpha: 1 } : null));
        try {
          // Dispose the first registered parser, then the third. If dispose
          // captured its index at registration time instead of resolving it
          // at dispose time, removing "a" first would shift "c"'s position
          // and its dispose would remove the wrong (b's) entry.
          a();
          c();
          expect(tryParse("a")).toBeNull();
          expect(tryParse("b")?.coords).toEqual([0, 1, 0]);
          expect(tryParse("c")).toBeNull();
        } finally {
          c();
        }
      } finally {
        b();
      }
    } finally {
      a();
    }
  });

  it("removes exactly one entry when the same function is registered twice", () => {
    const shared = (i: string): ColorObject | null =>
      i === "shared-input" ? { space: "srgb", coords: [1, 1, 0], alpha: 1 } : null;
    const first = registerParser(shared);
    try {
      const second = registerParser(shared);
      try {
        first();
        // One of the two registrations remains, so it still parses.
        expect(tryParse("shared-input")?.coords).toEqual([1, 1, 0]);
      } finally {
        second();
      }
      // Both registrations are now disposed.
      expect(tryParse("shared-input")).toBeNull();
    } finally {
      first();
      // Extra dispose calls beyond the two registrations are no-ops.
    }
  });
});
