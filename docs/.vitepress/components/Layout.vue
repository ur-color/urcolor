<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import DefaultTheme from "vitepress/theme";
import Logo from "./Logo.vue";

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
