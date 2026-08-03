import { describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { h } from "vue";
import HeroPanel from "../.vitepress/components/HeroPanel.vue";

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(HeroPanel, {
    props: { id: "sliders", index: 0, ...props },
    slots: { default: () => h("p", { class: "payload" }, "hi") },
  });
}

describe("HeroPanel", () => {
  it("exposes its id", () => {
    expect(mountPanel().attributes("data-panel-id")).toBe("sliders");
  });

  it("places itself in the named grid area", () => {
    expect(mountPanel().attributes("style") ?? "").toContain("grid-area: sliders");
  });

  it("renders its slot content", () => {
    expect(mountPanel().find(".payload").text()).toBe("hi");
  });

  it("renders a label only when given one", () => {
    expect(mountPanel().find(".hero-panel-label").exists()).toBe(false);
    expect(mountPanel({ label: "Palette" }).find(".hero-panel-label").text()).toBe("Palette");
  });

  it("drops its card chrome when plain", () => {
    expect(mountPanel({ plain: true }).classes()).toContain("hero-panel-plain");
    expect(mountPanel().classes()).not.toContain("hero-panel-plain");
  });
});
