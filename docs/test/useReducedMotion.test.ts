import { afterEach, describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { useReducedMotion } from "../.vitepress/composables/useReducedMotion";

type Listener = () => void;

function stubMatchMedia(matches: boolean) {
  const listeners: Listener[] = [];
  (window as unknown as Record<string, unknown>).matchMedia = (query: string) => ({
    matches,
    media: query,
    addEventListener: (_: string, fn: Listener) => listeners.push(fn),
    removeEventListener: () => {},
  });
  return listeners;
}

const Probe = defineComponent({
  setup() {
    const reduced = useReducedMotion();
    return () => h("span", { class: "flag" }, String(reduced.value));
  },
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).matchMedia;
});

describe("useReducedMotion", () => {
  it("is false when the query does not match", () => {
    stubMatchMedia(false);
    expect(mount(Probe).find(".flag").text()).toBe("false");
  });

  it("is true when the query matches", () => {
    stubMatchMedia(true);
    expect(mount(Probe).find(".flag").text()).toBe("true");
  });

  it("defaults to false when matchMedia is unavailable, as during SSR", () => {
    expect(mount(Probe).find(".flag").text()).toBe("false");
  });
});
