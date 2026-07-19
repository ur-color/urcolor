import { mount } from "@vue/test-utils";
import { describe, expect, it, mock } from "bun:test";
import { defineComponent, h, ref } from "vue";
import { Color } from "@urcolor/core";
import {
  ColorSwatchPickerItem,
  ColorSwatchPickerItemIndicator,
  ColorSwatchPickerItemSwatch,
  ColorSwatchPickerRoot,
} from "../src/components/ColorSwatchPicker";

const COLORS = ["#ff0000", "#00ff00", "#0000ff"];

function makePicker(rootProps: Record<string, unknown> = {}, withIndicator = false) {
  return defineComponent({
    emits: ["update:modelValue"],
    setup(_, { emit }) {
      return () =>
        h(ColorSwatchPickerRoot, {
          "onUpdate:modelValue": (v: unknown) => emit("update:modelValue", v),
          ...rootProps,
        }, {
          default: () => COLORS.map(c =>
            h(ColorSwatchPickerItem, { key: c, value: c }, {
              default: () => [
                h(ColorSwatchPickerItemSwatch),
                ...(withIndicator ? [h(ColorSwatchPickerItemIndicator, { class: "indicator" })] : []),
              ],
            })),
        });
    },
  });
}

describe("ColorSwatchPicker", () => {
  it("should expose a listbox with one option per swatch", () => {
    const wrapper = mount(makePicker(), { attachTo: document.body });
    expect(wrapper.find("[role=\"listbox\"]").exists()).toBe(true);
    expect(wrapper.findAll("[role=\"option\"]")).toHaveLength(3);
  });

  it("should name each option after its colour", () => {
    const wrapper = mount(makePicker(), { attachTo: document.body });
    const first = wrapper.findAll("[role=\"option\"]")[0]!;
    // Not merely truthy: the name must be the normalised colour, not the raw key.
    expect(first.attributes("aria-label")).toBe(Color.parse("#ff0000")!.toString());
    expect(first.attributes("data-color")).toBe("#ff0000");
  });

  it("should fall back to the raw value when it is not a parseable colour", () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(ColorSwatchPickerRoot, null, {
            default: () => h(ColorSwatchPickerItem, { value: "not-a-color" }),
          }),
      }),
      { attachTo: document.body },
    );
    expect(wrapper.find("[role=\"option\"]").attributes("aria-label")).toBe("not-a-color");
  });

  it("should select a swatch on click", async () => {
    const wrapper = mount(makePicker(), { attachTo: document.body });
    await wrapper.findAll("[role=\"option\"]")[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]?.[0]).toBe("#00ff00");
    // Guards against re-introducing a second `update:modelValue` path (e.g. a
    // generic `useForwardPropsEmits` alongside `v-model`) that would
    // double-fire this event; see ColorSwatchPickerRoot.vue's template
    // comment for why that combination is unsafe here.
    expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
  });

  it("should collect several values when multiple is set", async () => {
    const wrapper = mount(makePicker({ multiple: true }), { attachTo: document.body });
    const options = wrapper.findAll("[role=\"option\"]");
    await options[0]!.trigger("click");
    await options[2]!.trigger("click");
    const last = wrapper.emitted("update:modelValue")?.at(-1)?.[0] as string[];
    expect(last).toEqual(["#ff0000", "#0000ff"]);
  });

  it("should mark the selected option with aria-selected", async () => {
    const wrapper = mount(makePicker({ defaultValue: "#00ff00" }), { attachTo: document.body });
    const options = wrapper.findAll("[role=\"option\"]");
    expect(options[0]!.attributes("aria-selected")).toBe("false");
    expect(options[1]!.attributes("aria-selected")).toBe("true");
    expect(options[2]!.attributes("aria-selected")).toBe("false");
  });

  it("should render aria-multiselectable off the multiple prop", () => {
    const single = mount(makePicker(), { attachTo: document.body });
    expect(single.find("[role=\"listbox\"]").attributes("aria-multiselectable")).toBe("false");
    const many = mount(makePicker({ multiple: true }), { attachTo: document.body });
    expect(many.find("[role=\"listbox\"]").attributes("aria-multiselectable")).toBe("true");
  });

  it("should move the highlight with arrow keys and select with Enter", async () => {
    const wrapper = mount(makePicker(), { attachTo: document.body });
    const listbox = wrapper.find("[role=\"listbox\"]");

    await listbox.trigger("keydown", { key: "ArrowRight" });
    let options = wrapper.findAll("[role=\"option\"]");
    expect(options[0]!.attributes("data-highlighted")).toBe("");

    await listbox.trigger("keydown", { key: "ArrowRight" });
    options = wrapper.findAll("[role=\"option\"]");
    expect(options[0]!.attributes("data-highlighted")).toBeUndefined();
    expect(options[1]!.attributes("data-highlighted")).toBe("");

    await listbox.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")?.at(-1)?.[0]).toBe("#00ff00");
  });

  it("should select the highlighted option with Space", async () => {
    const wrapper = mount(makePicker(), { attachTo: document.body });
    const listbox = wrapper.find("[role=\"listbox\"]");
    await listbox.trigger("keydown", { key: "ArrowRight" });
    await wrapper.findAll("[role=\"option\"]")[0]!.trigger("keydown", { key: " " });
    expect(wrapper.emitted("update:modelValue")?.at(-1)?.[0]).toBe("#ff0000");
  });

  it("should not select anything when the root is disabled", async () => {
    const wrapper = mount(makePicker({ disabled: true }), { attachTo: document.body });
    const options = wrapper.findAll("[role=\"option\"]");
    expect(options[0]!.attributes("data-disabled")).toBe("");
    await options[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(options[1]!.attributes("aria-selected")).toBe("false");
  });

  it("should honour a disabled item", async () => {
    const wrapper = mount(
      defineComponent({
        emits: ["update:modelValue"],
        setup(_, { emit }) {
          return () =>
            h(ColorSwatchPickerRoot, {
              "onUpdate:modelValue": (v: unknown) => emit("update:modelValue", v),
            }, {
              default: () => COLORS.map((c, i) =>
                h(ColorSwatchPickerItem, { key: c, value: c, disabled: i === 1 })),
            });
        },
      }),
      { attachTo: document.body },
    );
    const options = wrapper.findAll("[role=\"option\"]");
    expect(options[1]!.attributes("data-disabled")).toBe("");
    expect(options[0]!.attributes("data-disabled")).toBeUndefined();
    await options[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("should reflect external model-value updates when controlled", async () => {
    const Controlled = defineComponent({
      setup() {
        const value = ref<string>("#ff0000");
        return { value };
      },
      render() {
        return h(ColorSwatchPickerRoot, {
          "modelValue": this.value,
          "onUpdate:modelValue": (v: unknown) => { this.value = v as string; },
        }, {
          default: () => COLORS.map(c => h(ColorSwatchPickerItem, { key: c, value: c })),
        });
      },
    });
    const wrapper = mount(Controlled, { attachTo: document.body });
    expect(wrapper.findAll("[role=\"option\"]")[0]!.attributes("aria-selected")).toBe("true");

    // External (non-user) update must reach the rendered selection.
    wrapper.vm.value = "#0000ff";
    await wrapper.vm.$nextTick();
    const options = wrapper.findAll("[role=\"option\"]");
    expect(options[0]!.attributes("aria-selected")).toBe("false");
    expect(options[2]!.attributes("aria-selected")).toBe("true");
  });

  it("should round-trip a click through an uncontrolled parent whose ref starts undefined", async () => {
    // NOTE: `value` starts at `undefined`, so `isControlled` (which latches on
    // `props.modelValue !== undefined` at setup) is `false` for this mount —
    // this exercises the `internalValue` path, not `props.modelValue`. It is
    // kept because it incidentally demonstrates that latch: a parent ref
    // that *becomes* defined later does not retroactively make the root
    // controlled. Genuine controlled-mode coverage (ref starts defined) lives
    // in "should reflect external model-value updates when controlled" above.
    const Controlled = defineComponent({
      setup() {
        const value = ref<string | undefined>(undefined);
        return { value };
      },
      render() {
        return h(ColorSwatchPickerRoot, {
          "modelValue": this.value,
          "onUpdate:modelValue": (v: unknown) => { this.value = v as string; },
        }, {
          default: () => COLORS.map(c => h(ColorSwatchPickerItem, { key: c, value: c })),
        });
      },
    });
    const wrapper = mount(Controlled, { attachTo: document.body });
    await wrapper.findAll("[role=\"option\"]")[2]!.trigger("click");
    expect(wrapper.vm.value).toBe("#0000ff");
    expect(wrapper.findAll("[role=\"option\"]")[2]!.attributes("aria-selected")).toBe("true");
  });

  it("should keep working uncontrolled, updating its own selection", async () => {
    const wrapper = mount(makePicker(), { attachTo: document.body });
    expect(wrapper.findAll("[role=\"option\"]")[1]!.attributes("aria-selected")).toBe("false");
    await wrapper.findAll("[role=\"option\"]")[1]!.trigger("click");
    expect(wrapper.findAll("[role=\"option\"]")[1]!.attributes("aria-selected")).toBe("true");
  });

  it("should expose the current value to the default slot", async () => {
    const Slotted = defineComponent({
      setup: () => () =>
        h(ColorSwatchPickerRoot, { defaultValue: "#ff0000" }, {
          default: ({ modelValue }: { modelValue: string | string[] | undefined }) => [
            h("output", String(modelValue)),
            ...COLORS.map(c => h(ColorSwatchPickerItem, { key: c, value: c })),
          ],
        }),
    });
    const wrapper = mount(Slotted, { attachTo: document.body });
    expect(wrapper.find("output").text()).toBe("#ff0000");
    await wrapper.findAll("[role=\"option\"]")[1]!.trigger("click");
    expect(wrapper.find("output").text()).toBe("#00ff00");
  });

  it("should render the item indicator only for the selected item", async () => {
    const wrapper = mount(makePicker({ defaultValue: "#0000ff" }, true), { attachTo: document.body });
    expect(wrapper.findAll(".indicator")).toHaveLength(1);
    expect(wrapper.findAll("[role=\"option\"]")[2]!.find(".indicator").exists()).toBe(true);

    await wrapper.findAll("[role=\"option\"]")[0]!.trigger("click");
    expect(wrapper.findAll("[role=\"option\"]")[0]!.find(".indicator").exists()).toBe(true);
    expect(wrapper.findAll("[role=\"option\"]")[2]!.find(".indicator").exists()).toBe(false);
  });

  it("should paint each item swatch with its own colour", () => {
    const wrapper = mount(makePicker(), { attachTo: document.body });
    const swatches = wrapper.findAll("[aria-roledescription=\"color swatch\"]");
    expect(swatches).toHaveLength(3);
    expect(swatches[0]!.attributes("style")).toContain("--swatch-color: rgb(255 0 0)");
    expect(swatches[2]!.attributes("style")).toContain("--swatch-color: rgb(0 0 255)");
  });

  it("should reflect orientation on the listbox", () => {
    const wrapper = mount(makePicker(), { attachTo: document.body });
    expect(wrapper.find("[role=\"listbox\"]").attributes("aria-orientation")).toBe("horizontal");
    const vertical = mount(makePicker({ orientation: "vertical" }), { attachTo: document.body });
    expect(vertical.find("[role=\"listbox\"]").attributes("aria-orientation")).toBe("vertical");
  });

  // `ColorSwatchPickerRootEmits` is reka's `ListboxRootEmits`: four events are
  // declared (`update:modelValue`, `highlight`, `entryFocus`, `leave`), which
  // means Vue registers all four at runtime and strips them from `$attrs`. If
  // the root only forwards `v-model` (as it briefly did) a consumer's
  // `@highlight` / `@entryFocus` / `@leave` listener is silently swallowed
  // instead of reaching `ListboxRoot`. These three tests each prove one event
  // actually reaches a consumer listener.

  it("should forward the listbox's highlight event to a consumer listener", async () => {
    const onHighlight = mock((_payload: unknown) => {});
    const wrapper = mount(makePicker({ onHighlight }), { attachTo: document.body });
    await wrapper.find("[role=\"listbox\"]").trigger("keydown", { key: "ArrowRight" });
    expect(onHighlight).toHaveBeenCalledTimes(1);
    expect((onHighlight.mock.calls[0]![0] as { value: string }).value).toBe("#ff0000");
  });

  it("should forward the listbox's entryFocus event to a consumer listener", async () => {
    const onEntryFocus = mock((_event: unknown) => {});
    const wrapper = mount(makePicker({ onEntryFocus }), { attachTo: document.body });
    await wrapper.find("[role=\"listbox\"]").trigger("focus");
    expect(onEntryFocus).toHaveBeenCalledTimes(1);
  });

  it("should forward the listbox's leave event to a consumer listener", async () => {
    const onLeave = mock((_event: unknown) => {});
    const wrapper = mount(makePicker({ onLeave }), { attachTo: document.body });
    await wrapper.find("[role=\"listbox\"]").trigger("pointerleave");
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
