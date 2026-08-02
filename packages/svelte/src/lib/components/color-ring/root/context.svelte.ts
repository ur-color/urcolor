import type { Color, SpaceId } from "@urcolor/core";
import { createContextPair } from "../../../shared/context.js";

/**
 * Everything a `ColorRing` part needs from its root.
 *
 * Every member is declared `readonly` and is published as a getter over a
 * `$derived` value, so parts read live state through a context object that is
 * itself set only once, at root initialisation.
 */
export interface ColorRingContextValue {
  /** The current colour. */
  readonly color: Color;
  /** The colour space the ring operates in. */
  readonly colorSpace: SpaceId;
  /** The channel the ring's angle maps to, or `"alpha"`. */
  readonly channel: string;
  readonly disabled: boolean;
  /** True while a pointer drag is in flight. */
  readonly dragging: boolean;
  /** The channel expressed in display units. */
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** Degrees clockwise from 12 o'clock at which the channel's minimum sits. */
  readonly startAngle: number;
  /** Hole radius as a ratio of the outer radius, 0-1. */
  readonly innerRadius: number;
}

export const colorRingContext = createContextPair<ColorRingContextValue>("ColorRing");
