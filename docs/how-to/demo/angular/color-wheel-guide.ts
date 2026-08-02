import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_WHEEL_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "color-wheel-guide",
  imports: [...COLOR_WHEEL_DIRECTIVES],
  template: `
    <div
      urcColorWheelRoot
      [(value)]="color"
      colorSpace="hsl"
      angleChannel="h"
      radiusChannel="s"
      class="relative block size-64 overflow-hidden rounded-full"
      style="container-type: inline-size"
    >
      <canvas urcColorWheelGradient class="absolute inset-0 block"></canvas>
      <div
        urcColorWheelThumb
        class="
          size-4 rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
        aria-label="Color"
      ></div>
    </div>
  `,
})
export class ColorWheelGuide {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
