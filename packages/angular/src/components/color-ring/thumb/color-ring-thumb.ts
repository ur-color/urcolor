import { computed, Directive, HostAttributeToken, inject } from "@angular/core";
import {
  channelLabel,
  DATA_DISABLED,
  DATA_DRAGGING,
  formatChannelValue,
} from "@urcolor/shared";
import { ColorRingRoot } from "../root/color-ring-root";

/**
 * The draggable handle. It is only a focus target and an ARIA surface — every
 * value change is owned by the root, whose `keydown` listener sees the events
 * that bubble up from here.
 *
 * There is no `aria-orientation`: a ring is neither horizontal nor vertical.
 */
@Directive({
  selector: "[urcColorRingThumb]",
  exportAs: "urcColorRingThumb",
  host: {
    "[attr.role]": "'slider'",
    "[attr.tabindex]": "tabIndex()",
    "[attr.aria-valuenow]": "root.displayValue()",
    "[attr.aria-valuemin]": "root.channelMin()",
    "[attr.aria-valuemax]": "root.channelMax()",
    "[attr.aria-valuetext]": "valueText()",
    "[attr.aria-label]": "label()",
    "[attr.aria-disabled]": "root.isDisabled() ? 'true' : null",
    [`[attr.${DATA_DISABLED}]`]: "root.isDisabled() ? '' : null",
    [`[attr.${DATA_DRAGGING}]`]: "root.dragging() ? '' : null",
    "[style.position]": "'absolute'",
    "[style.top]": "'50%'",
    "[style.left]": "'50%'",
    "[style.transform]": "transform()",
    "[style.transform-origin]": "'0 0'",
  },
})
export class ColorRingThumb {
  protected readonly root = inject(ColorRingRoot);

  /** A consumer's own `aria-label` wins; the channel name is only a fallback. */
  private readonly ariaLabelAttr = inject(new HostAttributeToken("aria-label"), { optional: true });

  protected readonly tabIndex = computed(() => (this.root.isDisabled() ? null : 0));

  /** Degrees clockwise from 12 o'clock at which the thumb currently sits. */
  private readonly angle = computed(() => {
    const min = this.root.channelMin();
    const range = this.root.channelMax() - min;
    if (range === 0) return this.root.startAngle();
    return ((this.root.displayValue() - min) / range) * 360 + this.root.startAngle();
  });

  /**
   * Half the annulus width from the centre, in `cqmin` — the ring's own
   * container query unit, so the orbit tracks the root's size without measuring
   * it. The root must therefore declare `container-type: size` or `inline-size`.
   */
  private readonly orbit = computed(() => ((1 + this.root.innerRadius()) / 2) * 50);

  protected readonly transform = computed(
    () =>
      `rotate(${this.angle()}deg) translateY(-${this.orbit()}cqmin) translate(-50%, -50%)`,
  );

  protected readonly label = computed(
    () => this.ariaLabelAttr ?? channelLabel(this.root.colorSpace(), this.root.channelKey()),
  );

  protected readonly valueText = computed(() =>
    formatChannelValue(this.root.colorSpace(), this.root.channelKey(), this.root.displayValue()),
  );
}
