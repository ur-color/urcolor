import type { Color, SpaceId } from "@urcolor/core";
import { createContextPair } from "../../../shared/context.js";

/**
 * Everything a `ColorWheel` part needs from its root.
 *
 * Every member is declared `readonly` and is published as a getter over a
 * `$derived` value, so parts read live state through a context object that is
 * itself set only once, at root initialisation.
 */
export interface ColorWheelContextValue {
  /** The current colour. */
  readonly color: Color;
  /** The colour space the wheel operates in. */
  readonly colorSpace: SpaceId;
  /** The channel mapped to the wheel's angular axis (usually hue). */
  readonly angleChannel: string;
  /** The channel mapped to the wheel's radial axis (usually saturation/chroma). */
  readonly radiusChannel: string;
  /** The angular channel in display units. */
  readonly angleValue: number;
  /** The radial channel in display units. */
  readonly radiusValue: number;
  readonly angleMin: number;
  readonly angleMax: number;
  readonly radiusMin: number;
  readonly radiusMax: number;
  /** Degrees of rotation applied to the angular axis; 0 puts the axis origin at 12 o'clock. */
  readonly startAngle: number;
  readonly disabled: boolean;
  /** True while a pointer drag is in flight. */
  readonly dragging: boolean;
}

export const colorWheelContext = createContextPair<ColorWheelContextValue>("ColorWheel");
