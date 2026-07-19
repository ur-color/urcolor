import type { ComputedRef, Ref, ShallowRef } from "vue";
import { computed, ref, shallowRef, watch } from "vue";
import type { ChannelConfig, SpaceId } from "@urcolor/core";
import { Color, displayToNative, getChannelConfig, nativeToDisplay } from "@urcolor/core";

/**
 * The alpha channel is displayed as a 0–100 percentage but stored natively as
 * 0–1, and is written through `withAlpha` rather than `with({ space, ... })`.
 */
export const ALPHA_CONFIG: ChannelConfig = {
  key: "alpha",
  label: "Alpha",
  min: 0,
  max: 100,
  step: 1,
  format: "percentage",
  nativeMin: 0,
  nativeMax: 1,
};

/** Display values closer than this to the current ones are treated as noise. */
const FEEDBACK_EPSILON = 0.001;

/**
 * The four change events every root emits. Declared as overloads rather than
 * one union signature so a root's own `defineEmits` result — where only
 * `update:modelValue` is nullable — stays assignable to it.
 */
export interface ColorChannelEmit {
  (event: "update:modelValue", payload: Color | undefined): void;
  (event: "update:color", payload: Color): void;
  (event: "change", payload: Color): void;
  (event: "changeEnd", payload: Color): void;
}

export interface UseColorChannelModelOptions {
  colorSpace: Ref<SpaceId>;
  channels: Ref<string[]>;
  modelValue: Ref<Color | string | null | undefined>;
  defaultValue: Ref<Color | string>;
  emit: ColorChannelEmit;
}

export interface UseColorChannelModelReturn {
  /** The current colour. */
  colorRef: ShallowRef<Color | undefined>;
  /** Display-space values, one per entry in `channels`, in the same order. */
  displayValues: Ref<number[]>;
  /** Per-channel display configs, one per entry in `channels`. */
  configs: ComputedRef<(ChannelConfig | undefined)[]>;
  /** Write new display values, rebuild the colour, and emit. */
  setDisplayValues: (values: number[], options?: { commit?: boolean }) => void;
  /** Emit `changeEnd` with the current colour. */
  commit: () => void;
}

export function parseColor(v: Color | string | null | undefined): Color | undefined {
  if (!v) return undefined;
  if (v instanceof Color) return v;
  return Color.parse(v) ?? undefined;
}

/**
 * The colour plumbing shared by every channel-driven root: parsing the incoming
 * model value, mapping the colour onto an ordered list of display values and
 * back, guarding the colour → values → colour round trip against feedback, and
 * emitting the four change events.
 *
 * Geometry, keyboard handling and the decision of *when* a write counts as a
 * change stay in the roots; this only owns the colour itself.
 */
export function useColorChannelModel(options: UseColorChannelModelOptions): UseColorChannelModelReturn {
  const { colorSpace, channels, modelValue, defaultValue, emit } = options;

  const configs = computed(() => channels.value.map(key =>
    key === "alpha" ? ALPHA_CONFIG : getChannelConfig(colorSpace.value, key),
  ));

  const colorRef = shallowRef<Color | undefined>(parseColor(modelValue.value ?? defaultValue.value));

  watch(modelValue, (val) => {
    const parsed = parseColor(val);
    if (parsed) colorRef.value = parsed;
  });

  function readDisplayValues(color: Color | undefined): number[] {
    const list = configs.value;
    const converted = color ? color.to(colorSpace.value) : undefined;
    return channels.value.map((key, index) => {
      const config = list[index];
      if (!config) return 0;
      if (!color || !converted) return config.min;
      const raw = key === "alpha" ? color.alpha : converted.get(key);
      return nativeToDisplay(config, raw);
    });
  }

  const displayValues = ref<number[]>(readDisplayValues(colorRef.value));

  // Colour → display values. Entries that moved by less than the epsilon keep
  // their existing value so a values → colour → values round trip cannot
  // oscillate; when nothing moved the ref is left untouched entirely.
  watch([colorRef, channels], ([color]) => {
    const next = readDisplayValues(color);
    const current = displayValues.value;
    let changed = next.length !== current.length;
    const merged = next.map((value, index) => {
      const existing = current[index];
      if (existing !== undefined && Math.abs(existing - value) < FEEDBACK_EPSILON)
        return existing;
      changed = true;
      return value;
    });
    if (changed) displayValues.value = merged;
  });

  function buildColor(values: number[]): Color | undefined {
    const color = colorRef.value;
    const list = configs.value;
    if (!color || list.some(config => !config)) return undefined;

    const updates: Record<string, number> = {};
    let alphaNative: number | undefined;

    channels.value.forEach((key, index) => {
      const config = list[index];
      const value = values[index];
      if (!config || value === undefined) return;
      const native = displayToNative(config, value);
      if (key === "alpha") alphaNative = native;
      else updates[key] = native;
    });

    let result = Object.keys(updates).length > 0
      ? color.with({ space: colorSpace.value, ...updates })
      : color;
    if (alphaNative !== undefined) result = result.withAlpha(alphaNative);
    return result;
  }

  function setDisplayValues(values: number[], { commit: shouldCommit = false }: { commit?: boolean } = {}) {
    displayValues.value = [...values];

    const next = buildColor(values);
    if (!next) return;

    colorRef.value = next;
    emit("update:modelValue", next);
    emit("update:color", next);
    emit("change", next);
    if (shouldCommit) emit("changeEnd", next);
  }

  function commit() {
    if (colorRef.value) emit("changeEnd", colorRef.value);
  }

  return { colorRef, displayValues, configs, setDisplayValues, commit };
}
