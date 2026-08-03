import type { SpaceId } from "@urcolor/core";
import { getChannelConfig } from "./color-spaces";

const ALPHA_LABEL = "Alpha";

/** Human-readable name for a channel, as announced to assistive technology. */
export function channelLabel(colorSpace: SpaceId, channelKey: string): string {
  if (channelKey === "alpha")
    return ALPHA_LABEL;
  return getChannelConfig(colorSpace, channelKey)?.label ?? channelKey;
}

/** A channel value rendered with its unit, for `aria-valuetext`. */
export function formatChannelValue(colorSpace: SpaceId, channelKey: string, value: number): string {
  if (channelKey === "alpha")
    return `${Math.round(value)}%`;
  const config = getChannelConfig(colorSpace, channelKey);
  if (!config)
    return String(Math.round(value));
  const decimals = (String(config.step).split(".")[1] || "").length;
  let rounded = value.toFixed(decimals);
  // A value that rounds to zero can still carry a sign (e.g. `(-0.3).toFixed(0)` is
  // `"-0"`), which would announce a misleading negative to assistive technology.
  if (rounded.startsWith("-") && Number(rounded) === 0)
    rounded = rounded.slice(1);
  if (config.format === "percentage")
    return `${rounded}%`;
  if (config.format === "degree")
    return `${rounded}°`;
  return rounded;
}
