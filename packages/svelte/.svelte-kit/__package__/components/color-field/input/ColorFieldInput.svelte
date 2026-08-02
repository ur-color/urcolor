<script module lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLInputAttributes } from "svelte/elements";
  import type { ChildSnippetArgs } from "../../../shared/child.js";

  export interface ColorFieldInputProps extends HTMLInputAttributes {
    /** Replaces the default element; receives the props it would have received. */
    child?: Snippet<[ChildSnippetArgs]>;
  }
</script>

<script lang="ts">
  import { createAttachmentKey } from "svelte/attachments";
  import { DATA_DISABLED, DATA_READONLY } from "@urcolor/primitives";
  import type { ChildProps } from "../../../shared/child.js";
  import { colorFieldContext } from "../root/context.svelte.js";

  let { class: className, style, children, child, ...rest }: ColorFieldInputProps = $props();

  const context = colorFieldContext.get();

  const attachmentKey = createAttachmentKey();

  /**
   * The input's behaviour attachment: text editing, blur/Enter commit, and the
   * spinbutton keyboard map.
   *
   * It travels inside the props object under a `Symbol` key, so a consumer
   * spreading those props onto their own `<input>` — or onto another component —
   * gets the full interaction, which an `oninput` prop bag could not do.
   */
  function interaction(node: HTMLInputElement): () => void {
    const onInput = (): void => context.onInputChange(node.value);
    // Deferred a frame: selecting during `focus` is undone by the click that
    // caused it, so the selection has to outlive the current event loop turn.
    const onFocus = (): void => {
      requestAnimationFrame(() => node.select());
    };
    const onBlur = (): void => context.commitValue(context.modelValue);
    const onKeyDown = (event: KeyboardEvent): void => {
      if (context.disabled || context.readOnly) return;
      if (event.key === "Enter") {
        context.commitValue(context.modelValue);
        return;
      }
      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          context.handleIncrease();
          break;
        case "ArrowDown":
          event.preventDefault();
          context.handleDecrease();
          break;
        case "PageUp":
          event.preventDefault();
          context.handleIncrease(10);
          break;
        case "PageDown":
          event.preventDefault();
          context.handleDecrease(10);
          break;
        case "Home":
          event.preventDefault();
          context.handleMinMaxValue("min");
          break;
        case "End":
          event.preventDefault();
          context.handleMinMaxValue("max");
          break;
      }
    };

    node.addEventListener("input", onInput);
    node.addEventListener("focus", onFocus);
    node.addEventListener("blur", onBlur);
    node.addEventListener("keydown", onKeyDown);

    return () => {
      node.removeEventListener("input", onInput);
      node.removeEventListener("focus", onFocus);
      node.removeEventListener("blur", onBlur);
      node.removeEventListener("keydown", onKeyDown);
    };
  }

  const elementProps = $derived<ChildProps>({
    ...rest,
    "type": "text",
    "role": "spinbutton",
    "aria-valuenow": context.modelValue,
    "value": context.displayValue,
    "disabled": context.disabled || undefined,
    "readonly": context.readOnly || undefined,
    "autocomplete": "off",
    "autocorrect": "off",
    "spellcheck": false,
    "inputmode": "text",
    "class": className,
    "style": style,
    [DATA_DISABLED]: context.disabled ? "" : undefined,
    [DATA_READONLY]: context.readOnly ? "" : undefined,
    [attachmentKey]: interaction,
  });
</script>

{#if child}
  {@render child({ props: elementProps })}
{:else}
  <input {...elementProps} />
{/if}
