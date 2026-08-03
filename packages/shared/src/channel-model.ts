import { Color, type SpaceId } from "@urcolor/core";
import { displayToNative, getChannelConfig, nativeToDisplay, type ChannelConfig } from "./color-spaces";

/**
 * The alpha channel is displayed as a 0-100 percentage but stored natively as
 * 0-1, and is written through `withAlpha` rather than `with({ space, ... })`.
 */
export const ALPHA_CONFIG: ChannelConfig = {
  key: "alpha",
  label: "Alpha",
  min: 0,
  max: 100,
  step: 1,
  format: "percentage",
  nativeMin: 0,
  nativeMax: 1,
};

/** Display values closer than this to the current ones are treated as noise. */
export const FEEDBACK_EPSILON = 0.001;

export function parseColor(v: Color | string | null | undefined): Color | undefined {
  if (!v) return undefined;
  if (v instanceof Color) return v;
  return Color.parse(v) ?? undefined;
}

export function resolveChannelConfig(colorSpace: SpaceId, channel: string): ChannelConfig | undefined {
  if (channel === "alpha") return ALPHA_CONFIG;
  return getChannelConfig(colorSpace, channel);
}

export function colorToDisplayValue(color: Color, colorSpace: SpaceId, channel: string): number {
  const config = resolveChannelConfig(colorSpace, channel);
  if (!config) return 0;
  if (channel === "alpha") return color.alpha * 100;
  return nativeToDisplay(config, color.to(colorSpace).get(channel));
}

export function applyDisplayValue(color: Color, colorSpace: SpaceId, channel: string, value: number): Color {
  const config = resolveChannelConfig(colorSpace, channel);
  if (!config) return color;
  if (channel === "alpha") return color.withAlpha(value / 100);
  return color.with({ space: colorSpace, [channel]: displayToNative(config, value) });
}

export function applyDisplayValues(color: Color, colorSpace: SpaceId, channels: string[], values: number[]): Color {
  let result = color;
  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i];
    const value = values[i];
    if (channel === undefined || value === undefined) continue;
    result = applyDisplayValue(result, colorSpace, channel, value);
  }
  return result;
}
