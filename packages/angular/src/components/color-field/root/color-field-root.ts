import {
  afterNextRender,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  HostAttributeToken,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
} from "@angular/core";
import type { FormValueControl } from "@angular/forms/signals";
import { Color, type SpaceId } from "@urcolor/core";
import {
  applyDisplayValue,
  clamp,
  colorToDisplayValue,
  DATA_DISABLED,
  DATA_READONLY,
  FEEDBACK_EPSILON,
  resolveChannelConfig,
  snapToStep,
} from "@urcolor/primitives";

/**
 * How the field renders and parses its channel value. `"hex"` is never derived
 * from a channel config — it only arrives through the root's `format` input,
 * and switches the field to editing the whole colour rather than one channel.
 */
export type ColorFieldFormat = "number" | "degree" | "percentage" | "hex";

/** The largest value `"hex"` mode can hold: `#ffffff`. */
const HEX_MAX = 0xffffff;

/** The colour a root falls back to when `[(value)]` is never bound. */
export const COLOR_FIELD_DEFAULT_COLOR: Color = Color.parse("hsl(210, 80%, 50%)")!;

/**
 * The root of a numeric colour field. Owns the colour, the field's own numeric
 * and text state, and every operation the other parts invoke through
 * `inject(ColorFieldRoot)`.
 *
 * ```html
 * <div urcColorFieldRoot [(value)]="color" colorSpace="hsl" channel="h">
 *   <span urcColorFieldSwatch [value]="color()"></span>
 *   <input urcColorFieldInput />
 *   <button urcColorFieldIncrement></button>
 *   <button urcColorFieldDecrement></button>
 * </div>
 * ```
 *
 * `implements FormValueControl<Color>` is satisfied by the `value` model alone,
 * which is what makes `<div urcColorFieldRoot [field]="form.brandColor">` work.
 */
@Directive({
  selector: "[urcColorFieldRoot]",
  exportAs: "urcColorFieldRoot",
  host: {
    [`[attr.${DATA_DISABLED}]`]: "isDisabled() ? '' : null",
    [`[attr.${DATA_READONLY}]`]: "isReadOnly() ? '' : null",
  },
})
export class ColorFieldRoot implements FormValueControl<Color> {
  /** The colour, two-way bindable as `[(value)]`. Also the Signal Forms contract. */
  readonly value = model<Color>(COLOR_FIELD_DEFAULT_COLOR);
  /** Emitted once at the end of an interaction, never mid-edit. */
  readonly valueCommit = output<Color>();

  /** The colour space the field operates in. */
  readonly colorSpace = input<SpaceId>("hsl");
  /** The channel this field controls, or `"alpha"`. */
  readonly channel = input<string>("h");
  /** Display format. Derived from the channel config when unset. */
  readonly format = input<ColorFieldFormat>();
  /** Minimum allowed value, in display units. */
  readonly min = input<number>();
  /** Maximum allowed value, in display units. */
  readonly max = input<number>();
  /** Step increment for arrow keys and the stepper buttons. */
  readonly step = input<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * `disabled` and `readonly` are DOM state, not inputs. The static host
   * attributes are read at construction — which works under SSR, where there is
   * no DOM — and a `MutationObserver` installed after the first render keeps
   * both live.
   */
  private readonly disabledState = signal(
    inject(new HostAttributeToken("disabled"), { optional: true }) !== null,
  );

  private readonly readOnlyState = signal(
    inject(new HostAttributeToken("readonly"), { optional: true }) !== null,
  );

  /**
   * Whether interaction is refused. Named `isDisabled` rather than `disabled`
   * because `FormUiControl` reserves `disabled` for an `InputSignal<boolean>`.
   */
  readonly isDisabled = this.disabledState.asReadonly();
  /** Whether the value is shown but cannot be edited. */
  readonly isReadOnly = this.readOnlyState.asReadonly();

  private readonly channelConfig = computed(() =>
    resolveChannelConfig(this.colorSpace(), this.channel()),
  );

  /** The resolved display format, after the channel config fallback. */
  readonly effectiveFormat = computed<ColorFieldFormat>(
    () => this.format() ?? this.channelConfig()?.format ?? "number",
  );

  private readonly isHexMode = computed(() => this.effectiveFormat() === "hex");
  private readonly isAlpha = computed(() => this.channel() === "alpha");

  private readonly effectiveMin = computed(() => this.min() ?? this.channelConfig()?.min ?? 0);

  private readonly effectiveMax = computed(
    () => this.max() ?? this.channelConfig()?.max ?? (this.isHexMode() ? HEX_MAX : 100),
  );

  private readonly effectiveStep = computed(() => this.step() ?? this.channelConfig()?.step ?? 1);

