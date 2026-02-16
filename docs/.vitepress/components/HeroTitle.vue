<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import LogoSymbol from "./LogoSymbol.vue";

const words = [
  "Favorite",
  "Perfect",
  "Dream",
  "Next",
  "True",
  "Vivid",
  "Harmonious",
  "Elegant",
  "Accessible",
  "Flexible",
  "Composable",
  "Universal",
  "Customizable",
  "Consistent",
  "Interactive",
  "Modern",
  "Intuitive",
  "Smart",
  "Effortless",
  "Expressive",
  "Precise",
  "Dope",
  "Fire",
  "Lit",
  "Fresh",
  "Sick",
  "Fly",
  "Clean",
  "Crispy",
  "Iconic",
  "Elite",
  "Legit",
  "Goated",
];
const currentWord = ref(words[0]);
const wordWidth = ref("auto");
const wordEl = ref<HTMLElement>();
const measureEl = ref<HTMLElement>();
let gsapRef: any;

function measureWord(word: string) {
  if (!measureEl.value) return;
  measureEl.value.textContent = word;
  return measureEl.value.offsetWidth;
}

onMounted(async () => {
  const gsap = (await import("gsap")).default;

  // Set initial width
  wordWidth.value = measureWord(words[0]) + "px";

  // Word cycling animation with shuffled order (no repeats until all shown)
  function shuffleWords() {
    const indices = Array.from({ length: words.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }

  let queue: number[] = [];
  let lastIndex = 0;

  function getNextWord() {
    if (queue.length === 0) {
      queue = shuffleWords();
      // Avoid repeating the last shown word at the start of a new shuffle
      if (queue[0] === lastIndex && queue.length > 1) {
        [queue[0], queue[queue.length - 1]] = [queue[queue.length - 1], queue[0]];
      }
    }
    lastIndex = queue.shift()!;
    return words[lastIndex];
  }

  function cycleWord() {
    const nextWord = getNextWord();
    gsap.to(wordEl.value!, {
      duration: 0.4,
      opacity: 0,
      y: -20,
      ease: "power2.in",
      onComplete: () => {
        currentWord.value = nextWord;
        wordWidth.value = measureWord(nextWord) + "px";
        gsap.to(wordEl.value!, {
          duration: 0.4,
          opacity: 1,
          y: 0,
          ease: "power2.out",
          onComplete: () => {
            gsap.delayedCall(1.5, cycleWord);
          },
        });
      },
    });
  }

  gsap.delayedCall(2, cycleWord);

  gsapRef = gsap;
});

onUnmounted(() => {
  if (gsapRef && wordEl.value) {
    gsapRef.killTweensOf(wordEl.value);
  }
});
</script>

<template>
  <h1 class="hero-title">
    <span class="hero-ur-symbol">
      <LogoSymbol />
    </span> <span
      class="hero-word-wrapper"
      :style="{ width: wordWidth }"
    ><span
      ref="wordEl"
      class="hero-word"
    >{{ currentWord }}</span></span> Color
    <span
      ref="measureEl"
      class="hero-word-measure"
      aria-hidden="true"
    />
  </h1>
</template>

<style scoped>
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
</style>
