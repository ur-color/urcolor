import { mount } from "@vue/test-utils";
import { describe, expect, it } from "bun:test";
import Checkerboard from "../src/shared/Checkerboard.vue";
import { ColorAreaCheckerboard } from "../src/components/ColorArea";
import { ColorWheelCheckerboard } from "../src/components/ColorWheel";

describe("shared Checkerboard", () => {
  it("renders a square checkerboard by default", () => {
    const wrapper = mount(Checkerboard);
    expect(wrapper.attributes("style")).toContain("repeating-conic-gradient");
    expect(wrapper.attributes("style")).not.toContain("border-radius");
  });

  it("rounds the checkerboard when shape is circle", () => {
    const wrapper = mount(Checkerboard, { props: { shape: "circle" } });
    expect(wrapper.attributes("style")).toContain("border-radius: 50%");
  });

  it("keeps ColorAreaCheckerboard square", () => {
    const wrapper = mount(ColorAreaCheckerboard);
    expect(wrapper.attributes("style")).not.toContain("border-radius");
  });

  it("keeps ColorWheelCheckerboard round", () => {
    const wrapper = mount(ColorWheelCheckerboard);
    expect(wrapper.attributes("style")).toContain("border-radius: 50%");
  });
});
