import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "bun:test";
import { defineComponent, h } from "vue";
import { Color, type SpaceId } from "@urcolor/core";
import {
  ColorFieldRoot,
  ColorFieldInput,
  ColorFieldIncrement,
  ColorFieldDecrement,
  ColorFieldSwatch,
} from "../src/components/ColorField";
import { handleSubmit } from "./utils";

const ColorField = defineComponent({
  props: {
    modelValue: { type: [Object, String], default: undefined },
    colorSpace: { type: String, default: "hsl" },
    channel: { type: String, default: "h" },
    format: { type: String, default: undefined },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
    step: { type: Number, default: undefined },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    name: { type: String, default: undefined },
    required: { type: Boolean, default: false },
    placeholder: { type: String, default: undefined },
    disableWheelChange: { type: Boolean, default: false },
    locale: { type: String, default: undefined },
    defaultValue: { type: [Object, String], default: undefined },
  },
  emits: ["update:modelValue", "change", "changeEnd"],
  setup(props, { emit }) {
    return () =>
      h(ColorFieldRoot, {
        "modelValue": props.modelValue as Color | string | undefined,
        "colorSpace": props.colorSpace as SpaceId,
        "channel": props.channel,
        "format": props.format as any,
        "min": props.min,
        "max": props.max,
        "step": props.step,
        "disabled": props.disabled,
        "readonly": props.readonly,
        "name": props.name,
        "required": props.required,
        "placeholder": props.placeholder,
        "disableWheelChange": props.disableWheelChange,
        "locale": props.locale,
        "defaultValue": props.defaultValue as Color | string | undefined,
        "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
        "onChange": (v: Color) => emit("change", v),
        "onChangeEnd": (v: Color) => emit("changeEnd", v),
      }, {
        default: () => [
          h(ColorFieldDecrement, null, { default: () => "-" }),
          h(ColorFieldInput),
          h(ColorFieldIncrement, null, { default: () => "+" }),
        ],
      });
  },
});

// Default test color: hsl(180, 50%, 50%) → hue channel starts at 180
const defaultColor = "hsl(180, 50%, 50%)";

