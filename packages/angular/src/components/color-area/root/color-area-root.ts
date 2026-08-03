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
  applyDisplayValues,
  colorSpaces,
  colorToDisplayValue,
  createDragController,
  DATA_DISABLED,
  DATA_DRAGGING,
  DATA_SLIDER_AREA_IMPL,
  FEEDBACK_EPSILON,
  resolveChannelConfig,
  snapToStep,
  stepMultiplier,
} from "@urcolor/shared";

/** Whether the thumb straddles the edge (`"overflow"`) or is kept inside it. */
export type ColorAreaThumbAlignment = "contain" | "overflow";

/** The colour a root falls back to when `[(value)]` is never bound. */
export const COLOR_AREA_DEFAULT_COLOR: Color = Color.parse("hsl(0, 100%, 50%)")!;

/**
 * `ArrowDown` increases the vertical channel because the y display axis runs
 * downward whenever the area slides from the top; `boundary` re-mirrors it when
 * it does not.
 */
const STEP_KEYS: Record<string, { axis: "x" | "y"; sign: 1 | -1 }> = {
  ArrowRight: { axis: "x", sign: 1 },
  ArrowLeft: { axis: "x", sign: -1 },
  ArrowDown: { axis: "y", sign: 1 },
  ArrowUp: { axis: "y", sign: -1 },
};

/**
 * The root of a two-dimensional colour area. Owns the colour, the interaction,
 * and every piece of state the other parts read through `inject(ColorAreaRoot)`.
 *
 * ```html
 * <div urcColorAreaRoot [(value)]="color" colorSpace="hsl" xChannel="s" yChannel="l">
 *   <canvas urcColorAreaGradient></canvas>
 *   <span urcColorAreaThumb></span>
 * </div>
 * ```
 *
 * `implements FormValueControl<Color>` is satisfied by the `value` model alone,
 * which is what makes `<div urcColorAreaRoot [field]="form.brandColor">` work.
 */
@Directive({
  selector: "[urcColorAreaRoot]",
  exportAs: "urcColorAreaRoot",
  host: {
    [`[attr.${DATA_SLIDER_AREA_IMPL}]`]: "''",
    [`[attr.${DATA_DISABLED}]`]: "isDisabled() ? '' : null",
    [`[attr.${DATA_DRAGGING}]`]: "dragging() ? '' : null",
    "[attr.aria-disabled]": "isDisabled() ? 'true' : null",
    "[style.--reka-slider-area-thumb-transform]": "thumbTransform()",
    "(pointerdown)": "onPointerDown($event)",
    "(pointermove)": "onPointerMove($event)",
    "(pointerup)": "onPointerUp($event)",
    "(pointercancel)": "onPointerCancel()",
    "(keydown)": "onKeyDown($event)",
    "(keyup)": "onKeyUp()",
  },
})
export class ColorAreaRoot implements FormValueControl<Color> {
  /** The colour, two-way bindable as `[(value)]`. Also the Signal Forms contract. */
  readonly value = model<Color>(COLOR_AREA_DEFAULT_COLOR);
  /** Emitted once at the end of an interaction, never mid-drag. */
  readonly valueCommit = output<Color>();

  /** The colour space both axes operate in. */
  readonly colorSpace = input<SpaceId>("hsl");
  /** The channel on the horizontal axis. Defaults to the space's first channel. */
  readonly xChannel = input<string>();
  /** The channel on the vertical axis. Defaults to the space's second channel. */
  readonly yChannel = input<string>();
  /** Whether the horizontal axis runs opposite to its natural direction. */
  readonly xInverted = input(false, { transform: booleanAttribute });
  /** Whether the vertical axis runs opposite to its natural direction. */
  readonly yInverted = input(false, { transform: booleanAttribute });
  /** Whether the thumb straddles the edge (`"overflow"`) or is kept inside it. */
  readonly thumbAlignment = input<ColorAreaThumbAlignment>("overflow");

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

  /** The channel mapped to the horizontal axis, or `"alpha"`. */
  readonly xChannelKey = computed(
    () => this.xChannel() ?? colorSpaces[this.colorSpace()]?.channels[0]?.key ?? "h",
  );

  /** The channel mapped to the vertical axis, or `"alpha"`. */
  readonly yChannelKey = computed(
    () => this.yChannel() ?? colorSpaces[this.colorSpace()]?.channels[1]?.key ?? "s",
  );

  private readonly xConfig = computed(() =>
    resolveChannelConfig(this.colorSpace(), this.xChannelKey()),
  );

  private readonly yConfig = computed(() =>
    resolveChannelConfig(this.colorSpace(), this.yChannelKey()),
  );

  readonly minX = computed(() => this.xConfig()?.min ?? 0);
  readonly maxX = computed(() => this.xConfig()?.max ?? 100);
  readonly minY = computed(() => this.yConfig()?.min ?? 0);
  readonly maxY = computed(() => this.yConfig()?.max ?? 100);
  private readonly stepX = computed(() => this.xConfig()?.step ?? 1);
  private readonly stepY = computed(() => this.yConfig()?.step ?? 1);

