import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { Color } from "@urcolor/core";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorFieldSwatchProps extends Omit<HTMLAttributes<HTMLSpanElement>, "value"> {
    /** The colour to display. */
    value?: Color | string | null;
    /** The checkerboard square size, in pixels. */
    checkerSize?: number;
    /** When true, reflects the colour's alpha; when false, paints it opaque. */
    alpha?: boolean;
    /** When true, marks the swatch as non-interactive. */
    disabled?: boolean;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorFieldSwatch: import("svelte").Component<ColorFieldSwatchProps, {}, "">;
type ColorFieldSwatch = ReturnType<typeof ColorFieldSwatch>;
export default ColorFieldSwatch;
