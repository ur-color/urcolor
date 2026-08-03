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
  numberAttribute,
  signal,
  untracked,
  type OnInit,
} from "@angular/core";
import type { Color } from "@urcolor/core";
import {
  DATA_DISABLED,
  DATA_PRESSED,
  isToggleActivationKey,
  parseColor,
  toggleAria,
} from "@urcolor/shared";

/**
 * The transparency grid the swatch paints under its colour. The tile size is
 * appended per instance, so the pattern itself carries no `background-size`.
 */
const CHECKER_PATTERN
  = "repeating-conic-gradient(rgb(230, 230, 230) 0%, rgb(230, 230, 230) 25%, white 0%, white 50%) 0% 50%";

/**
 * A single colour sample. Standalone it is a static `role="img"` element; as a
 * toggle it is a self-contained pressed/unpressed button.
 *
 * ```html
 * <div urcColorSwatch [value]="color()"></div>
 * <button urcColorSwatch [value]="'#f43f5e'" [(pressed)]="selected"></button>
 * ```
 *
 * The swatch always emits the same four custom properties — `--swatch-color`,
 * `--swatch-color-opaque`, `--swatch-alpha` and `--swatch-checkerboard` — even
 * for an absent or unparseable value, so consumer styling never has to guard
 * for a missing variable.
 *
 * Inside a `ColorSwatchGroup` the group owns roving focus: it listens for
 * `keydown` and `focusin` bubbling from its items, so the swatch needs no
 * coupling to it and stays usable on its own.
 */
@Directive({
  selector: "[urcColorSwatch]",
  exportAs: "urcColorSwatch",
  host: {
    "[attr.role]": "role()",
    "[attr.type]": "buttonType()",
    "[attr.aria-pressed]": "ariaPressed()",
    "[attr.aria-disabled]": "ariaDisabled()",
    "[attr.tabindex]": "tabIndex()",
    [`[attr.${DATA_PRESSED}]`]: "dataPressed()",
    [`[attr.${DATA_DISABLED}]`]: "dataDisabled()",
    "[style.--swatch-color]": "swatchColor()",
    "[style.--swatch-color-opaque]": "swatchColorOpaque()",
    "[style.--swatch-alpha]": "swatchAlpha()",
    "[style.--swatch-checkerboard]": "checkerboard()",
    "[style.background]": "background()",
    "(click)": "onClick()",
    "(keydown)": "onKeyDown($event)",
  },
})
export class ColorSwatch implements OnInit {
  /** The colour to display. Accepts a `Color` or any CSS colour string. */
  readonly value = input<Color | string | null>();
  /** The transparency grid's tile size, in pixels. */
  readonly checkerSize = input(16, { transform: numberAttribute });
  /** When true, reflects the colour's alpha; otherwise it paints fully opaque. */
  readonly alpha = input(false, { transform: booleanAttribute });
  /**
   * Forces toggle behaviour on or off. Left unset, the swatch becomes a toggle
   * when `[(pressed)]` is bound.
   */
  readonly toggle = input<boolean>();
  /** Whether the swatch is selected, two-way bindable as `[(pressed)]`. */
  readonly pressed = model<boolean | undefined>(undefined);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Static attributes the consumer set themselves always win over ours. */
  private readonly roleAttr = inject(new HostAttributeToken("role"), { optional: true });
  private readonly typeAttr = inject(new HostAttributeToken("type"), { optional: true });
  private readonly tabIndexAttr = inject(new HostAttributeToken("tabindex"), { optional: true });

  /**
   * `disabled` is DOM state, not an input. The static host attribute is read at
   * construction — which works under SSR, where there is no DOM — and a
   * `MutationObserver` installed after the first render keeps it live.
   */
  private readonly disabledState = signal(
    inject(new HostAttributeToken("disabled"), { optional: true }) !== null,
  );

  /**
   * Whether the host is a native `<button>`, which already carries the role and
   * the click-on-Enter/Space behaviour an arbitrary element does not.
   */
  private readonly isButtonElement
    = (this.host.nativeElement?.tagName ?? "").toLowerCase() === "button";

  /** Resolved once `pressed` has been bound; see {@link ngOnInit}. */
  private readonly inferredToggle = signal(false);

