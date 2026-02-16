<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Icon } from "@iconify/vue";
import { codeToHtml } from "shiki";

const props = defineProps<{
  description: string;
  code: string;
}>();

const showCode = ref(false);
const highlightedCode = ref("");
const codeEl = ref<HTMLElement>();

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
    if (codeEl.value) codeEl.value.innerHTML = highlightedCode.value;
  }
});
</script>

<template>
  <div class="my-4 overflow-hidden rounded-lg border border-(--vp-c-divider)">
    <div class="bg-(--vp-c-bg-alt) p-6">
      <slot />
    </div>
    <div
      class="
        flex items-center justify-between border-t border-(--vp-c-divider)
        bg-(--vp-c-bg) px-3 py-2
      "
    >
      <span
        v-if="props.description"
        class="text-[13px] text-(--vp-c-text-3)"
      >{{ props.description }}</span>
      <button
        class="
          ml-auto flex cursor-pointer items-center justify-center rounded-sm
          border-none bg-transparent p-1.5 text-(--vp-c-text-2)
          hover:bg-(--vp-c-bg-soft) hover:text-(--vp-c-text-1)
        "
        :aria-label="showCode ? 'Hide code' : 'Show code'"
        @click="showCode = !showCode"
      >
        <Icon
          icon="lucide:code"
          :width="18"
          :height="18"
        />
      </button>
    </div>
    <div
      v-show="showCode"
      ref="codeEl"
      class="demo-code border-t border-(--vp-c-divider)"
    />
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
