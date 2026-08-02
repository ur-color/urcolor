<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorFieldDecrementProps extends HTMLButtonAttributes {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { createAttachmentKey } from "svelte/attachments";
  import { DATA_DISABLED, DATA_PRESSED } from "@urcolor/primitives";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorFieldContext } from "../root/context.svelte.js";

  /** Delay before a held button starts repeating, then the repeat interval. */
  const HOLD_DELAY = 400;
  const REPEAT_INTERVAL = 60;

  let { class: className, style, children, child, ...rest }: ColorFieldDecrementProps = $props();

  const context = colorFieldContext.get();

  const isDisabled = $derived(context.disabled || context.readOnly || context.isDecreaseDisabled);

  let pressed = $state(false);
  /** Plain, non-reactive: only the hold loop reads it. */
  let timeout: ReturnType<typeof setTimeout> | undefined;

  /** Steps once, then schedules itself so a held button keeps stepping. */
  function startPress(delay: number): void {
    if (timeout !== undefined) clearTimeout(timeout);
    if (isDisabled) return;
    context.handleDecrease();
    timeout = setTimeout(() => startPress(REPEAT_INTERVAL), delay);
  }

  const attachmentKey = createAttachmentKey();

  /**
   * The button's behaviour attachment: press-and-hold stepping.
   *
   * It travels inside the props object under a `Symbol` key, so a consumer
   * spreading those props onto their own `<button>` — or onto another component
   * — gets the full interaction, which an `onpointerdown` prop bag could not do.
   * The release listeners live on `window` so a pointer that leaves the button
   * before lifting still ends the hold.
   */
  function interaction(node: HTMLButtonElement): () => void {
    const stop = (): void => {
      pressed = false;
      if (timeout !== undefined) clearTimeout(timeout);
      timeout = undefined;
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0 || isDisabled) return;
      event.preventDefault();
      pressed = true;
      startPress(HOLD_DELAY);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
    };
    const onContextMenu = (event: Event): void => event.preventDefault();

    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("contextmenu", onContextMenu);

    return () => {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("contextmenu", onContextMenu);
      stop();
    };
  }

  const elementProps = $derived<ChildProps>({
    ...rest,
    // The input owns the field's tab stop; the steppers are pointer affordances.
    "type": "button",
    "tabindex": -1,
    "aria-label": rest["aria-label"] ?? "Decrease",
    "disabled": isDisabled || undefined,
    "class": className,
    "style": style,
    [DATA_PRESSED]: pressed ? "" : undefined,
    [DATA_DISABLED]: isDisabled ? "" : undefined,
    [attachmentKey]: interaction,
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <button {...elementProps}>{@render children?.()}</button>
{/if}
