import { describe, expect, test } from "bun:test";
import { contrast } from "../../src/color/contrast";
import { parse } from "../../src/color/parse";

const white = parse("white");
const black = parse("black");

describe("contrast (WCAG 2.1)", () => {
  test("black on white is 21:1", () => {
    expect(contrast(black, white, { algorithm: "wcag21" })).toBeCloseTo(21, 2);
  });
  test("a color against itself is 1:1", () => {
    expect(contrast(parse("#777"), parse("#777"), { algorithm: "wcag21" })).toBeCloseTo(1, 6);
  });
  test("is symmetric", () => {
    const ab = contrast(white, black, { algorithm: "wcag21" });
    const ba = contrast(black, white, { algorithm: "wcag21" });
    expect(ab).toBeCloseTo(ba, 6);
  });
  test("defaults to wcag21", () => {
    expect(contrast(black, white)).toBeCloseTo(21, 2);
  });
});

describe("contrast (APCA)", () => {
  test("black text on white background ~ 106", () => {
    expect(contrast(black, white, { algorithm: "apca" })).toBeCloseTo(106.04, 1);
  });
  test("white text on black background is negative ~ -108", () => {
    expect(contrast(white, black, { algorithm: "apca" })).toBeCloseTo(-107.88, 1);
  });
  test("text on identical background is 0", () => {
    expect(contrast(parse("#888"), parse("#888"), { algorithm: "apca" })).toBe(0);
  });
});
