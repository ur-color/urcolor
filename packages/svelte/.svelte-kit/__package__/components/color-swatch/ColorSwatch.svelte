<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import type { Color } from "@urcolor/core";
  import type { ChildSnippetArgs } from "../../shared/child.js";

  export interface ColorSwatchProps extends HTMLAttributes<HTMLElement> {
    /** The colour to display. Accepts a `Color` or any CSS colour string. */
    value?: Color | string | null;
    /**
     * The checkerboard tile size, in pixels. Left unset, the grid reads
     * `--urcolor-checkerboard-size` and falls back to `16px`.
     */
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
      styleToString,
      swatchPaint,
      swatchStyle,
      toggleAria,
    } from "@urcolor/shared";
  import type { ChildProps } from "../../shared/child.js";

  let {
    value,
    checkerSize,
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

  const paint = $derived(swatchPaint(value, showAlpha));

  /**
   * The custom properties the swatch publishes, plus the painted background.
   * They are always all present, including for an unparseable or absent value,
   * so consumer styling never has to guard for a missing var.
   */
  const layout = $derived(styleToString(swatchStyle({ ...paint, checkerSize })));

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
    class: className,
    // The caller's declarations come last so they win the cascade.
    style: style ? `${layout}${style}` : layout,
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
