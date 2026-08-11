<script setup lang="ts">
import type { ColorNameResolution, ColorNames } from "@urcolor/i18n";
import { computed, shallowRef, watch } from "vue";
import { heroStrings } from "../../i18n/strings";
import { useDocsLang } from "../../composables/useDocsLang";
import { useHeroColor } from "../../composables/useHeroColor";

const color = useHeroColor();
const lang = useDocsLang();
const strings = computed(() => heroStrings(lang.value));

const names = shallowRef<ColorNames[]>([]);

/**
 * Every source that covers the language, not the first one that does. The two
 * answer different questions — uwdata models how speakers spontaneously name a
 * *region* of colour space, wikidata catalogues named colours at exact values —
 * and neither is the better answer everywhere, so the choice is made per colour
 * below rather than per language here. `ja` yields one instance; the other six
 * locales yield two.
 *
 * Order is the package's own default chain, and it survives into `resolution`
 * as the tie-break.
 */
async function loadNames(l: string): Promise<ColorNames[]> {
  const { ColorNames: Names, getSource } = await import("@urcolor/i18n");
  const covering = (["uwdata", "wikidata"] as const).filter(s => getSource(s).languages[l]);
  return Promise.all(covering.map(source => Names.load(l, { source })));
}

/**
 * A language chunk is real data, not a lookup table — uwdata's English one is
 * ~136 kB gzipped — so it waits for idle rather than competing with the hero's
 * first paint. The 1.5s ceiling covers Safari, which has no `requestIdleCallback`.
 * The second chunk is the small one of the pair (wikidata ships 27 kB for `zh`
 * against uwdata's 633 kB for `en`, uncompressed), and both load together so the
 * displayed name never changes on its own after the panel first fills.
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
  // panel renders its placeholder until the chunks land.
  if (typeof window === "undefined") return;
  const mine = ++token;
  whenIdle(() => {
    if (mine !== token) return;
    void loadNames(l).then((loaded) => {
      if (mine === token) names.value = loaded;
    }).catch(() => {
      if (mine === token) names.value = [];
    });
  });
}, { immediate: true });

/**
 * The closer of the two answers wins. `binDistance` is the only number
 * comparable across the models — `probability` is a sampled naming frequency
 * for uwdata and a proximity confidence for wikidata, so a 40% naming frequency
 * is not "worse" than a 0.9 proximity score.
 *
 * Two properties of the lookups make this need no special cases: the full model
 * reports distance 0 on an exact bin hit, so uwdata wins wherever it has real
 * data for the queried bin, and both models report `Infinity` when nothing
 * matches, so a source with nothing to say loses by arithmetic. `reduce` keeps
 * the incumbent on a tie, which leaves the package's own source order as the
 * tie-break.
 */
const resolution = computed<ColorNameResolution | undefined>(() => {
  const answered = names.value
    .map(n => n.resolve(color.value))
    .filter(r => r.coverage !== "none" && r.name);
  return answered.reduce<ColorNameResolution | undefined>(
    (best, r) => (best === undefined || r.binDistance < best.binDistance ? r : best),
    undefined,
  );
});

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
