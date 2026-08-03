import {
  afterNextRender,
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  HostAttributeToken,
  inject,
  input,
  model,
  signal,
} from "@angular/core";
import type { FormValueControl } from "@angular/forms/signals";
import {
  DATA_DISABLED,
  DATA_ORIENTATION,
  rovingIndexFromKey,
  rovingTabIndex,
  type ToggleGroupState,
} from "@urcolor/shared";

/** Whether the group holds at most one selection or any number of them. */
export type ColorSwatchGroupSelectionType = "single" | "multiple";

/** The axis arrow-key navigation runs along. */
export type ColorSwatchGroupOrientation = "horizontal" | "vertical";

/**
 * An item's live seat in the group, handed back by {@link ColorSwatchGroupRoot.register}.
 *
 * `index` is recomputed from the registration order on every read, so items
 * added or removed after mount stay correctly numbered. Items must call
 * `dispose()` when they are destroyed, e.g. from `DestroyRef.onDestroy`.
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
 * Roving focus needs the items as DOM nodes, and items are supplied by the
 * caller rather than rendered here, so they are found by shape: a native
 * button, an explicit button role, or anything carrying a tab stop.
 */
const ITEM_SELECTOR = "button, [role='button'], [tabindex]";

/**
 * A group of colour swatches sharing one selection and one tab stop.
 *
 * ```html
 * <div urcColorSwatchGroupRoot [(value)]="selected" type="multiple">
 *   @for (color of palette(); track color) {
 *     <button urcColorSwatch [value]="color"></button>
 *   }
 * </div>
 * ```
 *
 * Selection is tracked by **value string** and focus by **index** — never by
 * `Color` identity, which is immutable and so never compares equal.
 *
 * The group owns roving focus alone: `keydown` and `focusin` bubble here from
 * the focused item, so a `ColorSwatch` needs no coupling to it and stays usable
 * standalone. Activation (Enter/Space) belongs to the item, which owns its own
 * pressed state.
 *
 * `implements FormValueControl<string[]>` is satisfied by the `value` model
 * alone, which is what makes `<div urcColorSwatchGroupRoot [field]="form.tags">`
 * work.
 */
@Directive({
  selector: "[urcColorSwatchGroupRoot]",
  exportAs: "urcColorSwatchGroupRoot",
  host: {
    "[attr.role]": "role()",
    [`[attr.${DATA_ORIENTATION}]`]: "orientation()",
    [`[attr.${DATA_DISABLED}]`]: "isDisabled() ? '' : null",
    "(keydown)": "onKeyDown($event)",
    "(focusin)": "onFocusIn($event)",
  },
})
export class ColorSwatchGroupRoot implements FormValueControl<string[]> {
  /** The selected item values, two-way bindable as `[(value)]`. Also the Signal Forms contract. */
  readonly value = model<string[]>([]);

  /** Whether to allow a single selection or any number of them. */
  readonly type = input<ColorSwatchGroupSelectionType>("single");
  /** The axis arrow-key navigation runs along. */
  readonly orientation = input<ColorSwatchGroupOrientation>("horizontal");
  /** Whether keyboard focus wraps back to the first item past the last one. */
  readonly loopFocus = input(true, { transform: booleanAttribute });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** A static `role` the consumer set themselves always wins over ours. */
  private readonly roleAttr = inject(new HostAttributeToken("role"), { optional: true });

  /**
   * `disabled` and `dir` are DOM state, not inputs. The static host attribute
   * is read at construction — which works under SSR, where there is no DOM —
   * and a `MutationObserver` installed after the first render keeps both live.
   */
  private readonly disabledState = signal(
    inject(new HostAttributeToken("disabled"), { optional: true }) !== null,
  );

  private readonly dirState = signal<"ltr" | "rtl">(
    inject(new HostAttributeToken("dir"), { optional: true }) === "rtl" ? "rtl" : "ltr",
  );

  /** Registration seats, in mount order. An item's index is its position here. */
  private readonly seats = signal<readonly symbol[]>([]);
  /** Which item owns the group's single tab stop. */
  private readonly activeIndexState = signal(0);

  /**
   * Whether interaction is refused. Named `isDisabled` rather than `disabled`
   * because `FormUiControl` reserves `disabled` for an `InputSignal<boolean>`.
   */
  readonly isDisabled = this.disabledState.asReadonly();
  /** The resolved reading direction, which mirrors horizontal arrow navigation. */
  readonly dir = this.dirState.asReadonly();
  /** Index of the item owning the group's single tab stop. */
  readonly activeIndex = this.activeIndexState.asReadonly();
  /** Number of registered items. */
  readonly count = computed(() => this.seats().length);

