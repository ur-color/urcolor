import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "bun:test";
import { Color } from "@urcolor/core";
import { ColorSwatchRoot } from "../src/components/ColorSwatch";

// Regression test for C1: the old `internationalized-color` library's `.to()`/`Color.from()`
// returned null/undefined on failure. `@urcolor/core`'s `Color.from` throws on invalid input
// instead. ColorSwatchRoot must not throw when given a bad color string — it should degrade
// gracefully to "transparent", matching the React implementation's `Color.parse(...) ?? null`.
describe("ColorSwatchRoot", () => {
  it("should not throw when model-value is an invalid color string", () => {
    expect(() => {
      mount(ColorSwatchRoot, { props: { modelValue: "not-a-color" } });
    }).not.toThrow();
  });

  it("should render as transparent when model-value is an invalid color string", () => {
    const wrapper: VueWrapper = mount(ColorSwatchRoot, { props: { modelValue: "not-a-color" } });
    const style = wrapper.attributes("style") ?? "";
    expect(style).toContain("--swatch-color: transparent");
  });

  it("should still render a valid color string", () => {
    const wrapper: VueWrapper = mount(ColorSwatchRoot, { props: { modelValue: "red" } });
    const style = wrapper.attributes("style") ?? "";
    expect(style).not.toContain("--swatch-color: transparent");
  });

  it("should accept a Color instance without re-parsing", () => {
    const color = Color.parse("hsl(210, 80%, 50%)")!;
    expect(() => {
      mount(ColorSwatchRoot, { props: { modelValue: color } });
    }).not.toThrow();
  });
});
