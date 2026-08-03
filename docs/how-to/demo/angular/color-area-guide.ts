import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_AREA_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "color-area-guide",
  imports: [...COLOR_AREA_DIRECTIVES],
  template: `
    <div
      urcColorAreaRoot
      [(value)]="color"
      colorSpace="hsl"
      xChannel="h"
      yChannel="s"
      class="
        relative block h-[200px] w-full cursor-crosshair touch-none overflow-clip
        rounded-lg
      "
    >
      <canvas urcColorAreaGradient class="absolute inset-0"></canvas>
      <div
        urcColorAreaThumb
        class="
          absolute size-5
          rounded-full border-2 border-white
          shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
          focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
        "
      ></div>
    </div>
  `,
})
export class ColorAreaGuide {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
