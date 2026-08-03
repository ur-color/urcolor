import type { Color, SpaceId } from "@urcolor/core";
import type { SliderState } from "@urcolor/shared";
/**
 * Everything a `ColorSlider` part needs from its root.
 *
 * Every member is declared `readonly` and is published as a getter over a
 * `$derived` value, so parts read live state through a context object that is
 * itself set only once, at root initialisation.
 */
export interface ColorSliderContextValue {
    /** The current colour. */
    readonly color: Color;
    /** The colour space the slider operates in. */
    readonly colorSpace: SpaceId;
    /** The channel this slider controls, or `"alpha"`. */
    readonly channel: string;
    readonly orientation: "horizontal" | "vertical";
    readonly inverted: boolean;
    readonly disabled: boolean;
    /** True while a pointer drag is in flight. */
    readonly dragging: boolean;
    /** The channel expressed in display units, plus its bounds and axis flags. */
    readonly sliderState: SliderState;
    /** 0-1 offset of the thumb from the track's CSS start edge. */
    readonly position: number;
}
export declare const colorSliderContext: {
    set(value: ColorSliderContextValue): void;
    get(): ColorSliderContextValue;
};