  /** Whether interaction is refused. */
  readonly isDisabled = this.disabledState.asReadonly();
  /** Whether the swatch behaves as a toggle rather than a static sample. */
  readonly interactive = computed(() => this.toggle() ?? this.inferredToggle());
  /** The pressed state, defaulting to unpressed while `pressed` is unbound. */
  readonly isPressed = computed(() => this.pressed() ?? false);

  private readonly color = computed(() => parseColor(this.value()));

  private readonly opaqueString = computed(
    () => this.color()?.withAlpha(1).to("srgb").toString() ?? "transparent",
  );

  private readonly colorString = computed(() => {
    const color = this.color();
    if (!color) return "transparent";
    return this.alpha() ? color.to("srgb").toString() : this.opaqueString();
  });

  protected readonly checkerboard = computed(
    () => `${CHECKER_PATTERN} / ${this.checkerSize()}px ${this.checkerSize()}px`,
  );

  protected readonly swatchColor = this.colorString;
  protected readonly swatchColorOpaque = this.opaqueString;
  protected readonly swatchAlpha = computed(() => this.color()?.alpha ?? 1);

  /**
   * The colour is painted as a flat gradient rather than a `background-color`
   * so that it composites over the checkerboard in a single declaration.
   */
  protected readonly background = computed(() => {
    const colorStr = this.colorString();
    return `linear-gradient(${colorStr}, ${colorStr}), ${this.checkerboard()}`;
  });

  private readonly aria = computed(() => toggleAria(this.isPressed(), this.isDisabled()));

  protected readonly role = computed(() => {
    if (this.roleAttr !== null) return this.roleAttr;
    if (!this.interactive()) return "img";
    // A native button needs no role; anything else must claim one so the
    // group's roving focus can find it.
    return this.isButtonElement ? null : "button";
  });

  protected readonly buttonType = computed(() => {
    if (this.typeAttr !== null) return this.typeAttr;
    return this.interactive() && this.isButtonElement ? "button" : null;
  });

  protected readonly ariaPressed = computed(() =>
    this.interactive() ? this.aria()["aria-pressed"] : null,
  );

  protected readonly ariaDisabled = computed(() => this.aria()["aria-disabled"] ?? null);

  protected readonly dataPressed = computed(() =>
    this.interactive() ? this.aria()[DATA_PRESSED] ?? null : null,
  );

  protected readonly dataDisabled = computed(() => this.aria()[DATA_DISABLED] ?? null);

  protected readonly tabIndex = computed<string | number | null>(() => {
    if (this.tabIndexAttr !== null) return this.tabIndexAttr;
    if (!this.interactive()) return null;
    return this.aria().tabindex ?? null;
  });

  constructor() {
    // `afterNextRender` never runs on the server, so this is the only place a
    // directive may touch the DOM.
    afterNextRender(() => {
      const element = this.host.nativeElement;
      this.syncDisabled(element);
      if (typeof MutationObserver === "undefined") return;
      const observer = new MutationObserver(() => this.syncDisabled(element));
      // Deliberately excludes our own data-* bindings, so there is no feedback loop.
      observer.observe(element, { attributes: true, attributeFilter: ["disabled"] });
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /**
   * Toggle inference is resolved once, after the first binding pass: `pressed`
   * becomes defined as soon as the swatch is toggled, so reading it reactively
   * would flip a static swatch into a button.
   */
  ngOnInit(): void {
    this.inferredToggle.set(untracked(this.pressed) !== undefined);
  }

  /** Flips the pressed state, honouring `disabled` and non-toggle swatches. */
  togglePressed(): void {
    if (this.isDisabled() || !this.interactive()) return;
    this.pressed.set(!this.isPressed());
  }

  protected onClick(): void {
    this.togglePressed();
  }

  /**
   * `preventDefault` suppresses the click a native button would otherwise
   * synthesise; without it every keyboard activation would toggle twice.
   */
  protected onKeyDown(event: KeyboardEvent): void {
    if (!this.interactive() || !isToggleActivationKey(event.key)) return;
    event.preventDefault();
    this.togglePressed();
  }

  private syncDisabled(element: HTMLElement): void {
    this.disabledState.set(element.hasAttribute("disabled"));
  }
}
