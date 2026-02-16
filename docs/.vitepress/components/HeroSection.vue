<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import HeroDemo from "./HeroDemo.vue";
import HeroBgCanvas from "./HeroBgCanvas.vue";
import FeaturesGrid from "./FeaturesGrid.vue";
import UrSymbol from "../assets/symbol.svg?raw";

const words = ["Favorite", "Perfect", "Dream", "Next", "True"];
const currentWord = ref(words[0]);
const wordWidth = ref("auto");
const wordEl = ref<HTMLElement>();
const measureEl = ref<HTMLElement>();
const perspectiveEl = ref<HTMLElement>();
let ctx: any;

function measureWord(word: string) {
  if (!measureEl.value) return;
  measureEl.value.textContent = word;
  return measureEl.value.offsetWidth;
}

onMounted(async () => {
  const gsap = (await import("gsap")).default;
  const { ScrollTrigger } = await import("gsap/ScrollTrigger");
  gsap.registerPlugin(ScrollTrigger);

  // Set initial width
  wordWidth.value = measureWord(words[0]) + "px";

  // Word cycling animation
  let wordIndex = 0;
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });

  function addWordCycle() {
    const nextIndex = (wordIndex + 1) % words.length;
    const nextWord = words[nextIndex];
    tl.to(wordEl.value!, {
      duration: 0.4,
      opacity: 0,
      y: -20,
      ease: "power2.in",
      onComplete: () => {
        wordIndex = nextIndex;
        currentWord.value = nextWord;
        wordWidth.value = measureWord(nextWord) + "px";
      },
    }).to(wordEl.value!, {
      duration: 0.4,
      opacity: 1,
      y: 0,
      ease: "power2.out",
    }).to({}, { duration: 1.5 });
    wordIndex = nextIndex;
  }

  for (let i = 0; i < words.length; i++) {
    addWordCycle();
  }
  wordIndex = 0;

  // 3D scroll effect
  if (perspectiveEl.value) {
    gsap.set(perspectiveEl.value, { rotateX: -24, transformPerspective: 1000 });
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

  ctx = { tl };
});

onUnmounted(() => {
  ctx?.tl?.kill();
});

</script>

<template>
  <div class="hero-section">
    <HeroBgCanvas />
    <div class="hero-content">
      <h1 class="hero-title">
        <span class="hero-ur-symbol" v-html="UrSymbol"></span> <span class="hero-word-wrapper" :style="{ width: wordWidth }"><span ref="wordEl" class="hero-word">{{ currentWord }}</span></span> Color
        <span ref="measureEl" class="hero-word-measure" aria-hidden="true"></span>
      </h1>
      <p class="hero-tagline">Universal color picker component library</p>
      <div class="hero-actions">
        <a href="/guide/" class="hero-btn hero-btn-brand">Get Started</a>
        <a href="/components/" class="hero-btn hero-btn-alt">Components</a>
      </div>
    </div>

    <div ref="perspectiveEl" class="hero-demo-perspective">
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

.hero-title {
  font-size: clamp(2rem, 8vw, 5.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
}

.hero-ur-symbol {
  display: inline-block;
  vertical-align: baseline;
}

.hero-ur-symbol :deep(svg) {
  height: 0.8em;
  width: auto;
  vertical-align: baseline;
  position: relative;
  top: 0.065em;
  right: -0.1em;
}

.hero-word-wrapper {
  display: inline-block;
  overflow: hidden;
  vertical-align: bottom;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;
}

.hero-word {
  display: inline-block;
  background: linear-gradient(135deg, var(--vp-c-brand-2), var(--vp-c-brand-2));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  white-space: nowrap;
}

.hero-word-measure {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  white-space: nowrap;
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
  transition: all 0.2s ease;
}

.hero-btn-brand {
  background: color-mix(in srgb, var(--vp-c-brand-2) 80%, transparent);
  backdrop-filter: blur(12px);
  color: var(--vp-button-brand-text);
}

.hero-btn-brand:hover {
  background: color-mix(in srgb, var(--vp-c-brand-1) 90%, transparent);
}

.hero-btn-alt {
  border: 1px solid color-mix(in srgb, var(--vp-c-text-1) 15%, transparent);
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-bg-soft) 40%, transparent);
  backdrop-filter: blur(12px);
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
