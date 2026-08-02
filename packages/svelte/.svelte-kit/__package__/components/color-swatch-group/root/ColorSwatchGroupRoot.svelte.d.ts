import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
import type { SelectionType } from "./context.svelte.js";
export interface ColorSwatchGroupRootProps extends HTMLAttributes<HTMLDivElement> {
    /** Whether to allow single or multiple selection. */
    type?: SelectionType;
    /** The selected item values. Bindable: `bind:value`. */
    value?: string[];
    /** The selection used until the first interaction when `value` is not bound. */
    defaultValue?: string[];
    /** When true, prevents the user from interacting with the group. */
    disabled?: boolean;
    /** The orientation of the group for arrow key navigation. */
    orientation?: "horizontal" | "vertical";
    /** The reading direction, which mirrors horizontal arrow navigation. */
    dir?: "ltr" | "rtl";
    /** Whether keyboard focus wraps back to the first item past the last one. */
    loopFocus?: boolean;
    /** Called whenever the selection changes. */
    onValueChange?: (value: string[]) => void;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorSwatchGroupRoot: import("svelte").Component<ColorSwatchGroupRootProps, {}, "value">;
type ColorSwatchGroupRoot = ReturnType<typeof ColorSwatchGroupRoot>;
export default ColorSwatchGroupRoot;
