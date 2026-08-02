import type { ToggleGroupState } from "@urcolor/primitives";
/** Whether the group holds at most one selection or any number of them. */
export type SelectionType = "single" | "multiple";
/**
 * An item's live seat in the group, handed back by {@link ColorSwatchGroupContextValue.register}.
 *
 * `index` is recomputed from the registration order on every read, so items
 * added or removed after mount stay correctly numbered. Items must call
 * `dispose()` when they are destroyed, e.g. `$effect(() => () => handle.dispose())`.
 */
export interface ColorSwatchGroupItemHandle {
    /** Position in registration (and therefore DOM) order, or -1 once disposed. */
    readonly index: number;
    /** The single tab stop is 0; every other item is -1. */
    readonly tabIndex: 0 | -1;
    /** True when this item owns the group's tab stop. */
    readonly active: boolean;
    /** Moves the group's tab stop to this item. */
    activate(): void;
    /** Removes the item from the group. */
    dispose(): void;
}
/**
 * Everything a swatch needs from its enclosing group.
 *
 * Every value member is published as a getter over a `$derived`, so parts read
 * live state through a context object that is set only once, at root
 * initialisation.
 *
 * Selection is tracked by **value string**, and focus by **index** — never by
 * `Color` identity, which is immutable and so never compares equal.
 */
export interface ColorSwatchGroupContextValue {
    /** Single- or multiple-selection semantics. */
    readonly type: SelectionType;
    /** The currently selected item values. */
    readonly value: readonly string[];
    /** True when the whole group rejects interaction. */
    readonly disabled: boolean;
    readonly orientation: "horizontal" | "vertical";
    /** Whether arrow navigation wraps past the ends. */
    readonly loopFocus: boolean;
    /** Index of the item owning the group's single tab stop. */
    readonly activeIndex: number;
    /** Number of registered items. */
    readonly count: number;
    /** The roving-focus state, ready for `rovingIndexFromKey`/`rovingTabIndex`. */
    readonly groupState: ToggleGroupState;
    /** True when `itemValue` is part of the current selection. */
    isSelected(itemValue: string): boolean;
    /** Flips `itemValue`, honouring single- vs multiple-selection semantics. */
    toggle(itemValue: string): void;
    /** Moves the group's tab stop to `index`. */
    setActiveIndex(index: number): void;
    /** tabindex for the item at `index`. */
    tabIndexFor(index: number): 0 | -1;
    /** Claims a seat in the group; the caller must `dispose()` it on destroy. */
    register(): ColorSwatchGroupItemHandle;
}
export declare const colorSwatchGroupContext: {
    set(value: ColorSwatchGroupContextValue): void;
    get(): ColorSwatchGroupContextValue;
};
/**
 * The optional read: a standalone swatch is valid, so absence is not an error.
 *
 * Must be called during component initialisation, like every other context read.
 */
export declare function tryGetColorSwatchGroupContext(): ColorSwatchGroupContextValue | undefined;
