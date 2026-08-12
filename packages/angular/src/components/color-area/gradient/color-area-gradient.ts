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
import type { SpaceId } from "@urcolor/core";
import {
  areaCssLayers,
  CHECKERBOARD_BACKGROUND,
  CHECKERBOARD_REF,
  paintAreaSurface,
  surfaceOpacity,
  type AreaAxes,
  type AreaSurfaceOptions,
  type SurfaceCorners,
} from "@urcolor/shared";
import { cssGradientBackground, type GradientRenderer } from "../../../shared/css-gradient";
import { ColorAreaRoot } from "../root/color-area-root";

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
    "[style.--urcolor-checkerboard]": "checkerboardRecipe",
    "[style.background]": "background()",
    "[style.opacity]": "canvasOpacity()",
  },
})
export class ColorAreaGradient {
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

  protected readonly checkerboardRecipe = CHECKERBOARD_BACKGROUND;

  /**
   * The grid is referenced through its custom property rather than inlined,
   * so an author stylesheet can retile or recolour it; see `CHECKERBOARD_STYLE`.
   */
  protected readonly checkerboard = CHECKERBOARD_REF;

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

  protected readonly canvasOpacity = computed(
    () => surfaceOpacity(this.root.value(), this.hasAlphaAxis(), this.channelOverrides()),
  );

  /**
   * The CSS recipe as this canvas' background, or the bare checkerboard when
   * the canvas painter is the one that runs.
   */
  protected readonly background = computed(
    () => cssGradientBackground(this.renderer(), "ColorAreaGradient", () => {
      // Corner mode and an alpha axis both need a `mask-image` on their own
      // layer, which a single element cannot express — see `cssGradientBackground`.
      if (this.hasCorners() || this.hasAlphaAxis()) return null;
      return areaCssLayers(this.surface());
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

  /** The axes as `@urcolor/shared` describes them, shared by both painters. */
  private axes(): AreaAxes {
    return {
      colorSpace: this.root.colorSpace(),
      xChannel: this.root.xChannelKey(),
      yChannel: this.root.yChannelKey(),
      slidingFromLeft: this.root.isSlidingFromLeft(),
      slidingFromTop: this.root.isSlidingFromTop(),
    };
  }

  /** The four corners, or undefined when the caller gave none. */
  private corners(): SurfaceCorners | undefined {
    if (!this.hasCorners()) return undefined;
    return [
      this.topLeft() ?? "black",
      this.topRight() ?? "black",
      this.bottomLeft() ?? "black",
      this.bottomRight() ?? "black",
    ];
  }

  private surface(): AreaSurfaceOptions {
    return {
      ...this.axes(),
      color: this.root.value(),
      overrides: this.channelOverrides(),
      corners: this.corners(),
      interpolationSpace: this.interpolationSpace(),
    };
  }

  private paint(canvas: HTMLCanvasElement): void {
    paintAreaSurface({ ...this.surface(), canvas });
  }
}
