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
import { CHECKERBOARD_BACKGROUND, DATA_DISABLED, getChannelConfig, renderToCanvas, sampleTriangleGrid } from "@urcolor/shared";
import { ColorTriangleRoot } from "../root/color-triangle-root";

/** Both axes are sampled at this resolution and then smoothly upscaled. */
const GRID = 64;

/**
 * Channels locked to fixed values while the gradient is drawn, or `false` for
 * no overrides at all.
 */
export type ColorTriangleChannelOverrides = Record<string, number> | false;

/**
 * Paints the triangle's colour surface onto a `<canvas>` the consumer supplies.
 *
 * The transparency checkerboard is this element's CSS background, which the
 * canvas bitmap composites over — there is no separate `Checkerboard` part.
 *
 * The outline is cut here as well as on the root. `sampleTriangleGrid` clamps
 * its barycentric coordinates, so the bitmap is coloured out to its corners and
 * nothing translucent can show through the clip.
 */
@Directive({
  selector: "canvas[urcColorTriangleGradient]",
  exportAs: "urcColorTriangleGradient",
  host: {
    [`[attr.${DATA_DISABLED}]`]: "root.isDisabled() ? '' : null",
    "[style.position]": "'absolute'",
    "[style.inset]": "'0'",
    "[style.width]": "'100%'",
    "[style.height]": "'100%'",
    "[style.pointer-events]": "'none'",
    "[style.background]": "checkerboard",
    "[style.clip-path]": "clipPath()",
    "[style.opacity]": "canvasOpacity()",
  },
})
export class ColorTriangleGradient {
  /** Locked channels. Defaults to `{ alpha: 1 }`; pass `false` to disable. */
  readonly channelOverrides = input<ColorTriangleChannelOverrides>({ alpha: 1 });

  protected readonly checkerboard = CHECKERBOARD_BACKGROUND;

  protected readonly root = inject(ColorTriangleRoot);
  private readonly host = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly canvasOpacity = computed(() => {
    const overrides = this.channelOverrides();
    if (overrides === false || overrides["alpha"] === undefined) return this.root.value().alpha;
    return 1;
  });

  protected readonly clipPath = computed(() => {
    const points = this.root
      .vertices()
      .map(point => `${(point.x * 100).toFixed(2)}% ${(point.y * 100).toFixed(2)}%`)
      .join(", ");
    return `polygon(${points})`;
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
    const applicable: Record<string, number> = {};
    let result = base;
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
    // Sampling a triangle is the most expensive of the five grids, and a drag
    // only moves the channels the surface already spans, so the pixels cannot
    // change while one is in flight.
    if (this.root.dragging()) return;

    const colorSpace = this.root.colorSpace();
    const xChannel = this.root.xChannelKey();
    const yChannel = this.root.yChannelKey();
    const xConfig = getChannelConfig(colorSpace, xChannel);
    const yConfig = getChannelConfig(colorSpace, yChannel);
    if (!xConfig || !yConfig) return;

    let zChannel: string | undefined;
    let zMin: number | undefined;
    let zMax: number | undefined;
    const rootZChannel = this.root.zChannelKey();
    if (this.root.isThreeChannel() && rootZChannel !== undefined) {
      const zConfig = getChannelConfig(colorSpace, rootZChannel);
      if (zConfig) {
        zChannel = rootZChannel;
        zMin = zConfig.nativeMin ?? zConfig.min;
        zMax = zConfig.nativeMax ?? zConfig.max;
      }
    }

    const [v0, v1, v2] = this.root.vertices();
    const pixels = sampleTriangleGrid(
      this.withOverrides(this.root.value()),
      colorSpace,
      xChannel,
      yChannel,
      xConfig.nativeMin ?? xConfig.min,
      xConfig.nativeMax ?? xConfig.max,
      yConfig.nativeMin ?? yConfig.min,
      yConfig.nativeMax ?? yConfig.max,
      v0,
      v1,
      v2,
      GRID,
      GRID,
      false,
      zChannel,
      zMin,
      zMax,
    );
    renderToCanvas({ canvas, pixels, sampleWidth: GRID, sampleHeight: GRID });
  }
}