  /** RTL and `xInverted` each mirror the horizontal axis, so together they cancel. */
  readonly isSlidingFromLeft = computed(
    () =>
      (this.dir() !== "rtl" && !this.xInverted()) || (this.dir() !== "ltr" && this.xInverted()),
  );

  /** Reading direction never affects the vertical axis. */
  readonly isSlidingFromTop = computed(() => !this.yInverted());

  /** The horizontal channel in display units. */
  readonly valueX = computed(() =>
    colorToDisplayValue(this.value(), this.colorSpace(), this.xChannelKey()),
  );

  /** The vertical channel in display units. */
  readonly valueY = computed(() =>
    colorToDisplayValue(this.value(), this.colorSpace(), this.yChannelKey()),
  );

  /**
   * The thumb centres itself on its edge unless the axis is mirrored and the
   * caller asked for `"contain"`, in which case it is pulled fully inside. It
   * is published as a custom property so a consumer's own thumb styling can
   * consume it exactly as in the other packages.
   */
  protected readonly thumbTransform = computed(() => {
    const overflow = this.thumbAlignment() === "overflow";
    const x = !this.isSlidingFromLeft() && overflow ? "50%" : "-50%";
    const y = !this.isSlidingFromTop() && overflow ? "50%" : "-50%";
    return `translate(${x}, ${y})`;
  });

  /** True while a key that changes the value is held down. */
  private keyboardActive = false;

  private readonly drag = createDragController({
    getElement: () => this.host.nativeElement,
    isDisabled: () => this.isDisabled(),
    onStart: () => this.draggingState.set(true),
    onMove: (point) => {
      this.setDisplayValues(
        this.valueFromNormalized(point.normalizedX, this.minX(), this.maxX(), this.isSlidingFromLeft()),
        this.valueFromNormalized(point.normalizedY, this.minY(), this.maxY(), this.isSlidingFromTop()),
      );
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

  /** Writes both display-space channel values back as a single colour. */
  private setDisplayValues(rawX: number, rawY: number): void {
    if (!this.xConfig() || !this.yConfig()) return;
    const nextX = snapToStep(rawX, this.minX(), this.maxX(), this.stepX());
    const nextY = snapToStep(rawY, this.minY(), this.maxY(), this.stepY());
    if (
      Math.abs(nextX - this.valueX()) < FEEDBACK_EPSILON
      && Math.abs(nextY - this.valueY()) < FEEDBACK_EPSILON
    ) {
      return;
    }
    this.value.set(
      applyDisplayValues(
        this.value(),
        this.colorSpace(),
        [this.xChannelKey(), this.yChannelKey()],
        [nextX, nextY],
      ),
    );
  }

  /** Maps a 0-1 axis position to a display value, honouring the axis direction. */
  private valueFromNormalized(
    position: number,
    min: number,
    max: number,
    forward: boolean,
  ): number {
    const ratio = forward ? position : 1 - position;
    return min + ratio * (max - min);
  }

  /**
   * `Home`/`End` and `PageUp`/`PageDown` address the *visual* edges, so a
   * mirrored axis swaps which bound each of them means.
   */
  private boundary(axis: "x" | "y", bound: number): number {
    if (axis === "x") {
      if (this.isSlidingFromLeft()) return bound;
      return bound === this.minX() ? this.maxX() : this.minX();
    }
    if (this.isSlidingFromTop()) return bound;
    return bound === this.minY() ? this.maxY() : this.minY();
  }

  /** The display-space point a key would move to, or undefined if it is not ours. */
  private pointFromKey(event: KeyboardEvent): [number, number] | undefined {
    if (this.isDisabled()) return undefined;

    const x = this.valueX();
    const y = this.valueY();

    if (event.key === "Home") return [this.boundary("x", this.minX()), y];
    if (event.key === "End") return [this.boundary("x", this.maxX()), y];
    if (event.key === "PageUp") return [x, this.boundary("y", this.minY())];
    if (event.key === "PageDown") return [x, this.boundary("y", this.maxY())];

    const delta = STEP_KEYS[event.key];
    if (!delta) return undefined;

    const axisIsX = delta.axis === "x";
    const forward = axisIsX ? this.isSlidingFromLeft() : this.isSlidingFromTop();
    const step = axisIsX ? this.stepX() : this.stepY();
    const offset = step * stepMultiplier(event) * delta.sign * (forward ? 1 : -1);
    return axisIsX ? [x + offset, y] : [x, y + offset];
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
    const next = this.pointFromKey(event);
    if (!next) return;
    event.preventDefault();
    this.keyboardActive = true;
    this.setDisplayValues(next[0], next[1]);
  }

  protected onKeyUp(): void {
    if (!this.keyboardActive) return;
    this.keyboardActive = false;
    this.valueCommit.emit(this.value());
  }
}
