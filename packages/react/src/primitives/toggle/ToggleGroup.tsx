import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { DATA_DISABLED, DATA_ORIENTATION, rovingIndexFromKey } from "@urcolor/shared";
import { ToggleGroupContext, type ToggleGroupContextValue } from "./ToggleGroupContext";

/**
 * Roving focus needs the items as DOM nodes, and items are supplied by the
 * caller rather than rendered here, so they are found by shape: a native
 * button, an explicit button role, or anything carrying the tab stop.
 */
const ITEM_SELECTOR = "button, [role='button'], [tabindex]";

export interface ToggleGroupProps
  extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> {
  /** The controlled selection. */
  value?: string[];
  /** The selection used until the first interaction when uncontrolled. */
  defaultValue?: string[];
  /** Whether more than one item may be selected at a time. */
  multiple?: boolean;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  /** The reading direction, which mirrors horizontal arrow navigation. */
  dir?: "ltr" | "rtl";
  /** Whether keyboard focus wraps past the last item. */
  loopFocus?: boolean;
  onValueChange?: (value: string[]) => void;
}

export const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps>(
  function ToggleGroup(props, forwardedRef) {
    const {
      value,
      defaultValue,
      multiple = false,
      disabled = false,
      orientation = "horizontal",
      dir,
      loopFocus = true,
      onValueChange,
      children,
      ...rest
    } = props;

    const [internalValue, setInternalValue] = useState<string[]>(defaultValue ?? []);
    const [activeIndex, setActiveIndex] = useState(0);
    const nodeRef = useRef<HTMLDivElement | null>(null);

    const selection = value ?? internalValue;

    const setRefs = useCallback((node: HTMLDivElement | null) => {
      nodeRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }, [forwardedRef]);

    const commit = useCallback((next: string[]) => {
      if (value === undefined) setInternalValue(next);
      onValueChange?.(next);
    }, [value, onValueChange]);

    const ctx = useMemo<ToggleGroupContextValue>(() => ({
      type: multiple ? "multiple" : "single",
      disabled,
      isSelected: (itemValue: string) => selection.includes(itemValue),
      toggle: (itemValue: string) => {
        if (disabled) return;
        if (selection.includes(itemValue)) {
          commit(multiple ? selection.filter(entry => entry !== itemValue) : []);
          return;
        }
        commit(multiple ? [...selection, itemValue] : [itemValue]);
      },
    }), [multiple, disabled, selection, commit]);

    /** Items in DOM order, excluding anything nested inside another item. */
    const itemNodes = useCallback((root: HTMLElement): HTMLElement[] => {
      const found = Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
      return found.filter((node) => {
        const enclosing = node.parentElement?.closest<HTMLElement>(ITEM_SELECTOR);
        return !enclosing || enclosing === root || !root.contains(enclosing);
      });
    }, []);

    // The tab stop is written straight to the DOM: items come from the caller,
    // so the group cannot pass them a prop.
    useEffect(() => {
      const node = nodeRef.current;
      if (!node) return;
      itemNodes(node).forEach((item, index) => {
        item.setAttribute("tabindex", index === activeIndex ? "0" : "-1");
      });
    });

    useEffect(() => {
      const node = nodeRef.current;
      if (!node) return;

      const onKeyDown = (event: KeyboardEvent) => {
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
        setActiveIndex(next);
        nodes[next]?.focus();
      };
      /** Clicking or tabbing into an item moves the tab stop to it. */
      const onFocusIn = (event: FocusEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const index = itemNodes(node).findIndex(item => item === target || item.contains(target));
        if (index >= 0) setActiveIndex(index);
      };

      node.addEventListener("keydown", onKeyDown);
      node.addEventListener("focusin", onFocusIn);
      return () => {
        node.removeEventListener("keydown", onKeyDown);
        node.removeEventListener("focusin", onFocusIn);
      };
    }, [activeIndex, disabled, orientation, dir, loopFocus, itemNodes]);

    return (
      <ToggleGroupContext.Provider value={ctx}>
        <div
          ref={setRefs}
          role="group"
          dir={dir}
          {...{ [DATA_ORIENTATION]: orientation }}
          {...(disabled ? { [DATA_DISABLED]: "" } : {})}
          {...rest}
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    );
  },
);
