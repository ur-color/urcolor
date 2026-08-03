<script module lang="ts">
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
</script>

<script lang="ts">
  import { untrack } from "svelte";
  import { createAttachmentKey } from "svelte/attachments";
    import {
      DATA_DISABLED,
      DATA_ORIENTATION,
      rovingIndexFromKey,
      rovingTabIndex,
      type ToggleGroupState,
    } from "@urcolor/shared";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorSwatchGroupContext, type ColorSwatchGroupItemHandle } from "./context.svelte.js";

  /**
   * Roving focus needs the items as DOM nodes, and items are supplied by the
   * caller rather than rendered here, so they are found by shape: a native
   * button, an explicit button role, or anything carrying the tab stop this
   * group hands out.
   */
  const ITEM_SELECTOR = "button, [role='button'], [tabindex]";

  let {
    type = "single",
    value = $bindable(),
    defaultValue = [],
    disabled = false,
    orientation = "horizontal",
    dir,
    loopFocus = true,
    onValueChange,
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorSwatchGroupRootProps = $props();

  /**
   * Uncontrolled fallback, kept in sync so it and `value` never disagree.
   * `untrack` states the intent that only the initial props are read here.
   */
  let internalValue = $state<string[]>(untrack(() => value ?? defaultValue));
  /** Registration seats, in mount order. An item's index is its position here. */
  let seats = $state<symbol[]>([]);
  /** Which item owns the group's single tab stop. */
  let activeIndex = $state(0);

  const selection = $derived<readonly string[]>(value ?? internalValue);
  const groupState = $derived<ToggleGroupState>({
    activeIndex,
    count: seats.length,
    orientation,
    dir: dir ?? "ltr",
    loop: loopFocus,
  });

  function isSelected(itemValue: string): boolean {
    return selection.includes(itemValue);
  }

  /** Writes the next selection back through both the bound and callback paths. */
  function commit(next: string[]): void {
    internalValue = next;
    value = next;
    onValueChange?.(next);
  }

  function toggle(itemValue: string): void {
    if (disabled) return;
    if (isSelected(itemValue)) {
      commit(type === "single" ? [] : selection.filter(entry => entry !== itemValue));
      return;
    }
    commit(type === "single" ? [itemValue] : [...selection, itemValue]);
  }

  function setActiveIndex(index: number): void {
    if (index < 0) return;
    activeIndex = index;
  }

  function tabIndexFor(index: number): 0 | -1 {
    return rovingTabIndex(groupState, index);
  }

  function register(): ColorSwatchGroupItemHandle {
    const seat = Symbol("ColorSwatchGroupItem");
    seats.push(seat);
    return {
      get index() {
        return seats.indexOf(seat);
      },
      get tabIndex() {
        return rovingTabIndex(groupState, seats.indexOf(seat));
      },
      get active() {
        return seats.indexOf(seat) === activeIndex;
      },
      activate() {
        setActiveIndex(seats.indexOf(seat));
      },
      dispose() {
        const index = seats.indexOf(seat);
        if (index >= 0) seats.splice(index, 1);
      },
    };
  }

  /** Items in DOM order, excluding anything nested inside another item. */
  function itemNodes(root: HTMLElement): HTMLElement[] {
    const found = Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
    return found.filter((node) => {
      const enclosing = node.parentElement?.closest<HTMLElement>(ITEM_SELECTOR);
      return !enclosing || enclosing === root || !root.contains(enclosing);
    });
  }

  const attachmentKey = createAttachmentKey();

  /**
   * The family's single behaviour attachment: roving focus.
   *
   * It travels inside the props object under a `Symbol` key, so a consumer
   * spreading those props onto their own element — or onto another component —
   * gets the full interaction, which an `onkeydown` prop bag could not do.
   * `keydown` and `focusin` from the focused item bubble here, so the group
   * never has to attach anything to the items themselves. Activation
   * (Enter/Space) belongs to the item, which owns its own pressed state.
   */
  function interaction(node: HTMLElement): () => void {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (disabled) return;
      const nodes = itemNodes(node);
      if (nodes.length === 0) return;
      const next = rovingIndexFromKey(
        {
          activeIndex: Math.min(activeIndex, nodes.length - 1),
          count: nodes.length,
          orientation,
          dir: dir ?? "ltr",
          loop: loopFocus,
        },
        event.key,
      );
      if (next === undefined) return;
      event.preventDefault();
      activeIndex = next;
      nodes[next]?.focus();
    };
    /** Clicking or tabbing into an item moves the tab stop to it. */
    const onFocusIn = (event: FocusEvent): void => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const index = itemNodes(node).findIndex(item => item === target || item.contains(target));
      if (index >= 0) activeIndex = index;
    };

    node.addEventListener("keydown", onKeyDown);
    node.addEventListener("focusin", onFocusIn);

    return () => {
      node.removeEventListener("keydown", onKeyDown);
      node.removeEventListener("focusin", onFocusIn);
    };
  }

  const elementProps = $derived<ChildProps>({
    // Ahead of the rest props so an explicit `role` from the caller wins.
    role: "group",
    ...rest,
    class: className,
    style: style,
    dir: dir,
    [DATA_ORIENTATION]: orientation,
    [DATA_DISABLED]: disabled ? "" : undefined,
    [attachmentKey]: interaction,
  });

  colorSwatchGroupContext.set({
    get type() {
      return type;
    },
    get value() {
      return selection;
    },
    get disabled() {
      return disabled;
    },
    get orientation() {
      return orientation;
    },
    get loopFocus() {
      return loopFocus;
    },
    get activeIndex() {
      return activeIndex;
    },
    get count() {
      return seats.length;
    },
    get groupState() {
      return groupState;
    },
    isSelected,
    toggle,
    setActiveIndex,
    tabIndexFor,
    register,
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <div {...elementProps}>{@render children?.()}</div>
{/if}
