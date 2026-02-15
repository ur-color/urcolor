<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Icon } from "@iconify/vue";
import { codeToHtml } from "shiki";

const props = defineProps<{
  description: string;
  code: string;
}>();

const showCode = ref(false);
const highlightedCode = ref("");

onMounted(async () => {
  if (props.code) {
    highlightedCode.value = await codeToHtml(props.code, {
      lang: "vue",
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
    });
  }
});
</script>

<template>
  <div class="border border-(--vp-c-divider) rounded-lg overflow-hidden my-4">
    <div class="p-6 bg-(--vp-c-bg-alt)">
      <slot />
    </div>
    <div class="flex items-center justify-between border-t border-(--vp-c-divider) px-3 py-2 bg-(--vp-c-bg)">
      <span v-if="props.description" class="text-(color:--vp-c-text-3) text-[13px]">{{ props.description }}</span>
      <button
        class="flex items-center justify-center p-1.5 border-none bg-transparent text-(color:--vp-c-text-2) cursor-pointer rounded ml-auto hover:text-(color:--vp-c-text-1) hover:bg-(--vp-c-bg-soft)"
        :aria-label="showCode ? 'Hide code' : 'Show code'"
        @click="showCode = !showCode"
      >
        <Icon icon="lucide:code" :width="18" :height="18" />
      </button>
    </div>
    <div v-show="showCode" class="demo-code border-t border-(--vp-c-divider)" v-html="highlightedCode" />
  </div>
</template>

<style>
.demo-code pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
}

.demo-code code {
  font-family: var(--vp-font-family-mono);
  white-space: pre;
}

.demo-code .shiki {
  background-color: var(--shiki-light-bg) !important;
}

.demo-code .shiki span {
  color: var(--shiki-light) !important;
}

html.dark .demo-code .shiki {
  background-color: var(--shiki-dark-bg) !important;
}

html.dark .demo-code .shiki span {
  color: var(--shiki-dark) !important;
}
</style>
