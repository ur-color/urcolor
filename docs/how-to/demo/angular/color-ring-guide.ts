import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_RING_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "color-ring-guide",
  imports: [...COLOR_RING_DIRECTIVES],
  template: `
    <div
      urcColorRingRoot
      [(value)]="color"
      colorSpace="hsl"
      channel="h"
      innerRadius="0.85"
      class="relative block size-64"
      style="container-type: inline-size"
    >
      <div urcColorRingTrack class="relative block size-full">
        <canvas urcColorRingGradient class="absolute inset-0 block"></canvas>
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
  `,
})
export class ColorRingGuide {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
