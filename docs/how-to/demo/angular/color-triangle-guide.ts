import { Component, signal } from "@angular/core";
import { Color } from "@urcolor/core";
import { COLOR_TRIANGLE_DIRECTIVES } from "@urcolor/angular";

@Component({
  selector: "color-triangle-guide",
  imports: [...COLOR_TRIANGLE_DIRECTIVES],
  template: `
    <div
      urcColorTriangleRoot
      [(value)]="color"
      colorSpace="hsv"
      xChannel="s"
      yChannel="v"
      class="relative block size-64"
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
  `,
})
export class ColorTriangleGuide {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
}
