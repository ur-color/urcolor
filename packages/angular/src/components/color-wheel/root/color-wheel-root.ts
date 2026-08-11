import {
  afterNextRender,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  HostAttributeToken,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from "@angular/core";
import type { FormValueControl } from "@angular/forms/signals";
import { Color, type SpaceId } from "@urcolor/core";
import {
  applyDisplayValues,
  cartesianToPolar,
  clamp,
  clampToCircle,
  colorSpaces,
  colorToDisplayValue,
  createDragController,
  DATA_DISABLED,
  DATA_DRAGGING,
  FEEDBACK_EPSILON,
  normalizeAngle,
  resolveArrowKey,
  resolveChannelConfig,
  snapToStep,
  stepMultiplier,
  type DragPoint,
} from "@urcolor/shared";

/** The colour a root falls back to when `[(value)]` is never bound. */
export const COLOR_WHEEL_DEFAULT_COLOR: Color = Color.parse("hsl(0, 100%, 50%)")!;

/** `PageUp`/`PageDown` move the radial axis by ten steps. */
const PAGE_MULTIPLIER = 10;

/**
 * The root of a colour wheel: a disc whose angular axis drives one channel
 * (usually hue) and whose radial axis drives another (usually saturation or
 * chroma). It owns the colour, the interaction, and every piece of state the
 * other parts read through `inject(ColorWheelRoot)`.
 *
 * ```html
 * <div urcColorWheelRoot [(value)]="color" colorSpace="hsl">
 *   <canvas urcColorWheelGradient></canvas>
 *   <span urcColorWheelThumb></span>
 * </div>
 * ```
 *
 * `implements FormValueControl<Color>` is satisfied by the `value` model alone,
 * which is what makes `<div urcColorWheelRoot [field]="form.brandColor">` work.
 */
@Directive({
  selector: "[urcColorWheelRoot]",
  exportAs: "urcColorWheelRoot",
  host: {
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
export class ColorWheelRoot implements FormValueControl<Color> {
  /** The colour, two-way bindable as `[(value)]`. Also the Signal Forms contract. */
  readonly value = model<Color>(COLOR_WHEEL_DEFAULT_COLOR);
  /** Emitted once at the end of an interaction, never mid-drag. */
  readonly valueCommit = output<Color>();

  /** The colour space the wheel operates in. */
  readonly colorSpace = input<SpaceId>("hsl");
  /** Channel driven by the angular axis. Defaults to the space's first channel. */
  readonly angleChannel = input<string>();
  /** Channel driven by the radial axis. Defaults to the space's second channel. */
  readonly radiusChannel = input<string>();
  /** Degrees of rotation for the angular axis; 0 puts its origin at 12 o'clock. */
  readonly startAngle = input(0, { transform: numberAttribute });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * `disabled` is DOM state, not an input. The static host attribute is read at
   * construction — which works under SSR, where there is no DOM — and a
   * `MutationObserver` installed after the first render keeps it live.
   */
  private readonly disabledState = signal(
    inject(new HostAttributeToken("disabled"), { optional: true }) !== null,
  );

  private readonly draggingState = signal(false);

  /**
   * Whether interaction is refused. Named `isDisabled` rather than `disabled`
   * because `FormUiControl` reserves `disabled` for an `InputSignal<boolean>`.
   */
  readonly isDisabled = this.disabledState.asReadonly();
  /** True while a pointer drag is in flight. */
  readonly dragging = this.draggingState.asReadonly();

  private readonly spaceConfig = computed(() => colorSpaces[this.colorSpace()]);

  /** The resolved angular channel, after the space's default is applied. */
  readonly angleChannelKey = computed(
    () => this.angleChannel() ?? this.spaceConfig()?.channels[0]?.key ?? "h",
  );

  /** The resolved radial channel, after the space's default is applied. */
  readonly radiusChannelKey = computed(
    () => this.radiusChannel() ?? this.spaceConfig()?.channels[1]?.key ?? "s",
  );

  private readonly angleConfig = computed(() =>
    resolveChannelConfig(this.colorSpace(), this.angleChannelKey()),
  );

  private readonly radiusConfig = computed(() =>
    resolveChannelConfig(this.colorSpace(), this.radiusChannelKey()),
  );

  /** Lower bound of the angular axis, in display units. */
  readonly angleMin = computed(() => this.angleConfig()?.min ?? 0);
  /** Upper bound of the angular axis, in display units. */
  readonly angleMax = computed(() => this.angleConfig()?.max ?? 360);
  private readonly angleStep = computed(() => this.angleConfig()?.step ?? 1);
  /** Lower bound of the radial axis, in display units. */
  readonly radiusMin = computed(() => this.radiusConfig()?.min ?? 0);
  /** Upper bound of the radial axis, in display units. */
  readonly radiusMax = computed(() => this.radiusConfig()?.max ?? 100);
  private readonly radiusStep = computed(() => this.radiusConfig()?.step ?? 1);

  /** The angular channel in display units. */
  readonly angleValue = computed(() =>
    colorToDisplayValue(this.value(), this.colorSpace(), this.angleChannelKey()),
  );

  /** The radial channel in display units. */
  readonly radiusValue = computed(() =>
    colorToDisplayValue(this.value(), this.colorSpace(), this.radiusChannelKey()),
  );

  /** Hue-like axes wrap; bounded ones clamp. */
  private readonly angleIsCyclic = computed(() => this.angleConfig()?.format === "degree");

  /** True while a key that changes the value is held down. */
  private keyboardActive = false;

  private readonly drag = createDragController({
    getElement: () => this.host.nativeElement,
    isDisabled: () => this.isDisabled(),
    // The wheel is a disc inside a square box; a press in a corner belongs to
    // whatever is behind the wheel, not to the wheel.
    hitTest: (point) => {
      const { rect } = point;
      const dx = point.clientX - (rect.left + rect.width / 2);
      const dy = point.clientY - (rect.top + rect.height / 2);
      const maxRadius = Math.min(rect.width, rect.height) / 2;
      return dx * dx + dy * dy <= maxRadius * maxRadius;
    },
    onStart: () => this.draggingState.set(true),
    onMove: (point) => {
      const values = this.valuesFromPoint(point);
      this.setDisplayValues(values.angle, values.radius);
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
      observer.observe(element, { attributes: true, attributeFilter: ["disabled"] });
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    this.destroyRef.onDestroy(() => this.drag.cancel());
  }

  private syncDomState(element: HTMLElement): void {
    this.disabledState.set(element.hasAttribute("disabled"));
  }

  private wrapAngle(next: number): number {
    const min = this.angleMin();
    const range = this.angleMax() - min;
    if (range === 0) return min;
    return ((((next - min) % range) + range) % range) + min;
  }

  /** Writes both display-space channel values back as a colour. */
  private setDisplayValues(angle: number, radius: number): void {
    if (!this.angleConfig() || !this.radiusConfig()) return;
    const snappedAngle = snapToStep(angle, this.angleMin(), this.angleMax(), this.angleStep());
    const snappedRadius = snapToStep(radius, this.radiusMin(), this.radiusMax(), this.radiusStep());
    const changed
      = Math.abs(snappedAngle - this.angleValue()) >= FEEDBACK_EPSILON
        || Math.abs(snappedRadius - this.radiusValue()) >= FEEDBACK_EPSILON;
    if (!changed) return;
    this.value.set(
      applyDisplayValues(
        this.value(),
        this.colorSpace(),
        [this.angleChannelKey(), this.radiusChannelKey()],
        [snappedAngle, snappedRadius],
      ),
    );
  }

  /** Maps a pointer position onto the two display-space axes. */
  private valuesFromPoint(point: DragPoint): { angle: number; radius: number } {
    const { rect } = point;
    const angleMin = this.angleMin();
    const radiusMin = this.radiusMin();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxRadius = Math.min(rect.width, rect.height) / 2;
    if (maxRadius === 0) return { angle: angleMin, radius: radiusMin };
    const clamped = clampToCircle(point.clientX, point.clientY, cx, cy, maxRadius);
    const polar = cartesianToPolar(clamped.x, clamped.y, cx, cy);
    const normalizedAngle = normalizeAngle(polar.angle, this.startAngle());
    const normalizedRadius = Math.min(1, polar.radius / maxRadius);
    return {
      angle: angleMin + (normalizedAngle / 360) * (this.angleMax() - angleMin),
      radius: radiusMin + normalizedRadius * (this.radiusMax() - radiusMin),
    };
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
    this.drag.pointerCancel();
    this.draggingState.set(false);
  }

  /**
   * Keyboard lives on the root rather than the thumb: `keydown` from the
   * focused thumb bubbles here, so one listener covers both.
   */
  protected onKeyDown(event: KeyboardEvent): void {
    if (this.isDisabled()) return;

    // Home and End jump both axes at once, so they bypass the offset path.
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      this.keyboardActive = true;
      if (event.key === "Home") this.setDisplayValues(this.angleMin(), this.radiusMin());
      else this.setDisplayValues(this.angleMax(), this.radiusMax());
      return;
    }

    let angleOffset = 0;
    let radiusOffset = 0;
    const arrow = resolveArrowKey({ key: event.key });
    if (arrow) {
      // The horizontal axis drives the angle, the vertical axis the radius.
      const magnitude = stepMultiplier(event) * arrow.sign;
      if (arrow.axis === "x") angleOffset = this.angleStep() * magnitude;
      else radiusOffset = this.radiusStep() * magnitude;
    } else if (event.key === "PageUp") {
      radiusOffset = this.radiusStep() * PAGE_MULTIPLIER;
    } else if (event.key === "PageDown") {
      radiusOffset = -this.radiusStep() * PAGE_MULTIPLIER;
    } else {
      return;
    }

    event.preventDefault();
    this.keyboardActive = true;
    const rawAngle = this.angleValue() + angleOffset;
    const nextAngle = this.angleIsCyclic()
      ? this.wrapAngle(rawAngle)
      : clamp(rawAngle, this.angleMin(), this.angleMax());
    const nextRadius = clamp(this.radiusValue() + radiusOffset, this.radiusMin(), this.radiusMax());
    this.setDisplayValues(nextAngle, nextRadius);
  }

  protected onKeyUp(): void {
    if (!this.keyboardActive) return;
    this.keyboardActive = false;
    this.valueCommit.emit(this.value());
  }
}
