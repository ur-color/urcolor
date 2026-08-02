import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_SLIDER_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "color-slider-guide",
  imports: [...COLOR_SLIDER_DIRECTIVES],
  template: `
    <div urcColorSliderRoot [(value)]="color" colorSpace="hsl" channel="h" class="w-full">
      <div urcColorSliderTrack class="relative h-5 overflow-hidden rounded-xl">
        <canvas
          urcColorSliderGradient
          class="absolute inset-0 rounded-xl"
          [colors]="['red', 'yellow', 'lime', 'cyan', 'blue', 'magenta', 'red']"
        ></canvas>
        <div
          urcColorSliderThumb
          class="
            block size-5 rounded-full border-[2.5px] border-white bg-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          aria-label="Hue"
        ></div>
      </div>
    </div>
  `,
})
export class ColorSliderGuide {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
