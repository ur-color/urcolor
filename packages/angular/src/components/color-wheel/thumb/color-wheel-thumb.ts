import { computed, Directive, HostAttributeToken, inject } from "@angular/core";
import {
  channelLabel,
  DATA_DISABLED,
  DATA_DRAGGING,
  formatChannelValue,
} from "@urcolor/shared";
import { ColorWheelRoot } from "../root/color-wheel-root";

/**
 * The single combined handle. One thumb drives both axes, so it is only a
 * focus target and an ARIA surface — every value change is owned by the root,
 * whose `keydown` listener sees the events that bubble up from here.
 *
 * `aria-valuenow` can only carry one number; the angular axis owns it and
 * `aria-valuetext` announces the pair.
 */
@Directive({
  selector: "[urcColorWheelThumb]",
  exportAs: "urcColorWheelThumb",
  host: {
    "role": "slider",
    "aria-roledescription": "Color thumb",
    "[attr.tabindex]": "tabIndex()",
    "[attr.aria-label]": "label()",
    "[attr.aria-valuenow]": "root.angleValue()",
    "[attr.aria-valuemin]": "root.angleMin()",
    "[attr.aria-valuemax]": "root.angleMax()",
    "[attr.aria-valuetext]": "valueText()",
    "[attr.aria-disabled]": "root.isDisabled() ? 'true' : null",
    [`[attr.${DATA_DISABLED}]`]: "root.isDisabled() ? '' : null",
    [`[attr.${DATA_DRAGGING}]`]: "root.dragging() ? '' : null",
    "[style.position]": "'absolute'",
    "[style.top]": "'50%'",
    "[style.left]": "'50%'",
    "[style.transform-origin]": "'0 0'",
    "[style.transform]": "transform()",
  },
})
export class ColorWheelThumb {
  protected readonly root = inject(ColorWheelRoot);

  /** A consumer's own `aria-label` wins; the channel pair is only a fallback. */
  private readonly ariaLabelAttr = inject(new HostAttributeToken("aria-label"), { optional: true });

  /** Position on the wheel, in degrees clockwise from 12 o'clock. */
  private readonly angleDeg = computed(() => {
    const min = this.root.angleMin();
    const range = this.root.angleMax() - min;
    if (range === 0) return this.root.startAngle();
    return ((this.root.angleValue() - min) / range) * 360 + this.root.startAngle();
  });

  /**
   * Distance from the centre, as a percentage of the container's smaller side.
   * The wheel's radius is half that side, hence the 50 rather than 100.
   */
  private readonly radiusPercent = computed(() => {
    const min = this.root.radiusMin();
    const range = this.root.radiusMax() - min;
    if (range === 0) return 0;
    return ((this.root.radiusValue() - min) / range) * 50;
  });

  private readonly angleLabel = computed(() =>
    channelLabel(this.root.colorSpace(), this.root.angleChannelKey()),
  );

  private readonly radiusLabel = computed(() =>
    channelLabel(this.root.colorSpace(), this.root.radiusChannelKey()),
  );

  protected readonly tabIndex = computed(() => (this.root.isDisabled() ? null : 0));

  protected readonly label = computed(
    () => this.ariaLabelAttr ?? `${this.angleLabel()}, ${this.radiusLabel()}`,
  );

  protected readonly valueText = computed(() => {
    const colorSpace = this.root.colorSpace();
    const angle = formatChannelValue(colorSpace, this.root.angleChannelKey(), this.root.angleValue());
    const radius = formatChannelValue(
      colorSpace,
      this.root.radiusChannelKey(),
      this.root.radiusValue(),
    );
    return `${this.angleLabel()} ${angle}, ${this.radiusLabel()} ${radius}`;
  });

  protected readonly transform = computed(
    () =>
      `rotate(${this.angleDeg()}deg) translateY(-${this.radiusPercent()}cqmin) translate(-50%, -50%)`,
  );
}
