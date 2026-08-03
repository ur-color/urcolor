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
  drawGradient,
  getChannelConfig,
  sampleBilinearGrid,
  sampleChannelGrid,
  type SpaceId,
} from "@urcolor/core";
import { CHECKERBOARD_BACKGROUND, renderToCanvas } from "@urcolor/primitives";
import { ColorAreaRoot } from "../root/color-area-root";

/** Both axes are sampled at this resolution and then smoothly upscaled. */
const GRID = 64;

/**
 * Channels locked to fixed values while the surface is drawn, or `false` for no
 * overrides at all.
 */
export type ColorAreaChannelOverrides = Record<string, number> | false;

/**
 * Paints the area's two-dimensional colour surface onto a `<canvas>` the
 * consumer supplies.
 *
 * The transparency checkerboard is this element's CSS background, which the
 * canvas bitmap composites over — there is no separate `Checkerboard` part.
 */
@Directive({
  selector: "canvas[urcColorAreaGradient]",
  exportAs: "urcColorAreaGradient",
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
export class ColorAreaGradient {
  /** Explicit top-left corner colour. Supplying any corner switches to corner mode. */
  readonly topLeft = input<string>();
  /** Explicit top-right corner colour. */
  readonly topRight = input<string>();
  /** Explicit bottom-left corner colour. */
  readonly bottomLeft = input<string>();
  /** Explicit bottom-right corner colour. */
  readonly bottomRight = input<string>();
  /** Interpolate the surface in this space for perceptual accuracy. */
  readonly interpolationSpace = input<SpaceId>();
  /** Locked channels. Defaults to `{ alpha: 1 }`; pass `false` to disable. */
  readonly channelOverrides = input<ColorAreaChannelOverrides>({ alpha: 1 });

  protected readonly checkerboard = CHECKERBOARD_BACKGROUND;

  private readonly root = inject(ColorAreaRoot);
  private readonly host = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  private readonly xIsAlpha = computed(() => this.root.xChannelKey() === "alpha");
  private readonly yIsAlpha = computed(() => this.root.yChannelKey() === "alpha");
  /** One axis being alpha means the surface itself must be drawn with transparency. */
  private readonly hasAlphaAxis = computed(() => this.xIsAlpha() || this.yIsAlpha());

  private readonly hasCorners = computed(
    () =>
      this.topLeft() !== undefined
      || this.topRight() !== undefined
      || this.bottomLeft() !== undefined
      || this.bottomRight() !== undefined,
  );

  protected readonly canvasOpacity = computed(() => {
    if (this.hasAlphaAxis()) return 1;
    const overrides = this.channelOverrides();
    if (overrides === false || overrides["alpha"] === undefined) return this.root.value().alpha;
    return 1;
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

  /** Applies the caller's fixed channel values on top of a base colour. */
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

  /** The four explicit corner colours, or null when any of them fails to parse. */
  private cornerColors(): [Color, Color, Color, Color] | null {
    const tl = Color.parse(this.topLeft() ?? "black");
    const tr = Color.parse(this.topRight() ?? "black");
    const bl = Color.parse(this.bottomLeft() ?? "black");
    const br = Color.parse(this.bottomRight() ?? "black");
    if (!tl || !tr || !bl || !br) return null;
    return [tl, tr, bl, br];
  }

  private paintCorners(canvas: HTMLCanvasElement): void {
    const corners = this.cornerColors();
    if (!corners) return;

    const space = this.interpolationSpace();
    const fromLeft = this.root.isSlidingFromLeft();
    const fromTop = this.root.isSlidingFromTop();

    if (!space) {
      // The GPU path mirrors in the shader, so the corners are passed as authored.
      drawGradient(
        canvas,
        corners[0],
        corners[1],
        corners[2],
        corners[3],
        this.hasAlphaAxis(),
        !fromLeft,
        !fromTop,
      );
      return;
    }

    // The CPU path has no mirror flags, so the corners are swapped instead.
    let [a, b, c, d] = corners;
    if (!fromLeft) [a, b, c, d] = [b, a, d, c];
    if (!fromTop) [a, b, c, d] = [c, d, a, b];
    const pixels = sampleBilinearGrid(a, b, c, d, GRID, GRID, space, this.hasAlphaAxis());
    renderToCanvas({ canvas, pixels, sampleWidth: GRID, sampleHeight: GRID });
  }

  /** Both axes carry a real channel: the core sampler covers it directly. */
  private paintChannelGrid(canvas: HTMLCanvasElement, base: Color): void {
    const colorSpace = this.root.colorSpace();
    const xChannel = this.root.xChannelKey();
    const yChannel = this.root.yChannelKey();
    const xConfig = getChannelConfig(colorSpace, xChannel);
    const yConfig = getChannelConfig(colorSpace, yChannel);
    if (!xConfig || !yConfig) return;

    const xMin = xConfig.nativeMin ?? xConfig.min;
    const xMax = xConfig.nativeMax ?? xConfig.max;
    const yMin = yConfig.nativeMin ?? yConfig.min;
    const yMax = yConfig.nativeMax ?? yConfig.max;
    const fromLeft = this.root.isSlidingFromLeft();
    const fromTop = this.root.isSlidingFromTop();

    const pixels = sampleChannelGrid(
      base,
      colorSpace,
      xChannel,
      yChannel,
      fromLeft ? xMin : xMax,
      fromLeft ? xMax : xMin,
      fromTop ? yMin : yMax,
      fromTop ? yMax : yMin,
      GRID,
      GRID,
      this.hasAlphaAxis(),
    );
    renderToCanvas({ canvas, pixels, sampleWidth: GRID, sampleHeight: GRID });
  }

  /**
   * One axis is alpha, so only the other carries a channel. The core samplers
   * take two real channels, so this surface is built pixel by pixel instead.
   */
  private paintAlphaAxisGrid(canvas: HTMLCanvasElement, base: Color, channelKey: string): void {
    const colorSpace = this.root.colorSpace();
    const config = getChannelConfig(colorSpace, channelKey);
    if (!config) return;

    const channelMin = config.nativeMin ?? config.min;
    const channelMax = config.nativeMax ?? config.max;
    const realIsX = !this.xIsAlpha();
    const realForward = realIsX ? this.root.isSlidingFromLeft() : this.root.isSlidingFromTop();
    const alphaForward = realIsX ? this.root.isSlidingFromTop() : this.root.isSlidingFromLeft();
    const realMin = realForward ? channelMin : channelMax;
    const realMax = realForward ? channelMax : channelMin;
    const alphaMin = alphaForward ? 0 : 1;
    const alphaMax = alphaForward ? 1 : 0;

    const pixels = new Uint8ClampedArray(GRID * GRID * 4);
    for (let y = 0; y < GRID; y++) {
      const vy = y / (GRID - 1);
      for (let x = 0; x < GRID; x++) {
        const vx = x / (GRID - 1);
        const realValue = realIsX
          ? realMin + vx * (realMax - realMin)
          : realMin + vy * (realMax - realMin);
        const alphaValue = realIsX
          ? alphaMin + vy * (alphaMax - alphaMin)
          : alphaMin + vx * (alphaMax - alphaMin);
        const rgb = base.with({ space: colorSpace, [channelKey]: realValue }).to("srgb");
        const index = (y * GRID + x) * 4;
        pixels[index] = Math.round(Math.max(0, Math.min(1, rgb.get("r"))) * 255);
        pixels[index + 1] = Math.round(Math.max(0, Math.min(1, rgb.get("g"))) * 255);
        pixels[index + 2] = Math.round(Math.max(0, Math.min(1, rgb.get("b"))) * 255);
        pixels[index + 3] = Math.round(Math.max(0, Math.min(1, alphaValue)) * 255);
      }
    }
    renderToCanvas({ canvas, pixels, sampleWidth: GRID, sampleHeight: GRID });
  }

  private paint(canvas: HTMLCanvasElement): void {
    if (this.hasCorners()) {
      this.paintCorners(canvas);
      return;
    }

    const base = this.withOverrides(this.root.value());
    if (!this.xIsAlpha() && !this.yIsAlpha()) {
      this.paintChannelGrid(canvas, base);
      return;
    }
    // Both axes being alpha leaves no channel to sample, so nothing is painted.
    const channelKey = this.xIsAlpha()
      ? this.yIsAlpha()
        ? undefined
        : this.root.yChannelKey()
      : this.root.xChannelKey();
    if (channelKey === undefined) return;
    this.paintAlphaAxisGrid(canvas, base, channelKey);
  }
}
