import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import HeroConnectors from "../.vitepress/components/HeroConnectors.vue";
import { DOCKS } from "../.vitepress/composables/heroOrbit";

beforeEach(() => {
  (window as unknown as Record<string, unknown>).matchMedia = () => ({
    matches: true,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).matchMedia;
});

describe("HeroConnectors", () => {
  it("renders nothing until it has a stage", () => {
    const wrapper = mount(HeroConnectors, {
      props: { stage: null, instrument: null, docks: [...DOCKS], pulseKey: 0 },
    });
    expect(wrapper.findAll("path")).toHaveLength(0);
  });

  it("is hidden from assistive technology and from pointers", () => {
    const wrapper = mount(HeroConnectors, {
      props: { stage: null, instrument: null, docks: [...DOCKS], pulseKey: 0 },
    });
    const svg = wrapper.find("svg");
    expect(svg.attributes("aria-hidden")).toBe("true");
    expect(svg.classes()).toContain("hero-connectors");
  });

  it("draws one base path and one pulse path per dock once measured", async () => {
    const stage = document.createElement("div");
    const instrument = document.createElement("div");
    stage.appendChild(instrument);
    for (const dock of DOCKS) {
      const el = document.createElement("div");
      el.setAttribute("data-dock-id", dock.id);
      stage.appendChild(el);
    }
    document.body.appendChild(stage);

    const wrapper = mount(HeroConnectors, {
      props: { stage, instrument, docks: [...DOCKS], pulseKey: 0 },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll("path.hero-connector-base")).toHaveLength(DOCKS.length);
    expect(wrapper.findAll("path.hero-connector-pulse")).toHaveLength(DOCKS.length);
    stage.remove();
  });
});
