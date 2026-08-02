import { Directive, ElementRef, inject } from "@angular/core";
import { DATA_DISABLED, DATA_READONLY } from "@urcolor/primitives";
import { ColorFieldRoot } from "../root/color-field-root";

/**
 * The editable text surface, applied to a native `<input>`.
 *
 * It is a `spinbutton` rather than `type="number"`: the field renders suffixed
 * text (`210°`, `50%`, `#ff8800`) that a numeric input would reject, so the
 * stepping keyboard map is provided here instead of by the browser.
 */
@Directive({
  selector: "input[urcColorFieldInput]",
  exportAs: "urcColorFieldInput",
  host: {
    "[attr.type]": "'text'",
    "[attr.role]": "'spinbutton'",
    "[attr.aria-valuenow]": "root.modelValue() ?? null",
    "[attr.autocomplete]": "'off'",
    "[attr.autocorrect]": "'off'",
    "[attr.inputmode]": "'text'",
    "[value]": "root.displayValue()",
    "[disabled]": "root.isDisabled()",
    "[readOnly]": "root.isReadOnly()",
    "[spellcheck]": "false",
    [`[attr.${DATA_DISABLED}]`]: "root.isDisabled() ? '' : null",
    [`[attr.${DATA_READONLY}]`]: "root.isReadOnly() ? '' : null",
    "(input)": "onInput()",
    "(focus)": "onFocus()",
    "(blur)": "onBlur()",
    "(keydown)": "onKeyDown($event)",
  },
})
export class ColorFieldInput {
  protected readonly root = inject(ColorFieldRoot);

  private readonly host = inject<ElementRef<HTMLInputElement>>(ElementRef);

  protected onInput(): void {
    this.root.onInputChange(this.host.nativeElement.value);
  }

  /**
   * Deferred a frame: selecting during `focus` is undone by the click that
   * caused it, so the selection has to outlive the current event loop turn.
   */
  protected onFocus(): void {
    const element = this.host.nativeElement;
    if (typeof requestAnimationFrame === "undefined") {
      element.select();
      return;
    }
    requestAnimationFrame(() => element.select());
  }

  protected onBlur(): void {
    this.root.commitValue(this.root.modelValue());
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.root.isDisabled() || this.root.isReadOnly()) return;
    if (event.key === "Enter") {
      this.root.commitValue(this.root.modelValue());
      return;
    }
    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        this.root.handleIncrease();
        break;
      case "ArrowDown":
        event.preventDefault();
        this.root.handleDecrease();
        break;
      case "PageUp":
        event.preventDefault();
        this.root.handleIncrease(10);
        break;
      case "PageDown":
        event.preventDefault();
        this.root.handleDecrease(10);
        break;
      case "Home":
        event.preventDefault();
        this.root.handleMinMaxValue("min");
        break;
      case "End":
        event.preventDefault();
        this.root.handleMinMaxValue("max");
        break;
    }
  }
}
