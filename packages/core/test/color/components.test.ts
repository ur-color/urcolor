import { describe, expect, it } from "bun:test";
import { parseFn } from "../../src/color/components";

describe("parseFn", () => {
  it("splits alpha at a top-level slash", () => {
    const c = parseFn("rgb(1 2 3 / 40%)", "rgba?");
    expect(c?.args).toEqual(["1", "2", "3"]);
    expect(c?.alpha).toBeCloseTo(0.4, 6);
  });

  it("ignores a slash nested inside parentheses", () => {
    const c = parseFn("rgb(from rgb(1 2 3 / 40%) r g b)", "rgba?");
    expect(c?.alpha).toBeUndefined();
    expect(c?.args).toEqual(["from", "rgb(1", "2", "3", "/", "40%)", "r", "g", "b"]);
  });

  it("splits at the top-level slash even when a nested one precedes it", () => {
    const c = parseFn("rgb(from rgb(1 2 3 / 40%) r g b / 50%)", "rgba?");
    expect(c?.alpha).toBeCloseTo(0.5, 6);
  });

  it("exposes the raw body", () => {
    expect(parseFn("rgb(1 2 3)", "rgba?")?.body).toBe("1 2 3");
    expect(parseFn("rgb(from red r g b)", "rgba?")?.body).toBe("from red r g b");
  });

  it("returns null when the notation name does not match", () => {
    expect(parseFn("hsl(1 2 3)", "rgba?")).toBeNull();
  });
});
