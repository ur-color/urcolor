<script setup lang="ts">
import { ref } from "vue";
import {
  ColorSwatchPickerRoot,
  ColorSwatchPickerItem,
  ColorSwatchPickerItemSwatch,
  ColorSwatchPickerItemIndicator,
} from "@urcolor/vue";
import { Check } from "lucide-vue-next";

const colors = [
  "hsl(210, 80%, 50%)",
  "hsl(350, 90%, 60%)",
  "hsl(120, 60%, 45%)",
  "hsl(45, 100%, 55%)",
  "hsl(280, 70%, 55%)",
  "hsl(15, 85%, 55%)",
];

const selected = ref<string>(colors[0]!);
</script>

<template>
  <div class="flex flex-col gap-4">
    <ColorSwatchPickerRoot
      v-model="selected"
      as="div"
      class="flex items-center gap-2"
    >
      <ColorSwatchPickerItem
        v-for="color in colors"
        :key="color"
        :value="color"
        as="div"
        class="
          relative size-10 cursor-pointer rounded-lg outline-none
          data-[highlighted]:outline-2 data-[highlighted]:outline-offset-2
          data-[highlighted]:outline-(--vp-c-brand-1)
        "
      >
        <ColorSwatchPickerItemSwatch
          as="div"
          class="size-full rounded-lg"
        />
        <ColorSwatchPickerItemIndicator
          as="span"
          class="absolute inset-0 grid place-items-center"
        >
          <Check
            class="size-5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
          />
        </ColorSwatchPickerItemIndicator>
      </ColorSwatchPickerItem>
    </ColorSwatchPickerRoot>
    <p class="text-sm text-gray-500">
      Selected: <code>{{ selected ?? 'none' }}</code>
    </p>
  </div>
</template>
