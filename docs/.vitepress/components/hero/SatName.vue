<script setup lang="ts">
import type { ColorNameResolution, ColorNames } from "@urcolor/i18n";
import { computed, shallowRef, watch } from "vue";
import { heroStrings } from "../../i18n/strings";
import { useDocsLang } from "../../composables/useDocsLang";
import { useHeroColor } from "../../composables/useHeroColor";

const color = useHeroColor();
const lang = useDocsLang();
const strings = computed(() => heroStrings(lang.value));

const names = shallowRef<ColorNames | null>(null);

/**
 * uwdata first: it models how speakers spontaneously name a *region* of colour
 * space, which is the right answer for an arbitrary picked colour. wikidata is
 * the fallback for languages uwdata never sampled (`ja` among the site's), and
 * answers a different question — the established name of a catalogued colour —
 * which is why the readout says which source spoke.
 */
async function pickNames(l: string): Promise<ColorNames | null> {
  const { ColorNames: Names, getSource } = await import("@urcolor/i18n");
  for (const source of ["uwdata", "wikidata"] as const) {
    if (getSource(source).languages[l]) return Names.load(l, { source });
  }
  return null;
}

/**
 * A language chunk is real data, not a lookup table — uwdata's English one is
 * ~136 kB gzipped — so it waits for idle rather than competing with the hero's
 * first paint. The 1.5s ceiling covers Safari, which has no `requestIdleCallback`.
 */
function whenIdle(run: () => void): void {
  const ric = (window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void })
    .requestIdleCallback;
  if (ric) ric(run, { timeout: 1500 });
  else window.setTimeout(run, 1500);
}

let token = 0;

watch(lang, (l) => {
  // Keeping the load client-side keeps the data out of the SSR bundle too. The
  // panel renders its placeholder until the chunk lands.
  if (typeof window === "undefined") return;
  const mine = ++token;
  whenIdle(() => {
    if (mine !== token) return;
    void pickNames(l).then((loaded) => {
      if (mine === token) names.value = loaded;
    }).catch(() => {
      if (mine === token) names.value = null;
    });
  });
}, { immediate: true });

const resolution = computed<ColorNameResolution | undefined>(() =>
  names.value ? names.value.resolve(color.value) : undefined,
);

const name = computed(() => {
  const r = resolution.value;
  if (!r || r.coverage === "none" || !r.name) return "—";
  return r.name;
});

/**
 * `probability` means different things per model — a sampled naming frequency
 * for uwdata, a proximity score for wikidata's catalogue — so only the former
 * is shown as a percentage. See `@urcolor/i18n`'s `ColorNameResolution`.
 */
const meta = computed(() => {
  const r = resolution.value;
  if (!r || r.coverage === "none" || !r.name) return strings.value.noData;
  if (r.model === "palette") return `${strings.value.closestMatch} · ${r.source}`;
  return `${Math.round(r.probability * 100)}% · ${r.source}`;
});

/** The language's own endonym, e.g. "日本語" for `ja`. */
const langLabel = computed(() => {
  try {
    return new Intl.DisplayNames([lang.value], { type: "language" }).of(lang.value)
      ?? lang.value.toUpperCase();
  } catch {
    return lang.value.toUpperCase();
  }
});
</script>

<template>
  <div class="sat-name">
    <div class="sat-name-head">
      <span class="sat-name-label">{{ strings.labelName }}</span>
      <span class="sat-name-lang">{{ langLabel }}</span>
    </div>
    <output
      class="sat-name-value"
      :lang="lang"
    >{{ name }}</output>
    <span class="sat-name-meta">{{ meta }}</span>
  </div>
</template>

<style scoped>
.sat-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sat-name-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.sat-name-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}

.sat-name-lang {
  font-size: 11px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
}

.sat-name-value {
  font-size: clamp(1.05rem, 3.5cqw, 1.5rem);
  font-weight: 700;
  line-height: 1.25;
  color: var(--vp-c-brand-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sat-name-meta {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--vp-c-text-3);
}
</style>
