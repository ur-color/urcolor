import { computed, Directive, HostAttributeToken, inject } from "@angular/core";
import {
  channelLabel,
  convertValueToPercentage,
  DATA_DISABLED,
  DATA_DRAGGING,
  formatChannelValue,
} from "@urcolor/primitives";
import { ColorAreaRoot } from "../root/color-area-root";

/**
 * The draggable handle. It is only a focus target and an ARIA surface — every
 * value change is owned by the root, whose `keydown` listener sees the events
 * that bubble up from here.
 *
 * A mirrored axis is anchored from the opposite edge so the percentage stays
 * positive. The centring transform comes from the root, which is what knows
 * the requested alignment.
 */
@Directive({
  selector: "[urcColorAreaThumb]",
  exportAs: "urcColorAreaThumb",
  host: {
    "[attr.role]": "'slider'",
    "[attr.aria-roledescription]": "'2D slider'",
    "[attr.aria-valuenow]": "root.valueX()",
    "[attr.aria-valuemin]": "root.minX()",
    "[attr.aria-valuemax]": "root.maxX()",
    "[attr.aria-valuetext]": "valueText()",
    "[attr.aria-label]": "label()",
    "[attr.aria-disabled]": "root.isDisabled() ? 'true' : null",
    "[attr.tabindex]": "tabIndex()",
    [`[attr.${DATA_DISABLED}]`]: "root.isDisabled() ? '' : null",
    [`[attr.${DATA_DRAGGING}]`]: "root.dragging() ? '' : null",
    "[style.position]": "'absolute'",
    "[style.transform]": "'var(--reka-slider-area-thumb-transform)'",
    "[style.left]": "left()",
    "[style.right]": "right()",
    "[style.top]": "top()",
    "[style.bottom]": "bottom()",
  },
})
export class ColorAreaThumb {
  protected readonly root = inject(ColorAreaRoot);

  /** A consumer's own `aria-label` wins; the channel names are only a fallback. */
  private readonly ariaLabelAttr = inject(new HostAttributeToken("aria-label"), { optional: true });

  private readonly percentX = computed(
    () => `${convertValueToPercentage(this.root.valueX(), this.root.minX(), this.root.maxX())}%`,
  );

  private readonly percentY = computed(
    () => `${convertValueToPercentage(this.root.valueY(), this.root.minY(), this.root.maxY())}%`,
  );

  protected readonly tabIndex = computed(() => (this.root.isDisabled() ? null : 0));

  protected readonly label = computed(
    () =>
      this.ariaLabelAttr
      ?? `${channelLabel(this.root.colorSpace(), this.root.xChannel())} and `
      + `${channelLabel(this.root.colorSpace(), this.root.yChannel())}`,
  );

  protected readonly valueText = computed(
    () =>
      `${formatChannelValue(this.root.colorSpace(), this.root.xChannel(), this.root.valueX())}, `
      + `${formatChannelValue(this.root.colorSpace(), this.root.yChannel(), this.root.valueY())}`,
  );

  protected readonly left = computed(() =>
    this.root.isSlidingFromLeft() ? this.percentX() : null,
  );

  protected readonly right = computed(() =>
    this.root.isSlidingFromLeft() ? null : this.percentX(),
  );

  protected readonly top = computed(() => (this.root.isSlidingFromTop() ? this.percentY() : null));
  protected readonly bottom = computed(() =>
    this.root.isSlidingFromTop() ? null : this.percentY(),
  );
}
