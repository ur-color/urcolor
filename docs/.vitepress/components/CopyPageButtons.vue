<script setup lang="ts">
/**
 * The "Copy page" control that `vitepress-plugin-llms` injects after every
 * page's first `<h1>`.
 *
 * The plugin ships its own component, but its provider list is hard-coded to
 * ChatGPT and Claude with no way to pass more in. This one drives the plugin's
 * composable directly so the dropdown can offer every assistant that accepts a
 * prompt in its URL.
 */
import { onMounted, onUnmounted, ref } from "vue";
import {
  type MarkdownAiProvider,
  useCopyOrDownloadAsMarkdownButtons,
} from "vitepress-plugin-llms/vitepress-components";
import {
  ICON_CHECK,
  ICON_CHEVRON,
  ICON_COPY,
  ICON_DOWNLOAD,
  ICON_EXTERNAL,
  ICON_MARKDOWN,
  PROVIDERS,
} from "./copyPageProviders";

const {
  copied,
  copyAsMarkdown,
  downloadMarkdown,
  downloaded,
  openInAI,
  viewAsMarkdown,
} = useCopyOrDownloadAsMarkdownButtons({ aiProviders: PROVIDERS });

const isOpen = ref(false);
const container = ref<HTMLElement>();

function close() {
  isOpen.value = false;
}

function toggle() {
  isOpen.value = !isOpen.value;
}

function run(action: () => void | Promise<void>) {
  void action();
  close();
}

function openProvider(provider: MarkdownAiProvider) {
  openInAI(provider);
  close();
}

/** A click anywhere else dismisses the menu, as a native `<select>` would. */
function onDocumentClick(event: MouseEvent) {
  if (container.value && !container.value.contains(event.target as Node)) close();
}

onMounted(() => document.addEventListener("click", onDocumentClick));
onUnmounted(() => document.removeEventListener("click", onDocumentClick));
</script>

<template>
  <!--
    Every `v-html` below renders one of the static SVG constants from
    `copyPageProviders.ts`. No page content and no user input reaches them.
  -->
  <!-- eslint-disable vue/no-v-html -->
  <div class="copy-page">
    <div
      ref="container"
      class="copy-page-menu"
    >
      <div class="copy-page-trigger">
        <button
          type="button"
          class="copy-page-main"
          @click="run(copyAsMarkdown)"
        >
          <span
            class="copy-page-icon"
            v-html="copied ? ICON_CHECK : ICON_COPY"
          />
          <span>{{ copied ? "Copied" : "Copy page" }}</span>
        </button>

        <span class="copy-page-divider" />

        <button
          type="button"
          class="copy-page-chevron"
          :aria-expanded="isOpen"
          aria-label="More copy options"
          @click.stop="toggle"
        >
          <span
            class="copy-page-icon"
            :class="{ open: isOpen }"
            v-html="ICON_CHEVRON"
          />
        </button>
      </div>

      <div
        v-show="isOpen"
        class="copy-page-dropdown"
      >
        <button
          type="button"
          class="copy-page-item"
          @click="run(viewAsMarkdown)"
        >
          <span
            class="copy-page-icon"
            v-html="ICON_MARKDOWN"
          />
          View as Markdown
          <span
            class="copy-page-icon external"
            v-html="ICON_EXTERNAL"
          />
        </button>

        <button
          v-for="provider in PROVIDERS"
          :key="provider.name"
          type="button"
          class="copy-page-item"
          @click="openProvider(provider)"
        >
          <span
            class="copy-page-icon"
            v-html="provider.icon"
          />
          Open in {{ provider.name }}
          <span
            class="copy-page-icon external"
            v-html="ICON_EXTERNAL"
          />
        </button>
      </div>
    </div>

    <button
      type="button"
      class="copy-page-download"
      aria-label="Download this page as Markdown"
      @click="run(downloadMarkdown)"
    >
      <span
        class="copy-page-icon"
        v-html="downloaded ? ICON_CHECK : ICON_DOWNLOAD"
      />
    </button>
  </div>
</template>

<style scoped>
/* Spacing belongs to `.page-title-row`, which owns the row this sits in. */
.copy-page {
  display: flex;
  flex: none;
  gap: 8px;
}

.copy-page-menu {
  position: relative;
}

.copy-page-trigger {
  display: flex;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  color: var(--vp-c-text-1);
  transition: border-color 0.2s ease;
}

.copy-page-trigger:hover {
  border-color: var(--vp-c-brand-1);
}

.copy-page-main,
.copy-page-chevron,
.copy-page-download {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}

.copy-page-main {
  padding: 8px 14px;
}

.copy-page-chevron {
  padding: 0 10px;
}

.copy-page-main:hover,
.copy-page-chevron:hover,
.copy-page-download:hover {
  background: var(--vp-c-bg-soft);
}

.copy-page-divider {
  align-self: center;
  width: 1px;
  height: 22px;
  background: var(--vp-c-divider);
}

.copy-page-download {
  padding: 8px 11px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.copy-page-download:hover {
  border-color: var(--vp-c-brand-1);
}

.copy-page-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 20;
  min-width: 240px;
  padding: 4px;
  overflow: hidden;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  box-shadow: var(--vp-shadow-3);
}

.copy-page-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-1);
  font-size: 14px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.copy-page-item:hover {
  background: var(--vp-c-bg-soft);
}

.copy-page-icon {
  display: inline-flex;
  flex: none;
  width: 18px;
  height: 18px;
}

.copy-page-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.copy-page-icon.external {
  width: 14px;
  height: 14px;
  margin-left: auto;
  opacity: 0.5;
}

.copy-page-item:hover .copy-page-icon.external {
  opacity: 1;
}

.copy-page-icon.open :deep(svg) {
  transform: rotate(180deg);
}

.copy-page-icon :deep(svg) {
  transition: transform 0.2s ease;
}
</style>
