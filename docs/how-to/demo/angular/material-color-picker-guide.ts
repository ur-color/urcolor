import { Component, signal } from "@angular/core";
import { Color, colorSpaces } from "@urcolor/core";
import {
  COLOR_AREA_DIRECTIVES,
  COLOR_FIELD_DIRECTIVES,
  COLOR_SLIDER_DIRECTIVES,
} from "@urcolor/angular";

@Component({
  selector: "material-color-picker-guide",
  imports: [...COLOR_AREA_DIRECTIVES, ...COLOR_SLIDER_DIRECTIVES, ...COLOR_FIELD_DIRECTIVES],
  template: `
    <div
      class="
        flex w-full max-w-xs flex-col gap-3 rounded-xl border
        border-[var(--vp-c-divider)] bg-[var(--vp-c-bg)] p-3 shadow-sm
      "
    >
      <div
        urcColorAreaRoot
        [(value)]="color"
        colorSpace="hsv"
        channelX="s"
        channelY="v"
        yInverted
        class="
          relative block h-[180px] w-full cursor-crosshair touch-none overflow-clip
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

      <div urcColorSliderRoot [(value)]="color" colorSpace="hsv" channel="h" class="w-full">
        <div urcColorSliderTrack class="relative h-4 overflow-hidden rounded-full">
          <canvas
            urcColorSliderGradient
            class="absolute inset-0 rounded-full"
            [colors]="['red', 'yellow', 'lime', 'cyan', 'blue', 'magenta', 'red']"
          ></canvas>
          <div
            urcColorSliderThumb
            class="
              block size-4 rounded-full border-2 border-white
              shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
              focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
            "
            aria-label="Hue"
          ></div>
        </div>
      </div>

      <div urcColorSliderRoot [(value)]="color" colorSpace="hsv" channel="alpha" class="w-full">
        <div urcColorSliderTrack class="relative h-4 overflow-hidden rounded-full">
          <canvas urcColorSliderGradient class="absolute inset-0 rounded-full"></canvas>
          <div
            urcColorSliderThumb
            class="
              block size-4 rounded-full border-2 border-white
              shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
              focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_0_0_3px_rgba(66,153,225,0.6)]
            "
            aria-label="Alpha"
          ></div>
        </div>
      </div>

      <div class="flex flex-1 flex-wrap gap-2">
        @for (ch of channels; track ch.key) {
          <div class="flex min-w-[60px] flex-1 flex-col gap-1">
            <label
              [attr.for]="'material-field-' + ch.key"
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
                  flex size-7 shrink-0 cursor-pointer items-center justify-center
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
                [id]="'material-field-' + ch.key"
                class="
                  w-0 min-w-0 flex-1 border-none bg-transparent px-0.5 py-1
                  text-center font-mono text-[13px] text-[var(--vp-c-text-1)] outline-none
                "
              />
              <button
                type="button"
                urcColorFieldIncrement
                class="
                  flex size-7 shrink-0 cursor-pointer items-center justify-center
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
    </div>
  `,
})
export class MaterialColorPickerGuide {
  protected readonly color = signal<Color>(Color.parse("hsl(210, 80%, 50%)")!);
  protected readonly channels = colorSpaces["hsl"]?.channels ?? [];
}
