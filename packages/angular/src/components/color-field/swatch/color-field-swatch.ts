import { booleanAttribute, computed, Directive, HostAttributeToken, inject, input } from "@angular/core";
import type { Color } from "@urcolor/core";
import { CHECKERBOARD_BACKGROUND, DATA_DISABLED, parseColor } from "@urcolor/primitives";

/** The size `CHECKERBOARD_BACKGROUND` is already tiled at. */
const DEFAULT_CHECKER_SIZE = 16;

/**
 * A read-only preview of a colour, usually rendered inline with the field.
 *
 * The colour is painted as a flat `linear-gradient` layered over the
 * checkerboard, so a translucent value shows the checks through it. Every layer
 * is a host style binding, which leaves the consumer's own `style` attribute —
 * a template-level binding — winning the cascade.
 */
@Directive({
  selector: "[urcColorFieldSwatch]",
  exportAs: "urcColorFieldSwatch",
  host: {
    "[attr.role]": "'img'",
    "[attr.aria-label]": "label",
    "[style.background]": "background()",
    "[style.--swatch-color]": "swatchColor()",
    "[style.--swatch-color-opaque]": "opaqueColor()",
    "[style.--swatch-alpha]": "swatchAlpha()",
    "[style.--swatch-checkerboard]": "checkerboard()",
    [`[attr.${DATA_DISABLED}]`]: "isDisabled ? '' : null",
  },
})
export class ColorFieldSwatch {
  /** The colour to display. */
  readonly value = input<Color | string | null>();
  /** The checkerboard square size, in pixels. */
  readonly checkerSize = input(DEFAULT_CHECKER_SIZE);
  /** When true, reflects the colour's alpha; when false, paints it opaque. */
  readonly alpha = input(false, { transform: booleanAttribute });

  /**
   * A swatch is inert, so `disabled` is read once from the static host
   * attribute rather than tracked live — there is no interaction whose refusal
   * would need to change mid-life.
   */
  protected readonly isDisabled
    = inject(new HostAttributeToken("disabled"), { optional: true }) !== null;

  /** A consumer's own `aria-label` wins; the generic name is only a fallback. */
  protected readonly label
    = inject(new HostAttributeToken("aria-label"), { optional: true }) ?? "Colour swatch";

  private readonly color = computed(() => parseColor(this.value()));

  protected readonly checkerboard = computed(() => {
    const size = this.checkerSize();
    if (size === DEFAULT_CHECKER_SIZE) return CHECKERBOARD_BACKGROUND;
    return `repeating-conic-gradient(rgb(230, 230, 230) 0% 25%, white 0% 50%) 0% 50% / ${size}px ${size}px`;
  });

  protected readonly opaqueColor = computed(() => {
    const current = this.color();
    return current ? current.withAlpha(1).to("srgb").toString() : null;
  });

  protected readonly swatchColor = computed(() => {
    const current = this.color();
    if (!current) return "transparent";
    return this.alpha() ? current.to("srgb").toString() : this.opaqueColor();
  });

  protected readonly swatchAlpha = computed(() => this.color()?.alpha ?? null);

  protected readonly background = computed(() => {
    const current = this.swatchColor();
    const layer = current === "transparent" ? "transparent, transparent" : `${current}, ${current}`;
    return `linear-gradient(${layer}), ${this.checkerboard()}`;
  });
}
