import { describe, it, expect } from "bun:test";
import { PAGE_KEYS, ARROW_KEYS, resolveArrowKey, stepMultiplier } from "../src/keys";

describe("key constants", () => {
  it("lists the page and arrow keys", () => {
    expect(PAGE_KEYS).toEqual(["PageUp", "PageDown"]);
    expect(ARROW_KEYS).toEqual(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  });
});

describe("resolveArrowKey", () => {
  it("maps horizontal arrows to the x axis", () => {
    expect(resolveArrowKey({ key: "ArrowRight" })).toEqual({ axis: "x", sign: 1 });
    expect(resolveArrowKey({ key: "ArrowLeft" })).toEqual({ axis: "x", sign: -1 });
  });
  it("maps vertical arrows to the y axis, up positive", () => {
    expect(resolveArrowKey({ key: "ArrowUp" })).toEqual({ axis: "y", sign: 1 });
    expect(resolveArrowKey({ key: "ArrowDown" })).toEqual({ axis: "y", sign: -1 });
  });
  it("returns undefined for keys it does not handle", () => {
    expect(resolveArrowKey({ key: "Enter" })).toBeUndefined();
    expect(resolveArrowKey({ key: "PageUp" })).toBeUndefined();
  });
  it("flips only horizontal arrows in rtl", () => {
    expect(resolveArrowKey({ key: "ArrowRight", dir: "rtl" })).toEqual({ axis: "x", sign: -1 });
    expect(resolveArrowKey({ key: "ArrowUp", dir: "rtl" })).toEqual({ axis: "y", sign: 1 });
  });
  it("flips both axes when inverted", () => {
    expect(resolveArrowKey({ key: "ArrowRight", inverted: true })).toEqual({ axis: "x", sign: -1 });
    expect(resolveArrowKey({ key: "ArrowUp", inverted: true })).toEqual({ axis: "y", sign: -1 });
  });
  it("cancels out when rtl and inverted are both set on a horizontal arrow", () => {
    expect(resolveArrowKey({ key: "ArrowRight", dir: "rtl", inverted: true })).toEqual({ axis: "x", sign: 1 });
  });
});

describe("stepMultiplier", () => {
  it("is 10 with shift and 1 without", () => {
    expect(stepMultiplier({ shiftKey: true })).toBe(10);
    expect(stepMultiplier({ shiftKey: false })).toBe(1);
    expect(stepMultiplier({})).toBe(1);
  });
});
