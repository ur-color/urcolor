import type { Snippet } from "svelte";
import type { HTMLInputAttributes } from "svelte/elements";
import type { ChildSnippetArgs } from "../../../shared/child.js";
export interface ColorFieldInputProps extends HTMLInputAttributes {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
}
declare const ColorFieldInput: import("svelte").Component<ColorFieldInputProps, {}, "">;
type ColorFieldInput = ReturnType<typeof ColorFieldInput>;
export default ColorFieldInput;
