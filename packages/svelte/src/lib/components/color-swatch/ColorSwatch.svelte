<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Color } from "@urcolor/core";
  import type { ChildSnippetArgs } from "../../shared/child.js";

  export interface ColorSwatchProps extends HTMLAttributes<HTMLElement> {
    /** The colour to display. Accepts a `Color` or any CSS colour string. */
    value?: Color | string | null;
    /** The checkerboard tile size, in pixels. */
    checkerSize?: number;
    /** When true, reflects the colour's alpha channel; otherwise it paints fully opaque. */
    alpha?: boolean;
    /** When true, prevents the user from interacting with the swatch. */
    disabled?: boolean;
    /**
     * Renders the swatch as a toggle button instead of a static `role="img"`
     * element. Defaults to true when `pressed` or `onPressedChange` is supplied.
     */
    toggle?: boolean;
    /** Whether the swatch is selected. Bindable: `bind:pressed`. */
    pressed?: boolean;
    /** Called whenever the pressed state flips. */
    onPressedChange?: (pressed: boolean) => void;
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { untrack } from "svelte";
  import { createAttachmentKey } from "svelte/attachments";
  import {
    DATA_DISABLED,
    DATA_PRESSED,
    isToggleActivationKey,
    parseColor,
    toggleAria,
  } from "@urcolor/primitives";
  import type { ChildProps } from "../../shared/child.js";

  const CHECKER_PATTERN =
    "repeating-conic-gradient(rgb(230, 230, 230) 0%, rgb(230, 230, 230) 25%, white 0%, white 50%) 0% 50%";

  let {
    value,
    checkerSize = 16,
    alpha: showAlpha = false,
    disabled = false,
    toggle,
    pressed = $bindable(),
    onPressedChange,
    class: className,
    style,
    children,
    child,
    ...rest
  }: ColorSwatchProps = $props();

  /**
   * Resolved once: `pressed` becomes defined as soon as the swatch is toggled,
   * so reading it reactively would flip a static swatch into a button.
   */
  const inferredToggle = untrack(() => pressed !== undefined || onPressedChange !== undefined);
  const interactive = $derived(toggle ?? inferredToggle);

  /** Uncontrolled fallback, kept in sync so it and `pressed` never disagree. */
  let internalPressed = $state<boolean>(untrack(() => pressed ?? false));
  const isPressed = $derived(pressed ?? internalPressed);

  const color = $derived(parseColor(value));
  const checkerboard = $derived(`${CHECKER_PATTERN} / ${checkerSize}px ${checkerSize}px`);

  /**
   * The four CSS custom properties React's swatch emits, plus the painted
   * background. They are always all present, including for an unparseable or
   * absent value, so consumer styling never has to guard for a missing var.
   */
  const swatchStyle = $derived.by(() => {
    const vars = (opaque: string, alphaValue: number, current: string) =>
      `--swatch-color-opaque:${opaque};--swatch-alpha:${alphaValue};--swatch-checkerboard:${checkerboard};--swatch-color:${current};`;

    if (!color) {
      return `${vars("transparent", 1, "transparent")}background:linear-gradient(transparent, transparent), ${checkerboard};`;
    }

    const opaqueStr = color.withAlpha(1).to("srgb").toString();
    const colorStr = showAlpha ? color.to("srgb").toString() : opaqueStr;
    return `${vars(opaqueStr, color.alpha, colorStr)}background:linear-gradient(${colorStr}, ${colorStr}), ${checkerboard};`;
  });

  function togglePressed(): void {
    if (disabled) return;
    const next = !isPressed;
    internalPressed = next;
    pressed = next;
    onPressedChange?.(next);
  }

  const attachmentKey = createAttachmentKey();

  /**
   * The toggle behaviour, carried inside the props object under a `Symbol` key
   * so a consumer spreading those props onto their own element — or onto
   * another component — gets it too.
   *
   * `keydown` calls `preventDefault` for Enter and Space, which suppresses the
   * click a native button would otherwise synthesise; without it every keyboard
   * activation would toggle twice.
   */
  function interaction(node: HTMLElement): () => void {
    const onClick = (): void => togglePressed();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!isToggleActivationKey(event.key)) return;
      event.preventDefault();
      togglePressed();
    };

    node.addEventListener("click", onClick);
    node.addEventListener("keydown", onKeyDown);

    return () => {
      node.removeEventListener("click", onClick);
      node.removeEventListener("keydown", onKeyDown);
    };
  }

  const elementProps = $derived<ChildProps>({
    ...rest,
    ...(interactive
      ? { ...toggleAria(isPressed, disabled), type: "button", disabled: disabled || undefined }
      : { role: "img" }),
    "class": className,
    // The caller's declarations come last so they win the cascade.
    "style": style ? `${swatchStyle}${style}` : swatchStyle,
    [DATA_PRESSED]: interactive && isPressed ? "" : undefined,
    [DATA_DISABLED]: disabled ? "" : undefined,
    ...(interactive ? { [attachmentKey]: interaction } : {}),
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else if interactive}
  <button {...elementProps}>{@render children?.()}</button>
{:else}
  <div {...elementProps}>{@render children?.()}</div>
{/if}
