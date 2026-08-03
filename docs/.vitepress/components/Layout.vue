<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import DefaultTheme from "vitepress/theme";
import { useData } from "vitepress";
import { provideDocsLang } from "../composables/useDocsLang";
import HeroBgCanvas from "./HeroBgCanvas.vue";
import HeroVisual from "./HeroVisual.vue";
import Logo from "./Logo.vue";

const { lang, frontmatter } = useData();
provideDocsLang(lang);

/** The animated backdrop belongs to the landing page only. */
const isHome = computed(() => frontmatter.value.layout === "home");

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

    <template #layout-top>
      <HeroBgCanvas v-if="isHome" />
    </template>

    <template #home-hero-image>
      <HeroVisual />
    </template>
  </DefaultTheme.Layout>
</template>
