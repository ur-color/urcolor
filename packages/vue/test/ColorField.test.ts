import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "bun:test";
import { defineComponent, h } from "vue";
import "internationalized-color/css";
import { Color } from "internationalized-color";
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
    readOnly: { type: Boolean, default: false },
    name: { type: String, default: undefined },
    required: { type: Boolean, default: false },
  },
  emits: ["update:modelValue", "valueCommit"],
  setup(props, { emit }) {
    return () =>
      h(ColorFieldRoot, {
        "modelValue": props.modelValue as Color | string | undefined,
        "colorSpace": props.colorSpace,
        "channel": props.channel,
        "format": props.format as any,
        "min": props.min,
        "max": props.max,
        "step": props.step,
        "disabled": props.disabled,
        "readOnly": props.readOnly,
        "name": props.name,
        "required": props.required,
        "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
        "onValueCommit": (v: Color) => emit("valueCommit", v),
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

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("rendering", () => {
    it("should render input with correct value", () => {
      wrapper = mountField();
      const input = wrapper.find("input");
      expect(input.exists()).toBe(true);
      expect(input.element.value).toBe("180deg");
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

    it("should display with deg suffix", () => {
      expect(wrapper.find("input").element.value).toBe("180deg");
    });

    it("should increment on ArrowUp", async () => {
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "ArrowUp" });
      expect(input.element.value).toBe("181deg");
    });

    it("should decrement on ArrowDown", async () => {
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "ArrowDown" });
      expect(input.element.value).toBe("179deg");
    });

    it("should go to min on Home", async () => {
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "Home" });
      expect(input.element.value).toBe("0deg");
    });

    it("should go to max on End", async () => {
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "End" });
      expect(input.element.value).toBe("360deg");
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
      expect(input.element.value).toBe("180deg");
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
  });

  describe("readOnly state", () => {
    it("should not respond to keyboard when readOnly", async () => {
      wrapper = mountField({ readOnly: true });
      const input = wrapper.find("input");
      await input.trigger("keydown", { key: "ArrowUp" });
      expect(input.element.value).toBe("180deg");
    });
  });

  describe("v-model binding", () => {
    it("should emit Color on ArrowUp", async () => {
      wrapper = mountField();
      await wrapper.find("input").trigger("keydown", { key: "ArrowUp" });
      const emitted = wrapper.emitted("update:modelValue")?.[0]?.[0];
      expect(emitted).toBeInstanceOf(Color);
    });

    it("should emit valueCommit on ArrowUp", async () => {
      wrapper = mountField();
      await wrapper.find("input").trigger("keydown", { key: "ArrowUp" });
      const emitted = wrapper.emitted("valueCommit")?.[0]?.[0];
      expect(emitted).toBeInstanceOf(Color);
    });
  });

  describe("increment/decrement buttons", () => {
    it("should increment on increment button click", async () => {
      wrapper = mountField();
      const btn = wrapper.find("[aria-label=\"Increase\"]");
      await btn.trigger("pointerdown", { button: 0 });
      window.dispatchEvent(new PointerEvent("pointerup"));
      expect(wrapper.find("input").element.value).toBe("181deg");
    });

    it("should decrement on decrement button click", async () => {
      wrapper = mountField();
      const btn = wrapper.find("[aria-label=\"Decrease\"]");
      await btn.trigger("pointerdown", { button: 0 });
      window.dispatchEvent(new PointerEvent("pointerup"));
      expect(wrapper.find("input").element.value).toBe("179deg");
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
});
