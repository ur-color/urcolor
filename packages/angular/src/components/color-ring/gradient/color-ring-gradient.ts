import {
  afterNextRender,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
} from "@angular/core";
import type { Color } from "@urcolor/core";
import { channelStops, CHECKERBOARD_BACKGROUND, cssConicStops, DATA_DISABLED, getChannelConfig, renderToCanvas, sampleConicRing } from "@urcolor/shared";
import { cssGradientBackground, type GradientRenderer } from "../../../shared/css-gradient";
import { ColorRingRoot } from "../root/color-ring-root";

const SAMPLE_SIZE = 128;

/**
 * Channels locked to fixed values while the gradient is drawn, or `false` for
 * no overrides at all.
 */
export type ColorRingChannelOverrides = Record<string, number> | false;

/**
 * Paints the ring's conic colour ramp onto a `<canvas>` the consumer supplies.
 *
 * The annulus is cut here and nowhere else: the canvas paints a full square and
 * the mask hides the hole and the corners. Because the checkerboard background
 * and the bitmap are on the same element, one mask rasterisation covers both —
 * masking a wrapper *and* the canvas is what used to leave a seam, since the
 * two edges rasterise independently and their partial coverage multiplies.
 *
 * The ±0.5px on the stops is what antialiases the edges: a gradient hard stop
 * (two stops at one position) rasterises without any, so both circles came out
 * visibly stepped.
 */
@Directive({
  selector: "canvas[urcColorRingGradient]",
  exportAs: "urcColorRingGradient",
  host: {
    [`[attr.${DATA_DISABLED}]`]: "root.isDisabled() ? '' : null",
    "[style.position]": "'absolute'",
    "[style.inset]": "'0'",
    "[style.width]": "'100%'",
    "[style.height]": "'100%'",
    "[style.pointer-events]": "'none'",
    "[style.background]": "background()",
    "[style.mask-image]": "mask()",
    "[style.-webkit-mask-image]": "mask()",
  },
})
export class ColorRingGradient {
  /**
   * Which painter to use.
   * - `"auto"` (default) — CSS when an exact recipe exists, canvas otherwise
   * - `"css"` — force CSS; falls back to the canvas with a dev warning if none exists
   * - `"canvas"` — force the canvas painter
   *
   * On the CSS path the recipe becomes this canvas' own CSS background and no
   * drawing context is ever acquired, so the gradient survives server
   * rendering and costs no WebGL context.
   */
  readonly renderer = input<GradientRenderer>("auto");

  /** Locked channels. Defaults to `{ alpha: 1 }`; pass `false` to disable. */
  readonly channelOverrides = input<ColorRingChannelOverrides>({ alpha: 1 });

  protected readonly checkerboard = CHECKERBOARD_BACKGROUND;

  protected readonly root = inject(ColorRingRoot);
  private readonly host = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly mask = computed(() => {
    const p = this.root.innerRadius() * 100;
    return (
      `radial-gradient(circle closest-side at center, transparent calc(${p}% - 0.5px), `
      + `#000 calc(${p}% + 0.5px), #000 calc(100% - 0.5px), transparent 100%)`
    );
  });

  /**
   * The CSS recipe as this canvas' background, or the bare checkerboard when
   * the canvas painter is the one that runs.
   */
  protected readonly background = computed(
    () => cssGradientBackground(this.renderer(), "ColorRingGradient", () => {
      // `sampleConicRing` writes an opaque alpha byte for every pixel, so the
      // CSS stops drop the base colour's alpha to match rather than tinting it.
      const base = this.withOverrides(this.root.value()).withAlpha(1);
      const stops = channelStops(base, this.root.colorSpace(), this.root.channelKey());
      return stops && cssConicStops(stops, this.root.startAngle());
    }) ?? this.checkerboard,
  );

  /** Whether the canvas should paint at all. */
  private readonly usesCanvas = computed(() => this.background() === this.checkerboard);

  constructor() {
    // Canvas work is deferred to `afterNextRender`: it never runs on the
    // server, where `OffscreenCanvas` does not exist. The effect is created
    // here rather than as a field so that it, too, is browser-only.
    afterNextRender(() => {
      const canvas = this.host.nativeElement;

      effect(() => {
        if (this.usesCanvas()) this.paint(canvas);
      }, { injector: this.injector });

      if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(() => {
          if (this.usesCanvas()) this.paint(canvas);
        });
        observer.observe(canvas);
        this.destroyRef.onDestroy(() => observer.disconnect());
      }

      this.destroyRef.onDestroy(() => {
        // WebGL contexts are a capped per-document resource; release ours.
        if (!this.usesCanvas()) return;
        canvas.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext();
      });
    });
  }

  /** Applies the alpha and non-alpha overrides to a base colour. */
  private withOverrides(base: Color): Color {
    const overrides = this.channelOverrides();
    if (overrides === false) return base;
    const colorSpace = this.root.colorSpace();
    let result = base;
    const applicable: Record<string, number> = {};
    for (const [key, value] of Object.entries(overrides)) {
      if (key === "alpha") result = result.withAlpha(value);
      else if (getChannelConfig(colorSpace, key)) applicable[key] = value;
    }
    if (Object.keys(applicable).length > 0) {
      result = result.with({ space: colorSpace, ...applicable });
    }
    return result;
  }

  private paint(canvas: HTMLCanvasElement): void {
    const colorSpace = this.root.colorSpace();
    const channel = this.root.channelKey();
    const config = getChannelConfig(colorSpace, channel);
    if (!config) return;

    const base = this.withOverrides(this.root.value());
    const channelMin = config.nativeMin ?? config.min;
    const channelMax = config.nativeMax ?? config.max;
    const pixels = sampleConicRing(
      base,
      colorSpace,
      channel,
      channelMin,
      channelMax,
      SAMPLE_SIZE,
      SAMPLE_SIZE,
      this.root.startAngle(),
    );
    // `innerRadius` is deliberately not read: it only moves the mask, and the
    // pixels the canvas paints are the same at every radius.
    renderToCanvas({ canvas, pixels, sampleWidth: SAMPLE_SIZE, sampleHeight: SAMPLE_SIZE });
  }
}
