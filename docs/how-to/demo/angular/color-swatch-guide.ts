import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_SWATCH_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "color-swatch-guide",
  imports: [...COLOR_SWATCH_DIRECTIVES],
  template: `
    <div class="flex items-center gap-3">
      @for (color of colors; track $index) {
        <div
          urcColorSwatch
          [value]="color"
          alpha
          class="flex size-10 cursor-pointer items-center justify-center rounded-lg"
          (click)="selected.set($index)"
        >
          <svg
            class="size-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-opacity duration-150"
            [style.opacity]="selected() === $index ? 1 : 0"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      }
    </div>
  `,
})
export class ColorSwatchGuide {
  protected readonly colors = [
    Color.parse("hsl(210, 80%, 50%)")!,
    Color.parse("hsl(350, 90%, 60%)")!,
    Color.parse("hsl(120, 60%, 45%)")!,
    Color.parse("hsla(45, 100%, 55%, 0.5)")!,
  ];

  protected readonly selected = signal(0);
}
