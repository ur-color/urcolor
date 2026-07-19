import { mount } from "@vue/test-utils";
import { describe, expect, it } from "bun:test";
import { defineComponent, h, nextTick } from "vue";
import {
  ColorAreaGradient,
  ColorAreaRoot,
} from "../src/components/ColorArea";

// Regression test for C2: unvalidated `channelOverrides` keys used to be funneled straight
// into `Color#with()`, which throws a RangeError for a channel unknown to the target space
// (the old `.set()` silently no-op'd on strays). This is reachable from the docs' own example
// override `{ s: 1, v: 1, alpha: 1 }` (HSV-only) paired with any non-HSV `colorSpace`.
describe("ColorAreaGradient channelOverrides", () => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  it("should not throw when an override key is not a channel of the color space", async () => {
    let caughtError: unknown;

    const Harness = defineComponent({
      setup() {
        return () =>
          h(ColorAreaRoot, { defaultValue: "hsl(210, 80%, 50%)", colorSpace: "hsl" }, {
            default: () => h(ColorAreaGradient, { channelOverrides: { s: 1, v: 1, alpha: 1 } }),
          });
      },
    });

    mount(Harness, {
      attachTo: document.body,
      global: {
        config: {
          errorHandler: (err) => { caughtError = err; },
        },
      },
    });

    await nextTick();
    await nextTick();

    expect(caughtError).toBeUndefined();
  });

  it("should still apply a valid override for the color space", async () => {
    let caughtError: unknown;

    const Harness = defineComponent({
      setup() {
        return () =>
          h(ColorAreaRoot, { defaultValue: "hsv(210, 80%, 50%)", colorSpace: "hsv" }, {
            default: () => h(ColorAreaGradient, { channelOverrides: { s: 1, v: 1, alpha: 1 } }),
          });
      },
    });

    mount(Harness, {
      attachTo: document.body,
      global: {
        config: {
          errorHandler: (err) => { caughtError = err; },
        },
      },
    });

    await nextTick();
    await nextTick();

    expect(caughtError).toBeUndefined();
  });
});
