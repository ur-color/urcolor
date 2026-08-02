import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { Color } from "@urcolor/core";
import type { ChildSnippetArgs } from "../../shared/child.js";
export interface ColorSwatchProps extends HTMLAttributes<HTMLElement> {
    /** The colour to display. Accepts a `Color` or any CSS colour string. */
    value?: Color | string | null;
    /** The checkerboard tile size, in pixels. */
    checkerSize?: number;
    /** When true, reflects the colour's alpha channel; otherwise it paints fully opaque. */
    alpha?: boolean;
    /** When true, prevents the user from interacting with the swatch. */
    disabled?: boolean;
    /**
     * Renders the swatch as a toggle button instead of a static `role="img"`
     * element. Defaults to true when `pressed` or `onPressedChange` is supplied.
     */
    toggle?: boolean;
    /** Whether the swatch is selected. Bindable: `bind:pressed`. */
    pressed?: boolean;
    /** Called whenever the pressed state flips. */
    onPressedChange?: (pressed: boolean) => void;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorSwatch: import("svelte").Component<ColorSwatchProps, {}, "pressed">;
type ColorSwatch = ReturnType<typeof ColorSwatch>;
export default ColorSwatch;
