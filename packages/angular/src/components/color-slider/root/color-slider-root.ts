import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  HostAttributeToken,
  inject,
  input,
  model,
  output,
  signal,
} from "@angular/core";
import type { FormValueControl } from "@angular/forms/signals";
import { Color, type SpaceId } from "@urcolor/core";
import {
  applyDisplayValue,
  colorToDisplayValue,
  createDragController,
  DATA_DISABLED,
  DATA_DRAGGING,
  DATA_ORIENTATION,
  FEEDBACK_EPSILON,
  positionFromValue,
  resolveChannelConfig,
  valueFromKey,
  valueFromPosition,
  type SliderState,
} from "@urcolor/shared";

/** The axis a `ColorSlider` runs along. */
export type ColorSliderOrientation = "horizontal" | "vertical";

/** The colour a root falls back to when `[(value)]` is never bound. */
export const COLOR_SLIDER_DEFAULT_COLOR: Color = Color.parse("hsl(210, 80%, 50%)")!;

/**
 * The root of a colour slider. Owns the colour, the interaction, and every
 * piece of state the other parts read through `inject(ColorSliderRoot)`.
 *
 * ```html
 * <div urcColorSliderRoot [(value)]="color" colorSpace="oklch" channel="h">
 *   <div urcColorSliderTrack>
 *     <canvas urcColorSliderGradient></canvas>
 *     <div urcColorSliderThumb></div>
 *   </div>
 * </div>
 * ```
 *
 * `implements FormValueControl<Color>` is satisfied by the `value` model alone,
 * which is what makes `<div urcColorSliderRoot [field]="form.brandColor">` work.
 */
@Directive({
  selector: "[urcColorSliderRoot]",
  exportAs: "urcColorSliderRoot",
  host: {
    [`[attr.${DATA_ORIENTATION}]`]: "orientation()",
    [`[attr.${DATA_DISABLED}]`]: "isDisabled() ? '' : null",
    [`[attr.${DATA_DRAGGING}]`]: "dragging() ? '' : null",
    "[attr.aria-disabled]": "isDisabled() ? 'true' : null",
    "(pointerdown)": "onPointerDown($event)",
    "(pointermove)": "onPointerMove($event)",
    "(pointerup)": "onPointerUp($event)",
    "(pointercancel)": "onPointerCancel()",
    "(keydown)": "onKeyDown($event)",
    "(keyup)": "onKeyUp()",
  },
})
export class ColorSliderRoot implements FormValueControl<Color> {
  /** The colour, two-way bindable as `[(value)]`. Also the Signal Forms contract. */
  readonly value = model<Color>(COLOR_SLIDER_DEFAULT_COLOR);
  /** Emitted once at the end of an interaction, never mid-drag. */
  readonly valueCommit = output<Color>();

  /** The colour space the slider operates in. */
  readonly colorSpace = input<SpaceId>("hsl");
  /** The channel this slider controls, or `"alpha"`. */
  readonly channel = input<string>("h");
  /** The axis the slider runs along. */
  readonly orientation = input<ColorSliderOrientation>("horizontal");
  /** Whether the slider runs opposite to its natural direction. */
  readonly inverted = input(false, { transform: booleanAttribute });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * `disabled` and `dir` are DOM state, not inputs. The static host attribute
   * is read at construction — which works under SSR, where there is no DOM —
   * and a `MutationObserver` installed after the first render keeps both live.
   */
  private readonly disabledState = signal(
    inject(new HostAttributeToken("disabled"), { optional: true }) !== null,
  );

  private readonly dirState = signal<"ltr" | "rtl">(
    inject(new HostAttributeToken("dir"), { optional: true }) === "rtl" ? "rtl" : "ltr",
  );

  private readonly draggingState = signal(false);

  /**
   * Whether interaction is refused. Named `isDisabled` rather than `disabled`
   * because `FormUiControl` reserves `disabled` for an `InputSignal<boolean>`.
   */
  readonly isDisabled = this.disabledState.asReadonly();
  /** The resolved reading direction. */
  readonly dir = this.dirState.asReadonly();
  /** True while a pointer drag is in flight. */
  readonly dragging = this.draggingState.asReadonly();

