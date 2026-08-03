import {
  afterNextRender,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  HostAttributeToken,
  inject,
} from "@angular/core";
import {
  barycentricToCartesian,
  channelLabel,
  DATA_DISABLED,
  DATA_DRAGGING,
  formatChannelValue,
} from "@urcolor/shared";
import { ColorTriangleRoot } from "../root/color-triangle-root";

/**
 * The single combined handle. There is no `ThumbX`/`ThumbY`/`ThumbZ`: the
 * triangle's axes are not independent, so one element carries all of them.
 *
 * It is only a focus target and an ARIA surface — every value change is owned
 * by the root, whose `keydown` listener sees the events that bubble up here.
 */
@Directive({
  selector: "[urcColorTriangleThumb]",
  exportAs: "urcColorTriangleThumb",
  host: {
    "role": "slider",
    "aria-roledescription": "Color thumb",
    "[attr.aria-valuenow]": "root.valueX()",
    "[attr.aria-valuemin]": "root.minX()",
    "[attr.aria-valuemax]": "root.maxX()",
    "[attr.aria-valuetext]": "valueText()",
    "[attr.aria-label]": "label()",
    "[attr.aria-disabled]": "root.isDisabled() ? 'true' : null",
    "[attr.tabindex]": "tabIndex()",
    [`[attr.${DATA_DISABLED}]`]: "root.isDisabled() ? '' : null",
    [`[attr.${DATA_DRAGGING}]`]: "root.dragging() ? '' : null",
    "[style.position]": "'absolute'",
    "[style.left]": "left()",
    "[style.top]": "top()",
    "[style.translate]": "'-50% -50%'",
  },
})
export class ColorTriangleThumb {
  protected readonly root = inject(ColorTriangleRoot);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** A consumer's own `aria-label` wins; the channel names are only a fallback. */
  private readonly ariaLabelAttr = inject(new HostAttributeToken("aria-label"), { optional: true });

  constructor() {
    // The root measures this element for the `"contain"` inset. Registration is
    // deferred to `afterNextRender` because it reads `clientWidth`/`clientHeight`.
    afterNextRender(() => {
      const unregister = this.root.registerThumb(this.host.nativeElement);
      this.destroyRef.onDestroy(unregister);
    });
  }

  /**
   * Channel values back to barycentric weights.
   *
   * In three-channel mode all three axes are read and renormalised — only their
   * ratio is meaningful. In two-channel mode the first channel is `u`, the
   * second runs backwards along `w`, and `v` is whatever is left over.
   */
  private readonly bary = computed(() => {
    const xRange = this.root.maxX() - this.root.minX();
    const yRange = this.root.maxY() - this.root.minY();

    if (this.root.isThreeChannel()) {
      const zRange = this.root.maxZ() - this.root.minZ();
      const rawU = xRange === 0 ? 0 : (this.root.valueX() - this.root.minX()) / xRange;
      const rawV = yRange === 0 ? 0 : (this.root.valueY() - this.root.minY()) / yRange;
      const rawW = zRange === 0 ? 0 : (this.root.valueZ() - this.root.minZ()) / zRange;
      const sum = rawU + rawV + rawW || 1;
      return { u: rawU / sum, v: rawV / sum, w: rawW / sum };
    }

    const u = xRange === 0 ? 0 : (this.root.valueX() - this.root.minX()) / xRange;
    const w = yRange === 0 ? 0 : 1 - (this.root.valueY() - this.root.minY()) / yRange;
    return { u, v: Math.max(0, 1 - u - w), w };
  });

  private readonly position = computed(() => {
    const { u, v, w } = this.bary();
    const [v0, v1, v2] = this.root.positionVertices();
    return barycentricToCartesian(u, v, w, v0, v1, v2);
  });

  /** The third entry is present only in three-channel mode. */
  private readonly labels = computed(() => {
    const space = this.root.colorSpace();
    const zChannel = this.root.zChannelKey();
    return {
      x: channelLabel(space, this.root.xChannelKey()),
      y: channelLabel(space, this.root.yChannelKey()),
      z: zChannel === undefined ? undefined : channelLabel(space, zChannel),
    };
  });

  protected readonly label = computed(() => {
    if (this.ariaLabelAttr !== null) return this.ariaLabelAttr;
    const { x, y, z } = this.labels();
    return [x, y, z].filter(entry => entry !== undefined).join(", ");
  });

  protected readonly valueText = computed(() => {
    const space = this.root.colorSpace();
    const labels = this.labels();
    const parts = [
      `${labels.x} ${formatChannelValue(space, this.root.xChannelKey(), this.root.valueX())}`,
      `${labels.y} ${formatChannelValue(space, this.root.yChannelKey(), this.root.valueY())}`,
    ];
    const zChannel = this.root.zChannelKey();
    if (labels.z !== undefined && zChannel !== undefined) {
      parts.push(`${labels.z} ${formatChannelValue(space, zChannel, this.root.valueZ())}`);
    }
    return parts.join(", ");
  });

  protected readonly tabIndex = computed(() => (this.root.isDisabled() ? null : 0));
  protected readonly left = computed(() => `${this.position().x * 100}%`);
  protected readonly top = computed(() => `${this.position().y * 100}%`);
}
