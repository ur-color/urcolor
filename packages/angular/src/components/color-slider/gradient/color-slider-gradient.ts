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
import { Color, type SpaceId } from "@urcolor/core";
import {
  CHECKERBOARD_BACKGROUND,
  CHECKERBOARD_REF,
  cssLinearStops,
  defaultStepsFor,
  drawLinearGradient,
  getChannelConfig,
  interpolateStops,
} from "@urcolor/shared";
import { cssGradientBackground, type GradientRenderer } from "../../../shared/css-gradient";
import { ColorSliderRoot } from "../root/color-slider-root";

const AUTO_STEPS = 12;
const INTERPOLATION_STEPS = 32;

/**
 * Channels locked to fixed values while the gradient is drawn, or `false` for
 * no overrides at all.
 */
export type ColorSliderChannelOverrides = Record<string, number> | false;

/**
 * Paints the slider's colour ramp onto a `<canvas>` the consumer supplies.
 *
 * The transparency checkerboard is this element's CSS background, which the
 * canvas bitmap composites over — there is no separate `Checkerboard` part.
 */
@Directive({
  selector: "canvas[urcColorSliderGradient]",
  exportAs: "urcColorSliderGradient",
  host: {
    "[style.position]": "'absolute'",
    "[style.inset]": "'0'",
    "[style.width]": "'100%'",
    "[style.height]": "'100%'",
    "[style.pointer-events]": "'none'",
    "[style.--urcolor-checkerboard]": "checkerboardRecipe",
    "[style.background]": "background()",
    "[style.opacity]": "canvasOpacity()",
  },
})
export class ColorSliderGradient {
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

  /** Explicit colour stops. When omitted they are derived from the channel. */
  readonly colors = input<string[]>();
  /** Rotation in degrees. Defaults to 90 for a vertical slider, 0 otherwise. */
  readonly angle = input<number>();
  /** Interpolate the stops in this space for perceptual accuracy. */
  readonly interpolationSpace = input<SpaceId>();
  /** Locked channels. Defaults to `{ alpha: 1 }`; pass `false` to disable. */
  readonly channelOverrides = input<ColorSliderChannelOverrides>({ alpha: 1 });

  protected readonly checkerboardRecipe = CHECKERBOARD_BACKGROUND;

  /**
   * The grid is referenced through its custom property rather than inlined,
   * so an author stylesheet can retile or recolour it; see `CHECKERBOARD_STYLE`.
   */
  protected readonly checkerboard = CHECKERBOARD_REF;

  private readonly root = inject(ColorSliderRoot);
  private readonly host = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  private readonly isAlphaChannel = computed(() => this.root.channel() === "alpha");

  private readonly effectiveAngle = computed(
    () => this.angle() ?? (this.root.orientation() === "vertical" ? 90 : 0),
  );

  protected readonly canvasOpacity = computed(() => {
    if (this.isAlphaChannel()) return 1;
    const overrides = this.channelOverrides();
    if (overrides === false || overrides["alpha"] === undefined) return this.root.value().alpha;
    return 1;
  });

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

  private buildAutoColors(steps: number): Color[] | null {
    if (this.colors()) return null;

    const colorSpace = this.root.colorSpace();
    const channel = this.root.channel();
    const base = this.withOverrides(this.root.value());

    if (this.isAlphaChannel()) return [base.withAlpha(0), base.withAlpha(1)];

    const config = getChannelConfig(colorSpace, channel);
    if (!config) return null;

    const min = config.nativeMin ?? config.min;
    const max = config.nativeMax ?? config.max;
    const stops: Color[] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      stops.push(base.with({ space: colorSpace, [channel]: min + t * (max - min) }));
    }
    return stops;
  }

  /**
   * The stop list both painters draw, differing only in how many stops they can
   * hold: the shader has 16 uniform slots, CSS has no ceiling. Mirroring
   * reverses the stops rather than flipping the gradient, as the WebGL path has
   * always done.
   *
   * `interpolationSpace` does not force the canvas — a 1D sweep is fully
   * expressible as stops, and they are densified in that space here.
   */
  private resolveStops(steps: number): Color[] | null {
    const explicit = this.colors();
    let stops: Color[];

    if (explicit) {
      const parsed = explicit.map(entry => Color.parse(entry));
      if (parsed.length < 2 || parsed.some(entry => !entry)) return null;
      stops = parsed as Color[];
    } else {
      const auto = this.buildAutoColors(steps);
      if (!auto || auto.length < 2) return null;
      stops = auto;
    }

    // Horizontal and vertical both mirror along their own axis when inverted.
    if (this.root.inverted()) stops = [...stops].reverse();

    const space = this.interpolationSpace();
    return space ? interpolateStops(stops, INTERPOLATION_STEPS, space) : stops;
  }

  /**
   * The CSS recipe as this canvas' background, or `null` when the canvas
   * painter is the one that runs.
   */
  protected readonly background = computed(
    () => cssGradientBackground(this.renderer(), "ColorSliderGradient", () => {
      const stops = this.resolveStops(
        this.colors() ? AUTO_STEPS : defaultStepsFor(this.root.colorSpace(), this.root.channel()),
      );
      return stops && cssLinearStops(stops, this.effectiveAngle());
    }) ?? this.checkerboard,
  );

  /** Whether the canvas should paint at all. */
  private readonly usesCanvas = computed(() => this.background() === this.checkerboard);

  constructor() {
    // Canvas work is deferred to `afterNextRender`: it never runs on the
    // server, where `OffscreenCanvas` and WebGL do not exist. The effect is
    // created here rather than as a field so that it, too, is browser-only.
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

  private paint(canvas: HTMLCanvasElement): void {
    const stops = this.resolveStops(AUTO_STEPS);
    if (!stops) return;
    drawLinearGradient(canvas, stops, this.effectiveAngle(), this.isAlphaChannel());
  }
}
