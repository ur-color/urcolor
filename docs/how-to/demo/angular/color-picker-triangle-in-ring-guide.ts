import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_RING_DIRECTIVES, COLOR_TRIANGLE_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "color-picker-triangle-in-ring-guide",
  imports: [...COLOR_RING_DIRECTIVES, ...COLOR_TRIANGLE_DIRECTIVES],
  template: `
    <div class="relative size-64">
      <div
        urcColorRingRoot
        [(value)]="color"
        colorSpace="hsv"
        channel="h"
        innerRadius="0.84"
        class="absolute inset-0"
        style="container-type: inline-size"
      >
        <div urcColorRingTrack class="relative block size-full">
          <canvas
            urcColorRingGradient
            class="absolute inset-0 block"
            [channelOverrides]="{ s: 1, v: 1, alpha: 1 }"
          ></canvas>
          <div
            urcColorRingThumb
            class="
              size-4 rounded-full border-2 border-white
              shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
              focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
            "
            aria-label="Hue"
          ></div>
        </div>
      </div>

      <div
        urcColorTriangleRoot
        [(value)]="color"
        colorSpace="hsv"
        channelX="s"
        channelY="v"
        rotation="90"
        inverted
        class="absolute inset-[8%]"
      >
        <canvas urcColorTriangleGradient class="absolute inset-0 block"></canvas>
        <div
          urcColorTriangleThumb
          class="
            size-4 rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
          aria-label="Color"
        ></div>
      </div>
    </div>
  `,
})
export class ColorPickerTriangleInRingGuide {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
