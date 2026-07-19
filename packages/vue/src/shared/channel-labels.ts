import type { SpaceId } from "@urcolor/core";
import { getChannelConfig } from "@urcolor/core";

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
  const rounded = value.toFixed(decimals);
  if (config.format === "percentage")
    return `${rounded}%`;
  if (config.format === "degree")
    return `${rounded}°`;
  return rounded;
}
