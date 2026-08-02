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
import {
  Color,
  drawLinearGradient,
  getChannelConfig,
  interpolateStops,
  type SpaceId,
} from "@urcolor/core";
import { CHECKERBOARD_BACKGROUND } from "@urcolor/primitives";
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
    "[style.background]": "checkerboard",
    "[style.opacity]": "canvasOpacity()",
  },
})
export class ColorSliderGradient {
  /** Explicit colour stops. When omitted they are derived from the channel. */
  readonly colors = input<string[]>();
  /** Rotation in degrees. Defaults to 90 for a vertical slider, 0 otherwise. */
  readonly angle = input<number>();
  /** Interpolate the stops in this space for perceptual accuracy. */
  readonly interpolationSpace = input<SpaceId>();
  /** Locked channels. Defaults to `{ alpha: 1 }`; pass `false` to disable. */
  readonly channelOverrides = input<ColorSliderChannelOverrides>({ alpha: 1 });

  protected readonly checkerboard = CHECKERBOARD_BACKGROUND;

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

  private readonly autoColors = computed<Color[] | null>(() => {
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
    for (let i = 0; i < AUTO_STEPS; i++) {
      const t = i / (AUTO_STEPS - 1);
      stops.push(base.with({ space: colorSpace, [channel]: min + t * (max - min) }));
    }
    return stops;
  });

  constructor() {
    // Canvas work is deferred to `afterNextRender`: it never runs on the
    // server, where `OffscreenCanvas` and WebGL do not exist. The effect is
    // created here rather than as a field so that it, too, is browser-only.
    afterNextRender(() => {
      const canvas = this.host.nativeElement;

      effect(() => this.paint(canvas), { injector: this.injector });

      if (typeof ResizeObserver !== "undefined") {
        const observer = new ResizeObserver(() => this.paint(canvas));
        observer.observe(canvas);
        this.destroyRef.onDestroy(() => observer.disconnect());
      }

      this.destroyRef.onDestroy(() => {
        // WebGL contexts are a capped per-document resource; release ours.
        canvas.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext();
      });
    });
  }

  private paint(canvas: HTMLCanvasElement): void {
    const explicit = this.colors();
    let stops: Color[];

    if (explicit) {
      const parsed = explicit.map(entry => Color.parse(entry));
      if (parsed.length < 2 || parsed.some(entry => !entry)) return;
      stops = parsed as Color[];
    } else {
      const auto = this.autoColors();
      if (!auto || auto.length < 2) return;
      stops = auto;
    }

    // Horizontal and vertical both mirror along their own axis when inverted.
    if (this.root.inverted()) stops = [...stops].reverse();

    const space = this.interpolationSpace();
    const resolved = space ? interpolateStops(stops, INTERPOLATION_STEPS, space) : stops;
    drawLinearGradient(canvas, resolved, this.effectiveAngle(), this.isAlphaChannel());
  }
}
