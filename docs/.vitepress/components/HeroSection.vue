<script setup lang="ts">
import { provideHeroColor } from "../composables/useHeroColor";
import FeaturesGrid from "./FeaturesGrid.vue";
import HeroBgCanvas from "./HeroBgCanvas.vue";
import HeroOrbit from "./HeroOrbit.vue";
import HeroTitle from "./HeroTitle.vue";

provideHeroColor();
</script>

<template>
  <div class="hero-section">
    <HeroBgCanvas />

    <div class="hero-stage">
      <div class="hero-copy">
        <HeroTitle />
        <p class="hero-tagline">
          Universal color picker component library
        </p>
        <p class="hero-lede">
          Headless, accessible primitives for every color space — sRGB, HSL,
          LCH, OKLCH — in any framework, with no runtime dependencies.
        </p>
        <div class="hero-actions">
          <a
            href="/guide/"
            class="hero-btn hero-btn-brand"
          >Get Started</a>
          <a
            href="/components/"
            class="hero-btn hero-btn-alt"
          >Components</a>
        </div>
      </div>

      <div class="hero-cluster">
        <HeroOrbit />
      </div>
    </div>

    <div class="hero-features">
      <FeaturesGrid />
    </div>
  </div>
</template>

<style scoped>
.hero-section {
  position: relative;
  overflow-x: clip;
}

.hero-stage {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  align-items: center;
  gap: clamp(24px, 4vw, 64px);
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100dvh - var(--vp-nav-height));
  padding: 24px clamp(24px, 4vw, 56px) 40px;
  text-align: left;
}

.hero-copy {
  max-width: 560px;
}

.hero-tagline {
  font-size: clamp(1.05rem, 2vw, 1.4rem);
  color: var(--vp-c-text-1);
  margin-top: 8px;
}

.hero-lede {
  font-size: clamp(0.9rem, 1.4vw, 1rem);
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin-top: 14px;
  max-width: 46ch;
}

.hero-cluster {
  min-width: 0;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  flex-wrap: wrap;
  margin-top: 28px;
}

.hero-btn {
  display: inline-block;
  padding: 12px 28px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
}

.hero-btn-brand {
  position: relative;
  overflow: hidden;
  background: color-mix(in srgb, var(--vp-c-brand-2) 80%, transparent);
  backdrop-filter: blur(12px);
  color: var(--vp-button-brand-text);
}

.hero-btn-brand::after {
  content: "";
  position: absolute;
  inset: 0;
  mix-blend-mode: soft-light;
  background: color-mix(in srgb, var(--vp-c-brand-1) 90%, transparent);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.hero-btn-brand:hover::after {
  opacity: 1;
}

.hero-btn-alt {
  border: 1px solid color-mix(in srgb, var(--vp-c-text-1) 15%, transparent);
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-bg-soft) 40%, transparent);
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
}

.hero-btn-alt:hover {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 40%, transparent);
  color: var(--vp-c-brand-1);
}

.hero-features {
  position: relative;
  z-index: 1;
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px 80px;
}

/*
 * Below this the two columns each get too narrow to be worth the split: the
 * copy wraps to ragged three-word lines and the cluster loses its orbit. One
 * centered column instead.
 */
@media (max-width: 1080px) {
  .hero-stage {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    text-align: center;
    gap: 32px;
  }

  .hero-copy {
    max-width: 620px;
  }

  .hero-lede {
    margin-inline: auto;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-cluster {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .hero-stage {
    min-height: 0;
    padding: 48px 16px 32px;
  }

  .hero-features {
    padding: 0 16px 48px;
  }
}
</style>
