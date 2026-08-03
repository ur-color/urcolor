import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_AREA_DIRECTIVES, COLOR_RING_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "color-picker-square-in-ring-guide",
  imports: [...COLOR_RING_DIRECTIVES, ...COLOR_AREA_DIRECTIVES],
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
            [channelOverrides]="ringOverrides"
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
        urcColorAreaRoot
        [(value)]="color"
        colorSpace="hsv"
        xChannel="s"
        yChannel="v"
        yInverted
        class="absolute inset-[20.3%] cursor-crosshair touch-none overflow-clip rounded-sm"
      >
        <canvas urcColorAreaGradient class="absolute inset-0"></canvas>
        <div
          urcColorAreaThumb
          class="
            absolute size-5 rounded-full border-2 border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
          "
        ></div>
      </div>
    </div>
  `,
})
export class ColorPickerSquareInRingGuide {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);

  /** A stable reference, so the gradient input keeps its identity across change detection. */
  protected readonly ringOverrides = { s: 1, v: 1, alpha: 1 };
}
