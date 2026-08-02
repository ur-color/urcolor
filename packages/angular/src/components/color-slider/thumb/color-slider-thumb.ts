import { computed, Directive, HostAttributeToken, inject } from "@angular/core";
import {
  channelLabel,
  DATA_DISABLED,
  DATA_DRAGGING,
  DATA_ORIENTATION,
  formatChannelValue,
  sliderAria,
} from "@urcolor/primitives";
import { ColorSliderRoot } from "../root/color-slider-root";

/**
 * The draggable handle. It is only a focus target and an ARIA surface — every
 * value change is owned by the root, whose `keydown` listener sees the events
 * that bubble up from here.
 */
@Directive({
  selector: "[urcColorSliderThumb]",
  exportAs: "urcColorSliderThumb",
  host: {
    "[attr.role]": "role()",
    "[attr.aria-valuenow]": "valueNow()",
    "[attr.aria-valuemin]": "valueMin()",
    "[attr.aria-valuemax]": "valueMax()",
    "[attr.aria-orientation]": "ariaOrientation()",
    "[attr.aria-disabled]": "ariaDisabled()",
    "[attr.aria-label]": "label()",
    "[attr.aria-valuetext]": "valueText()",
    "[attr.tabindex]": "tabIndex()",
    [`[attr.${DATA_ORIENTATION}]`]: "root.orientation()",
    [`[attr.${DATA_DISABLED}]`]: "root.isDisabled() ? '' : null",
    [`[attr.${DATA_DRAGGING}]`]: "root.dragging() ? '' : null",
    "[style.position]": "'absolute'",
    "[style.left]": "left()",
    "[style.top]": "top()",
    "[style.translate]": "'-50% -50%'",
  },
})
export class ColorSliderThumb {
  protected readonly root = inject(ColorSliderRoot);

  /** A consumer's own `aria-label` wins; the channel name is only a fallback. */
  private readonly ariaLabelAttr = inject(new HostAttributeToken("aria-label"), { optional: true });

  private readonly aria = computed(() => sliderAria(this.root.sliderState()));
  private readonly vertical = computed(() => this.root.sliderState().orientation === "vertical");
  private readonly offset = computed(() => `${this.root.position() * 100}%`);

  protected readonly role = computed(() => this.aria().role);
  protected readonly valueNow = computed(() => this.aria()["aria-valuenow"]);
  protected readonly valueMin = computed(() => this.aria()["aria-valuemin"]);
  protected readonly valueMax = computed(() => this.aria()["aria-valuemax"]);
  protected readonly ariaOrientation = computed(() => this.aria()["aria-orientation"]);
  protected readonly ariaDisabled = computed(() => this.aria()["aria-disabled"] ?? null);
  protected readonly tabIndex = computed(() => this.aria().tabindex ?? null);

  protected readonly label = computed(
    () => this.ariaLabelAttr ?? channelLabel(this.root.colorSpace(), this.root.channel()),
  );

  protected readonly valueText = computed(() =>
    formatChannelValue(
      this.root.colorSpace(),
      this.root.channel(),
      this.root.sliderState().value,
    ),
  );

  protected readonly left = computed(() => (this.vertical() ? "50%" : this.offset()));
  protected readonly top = computed(() => (this.vertical() ? this.offset() : "50%"));
}