  /** The roving-focus state, ready for `rovingIndexFromKey`/`rovingTabIndex`. */
  readonly groupState = computed<ToggleGroupState>(() => ({
    activeIndex: this.activeIndex(),
    count: this.count(),
    orientation: this.orientation(),
    dir: this.dir(),
    loop: this.loopFocus(),
  }));

  protected readonly role = computed(() => this.roleAttr ?? "group");

  constructor() {
    // `afterNextRender` never runs on the server, so this is the only place a
    // directive may touch the DOM.
    afterNextRender(() => {
      const element = this.host.nativeElement;
      this.syncDomState(element);
      if (typeof MutationObserver === "undefined") return;
      const observer = new MutationObserver(() => this.syncDomState(element));
      // Deliberately excludes our own data-* bindings, so there is no feedback loop.
      observer.observe(element, { attributes: true, attributeFilter: ["disabled", "dir"] });
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** True when `itemValue` is part of the current selection. */
  isSelected(itemValue: string): boolean {
    return this.value().includes(itemValue);
  }

  /** Flips `itemValue`, honouring single- vs multiple-selection semantics. */
  toggle(itemValue: string): void {
    if (this.isDisabled()) return;
    const selection = this.value();
    if (selection.includes(itemValue)) {
      this.value.set(
        this.type() === "single" ? [] : selection.filter(entry => entry !== itemValue),
      );
      return;
    }
    this.value.set(this.type() === "single" ? [itemValue] : [...selection, itemValue]);
  }

  /** Moves the group's tab stop to `index`. */
  setActiveIndex(index: number): void {
    if (index < 0) return;
    this.activeIndexState.set(index);
  }

  /** tabindex for the item at `index`. */
  tabIndexFor(index: number): 0 | -1 {
    return rovingTabIndex(this.groupState(), index);
  }

  /**
   * Claims a seat in the group; the caller must `dispose()` it on destroy.
   *
   * Nothing in this package registers today — a `ColorSwatch` is driven by the
   * bubbling listeners above — but a consumer's own item directive can inject
   * the root and take a seat to get its index and tab stop.
   */
  register(): ColorSwatchGroupItemHandle {
    const seat = Symbol("ColorSwatchGroupItem");
    this.seats.update(seats => [...seats, seat]);

    // Every member reads through a closure over the directive, so the handle
    // reports live state rather than a snapshot taken at registration.
    const indexOf = (): number => this.seats().indexOf(seat);
    const tabIndexOf = (): 0 | -1 => rovingTabIndex(this.groupState(), indexOf());
    const isActive = (): boolean => indexOf() === this.activeIndex();
    const activate = (): void => this.setActiveIndex(indexOf());
    const dispose = (): void => {
      this.seats.update(seats => seats.filter(entry => entry !== seat));
    };

    return {
      get index() {
        return indexOf();
      },
      get tabIndex() {
        return tabIndexOf();
      },
      get active() {
        return isActive();
      },
      activate,
      dispose,
    };
  }

  /**
   * Keyboard lives on the root rather than the items: `keydown` from the
   * focused item bubbles here, so one listener covers the whole group.
   */
  protected onKeyDown(event: KeyboardEvent): void {
    if (this.isDisabled()) return;
    const nodes = this.itemNodes();
    if (nodes.length === 0) return;
    const next = rovingIndexFromKey(
      {
        activeIndex: Math.min(this.activeIndex(), nodes.length - 1),
        count: nodes.length,
        orientation: this.orientation(),
        dir: this.dir(),
        loop: this.loopFocus(),
      },
      event.key,
    );
    if (next === undefined) return;
    event.preventDefault();
    this.activeIndexState.set(next);
    nodes[next]?.focus();
  }

  /** Clicking or tabbing into an item moves the tab stop to it. */
  protected onFocusIn(event: FocusEvent): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const index = this.itemNodes().findIndex(
      item => item === target || item.contains(target),
    );
    if (index >= 0) this.activeIndexState.set(index);
  }

  /** Items in DOM order, excluding anything nested inside another item. */
  private itemNodes(): HTMLElement[] {
    const root = this.host.nativeElement;
    const found = Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
    return found.filter((node) => {
      const enclosing = node.parentElement?.closest<HTMLElement>(ITEM_SELECTOR);
      return !enclosing || enclosing === root || !root.contains(enclosing);
    });
  }

  /**
   * `getComputedStyle` is used for direction because `dir` inherits from any
   * ancestor; reading the host attribute alone would miss `<html dir="rtl">`.
   */
  private syncDomState(element: HTMLElement): void {
    this.disabledState.set(element.hasAttribute("disabled"));
    const direction
      = typeof getComputedStyle === "function"
        ? getComputedStyle(element).direction
        : element.getAttribute("dir");
    this.dirState.set(direction === "rtl" ? "rtl" : "ltr");
  }
}
