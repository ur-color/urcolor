import { Component, signal } from "@angular/core";
import { COLOR_SWATCH_DIRECTIVES, COLOR_SWATCH_GROUP_DIRECTIVES } from "@urcolor/angular";

const COLORS = [
  "hsl(210, 80%, 50%)",
  "hsl(350, 90%, 60%)",
  "hsl(120, 60%, 45%)",
  "hsl(45, 100%, 55%)",
  "hsl(280, 70%, 55%)",
  "hsl(15, 85%, 55%)",
];

@Component({
  selector: "color-swatch-picker-guide",
  imports: [...COLOR_SWATCH_GROUP_DIRECTIVES, ...COLOR_SWATCH_DIRECTIVES],
  template: `
    <div class="flex flex-col gap-4">
      <div
        urcColorSwatchGroupRoot
        [(value)]="selected"
        type="single"
        class="flex items-center gap-2"
      >
        @for (color of colors; track color) {
          <button
            urcColorSwatch
            [value]="color"
            [pressed]="selected().includes(color)"
            (pressedChange)="selected.set([color])"
            class="
              flex size-10 cursor-pointer items-center justify-center rounded-lg
              outline-none
            "
          >
            <svg
              class="size-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-opacity duration-150"
              [class.opacity-100]="selected().includes(color)"
              [class.opacity-0]="!selected().includes(color)"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        }
      </div>
      <p class="text-sm text-(--vp-c-text-2)">
        Selected: <code>{{ selected()[0] ?? 'none' }}</code>
      </p>
    </div>
  `,
})
export class ColorSwatchPickerGuide {
  protected readonly colors = COLORS;
  protected readonly selected = signal<string[]>([COLORS[0]!]);
}
