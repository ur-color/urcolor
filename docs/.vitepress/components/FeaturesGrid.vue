<script setup lang="ts">
import {
  Globe,
  Accessibility,
  Blocks,
  Paintbrush,
  Zap,
  Palette,
} from "lucide-vue-next";

const features = [
  {
    icon: Globe,
    title: "74 Languages",
    details:
      "Full internationalization powered by the internationalized-color package.",
  },
  {
    icon: Accessibility,
    title: "Accessible",
    details:
      "WAI-ARIA color picker pattern with full keyboard and screen reader support.",
  },
  {
    icon: Blocks,
    title: "Multi-Framework",
    details:
      "Vue support today, with React, Svelte, Angular, and more planned.",
  },
  {
    icon: Paintbrush,
    title: "Unstyled",
    details:
      "Headless, renderless primitives — bring your own design system.",
  },
  {
    icon: Zap,
    title: "Fast",
    details:
      "GPU-accelerated WebGL gradients and zero-dependency runtime performance.",
  },
  {
    icon: Palette,
    title: "Any Color Space",
    details:
      "sRGB, HSL, HSB, LCH, OKLCH, and more via culori package.",
  },
];
</script>

<template>
  <div class="feature-grid">
    <div
      v-for="(f, i) in features"
      :key="i"
      class="feature-card"
    >
      <component
        :is="f.icon"
        :size="20"
        class="feature-icon"
      />
      <h3 class="feature-title">
        {{ f.title }}
      </h3>
      <p class="feature-details">
        {{ f.details }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  text-align: left;
}

.feature-card {
  padding: 24px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--vp-c-bg-soft) 40%, transparent);
  backdrop-filter: blur(16px);
  border: 1px solid color-mix(in srgb, var(--vp-c-text-1) 15%, transparent);
  transition: border-color 0.2s ease;
}

.feature-card:hover {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 30%, transparent);
}

.feature-icon {
  color: var(--vp-c-brand-2);
  margin-bottom: 12px;
}

.feature-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--vp-c-text-1);
}

.feature-details {
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

@media (max-width: 960px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }
}
</style>
