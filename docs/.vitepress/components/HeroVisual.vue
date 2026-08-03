<script setup lang="ts">
/**
 * The one custom piece of the landing page: the live picker that fills the
 * stock hero's image slot. Everything around it — heading, tagline, buttons,
 * feature cards — is VitePress's own `home` layout.
 */
import { provideHeroColor } from "../composables/useHeroColor";
import HeroGrid from "./HeroGrid.vue";

provideHeroColor();
</script>

<template>
  <div class="hero-visual">
    <HeroGrid />
  </div>
</template>

<style scoped>
.hero-visual {
  width: 100%;
}
</style>
