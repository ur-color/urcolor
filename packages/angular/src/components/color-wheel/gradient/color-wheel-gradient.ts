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
import { Color } from "@urcolor/core";
import { CHECKERBOARD_BACKGROUND, cssWheelPolar, DATA_DISABLED, getChannelConfig, renderToCanvas, samplePolarGrid } from "@urcolor/shared";
import { cssGradientBackground, type GradientRenderer } from "../../../shared/css-gradient";
import { ColorWheelRoot } from "../root/color-wheel-root";

/** Edge length of the sampled square the disc is cut from. */
const SAMPLE_SIZE = 128;

/**
 * Channels locked to fixed values while the gradient is drawn, or `false` for
 * no overrides at all.
 */
export type ColorWheelChannelOverrides = Record<string, number> | false;

/**
 * Paints the wheel's colour disc onto a `<canvas>` the consumer supplies.
 *
 * The transparency checkerboard is this element's CSS background, which the
 * canvas bitmap composites over — there is no separate `Checkerboard` part.
 * The disc is cut with `clip-path` rather than inside `renderToCanvas`: the
 * sampled grid fills its whole square, and clipping in both places leaves a
 * seam along the boundary.
 */
@Directive({
  selector: "canvas[urcColorWheelGradient]",
  exportAs: "urcColorWheelGradient",
  host: {
    [`[attr.${DATA_DISABLED}]`]: "root.isDisabled() ? '' : null",
    "[style.position]": "'absolute'",
    "[style.inset]": "'0'",
    "[style.width]": "'100%'",
    "[style.height]": "'100%'",
    "[style.pointer-events]": "'none'",
    "[style.border-radius]": "'50%'",
    "[style.clip-path]": "'circle(50%)'",
    "[style.background]": "background()",
  },
})
export class ColorWheelGradient {
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
  readonly channelOverrides = input<ColorWheelChannelOverrides>({ alpha: 1 });

  protected readonly checkerboard = CHECKERBOARD_BACKGROUND;
  protected readonly root = inject(ColorWheelRoot);

  private readonly host = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * The CSS recipe as this canvas' background, or the bare checkerboard when
   * the canvas painter is the one that runs.
   */
  protected readonly background = computed(
    () => cssGradientBackground(this.renderer(), "ColorWheelGradient", () => cssWheelPolar(
      this.withOverrides(this.root.value()), this.root.colorSpace(),
      this.root.angleChannelKey(), this.root.radiusChannelKey(), this.root.startAngle(),
    )) ?? this.checkerboard,
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

  /** Applies the non-alpha overrides, then alpha, to a base colour. */
  private withOverrides(base: Color): Color {
    const overrides = this.channelOverrides();
    if (overrides === false) return base;
    const colorSpace = this.root.colorSpace();
    const applicable: Record<string, number> = {};
    for (const [key, value] of Object.entries(overrides)) {
      if (key !== "alpha" && getChannelConfig(colorSpace, key)) applicable[key] = value;
    }
    let result = base;
    if (Object.keys(applicable).length > 0) {
      result = result.with({ space: colorSpace, ...applicable });
    }
    const alpha = overrides["alpha"];
    if (alpha !== undefined) result = result.withAlpha(alpha);
    return result;
  }

  private paint(canvas: HTMLCanvasElement): void {
    // Both axes sweep their full range, so nothing the disc shows depends on
    // the values a drag is changing. Reading `dragging` still subscribes this
    // effect to it, so the disc repaints once the gesture ends.
    if (this.root.dragging()) return;

    const colorSpace = this.root.colorSpace();
    const angleChannel = this.root.angleChannelKey();
    const radiusChannel = this.root.radiusChannelKey();
    const angleConfig = getChannelConfig(colorSpace, angleChannel);
    const radiusConfig = getChannelConfig(colorSpace, radiusChannel);
    if (!angleConfig || !radiusConfig) return;

    const base = this.withOverrides(this.root.value());
    const pixels = samplePolarGrid(
      base,
      colorSpace,
      angleChannel,
      radiusChannel,
      angleConfig.nativeMin ?? angleConfig.min,
      angleConfig.nativeMax ?? angleConfig.max,
      radiusConfig.nativeMin ?? radiusConfig.min,
      radiusConfig.nativeMax ?? radiusConfig.max,
      SAMPLE_SIZE,
      SAMPLE_SIZE,
      this.root.startAngle(),
    );
    renderToCanvas({ canvas, pixels, sampleWidth: SAMPLE_SIZE, sampleHeight: SAMPLE_SIZE });
  }
}
