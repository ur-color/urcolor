<script setup lang="ts">
import LogoSymbol from "./LogoSymbol.vue";
</script>

<template>
  <h1 class="hero-title">
    <span class="hero-ur-symbol">
      <LogoSymbol />
    </span>Color
  </h1>
</template>

<style scoped>
/*
 * Sized to VitePress's own hero name — 32 / 48 / 56px at its breakpoints — so
 * the custom hero reads at the same scale as a stock one.
 */
.hero-title {
  font-size: 32px;
  line-height: 40px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 8px;
}

@media (min-width: 640px) {
  .hero-title {
    font-size: 48px;
    line-height: 56px;
  }
}

@media (min-width: 960px) {
  .hero-title {
    font-size: 56px;
    line-height: 64px;
  }
}

/* The mark is the "Ur" of the wordmark, so it carries the brand colour and the
   plain text carries the rest. */
.hero-ur-symbol {
  display: inline-block;
  vertical-align: baseline;
  color: var(--vp-c-brand-1);
}

.hero-ur-symbol :deep(svg) {
  height: 0.8em;
  width: auto;
  vertical-align: baseline;
  position: relative;
  top: 0.065em;
  right: -0.1em;
}
</style>
