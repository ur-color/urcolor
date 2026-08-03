<script setup lang="ts">
import { computed } from "vue";
import {
  Globe,
  Keyboard,
  Blocks,
  Paintbrush,
  Zap,
  Palette,
} from "lucide-vue-next";
import { featureStrings } from "../i18n/strings";
import { useDocsLang } from "../composables/useDocsLang";

/** Parallel to the six cards in `FEATURE_STRINGS`, which carry the prose. */
const ICONS = [Paintbrush, Palette, Keyboard, Zap, Blocks, Globe];

const lang = useDocsLang();

const features = computed(() => {
  const prefix = lang.value === "en" ? "" : `/${lang.value}`;
  return featureStrings(lang.value).map((f, i) => ({
    icon: ICONS[i],
    title: f.title,
    details: f.details,
    href: `${prefix}/guide/features#${f.anchor}`,
  }));
});
</script>

<template>
  <div class="feature-grid">
    <a
      v-for="(f, i) in features"
      :key="i"
      :href="f.href"
      class="feature-card"
    >
      <div class="feature-head">
        <component
          :is="f.icon"
          :size="20"
          class="feature-icon"
        />
        <h3 class="feature-title">
          {{ f.title }}
        </h3>
      </div>
      <p class="feature-details">
        {{ f.details }}
      </p>
    </a>
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
  display: block;
  text-decoration: none;
  color: inherit;
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

/* Icon and title share a line; the description sits under both. */
.feature-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.feature-icon {
  color: var(--vp-c-brand-2);
  flex: none;
}

.feature-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
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
