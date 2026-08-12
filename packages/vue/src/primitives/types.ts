/**
 * Local copies of the reka-ui types this package puts in its own public API.
 *
 * reka-ui is a build-time dependency, not a runtime one: `vite.config.ts`
 * deliberately keeps it out of `rollupOptions.external`, so rollup inlines it
 * and tree-shakes away everything the components do not reach. Consumers
 * install `@urcolor/vue` and get no reka-ui of their own.
 *
 * Runtime imports pose no problem for that, because they disappear into the
 * bundle. Types do: `import type { PrimitiveProps } from "reka-ui"` in a
 * component's `<script>` survives into the emitted `.d.ts` as
 * `import("reka-ui")`, which puts reka-ui back on the consumer's dependency
 * list at type-check time even though no runtime import is left. So the split
 * across `src` is:
 *
 * - values (`Primitive`, `SliderRoot`, `useForwardExpose`, …) import straight
 *   from `"reka-ui"`;
 * - types that appear in an exported prop or emit interface come from here.
 *
 * That makes the declarations below copies, pinned to the reka-ui version in
 * `package.json` (currently ^2.8.0). When bumping reka-ui, re-check them
 * against `reka-ui/dist/index.d.ts`; drift surfaces as a type error at the call
 * sites that pass these props on to a reka component, not in this file.
 */

import type { Component } from "vue";

/**
 * The intrinsic elements `as` accepts by name, widened to any other tag. The
 * trailing `string & Record<never, never>` is `string & {}` spelled in a way
 * that survives `no-empty-object-type`: it opens the union up without letting
 * it collapse to plain `string`, so the names above still autocomplete.
 */
export type AsTag
  = | "a"
    | "button"
    | "div"
    | "form"
    | "h2"
    | "h3"
    | "img"
    | "input"
    | "label"
    | "li"
    | "nav"
    | "ol"
    | "p"
    | "span"
    | "svg"
    | "ul"
    | "template"
    | (string & Record<never, never>);

export interface PrimitiveProps {
  /**
   * Change the default rendered element for the one passed as a child, merging
   * their props and behavior.
   */
  asChild?: boolean;
  /**
   * The element or component this component should render as. Can be
   * overwritten by `asChild`.
   * @defaultValue "div"
   */
  as?: AsTag | Component;
}

export type SliderRangeProps = PrimitiveProps;
export type SliderThumbProps = PrimitiveProps;
export type SliderTrackProps = PrimitiveProps;

/** The value a listbox item may carry. */
export type AcceptableValue = string | number | bigint | Record<string, any> | null;

export type DataOrientation = "horizontal" | "vertical";
export type Direction = "ltr" | "rtl";

export type ListboxItemIndicatorProps = PrimitiveProps;

export interface ListboxItemProps<T = AcceptableValue> extends PrimitiveProps {
  /** The value given as data when submitted with a `name`. */
  value: T;
  /** When `true`, prevents the user from interacting with the item. */
  disabled?: boolean;
}

export interface ListboxRootProps<T = AcceptableValue> extends PrimitiveProps {
  /** The controlled value of the listbox. Can be binded with `v-model`. */
  modelValue?: T | Array<T>;
  /**
   * The value of the listbox when initially rendered. Use when you do not need
   * to control the state of the Listbox.
   */
  defaultValue?: T | Array<T>;
  /** Whether multiple options can be selected or not. */
  multiple?: boolean;
  /**
   * The orientation of the listbox, which decides the arrow keys used to
   * navigate it (left & right vs. up & down).
   */
  orientation?: DataOrientation;
  /**
   * The reading direction of the listbox when applicable. If omitted, inherits
   * globally from `ConfigProvider` or assumes LTR (left-to-right) reading mode.
   */
  dir?: Direction;
  /** When `true`, prevents the user from interacting with listbox. */
  disabled?: boolean;
  /**
   * How multiple selection should behave in the collection.
   * @defaultValue 'toggle'
   */
  selectionBehavior?: "toggle" | "replace";
  /** When `true`, hover over item will trigger highlight. */
  highlightOnHover?: boolean;
  /**
   * Use this to compare objects by a particular field, or pass your own
   * comparison function for complete control over how objects are compared.
   */
  by?: string | ((a: T, b: T) => boolean);
  /**
   * The name of the field. Submitted with its owning form as part of a
   * name/value pair.
   */
  name?: string;
  /**
   * When `true`, indicates that the user must set the value before the owning
   * form can be submitted.
   */
  required?: boolean;
}

export type ListboxRootEmits<T = AcceptableValue> = {
  /** Event handler called when the value changes. */
  "update:modelValue": [value: T];
  /** Event handler when highlighted element changes. */
  "highlight": [payload: { ref: HTMLElement; value: T } | undefined];
  /** Event handler called when container is being focused. Can be prevented. */
  "entryFocus": [event: CustomEvent];
  /** Event handler called when the mouse leave the container. */
  "leave": [event: Event];
};
