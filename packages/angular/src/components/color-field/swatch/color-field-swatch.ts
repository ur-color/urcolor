import { booleanAttribute, computed, Directive, HostAttributeToken, inject, input } from "@angular/core";
import type { Color } from "@urcolor/core";
import {
  CHECKERBOARD_BACKGROUND,
  DATA_DISABLED,
  SWATCH_BACKGROUND,
  SWATCH_BACKGROUND_REF,
  swatchPaint,
} from "@urcolor/shared";

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
    "[style.background]": "background",
    "[style.--urcolor-checkerboard-size]": "checkerSizeVar()",
    "[style.--urcolor-swatch-color]": "swatchColor()",
    "[style.--urcolor-swatch-color-opaque]": "opaqueColor()",
    "[style.--urcolor-swatch-alpha]": "swatchAlpha()",
    "[style.--urcolor-swatch-checkerboard]": "checkerboard",
    "[style.--urcolor-swatch-background]": "swatchBackground",
    "[style.--swatch-color]": "swatchColor()",
    "[style.--swatch-color-opaque]": "opaqueColor()",
    "[style.--swatch-alpha]": "swatchAlpha()",
    "[style.--swatch-checkerboard]": "checkerboard",
    [`[attr.${DATA_DISABLED}]`]: "isDisabled ? '' : null",
  },
})
export class ColorFieldSwatch {
  /** The colour to display. */
  readonly value = input<Color | string | null>();
  /**
   * The checkerboard square size, in pixels. Left unset, the grid reads
   * `--urcolor-checkerboard-size` and falls back to `16px`.
   */
  readonly checkerSize = input<number | undefined>(undefined);
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

  private readonly paint = computed(() => swatchPaint(this.value(), this.alpha()));

  /**
   * Written only when `checkerSize` asks for it, so an author stylesheet keeps
   * ownership of `--urcolor-checkerboard-size` by default.
   */
  protected readonly checkerSizeVar = computed(() => {
    const size = this.checkerSize();
    return size === undefined ? null : `${size}px`;
  });

  protected readonly checkerboard = CHECKERBOARD_BACKGROUND;

  protected readonly opaqueColor = computed(() => this.paint().colorOpaque);
  protected readonly swatchColor = computed(() => this.paint().color);
  protected readonly swatchAlpha = computed(() => this.paint().alpha);

  protected readonly swatchBackground = SWATCH_BACKGROUND;

  protected readonly background = SWATCH_BACKGROUND_REF;
}
