import { describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { h } from "vue";
import HeroSatellite from "../.vitepress/components/HeroSatellite.vue";

function mountDock(props: Record<string, unknown> = {}) {
  return mount(HeroSatellite, {
    props: { id: "sliders", angle: 45, depth: 2, docked: true, index: 0, ...props },
    slots: { default: () => h("p", { class: "payload" }, "hi") },
  });
}

describe("HeroSatellite", () => {
  it("exposes its id for the connector layer to find", () => {
    expect(mountDock().attributes("data-dock-id")).toBe("sliders");
  });

  it("publishes angle and depth as custom properties", () => {
    const style = mountDock().attributes("style") ?? "";
    expect(style).toContain("--angle: 45deg");
    expect(style).toContain("--depth: 2");
  });

  it("renders its slot content", () => {
    expect(mountDock().find(".payload").text()).toBe("hi");
  });

  it("carries the docked class when docked", () => {
    expect(mountDock().classes()).toContain("hero-dock-docked");
  });

  it("drops the docked class in stack mode", () => {
    expect(mountDock({ docked: false }).classes()).not.toContain("hero-dock-docked");
  });
});
