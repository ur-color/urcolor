import { html, nothing, type TemplateResult } from "lit";
import type { SpaceId } from "@urcolor/core";
import {
  CHECKERBOARD_CSS,
  cssLinearStops,
  defaultStepsFor,
  drawLinearGradient,
  gradientOpacity,
  sliderStops,
  SLIDER_CANVAS_STEPS,
  type ChannelOverrides,
  type CssGradientLayer,
  type GradientRenderer,
} from "@urcolor/shared";
import { define } from "../../base/define";
import { UrcolorPainter } from "../../base/UrcolorPainter";
import type { UrcolorSliderRoot } from "./UrcolorSliderRoot";

const SURFACE_STYLE = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
const LAYER_STYLE = "position:absolute;inset:0;width:100%;height:100%;";

/**
 * Paints the slider's color ramp.
 *
 * The only element in the family that renders: it owns either a stack of CSS
 * layers or a `<canvas>`, and never holds caller markup.
 */
export class UrcolorSliderGradient extends UrcolorPainter {
  static override properties = {
    colors: { type: Array },
    angle: { type: Number },
    interpolationSpace: { type: String, attribute: "interpolation-space" },
    channelOverrides: { attribute: false },
    renderer: { type: String },
  };

  /** Explicit color stops. When omitted they are derived from the channel. */
  declare colors: string[] | undefined;
  /** Rotation in degrees. Defaults to 90 for a vertical slider, 0 otherwise. */
  declare angle: number | undefined;
  /** Interpolate the stops in this space for perceptual accuracy. */
  declare interpolationSpace: SpaceId | undefined;
  /** Locked channels. Defaults to `{ alpha: 1 }`; pass `false` to disable. */
  declare channelOverrides: ChannelOverrides;
  /** `"auto"`, `"css"` or `"canvas"`. */
  declare renderer: GradientRenderer;

  constructor() {
    super();
    this.channelOverrides = { alpha: 1 };
    this.renderer = "auto";
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.bindRoot("urcolor-slider-root");
    // The transparency grid is this element's own background, which whatever
    // paints on top composites over. There is no separate checkerboard part.
    this.style.cssText = CHECKERBOARD_CSS + this.style.cssText;
  }

  get #root(): UrcolorSliderRoot {
    return this.rootElement as UrcolorSliderRoot;
  }

  get #effectiveAngle(): number {
    return this.angle ?? (this.#root.orientation === "vertical" ? 90 : 0);
  }

  #stops(steps: number) {
    const root = this.#root;
    return sliderStops({
      color: root.color,
      colorSpace: root.colorSpace,
      channel: root.channel,
      colors: this.colors,
      channelOverrides: this.channelOverrides,
      interpolationSpace: this.interpolationSpace,
      steps,
      mirrored: root.inverted,
    });
  }

  /**
   * `null` means the canvas: the caller asked for it, or no exact recipe
   * exists for this space and channel. A layer list means the `<canvas>` is
   * never created at all, which frees a capped WebGL context slot.
   */
  get #cssLayers(): CssGradientLayer[] | null {
    if (this.renderer === "canvas") return null;
    const root = this.#root;
    const steps = this.colors ? SLIDER_CANVAS_STEPS : defaultStepsFor(root.colorSpace, root.channel);
    const stops = this.#stops(steps);
    return stops ? cssLinearStops(stops, this.#effectiveAngle) : null;
  }

  protected override render(): TemplateResult | typeof nothing {
    const root = this.#root;
    const opacity = gradientOpacity(root.color, root.channel, this.channelOverrides);
    const layers = this.#cssLayers;

    if (layers) {
      return html`
        <span style="${SURFACE_STYLE}opacity:${opacity};">
          ${layers.map(layer => html`<span
            style="${LAYER_STYLE}background-image:${layer.image};${layer.mask
              // Safari carried the prefixed property well past the point this
              // library started relying on masks; both are emitted.
              ? `mask-image:${layer.mask};-webkit-mask-image:${layer.mask};`
              : ""}"
          ></span>`)}
        </span>`;
    }

    return html`<canvas style="${SURFACE_STYLE}opacity:${opacity};"></canvas>`;
  }

  protected override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    const canvas = this.querySelector("canvas");
    if (!canvas) return;
    const stops = this.#stops(SLIDER_CANVAS_STEPS);
    if (!stops) return;
    drawLinearGradient(canvas, stops, this.#effectiveAngle, this.#root.channel === "alpha");
  }

  override disconnectedCallback(): void {
    // WebGL contexts are a capped per-document resource; release ours.
    this.querySelector("canvas")?.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext();
    super.disconnectedCallback();
  }
}

define("urcolor-slider-gradient", UrcolorSliderGradient);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-slider-gradient": UrcolorSliderGradient;
  }
}
