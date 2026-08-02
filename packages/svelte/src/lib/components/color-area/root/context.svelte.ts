import type { Color, SpaceId } from "@urcolor/core";
import { createContextPair } from "../../../shared/context.js";

/**
 * Everything a `ColorArea` part needs from its root.
 *
 * Every member is declared `readonly` and is published as a getter over a
 * `$derived` value, so parts read live state through a context object that is
 * itself set only once, at root initialisation.
 */
export interface ColorAreaContextValue {
  /** The current colour. */
  readonly color: Color;
  /** The colour space both axes operate in. */
  readonly colorSpace: SpaceId;
  /** The channel mapped to the horizontal axis, or `"alpha"`. */
  readonly xChannel: string;
  /** The channel mapped to the vertical axis, or `"alpha"`. */
  readonly yChannel: string;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  /** The horizontal channel in display units. */
  readonly valueX: number;
  /** The vertical channel in display units. */
  readonly valueY: number;
  readonly disabled: boolean;
  /** True while a pointer drag is in flight. */
  readonly dragging: boolean;
  /** True when increasing x runs left-to-right; false when the axis is mirrored. */
  readonly isSlidingFromLeft: boolean;
  /** True when increasing y runs top-to-bottom; false when the axis is mirrored. */
  readonly isSlidingFromTop: boolean;
  /** Whether the thumb is centred on the edge (`"overflow"`) or kept inside it. */
  readonly thumbAlignment: "contain" | "overflow";
}

export const colorAreaContext = createContextPair<ColorAreaContextValue>("ColorArea");
