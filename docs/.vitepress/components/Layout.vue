<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import DefaultTheme from "vitepress/theme";
import { useData } from "vitepress";
import { provideDocsLang } from "../composables/useDocsLang";
import Logo from "./Logo.vue";

const { lang } = useData();
provideDocsLang(lang);

let onScroll: (() => void) | null = null;

onMounted(() => {
  onScroll = () => {
    const t = Math.min(window.scrollY / 100, 1);
    document.documentElement.style.setProperty("--nav-bg-opacity", String(t));
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
});

onUnmounted(() => {
  if (onScroll) window.removeEventListener("scroll", onScroll);
});
</script>

<template>
  <DefaultTheme.Layout>
    <template #nav-bar-title-before>
      <Logo />
    </template>
  </DefaultTheme.Layout>
</template>
