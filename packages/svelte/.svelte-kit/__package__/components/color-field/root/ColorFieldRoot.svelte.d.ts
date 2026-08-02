import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { Color, SpaceId } from "@urcolor/core";
import type { ChildSnippetArgs } from "../../../shared/child.js";
import type { ColorFieldFormat } from "./context.svelte.js";
export interface ColorFieldRootProps extends HTMLAttributes<HTMLDivElement> {
    /** The colour value. Bindable: `bind:value`. */
    value?: Color | string | null;
    /** The colour used until the first interaction when `value` is not bound. */
    defaultValue?: Color | string | null;
    /** The colour space mode (e.g. `"hsl"`, `"oklch"`). */
    colorSpace?: SpaceId;
    /** Which channel this field controls (e.g. `"h"`, `"s"`, `"l"`, `"alpha"`). */
    channel?: string;
    /** Channel display format. Auto-derived from the channel config when unset. */
    format?: ColorFieldFormat;
    /** Minimum allowed value, in display units. */
    min?: number;
    /** Maximum allowed value, in display units. */
    max?: number;
    /** Step increment for arrow keys and the stepper buttons. */
    step?: number;
    /** When true, prevents the user from interacting with the field. */
    disabled?: boolean;
    /** When true, the value is shown but cannot be edited. */
    readOnly?: boolean;
    /** Called on every change, including mid-edit. */
    onValueChange?: (color: Color) => void;
    /** Called once at the end of an interaction. */
    onValueCommit?: (color: Color) => void;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorFieldRoot: import("svelte").Component<ColorFieldRootProps, {}, "value">;
type ColorFieldRoot = ReturnType<typeof ColorFieldRoot>;
export default ColorFieldRoot;
