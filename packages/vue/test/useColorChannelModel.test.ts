import { describe, expect, it, mock } from "bun:test";
import { ref } from "vue";
import { useColorChannelModel } from "../src/shared/useColorChannelModel";

function setup(channels: string[] = ["h", "s"]) {
  const emit = mock((..._args: unknown[]) => {});
  const model = useColorChannelModel({
    colorSpace: ref("hsl"),
    channels: ref(channels),
    modelValue: ref(null),
    defaultValue: ref("hsl(180, 50%, 50%)"),
    emit: emit as any,
  });
  return { model, emit };
}

describe("useColorChannelModel", () => {
  it("seeds display values from defaultValue", () => {
    const { model } = setup();
    expect(model.displayValues.value).toEqual([180, 50]);
  });

  it("emits all three change events on a write", () => {
    const { model, emit } = setup();
    model.setDisplayValues([200, 50]);
    const events = emit.mock.calls.map(c => c[0]);
    expect(events).toContain("update:modelValue");
    expect(events).toContain("update:color");
    expect(events).toContain("change");
    expect(events).not.toContain("changeEnd");
  });

  it("emits changeEnd only when committing", () => {
    const { model, emit } = setup();
    model.setDisplayValues([200, 50], { commit: true });
    expect(emit.mock.calls.map(c => c[0])).toContain("changeEnd");
  });

  it("round-trips a display value through the colour", () => {
    const { model } = setup();
    model.setDisplayValues([200, 60]);
    expect(model.displayValues.value).toEqual([200, 60]);
    expect(Math.round(model.colorRef.value!.to("hsl").get("h"))).toBe(200);
  });

  it("treats alpha as a 0-100 percentage channel", () => {
    const { model } = setup(["alpha"]);
    model.setDisplayValues([50]);
    expect(model.colorRef.value!.alpha).toBeCloseTo(0.5, 5);
  });

  it("does not thrash display values on sub-threshold colour changes", () => {
    const { model } = setup();
    model.setDisplayValues([200, 50]);
    const before = [...model.displayValues.value];
    model.colorRef.value = model.colorRef.value!.with({ space: "hsl", h: 200.0001 });
    expect(model.displayValues.value).toEqual(before);
  });
});