  /** The channel value the current colour implies, in display units. */
  private readonly colorValue = computed<number | undefined>(() => {
    const current = this.value();
    if (this.isHexMode()) {
      const hex = current.toString("hex").replace(/^#/, "");
      if (!hex) return undefined;
      return Number.parseInt(hex.slice(0, 6), 16);
    }
    if (!this.channelConfig()) return undefined;
    if (this.isAlpha()) return Math.round(current.alpha * 100);
    return colorToDisplayValue(current, this.colorSpace(), this.channel());
  });

  /**
   * The field's own numeric state. It is not purely derived from the colour:
   * mid-edit text may not round-trip yet, and clearing the input leaves it
   * empty. `linkedSignal` gives both halves — it follows the colour by default,
   * an explicit `set` overrides until the colour moves again, and the epsilon
   * check drops the echo of a change this field itself just emitted.
   */
  private readonly numericValue = linkedSignal<number | undefined, number | undefined>({
    source: this.colorValue,
    computation: (source, previous) => {
      if (source === undefined) return previous?.value;
      const current = previous?.value;
      if (current !== undefined && Math.abs(source - current) <= FEEDBACK_EPSILON) return current;
      return source;
    },
  });

  /** The exact text the input shows, including in-progress edits. */
  private readonly displayText = linkedSignal<number | undefined, string>({
    source: this.numericValue,
    computation: value => this.formatValue(value),
  });

  /** The numeric channel value in display units, or `undefined` when empty. */
  readonly modelValue = this.numericValue.asReadonly();
  /** The text the input renders. */
  readonly displayValue = this.displayText.asReadonly();

  /** True when the value already sits at its minimum. */
  readonly isDecreaseDisabled = computed(() => {
    const value = this.numericValue();
    return value !== undefined && this.clampValue(value) <= this.effectiveMin();
  });

  /** True when the value already sits at its maximum. */
  readonly isIncreaseDisabled = computed(() => {
    const value = this.numericValue();
    return value !== undefined && this.clampValue(value) >= this.effectiveMax();
  });

  constructor() {
    // `afterNextRender` never runs on the server, so this is the only place a
    // directive may touch the DOM. The filter deliberately excludes our own
    // `data-*` host bindings, so writing them cannot re-enter this observer.
    afterNextRender(() => {
      const element = this.host.nativeElement;
      this.syncDomState(element);
      if (typeof MutationObserver === "undefined") return;
      const observer = new MutationObserver(() => this.syncDomState(element));
      observer.observe(element, { attributes: true, attributeFilter: ["disabled", "readonly"] });
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Steps up by `step * multiplier` and commits. */
  handleIncrease(multiplier = 1): void {
    if (this.isDisabled() || this.isReadOnly()) return;
    this.setValue(this.clampValue((this.numericValue() ?? 0) + this.effectiveStep() * multiplier));
  }

  /** Steps down by `step * multiplier` and commits. */
  handleDecrease(multiplier = 1): void {
    if (this.isDisabled() || this.isReadOnly()) return;
    this.setValue(this.clampValue((this.numericValue() ?? 0) - this.effectiveStep() * multiplier));
  }

  /** Jumps to a bound and commits. */
  handleMinMaxValue(type: "min" | "max"): void {
    if (this.isDisabled() || this.isReadOnly()) return;
    this.setValue(type === "min" ? this.effectiveMin() : this.effectiveMax());
  }

  /** Clamps, snaps, reformats and commits a value. Clears the field for `undefined`. */
  commitValue(value: number | undefined): void {
    if (value === undefined || Number.isNaN(value)) {
      this.numericValue.set(undefined);
      this.displayText.set("");
      return;
    }
    const min = this.effectiveMin();
    const max = this.effectiveMax();
    this.setValue(
      this.isHexMode() ? clamp(Math.round(value), min, max) : this.clampValue(value),
    );
  }

  /** Accepts raw input text, emitting a change when it parses. */
  onInputChange(text: string): void {
    const parsed = this.parseValue(text);
    if (parsed !== undefined && !Number.isNaN(parsed)) {
      this.numericValue.set(parsed);
      this.emitColor(parsed);
    }
    // Written last on purpose: emitting a colour invalidates the text through
    // `numericValue`, and the raw keystrokes have to survive that.
    this.displayText.set(text);
  }

  /** Sets, formats, emits and commits in one step. */
  private setValue(value: number): void {
    this.numericValue.set(value);
    this.displayText.set(this.formatValue(value));
    const next = this.emitColor(value);
    if (next) this.valueCommit.emit(next);
  }

  private emitColor(value: number): Color | undefined {
    const next = this.rebuildColor(value);
    if (!next) return undefined;
    this.value.set(next);
    return next;
  }

  private rebuildColor(displayValue: number): Color | undefined {
    if (this.isHexMode()) {
      const hex = Math.round(clamp(displayValue, 0, HEX_MAX)).toString(16).padStart(6, "0");
      return Color.parse(`#${hex}`) ?? undefined;
    }
    if (!this.channelConfig()) return undefined;
    return applyDisplayValue(this.value(), this.colorSpace(), this.channel(), displayValue);
  }

  private formatValue(value: number | undefined): string {
    if (value === undefined) return "";
    switch (this.effectiveFormat()) {
      case "degree":
        return `${value}°`;
      case "percentage":
        return `${value}%`;
      case "hex":
        return `#${Math.round(value).toString(16).padStart(6, "0")}`;
      default:
        return String(value);
    }
  }

  private parseValue(text: string): number | undefined {
    const trimmed = text.trim();
    if (trimmed === "") return undefined;
    switch (this.effectiveFormat()) {
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

  private clampValue(value: number): number {
    const min = this.effectiveMin();
    const max = this.effectiveMax();
    return snapToStep(clamp(value, min, max), min, max, this.effectiveStep());
  }

  private syncDomState(element: HTMLElement): void {
    this.disabledState.set(element.hasAttribute("disabled"));
    this.readOnlyState.set(element.hasAttribute("readonly"));
  }
}
