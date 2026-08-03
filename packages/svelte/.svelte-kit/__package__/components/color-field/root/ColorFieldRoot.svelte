<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Color, SpaceId } from "@urcolor/core";
  import type { ChildSnippetArgs } from "../../../shared/child.js";
  import type { ColorFieldFormat } from "./context.svelte.js";

  export interface ColorFieldRootProps extends HTMLAttributes<HTMLDivElement> {
    /** The colour value. Bindable: `bind:value`. */
    value?: Color | string | null;
    /** The colour used until the first interaction when `value` is not bound. */
    defaultValue?: Color | string | null;
    /** The colour space mode (e.g. `"hsl"`, `"oklch"`). */
    colorSpace?: SpaceId;
    /** Which channel this field controls (e.g. `"h"`, `"s"`, `"l"`, `"alpha"`). */
    channel?: string;
    /** Channel display format. Auto-derived from the channel config when unset. */
    format?: ColorFieldFormat;
    /** Minimum allowed value, in display units. */
    min?: number;
    /** Maximum allowed value, in display units. */
    max?: number;
    /** Step increment for arrow keys and the stepper buttons. */
    step?: number;
    /** When true, prevents the user from interacting with the field. */
    disabled?: boolean;
    /** When true, the value is shown but cannot be edited. */
    readOnly?: boolean;
    /** Called on every change, including mid-edit. */
    onValueChange?: (color: Color) => void;
    /** Called once at the end of an interaction. */
    onValueCommit?: (color: Color) => void;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { untrack } from "svelte";
  import { Color as ColorClass } from "@urcolor/core";
  import {
    applyDisplayValue,
    clamp,
    colorToDisplayValue,
    DATA_DISABLED,
    DATA_READONLY,
    FEEDBACK_EPSILON,
    parseColor,
    resolveChannelConfig,
    snapToStep,
    type ChannelConfig,
  } from "@urcolor/shared";
  import type { ChildProps } from "../../../shared/child.js";
  // `ColorFieldFormat` is already in scope from the module block above.
  import { colorFieldContext } from "./context.svelte.js";

  const HEX_MAX = 0xffffff;

  let {
    value = $bindable(),
    defaultValue,
    colorSpace = "hsl",
    channel = "h",
    format: formatProp,
    min: minProp,
    max: maxProp,
    step: stepProp,
    disabled = false,
    readOnly = false,
    onValueChange,
    onValueCommit,
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorFieldRootProps = $props();

  /**
   * Uncontrolled fallback, kept in sync so it and `value` never disagree.
   * `untrack` states the intent that only the initial props are read here.
   */
  let internalColor = $state<Color | undefined>(
    untrack(() => parseColor(value) ?? parseColor(defaultValue)),
  );

  const color = $derived(parseColor(value) ?? internalColor);
  const isAlpha = $derived(channel === "alpha");
  const channelConfig = $derived<ChannelConfig | undefined>(resolveChannelConfig(colorSpace, channel));
  const effectiveFormat = $derived<ColorFieldFormat>(formatProp ?? channelConfig?.format ?? "number");
  const isHexMode = $derived(effectiveFormat === "hex");
  const effectiveMin = $derived(minProp ?? channelConfig?.min ?? 0);
  const effectiveMax = $derived(maxProp ?? channelConfig?.max ?? (isHexMode ? HEX_MAX : 100));
  const effectiveStep = $derived(stepProp ?? channelConfig?.step ?? 1);

  /** The channel value the current colour implies, in display units. */
  function displayFromColor(): number | undefined {
    const current = color;
    if (!current) return undefined;
    if (isHexMode) {
      const hex = current.toString("hex").replace(/^#/, "");
      if (!hex) return undefined;
      return Number.parseInt(hex.slice(0, 6), 16);
    }
    if (!channelConfig) return undefined;
    if (isAlpha) return Math.round(current.alpha * 100);
    return colorToDisplayValue(current, colorSpace, channel);
  }

  function formatValue(val: number | undefined): string {
    if (val === undefined) return "";
    switch (effectiveFormat) {
      case "degree":
        return `${val}°`;
      case "percentage":
        return `${val}%`;
      case "hex":
        return `#${Math.round(val).toString(16).padStart(6, "0")}`;
      default:
        return String(val);
    }
  }

  function parseValue(text: string): number | undefined {
    const trimmed = text.trim();
    if (trimmed === "") return undefined;
    switch (effectiveFormat) {
      case "degree":
        return Number.parseFloat(trimmed.replace(/[°]$|deg$/i, ""));
      case "percentage":
        return Number.parseFloat(trimmed.replace(/%$/, ""));
      case "hex": {
        const hex = trimmed.replace(/^#/, "");
        if (!/^[0-9a-f]*$/i.test(hex)) return undefined;
        return Number.parseInt(hex, 16);
      }
      default:
        return Number.parseFloat(trimmed);
    }
  }

  function clampValue(val: number): number {
    return snapToStep(clamp(val, effectiveMin, effectiveMax), effectiveMin, effectiveMax, effectiveStep);
  }

  /**
   * The field's own numeric state. It is not purely derived from `color`: the
   * field is usable before any colour exists, and mid-edit text may not yet
   * round-trip. `$effect` below syncs it down whenever the colour moves.
   */
  let numericValue = $state<number | undefined>(untrack(() => displayFromColor()));
  let displayValue = $state<string>(untrack(() => formatValue(numericValue)));

  $effect(() => {
    const next = displayFromColor();
    if (next === undefined) return;
    // Writes are untracked reads of our own state, so this can never re-enter.
    if (Math.abs(next - (untrack(() => numericValue) ?? 0)) <= FEEDBACK_EPSILON) return;
    numericValue = next;
    displayValue = formatValue(next);
  });

  function rebuildColor(displayVal: number): Color | undefined {
    const current = color;
    if (!current) return undefined;
    if (isHexMode) {
      const hexStr = `#${Math.round(clamp(displayVal, 0, HEX_MAX)).toString(16).padStart(6, "0")}`;
      return ColorClass.parse(hexStr) ?? undefined;
    }
    if (!channelConfig) return undefined;
    return applyDisplayValue(current, colorSpace, channel, displayVal);
  }

  function emitColor(val: number): Color | undefined {
    const nextColor = rebuildColor(val);
    if (!nextColor) return undefined;
    internalColor = nextColor;
    // A no-op locally when the caller did not bind, so bound and unbound
    // callers see identical behaviour.
    value = nextColor;
    onValueChange?.(nextColor);
    return nextColor;
  }

  function setValue(val: number): void {
    numericValue = val;
    displayValue = formatValue(val);
    const nextColor = emitColor(val);
    if (nextColor) onValueCommit?.(nextColor);
  }

  function commitValue(val: number | undefined): void {
    if (val === undefined || Number.isNaN(val)) {
      numericValue = undefined;
      displayValue = "";
      return;
    }
    setValue(isHexMode ? clamp(Math.round(val), effectiveMin, effectiveMax) : clampValue(val));
  }

  function onInputChange(text: string): void {
    displayValue = text;
    const parsed = parseValue(text);
    if (parsed === undefined || Number.isNaN(parsed)) return;
    numericValue = parsed;
    emitColor(parsed);
  }

  function handleIncrease(multiplier = 1): void {
    if (disabled || readOnly) return;
    setValue(clampValue((numericValue ?? 0) + effectiveStep * multiplier));
  }

  function handleDecrease(multiplier = 1): void {
    if (disabled || readOnly) return;
    setValue(clampValue((numericValue ?? 0) - effectiveStep * multiplier));
  }

  function handleMinMaxValue(type: "min" | "max"): void {
    if (disabled || readOnly) return;
    setValue(type === "min" ? effectiveMin : effectiveMax);
  }

  const isDecreaseDisabled = $derived(numericValue !== undefined && clampValue(numericValue) <= effectiveMin);
  const isIncreaseDisabled = $derived(numericValue !== undefined && clampValue(numericValue) >= effectiveMax);

  const elementProps = $derived<ChildProps>({
    ...rest,
    class: className,
    style: style,
    [DATA_DISABLED]: disabled ? "" : undefined,
    [DATA_READONLY]: readOnly ? "" : undefined,
  });

  colorFieldContext.set({
    get modelValue() {
      return numericValue;
    },
    get displayValue() {
      return displayValue;
    },
    get disabled() {
      return disabled;
    },
    get readOnly() {
      return readOnly;
    },
    get isDecreaseDisabled() {
      return isDecreaseDisabled;
    },
    get isIncreaseDisabled() {
      return isIncreaseDisabled;
    },
    get format() {
      return effectiveFormat;
    },
    handleIncrease,
    handleDecrease,
    handleMinMaxValue,
    commitValue,
    onInputChange,
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <div {...elementProps}>{@render children?.()}</div>
{/if}
