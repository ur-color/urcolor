import { Component, signal } from "@angular/core";
import { Color, colorSpaces } from "@urcolor/core";
import { COLOR_FIELD_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "color-field-guide",
  imports: [...COLOR_FIELD_DIRECTIVES],
  template: `
    <div class="flex flex-1 flex-wrap gap-2">
      @for (ch of channels; track ch.key) {
        <div class="flex min-w-[80px] flex-1 flex-col gap-1">
          <label
            [attr.for]="'guide-field-' + ch.key"
            class="text-xs font-semibold text-[var(--vp-c-text-2)]"
          >{{ ch.label }}</label>
          <div
            urcColorFieldRoot
            [(value)]="color"
            colorSpace="hsl"
            [channel]="ch.key"
            class="
              flex items-center overflow-hidden rounded-md border
              border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)]
            "
          >
            <button
              type="button"
              urcColorFieldDecrement
              class="
                flex size-8 shrink-0 cursor-pointer items-center justify-center
                border-none bg-transparent text-lg leading-none text-[var(--vp-c-text-2)]
                select-none
                hover:not-disabled:bg-[var(--vp-c-bg-soft)]
                hover:not-disabled:text-[var(--vp-c-text-1)]
                disabled:cursor-default disabled:opacity-30
              "
            >
              &minus;
            </button>
            <input
              urcColorFieldInput
              [id]="'guide-field-' + ch.key"
              class="
                w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1
                text-center font-mono text-[13px] text-[var(--vp-c-text-1)] outline-none
              "
            />
            <button
              type="button"
              urcColorFieldIncrement
              class="
                flex size-8 shrink-0 cursor-pointer items-center justify-center
                border-none bg-transparent text-lg leading-none text-[var(--vp-c-text-2)]
                select-none
                hover:not-disabled:bg-[var(--vp-c-bg-soft)]
                hover:not-disabled:text-[var(--vp-c-text-1)]
                disabled:cursor-default disabled:opacity-30
              "
            >
              +
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ColorFieldGuide {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
  protected readonly channels = colorSpaces["hsl"]?.channels ?? [];
}
