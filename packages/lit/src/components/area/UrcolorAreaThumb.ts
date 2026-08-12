import {
  channelLabel,
  convertValueToPercentage,
  DATA_DISABLED,
  DATA_DRAGGING,
  formatChannelValue,
} from "@urcolor/shared";
import { define } from "../../base/define";
import { UrcolorPart } from "../../base/UrcolorPart";
import type { UrcolorAreaRoot } from "./UrcolorAreaRoot";

/**
 * The area's handle.
 *
 * Only focusable: `keydown` bubbles to the root, which owns every value
 * change.
 */
export class UrcolorAreaThumb extends UrcolorPart {
  override connectedCallback(): void {
    super.connectedCallback();
    this.bindRoot("urcolor-area-root");
  }

  protected override update(changed: Map<string, unknown>): void {
    const root = this.rootElement as UrcolorAreaRoot;

    const percentX = convertValueToPercentage(root.valueX, root.minX, root.maxX);
    const percentY = convertValueToPercentage(root.valueY, root.minY, root.maxY);

    this.setAttribute("role", "slider");
    this.setAttribute("aria-roledescription", "2D slider");
    this.setAttribute("aria-valuenow", String(root.valueX));
    this.setAttribute("aria-valuemin", String(root.minX));
    this.setAttribute("aria-valuemax", String(root.maxX));
    this.setAttribute(
      "aria-valuetext",
      `${formatChannelValue(root.colorSpace, root.xChannelKey, root.valueX)}, `
      + `${formatChannelValue(root.colorSpace, root.yChannelKey, root.valueY)}`,
    );

    if (!this.hasAttribute("aria-label")) {
      this.setAttribute(
        "aria-label",
        `${channelLabel(root.colorSpace, root.xChannelKey)} and ${channelLabel(root.colorSpace, root.yChannelKey)}`,
      );
    }

    if (root.disabled) {
      this.setAttribute("aria-disabled", "true");
      this.removeAttribute("tabindex");
    } else {
      this.removeAttribute("aria-disabled");
      this.setAttribute("tabindex", "0");
    }

    /**
     * A mirrored axis is anchored from the opposite edge so the percentage
     * stays positive. The transform comes from the root, which knows the
     * alignment.
     */
    this.style.position = "absolute";
    this.style.transform = "var(--reka-slider-area-thumb-transform)";
    if (root.isSlidingFromLeft) {
      this.style.left = `${percentX}%`;
      this.style.right = "";
    } else {
      this.style.right = `${percentX}%`;
      this.style.left = "";
    }
    if (root.isSlidingFromTop) {
      this.style.top = `${percentY}%`;
      this.style.bottom = "";
    } else {
      this.style.bottom = `${percentY}%`;
      this.style.top = "";
    }

    this.toggleAttribute(DATA_DISABLED, root.disabled);
    this.toggleAttribute(DATA_DRAGGING, root.dragging);
    super.update(changed);
  }
}

define("urcolor-area-thumb", UrcolorAreaThumb);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-area-thumb": UrcolorAreaThumb;
  }
}