  private readonly channelConfig = computed(() =>
    resolveChannelConfig(this.colorSpace(), this.channel()),
  );

  /** The channel in display units, plus its bounds and axis flags. */
  readonly sliderState = computed<SliderState>(() => {
    const config = this.channelConfig();
    return {
      value: colorToDisplayValue(this.value(), this.colorSpace(), this.channel()),
      min: config?.min ?? 0,
      max: config?.max ?? 100,
      step: config?.step ?? 1,
      orientation: this.orientation(),
      dir: this.dir(),
      inverted: this.inverted(),
      disabled: this.isDisabled(),
    };
  });

  /** 0-1 offset of the thumb from the track's CSS start edge. */
  readonly position = computed(() => positionFromValue(this.sliderState()));

  /** True while a key that changes the value is held down. */
  private keyboardActive = false;

  private readonly drag = createDragController({
    getElement: () => this.host.nativeElement,
    isDisabled: () => this.isDisabled(),
    onStart: () => this.draggingState.set(true),
    onMove: (point) => {
      const state = this.sliderState();
      const offset = state.orientation === "vertical" ? point.normalizedY : point.normalizedX;
      this.setDisplayValue(valueFromPosition(state, offset));
    },
    onEnd: () => {
      this.draggingState.set(false);
      this.valueCommit.emit(this.value());
    },
  });

  constructor() {
    // `afterNextRender` never runs on the server, so this is the only place a
    // directive may touch the DOM.
    afterNextRender(() => {
      const element = this.host.nativeElement;
      this.syncDomState(element);
      if (typeof MutationObserver === "undefined") return;
      const observer = new MutationObserver(() => this.syncDomState(element));
      observer.observe(element, { attributes: true, attributeFilter: ["disabled", "dir"] });
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    this.destroyRef.onDestroy(() => this.drag.cancel());
  }

  /** Writes one display-space channel value back as a colour. */
  private setDisplayValue(next: number): void {
    if (!this.channelConfig()) return;
    if (Math.abs(next - this.sliderState().value) < FEEDBACK_EPSILON) return;
    this.value.set(applyDisplayValue(this.value(), this.colorSpace(), this.channel(), next));
  }

  /**
   * `getComputedStyle` is used for direction because `dir` inherits from any
   * ancestor; reading the host attribute alone would miss `<html dir="rtl">`.
   */
  private syncDomState(element: HTMLElement): void {
    this.disabledState.set(element.hasAttribute("disabled"));
    const direction
      = typeof getComputedStyle === "function"
        ? getComputedStyle(element).direction
        : element.getAttribute("dir");
    this.dirState.set(direction === "rtl" ? "rtl" : "ltr");
  }

  protected onPointerDown(event: PointerEvent): void {
    this.drag.pointerDown(event);
    // `pointerDown` calls `preventDefault`, which suppresses the focus the
    // browser would have moved to the thumb; do it explicitly instead.
    if (this.drag.isDragging) {
      this.host.nativeElement.querySelector<HTMLElement>("[role='slider']")?.focus();
    }
  }

  protected onPointerMove(event: PointerEvent): void {
    this.drag.pointerMove(event);
  }

  protected onPointerUp(event: PointerEvent): void {
    this.drag.pointerUp(event);
  }

  protected onPointerCancel(): void {
    this.drag.cancel();
    this.draggingState.set(false);
  }

  /**
   * Keyboard lives on the root rather than the thumb: `keydown` from the
   * focused thumb bubbles here, so one listener covers both.
   */
  protected onKeyDown(event: KeyboardEvent): void {
    const next = valueFromKey(this.sliderState(), event);
    if (next === undefined) return;
    event.preventDefault();
    this.keyboardActive = true;
    this.setDisplayValue(next);
  }

  protected onKeyUp(): void {
    if (!this.keyboardActive) return;
    this.keyboardActive = false;
    this.valueCommit.emit(this.value());
  }
}
