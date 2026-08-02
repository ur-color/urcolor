import { createContextPair } from "../../../shared/context.js";

/**
 * How the field renders and parses its channel value. `"hex"` is never derived
 * from a channel config — it only arrives through the root's `format` prop, and
 * switches the field to editing the whole colour rather than one channel.
 */
export type ColorFieldFormat = "number" | "degree" | "percentage" | "hex";

/**
 * Everything a `ColorField` part needs from its root.
 *
 * Reactive members are declared `readonly` and published as getters over
 * `$derived`/`$state`, so parts read live state through a context object that is
 * itself set only once, at root initialisation. The callbacks are plain
 * functions declared in the root instance script, so their identity is stable.
 */
export interface ColorFieldContextValue {
  /** The numeric channel value in display units, or `undefined` when empty. */
  readonly modelValue: number | undefined;
  /** The exact text the input shows, including in-progress edits. */
  readonly displayValue: string;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  /** True when the value already sits at its minimum. */
  readonly isDecreaseDisabled: boolean;
  /** True when the value already sits at its maximum. */
  readonly isIncreaseDisabled: boolean;
  readonly format: ColorFieldFormat;
  /** Steps up by `step * multiplier` and commits. */
  readonly handleIncrease: (multiplier?: number) => void;
  /** Steps down by `step * multiplier` and commits. */
  readonly handleDecrease: (multiplier?: number) => void;
  /** Jumps to a bound and commits. */
  readonly handleMinMaxValue: (type: "min" | "max") => void;
  /** Clamps, snaps, reformats and commits a value. */
  readonly commitValue: (value: number | undefined) => void;
  /** Accepts raw input text, emitting a change when it parses. */
  readonly onInputChange: (text: string) => void;
}

export const colorFieldContext = createContextPair<ColorFieldContextValue>("ColorField");