describe("ColorField", () => {
  let wrapper: VueWrapper;

  function mountField(props: Record<string, any> = {}) {
    return mount(ColorField, {
      props: { modelValue: defaultColor, colorSpace: "hsl", channel: "h", ...props },
      attachTo: document.body,
    });
  }

  // Mounts ColorFieldRoot directly with a caller-chosen `as` on
  // ColorFieldInput (e.g. "span"). Needed to genuinely exercise the
  // disabled/readonly JS guards: with the default as="input",
  // @vue/test-utils' own trigger()/setValue() silently no-op for *any*
  // event aimed at an element carrying the `disabled` attribute when that
  // element's tag is on test-utils' own "disableable" list (INPUT among
  // them — see DOMWrapper#isDisabled upstream). That check runs before the
  // event ever reaches this component's code, so a disabled-branch test
  // built on the default as="input" can never go red no matter what the
  // application code does. A <span> isn't on that list, so the event
  // genuinely dispatches and reaches the component's own guard.
  function mountFieldWithInputAs(inputAs: string, rootProps: Record<string, any> = {}) {
    const Wrapper = defineComponent({
      emits: ["update:modelValue", "changeEnd"],
      setup(_props, { emit }) {
        return () =>
          h(ColorFieldRoot, {
            "modelValue": defaultColor,
            "colorSpace": "hsl",
            "channel": "h",
            ...rootProps,
            "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
            "onChangeEnd": (v: Color) => emit("changeEnd", v),
          }, {
            default: () => h(ColorFieldInput, { as: inputAs }),
          });
      },
    });
    return mount(Wrapper, { attachTo: document.body });
  }

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("rendering", () => {
    it("should render input with correct value", () => {
      wrapper = mountField();
      const input = wrapper.find("input");
      expect(input.exists()).toBe(true);
      expect(input.element.value).toBe("180°");
    });

    it("should render increment and decrement buttons", () => {
      wrapper = mountField();
      expect(wrapper.find("[aria-label=\"Increase\"]").exists()).toBe(true);
      expect(wrapper.find("[aria-label=\"Decrease\"]").exists()).toBe(true);
    });
  });

  describe("hue channel (degree format)", () => {
    beforeEach(() => {
      wrapper = mountField();
    });

    it("should display with degree suffix", () => {
      expect(wrapper.find("input").element.value).toBe("180°");
    });

    it("should increment on ArrowUp", async () => {
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "ArrowUp" });
      expect(input.element.value).toBe("181°");
    });

    it("should decrement on ArrowDown", async () => {
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "ArrowDown" });
      expect(input.element.value).toBe("179°");
    });

    it("should go to min on Home", async () => {
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "Home" });
      expect(input.element.value).toBe("0°");
    });

    it("should go to max on End", async () => {
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "End" });
      expect(input.element.value).toBe("360°");
    });
  });

  describe("saturation channel (percentage format)", () => {
    beforeEach(() => {
      wrapper = mountField({ channel: "s" });
    });

    it("should display with % suffix", () => {
      expect(wrapper.find("input").element.value).toBe("50%");
    });

    it("should increment on ArrowUp", async () => {
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "ArrowUp" });
      expect(input.element.value).toBe("51%");
    });
  });

  describe("disabled state", () => {
    it("should not respond to keyboard when disabled", async () => {
      wrapper = mountField({ disabled: true });
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "ArrowUp" });
      expect(input.element.value).toBe("180°");
    });

    it("should have disabled attribute on input", () => {
      wrapper = mountField({ disabled: true });
      expect(wrapper.find("input").attributes("disabled")).toBeDefined();
    });

    it("should have data-disabled on root", () => {
      wrapper = mountField({ disabled: true });
      expect(wrapper.find("[data-disabled]").exists()).toBe(true);
    });

    it("should disable increment button", () => {
      wrapper = mountField({ disabled: true });
      expect(wrapper.find("[aria-label=\"Increase\"]").attributes("disabled")).toBeDefined();
    });

    it("should disable decrement button", () => {
      wrapper = mountField({ disabled: true });
      expect(wrapper.find("[aria-label=\"Decrease\"]").attributes("disabled")).toBeDefined();
    });

    it("should not commit via typing", async () => {
      // Regression test: onInputChange (the ColorFieldRoot context method
      // ColorFieldInput's @input handler calls) had no disabled/readonly
      // check of its own. Mounted with as="span" (see
      // mountFieldWithInputAs) so the dispatch isn't swallowed by
      // @vue/test-utils' own disabled-element handling before reaching the
      // guard under test. Before the fix, setting `.value` and firing
      // `input` still emitted update:modelValue with the typed value.
      const local = mountFieldWithInputAs("span", { disabled: true });
      const input = local.find("[role=\"spinbutton\"]");
      (input.element as HTMLElement & { value?: string }).value = "200";
      await input.trigger("input");
      expect(local.emitted("update:modelValue")).toBeFalsy();
    });
  });

  describe("readonly state", () => {
    it("should not respond to keyboard when readonly", async () => {
      wrapper = mountField({ readonly: true });
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "ArrowUp" });
      expect(input.element.value).toBe("180°");
    });
  });

  describe("v-model binding", () => {
    it("should emit Color on ArrowUp", async () => {
      wrapper = mountField();
      await wrapper.find("input").trigger("keydown", { key: "ArrowUp" });
      const emitted = wrapper.emitted("update:modelValue")?.[0]?.[0];
      expect(emitted).toBeInstanceOf(Color);
    });

    it("should emit changeEnd on ArrowUp", async () => {
      wrapper = mountField();
      await wrapper.find("input").trigger("keydown", { key: "ArrowUp" });
      const emitted = wrapper.emitted("changeEnd")?.[0]?.[0];
      expect(emitted).toBeInstanceOf(Color);
    });

    it("should emit change alongside changeEnd on ArrowUp", async () => {
      // ArrowUp is a single, discrete, already-complete interaction (like a
      // slider's keyboard step), so it fires `change` and `changeEnd`
      // together in the same tick — mirroring how the other roots' shared
      // channel model treats a `commit: true` value set.
      wrapper = mountField();
      await wrapper.find("input").trigger("keydown", { key: "ArrowUp" });
      expect(wrapper.emitted("change")?.[0]?.[0]).toBeInstanceOf(Color);
      expect(wrapper.emitted("changeEnd")?.[0]?.[0]).toBeInstanceOf(Color);
    });

    it("should emit change but not changeEnd while typing", async () => {
      // Typing is the mid-interaction, uncommitted phase for a text field —
      // analogous to a mid-drag pointer move on a slider/area. `changeEnd`
      // only fires once the interaction completes (blur, Enter, arrow keys,
      // wheel, or the increment/decrement buttons).
      wrapper = mountField();
      await wrapper.find("input").setValue("200");
      expect(wrapper.emitted("change")?.[0]?.[0]).toBeInstanceOf(Color);
      expect(wrapper.emitted("changeEnd")).toBeFalsy();
    });
  });

  describe("increment/decrement buttons", () => {
    it("should increment on increment button click", async () => {
      wrapper = mountField();
      const btn = wrapper.find("[aria-label=\"Increase\"]");
      await btn.trigger("pointerdown", { button: 0 });
      window.dispatchEvent(new PointerEvent("pointerup"));
      expect(wrapper.find("input").element.value).toBe("181°");
    });

    it("should decrement on decrement button click", async () => {
      wrapper = mountField();
      const btn = wrapper.find("[aria-label=\"Decrease\"]");
      await btn.trigger("pointerdown", { button: 0 });
      window.dispatchEvent(new PointerEvent("pointerup"));
      expect(wrapper.find("input").element.value).toBe("179°");
    });
  });

  describe("spinbutton role", () => {
    it("should have role spinbutton on input", () => {
      wrapper = mountField();
      expect(wrapper.find("input").attributes("role")).toBe("spinbutton");
    });

    it("should have aria-valuenow", () => {
      wrapper = mountField();
      expect(wrapper.find("input").attributes("aria-valuenow")).toBe("180");
    });
  });

  describe("swatch component", () => {
    it("should render with --swatch-color CSS variable", () => {
      const w = mount(ColorFieldSwatch, {
        props: { modelValue: "hsl(180, 50%, 50%)" },
      });
      expect(w.attributes("style")).toContain("--swatch-color:");
    });
  });

  describe("in a form", () => {
    const FormWrapper = defineComponent({
      props: { handleSubmit: { type: Function, default: undefined } },
      setup(props) {
        return () => h("form", { onSubmit: props.handleSubmit }, [
          h(ColorFieldRoot, { modelValue: "hsl(180, 50%, 50%)", colorSpace: "hsl", channel: "h", name: "color-channel" }, {
            default: () => h(ColorFieldInput),
          }),
        ]);
      },
    });

    beforeEach(() => {
      handleSubmit.mockClear();
    });

    it("should have hidden input field", () => {
      const w = mount(FormWrapper, { props: { handleSubmit }, attachTo: document.body });
      expect(w.find("[type=\"hidden\"]").exists()).toBe(true);
    });

    it("should submit correct value", async () => {
      const w = mount(FormWrapper, { props: { handleSubmit }, attachTo: document.body });
      await w.find("form").trigger("submit");
      expect(handleSubmit).toHaveBeenCalledTimes(1);
      const result = handleSubmit.mock.results[0]!.value as Record<string, string>;
      expect(result["color-channel"]).toBe("180");
    });
  });

  describe("ColorFieldInput accessibility and input handling", () => {
    beforeEach(() => {
      wrapper = mountField({ channel: "h", colorSpace: "hsl" });
    });

    it("should announce the channel range on the spinbutton", () => {
      const input = wrapper.find("[role=\"spinbutton\"]");
      expect(input.attributes("aria-valuemin")).toBe("0");
      expect(input.attributes("aria-valuemax")).toBe("360");
    });

    it("should name the spinbutton after its channel", () => {
      expect(wrapper.find("[role=\"spinbutton\"]").attributes("aria-label")).toBe("Hue");
    });

    it("should use a numeric inputmode for numeric channels", () => {
      expect(wrapper.find("[role=\"spinbutton\"]").attributes("inputmode")).toBe("numeric");
    });

    it("should increment on wheel up when focused", async () => {
      const input = wrapper.find("input");
      await input.trigger("focus");
      await input.trigger("wheel", { deltaY: -1 });
      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
    });

    it("should ignore the wheel when disableWheelChange is set", async () => {
      const local = mountField({ disableWheelChange: true });
      const input = local.find("input");
      await input.trigger("focus");
      await input.trigger("wheel", { deltaY: -1 });
      expect(local.emitted("update:modelValue")).toBeFalsy();
    });

    it("should ignore the wheel when not focused", async () => {
      const input = wrapper.find("input");
      await input.trigger("wheel", { deltaY: -1 });
      expect(wrapper.emitted("update:modelValue")).toBeFalsy();
    });

    it("should ignore the wheel when disabled", async () => {
      // Mounted with as="span" (see mountFieldWithInputAs): with the
      // default as="input", @vue/test-utils' own trigger() no-ops for any
      // event — wheel included — dispatched at an element carrying the
      // `disabled` attribute, before the event ever reaches handleWheel.
      // That made the equivalent test unfalsifiable through any
      // application-code change. A <span> isn't on test-utils' own
      // disableable-tag list, so the event genuinely dispatches here.
      //
      // This still doesn't isolate handleWheel's own disabled guard in
      // particular: handleWheel forwards to handleIncrease/handleDecrease,
      // which carry their own independent disabled checks, so this test
      // only proves the combination of guards blocks the wheel-driven
      // commit — the same caveat that applies to the readonly wheel test
      // below. It goes red only if the disabled check is removed from
      // handleWheel *and* handleIncrease *and* handleDecrease at once.
      const local = mountFieldWithInputAs("span", { disabled: true });
      const input = local.find("[role=\"spinbutton\"]");
      await input.trigger("focus");
      await input.trigger("wheel", { deltaY: -1 });
      expect(local.emitted("update:modelValue")).toBeFalsy();
    });

    it("should ignore the wheel when readonly", async () => {
      // Unlike the disabled case above, readonly doesn't trip
      // @vue/test-utils' isDisabled() short-circuit, so this test reaches
      // handleWheel even with the default as="input". It still can't
      // isolate handleWheel's own readonly guard from handleIncrease's and
      // handleDecrease's, though: handleWheel delegates to whichever of
      // those two fires, and both independently no-op when readonly. This
      // test only goes red if the readonly check is removed from all three
      // functions simultaneously — it does not pin handleWheel's guard on
      // its own. There is no mounting strategy that isolates it further
      // without restructuring the guards themselves, which is out of scope
      // here.
      const local = mountField({ readonly: true });
      const input = local.find("input");
      await input.trigger("focus");
      await input.trigger("wheel", { deltaY: -1 });
      expect(local.emitted("update:modelValue")).toBeFalsy();
    });
  });

  describe("ColorFieldInput beforeinput filtering", () => {
    beforeEach(() => {
      wrapper = mountField({ channel: "h", colorSpace: "hsl" });
    });

    function beforeInput(data: string | null, opts: { selectionStart?: number; selectionEnd?: number; value?: string } = {}) {
      const input = wrapper.find("input").element as HTMLInputElement;
      if (opts.value !== undefined) input.value = opts.value;
      input.setSelectionRange(
        opts.selectionStart ?? input.value.length,
        opts.selectionEnd ?? input.value.length,
      );
      const event = new InputEvent("beforeinput", { data, cancelable: true, bubbles: true });
      input.dispatchEvent(event);
      return event;
    }

    it("should reject a character outside [\\d.-]", () => {
      // "a" alone would also be caught by the downstream NaN check (since
      // "1a" doesn't parse), so this wouldn't distinguish the two guards.
      // "e" is different: JS `Number("1e2")` parses fine (scientific
      // notation), so only the character allow-list rejects it here.
      const event = beforeInput("e2", { value: "1", selectionStart: 1, selectionEnd: 1 });
      expect(event.defaultPrevented).toBe(true);
    });

    it("should allow a partial '-' through", () => {
      const event = beforeInput("-", { value: "", selectionStart: 0, selectionEnd: 0 });
      expect(event.defaultPrevented).toBe(false);
    });

    it("should allow a partial '.' through", () => {
      const event = beforeInput(".", { value: "", selectionStart: 0, selectionEnd: 0 });
      expect(event.defaultPrevented).toBe(false);
    });

    it("should allow a partial '-.' through", () => {
      const event = beforeInput(".", { value: "-", selectionStart: 1, selectionEnd: 1 });
      expect(event.defaultPrevented).toBe(false);
    });

    it("should reject an edit producing NaN", () => {
      // Both "." and "-" pass the single-character allow-list, but a second
      // "." makes the resulting string ("..") un-parseable as a number.
      const event = beforeInput(".", { value: ".", selectionStart: 1, selectionEnd: 1 });
      expect(event.defaultPrevented).toBe(true);
    });

    it("should not filter in hex format", () => {
      const local = mountField({ format: "hex", channel: "hex", modelValue: "#ff0000" });
      const input = local.find("input").element as HTMLInputElement;
      input.value = "f";
      input.setSelectionRange(1, 1);
      const event = new InputEvent("beforeinput", { data: "z", cancelable: true, bubbles: true });
      input.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe("readonly prevents commits via every path", () => {
    beforeEach(() => {
      wrapper = mountField({ readonly: true });
    });

    it("should not commit on Enter", async () => {
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "Enter" });
      expect(wrapper.emitted("changeEnd")).toBeFalsy();
    });

    it("should not commit on blur", async () => {
      const input = wrapper.find("input");
      await input.trigger("focus");
      await input.trigger("blur");
      expect(wrapper.emitted("changeEnd")).toBeFalsy();
    });

    it("should not commit via the wheel", async () => {
      const input = wrapper.find("input");
      await input.trigger("focus");
      await input.trigger("wheel", { deltaY: -1 });
      expect(wrapper.emitted("changeEnd")).toBeFalsy();
    });

    it("should not commit via typing", async () => {
      // Regression test: onInputChange (the ColorFieldRoot context method
      // that ColorFieldInput's @input handler calls) had no readonly check
      // of its own — unlike every other commit path here. setValue() sets
      // `.value` and dispatches a real `input` event, exactly what
      // ColorFieldInput listens for; this reaches the guard even with the
      // default as="input" because readonly (unlike disabled) doesn't trip
      // @vue/test-utils' isDisabled() short-circuit. Before the fix this
      // emitted update:modelValue with the typed value despite
      // readonly:true. onInputChange never emits changeEnd (only
      // commitValue does, via Enter/blur/wheel/etc.), so the assertion here
      // is on update:modelValue, matching what this path actually emits.
      const input = wrapper.find("input");
      await input.setValue("200");
      expect(wrapper.emitted("update:modelValue")).toBeFalsy();
    });

    it("should have the readonly attribute on the input", () => {
      expect(wrapper.find("input").attributes("readonly")).toBeDefined();
    });

    it("should have data-readonly on root", () => {
      // The input also carries data-readonly, so assert on the root
      // element itself (the wrapper's own root) rather than a tree-wide
      // selector, which would pass even if the root's own attribute
      // were dropped.
      expect(wrapper.attributes("data-readonly")).toBe("");
    });
  });

  describe("additional root API", () => {
    it("should render role=group on the root", () => {
      wrapper = mountField();
      expect(wrapper.attributes("role")).toBe("group");
    });

    it("should forward placeholder to the input", () => {
      wrapper = mountField({ placeholder: "Enter value" });
      expect(wrapper.find("input").attributes("placeholder")).toBe("Enter value");
    });

    it("should fall back to defaultValue when uncontrolled", () => {
      wrapper = mountField({ modelValue: undefined, defaultValue: "hsl(90, 50%, 50%)" });
      expect(wrapper.find("input").element.value).toBe("90°");
    });
  });
});
