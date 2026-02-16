<script setup lang="ts">
import { ref, onMounted } from "vue";
import HeroDemo from "./HeroDemo.vue";
import HeroBgCanvas from "./HeroBgCanvas.vue";
import FeaturesGrid from "./FeaturesGrid.vue";
import HeroTitle from "./HeroTitle.vue";

const perspectiveEl = ref<HTMLElement>();

onMounted(async () => {
  const gsap = (await import("gsap")).default;
  const { ScrollTrigger } = await import("gsap/ScrollTrigger");
  gsap.registerPlugin(ScrollTrigger);

  // 3D scroll effect
  if (perspectiveEl.value) {
    gsap.set(perspectiveEl.value, { rotateX: -36, transformPerspective: 1000 });
    gsap.to(perspectiveEl.value, {
      rotateX: 0,
      ease: "none",
      scrollTrigger: {
        trigger: perspectiveEl.value,
        start: "top 80%",
        end: "top 30%",
        scrub: true,
      },
    });
  }
});
</script>

<template>
  <div class="hero-section">
    <HeroBgCanvas />
    <div class="hero-content">
      <HeroTitle />
      <p class="hero-tagline">
        Universal color picker component library
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

    <div
      ref="perspectiveEl"
      class="hero-demo-perspective"
    >
      <HeroDemo />
    </div>

    <FeaturesGrid />
  </div>
</template>

<style scoped>
.hero-section {
  position: relative;
  max-width: 960px;
  margin: 0 auto;
  padding: 180px 24px 80px;
  text-align: center;
  overflow-x: hidden;
}

.hero-content,
.hero-demo-perspective {
  position: relative;
  z-index: 1;
}

.hero-content {
  margin-bottom: 80px;
}

.hero-tagline {
  font-size: clamp(1rem, 4vw, 1.5rem);
  color: var(--vp-c-text-2);
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
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

.hero-demo-perspective {
  margin-bottom: 64px;
  will-change: transform;
}

@media (max-width: 768px) {
  .hero-section {
    padding: 72px 16px 48px;
  }
}
</style>
