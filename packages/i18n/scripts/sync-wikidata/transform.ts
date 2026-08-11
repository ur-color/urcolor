import { Color } from "@urcolor/core";
import type { LanguageCoverage, PaletteChunk, TermEntry } from "../../src/engine/types";
import type { Catalogue, RawAliasRow, RawCatalogueRow, RawItemRow, RawLabelRow } from "./fetch";
import { attestedScripts, isScriptConsistent } from "./scripts";

/**
 * Wikidata pseudo-languages. `mul` ("multiple languages") is present in the
 * live data; `zxx` ("no linguistic content") is not, and is excluded
 * defensively. Neither is a language a locale could negotiate to.
 */
export const EXCLUDED_LANGUAGES: ReadonlySet<string> = new Set(["mul", "zxx"]);

/**
 * Wikidata ships regional and orthographic variants as independent label sets,
 * usually far thinner than their base tag. Shipping them verbatim is a footgun:
 * `negotiateLocale` prefers an exact tag match, so a 6-term `en-gb` chunk would
 * beat the 897-term `en` chunk for a caller asking for "en-GB".
 *
 * Region-only variants therefore fold into their base tag, while genuine script
 * variants stay distinct under well-formed BCP 47 script subtags. Chinese
 * regional tags are treated as script tags because that is what they encode in
 * practice; bare `zh` on Wikidata is Simplified, matching the uwdata `zh` chunk.
 */
export const LANGUAGE_MERGE: Readonly<Record<string, string>> = {
  // `simple` is Simple English Wikipedia's MediaWiki content-language code,
  // not a BCP 47 language subtag — no `Intl` locale negotiation ever reaches
  // it, so shipping it as its own locale would be dead weight. Its one term
  // (Q2294901 "baby blue") already appears identically in `en`, so merging is
  // a content no-op: `en`'s base-tag-wins rule keeps `en`'s own label.
  "simple": "en",
  "en-ca": "en", "en-gb": "en", "en-us": "en",
  "de-at": "de", "de-ch": "de",
  "pt-br": "pt",
  "crh-ro": "crh",
  "pap-aw": "pap",
  "zh-cn": "zh", "zh-sg": "zh", "zh-my": "zh", "zh-hans": "zh",
  "zh-tw": "zh-Hant", "zh-hk": "zh-Hant", "zh-mo": "zh-Hant", "zh-hant": "zh-Hant",
  "sr-ec": "sr-Cyrl", "sr-el": "sr-Latn",
  "tt-cyrl": "tt-Cyrl", "tt-latn": "tt-Latn",
  "aeb-arab": "aeb-Arab", "aeb-latn": "aeb-Latn",
  "isv-cyrl": "isv-Cyrl", "isv-latn": "isv-Latn",
  "ku-latn": "ku-Latn",
  "ms-arab": "ms-Arab",
  "shy-latn": "shy-Latn",
};

/** The locale a Wikidata tag ships under, or `undefined` if it must be dropped. */
export function normalizeLanguage(tag: string): string | undefined {
  const lower = tag.toLowerCase();
  if (EXCLUDED_LANGUAGES.has(lower)) return undefined;
  return LANGUAGE_MERGE[lower] ?? lower;
}

/**
 * Catalogue names as they are actually spelled in the shipped labels. The list
 * exists only for the fifteen digit-free codes in the data: `Pantone Reflex
 * Blue` in three locales, and `NCS red/green/yellow/blue` in English, Venetian
 * (`NCS roso`) and Frisian (`NCS-read`). Everything else a catalogue label can
 * be is caught by the digit test below.
 */
const CATALOGUE_MARKERS = ["pantone", "ral", "ncs", "彩通", "פנטון", "แพนโทน", "پنتون", "بانتون"];

/**
 * Anchored to whitespace, hyphen or string edge, so "coral" and "general" are
 * not read as RAL codes. Frisian writes `NCS-read`, hence the hyphen.
 */
const MARKER_PATTERN = new RegExp(`(^|[\\s\\-])(${CATALOGUE_MARKERS.join("|")})([\\s\\-]|$)`, "iu");

/**
 * Whether a label on a catalogue item is the code rather than a name.
 *
 * Identifying the item is not the same as condemning all of its labels. Some
 * languages label a RAL item with its descriptive name: German `Verkehrsrot`
 * for RAL 3020, Italian `rosso traffico`, Japanese `シグナルレッド`, plus ten
 * Estonian, eight Indonesian and five Czech names. Those are ordinary colour
 * words and stay in this source.
 *
 * The digit test carries almost all of the work and is script-neutral:
 * `\p{Nd}` matches Persian `۴۴۸` as readily as `448`. The rule fails in the
 * safe direction, since an unrecognised marker leaves a code-shaped label
 * visible in the data rather than destroying a real name.
 */
export function isCatalogueCode(label: string): boolean {
  return /\p{Nd}/u.test(label) || MARKER_PATTERN.test(label);
}

export function catalogueMembership(rows: readonly RawCatalogueRow[]): Map<string, Catalogue> {
  return new Map(rows.map(row => [row.qid, row.catalogue]));
}

/** Splits label or alias rows into the ones that stay and the codes that go. */
export function stripCatalogueCodes<T extends RawLabelRow>(
  rows: readonly T[],
  membership: ReadonlyMap<string, Catalogue>,
): { kept: T[]; dropped: T[] } {
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const row of rows) {
    if (membership.has(row.qid) && isCatalogueCode(row.value)) dropped.push(row);
    else kept.push(row);
  }
  return { kept, dropped };
}

/**
 * Drops catalogue items that lost every label, so they stop inflating
 * `itemCount` — the denominator every coverage figure divides by. A catalogue
 * item that kept a descriptive label in some language is still a colour this
 * source names, so it stays.
 *
 * Items outside any catalogue are never pruned, even when unlabelled: their
 * presence in the denominator is what makes coverage mean "the fraction of the
 * catalogue this language names".
 */
export function pruneCatalogueItems(
  itemRows: readonly RawItemRow[],
  membership: ReadonlyMap<string, Catalogue>,
  survivingQids: ReadonlySet<string>,
): RawItemRow[] {
  return itemRows.filter(row => !membership.has(row.qid) || survivingQids.has(row.qid));
}

/**
 * 62 items carry more than one best-rank `P465` — e.g. Q12894641 (lilac) has
 * both `BF00FF` and `C8A2C8`. Sorting and taking the first makes the choice
 * depend on the data rather than on SPARQL result ordering, so re-syncing an
 * unchanged catalogue produces byte-identical output.
 */
export function pickHex(hexes: readonly string[]): string {
  return [...hexes].sort()[0]!;
}

export interface ColorItem {
  qid: string;
  hex: string;
  sitelinks: number;
  centroid: [number, number, number];
}

const qidNumber = (qid: string) => Number(qid.slice(1));

/**
 * Collapses the raw rows into one entry per item and orders them by salience.
 *
 * Ordering is what makes reverse lookup deterministic. 545 (language, label)
 * pairs are shared by two or more items — English "white" labels both Q23444
 * (183 sitelinks) and Q62391724 (0) — and `resolveColorOf` takes the first
 * match. Sitelink count is a reasonable proxy for the central sense of a name;
 * the QID tiebreak guarantees a total order.
 */
export function buildItems(rows: readonly RawItemRow[]): ColorItem[] {
  const hexes = new Map<string, string[]>();
  const sitelinks = new Map<string, number>();

  for (const row of rows) {
    const bucket = hexes.get(row.qid);
    if (bucket === undefined) hexes.set(row.qid, [row.hex]);
    else bucket.push(row.hex);
    sitelinks.set(row.qid, row.sitelinks);
  }

  const items: ColorItem[] = [];
  for (const [qid, values] of hexes) {
    const hex = pickHex(values);
    const [l, a, b] = Color.parse(`#${hex}`)!.to("oklab").coords;
    items.push({ qid, hex, sitelinks: sitelinks.get(qid) ?? 0, centroid: [l, a, b] });
  }

  items.sort((x, y) => y.sitelinks - x.sitelinks || qidNumber(x.qid) - qidNumber(y.qid));
  return items;
}

interface LabelSlot {
  value: string;
  /** Source tag, lowercased — the tiebreak key when no base-tag row exists. */
  lang: string;
  isBase: boolean;
}

/**
 * Buckets labels by shipping locale, one label per item.
 *
 * A base-tag row (`row.lang === target`) always wins, and always overwrites
 * — that guard needs no row order. But `LABELS_QUERY` has no `ORDER BY`, so
 * when an item has no base-tag row at all and several variant rows compete
 * (e.g. only `en-gb` and `en-ca` label an item, no plain `en`), arrival order
 * is arbitrary and would make the sync non-deterministic. The tiebreak there
 * is the source language tag itself, ascending — an arbitrary but stable
 * total order, so re-syncing unchanged upstream data reproduces byte-identical
 * output regardless of what order WDQS happened to return rows in.
 */
export function groupLabels(rows: readonly RawLabelRow[]): Map<string, Map<string, string>> {
  const byLang = new Map<string, Map<string, LabelSlot>>();

  for (const row of rows) {
    const target = normalizeLanguage(row.lang);
    if (target === undefined) continue;

    let bucket = byLang.get(target);
    if (bucket === undefined) {
      bucket = new Map<string, LabelSlot>();
      byLang.set(target, bucket);
    }

    const lang = row.lang.toLowerCase();
    const isBase = lang === target.toLowerCase();
    const existing = bucket.get(row.qid);

    const winsOverExisting = existing === undefined
      || (isBase && !existing.isBase)
      || (!isBase && !existing.isBase && lang < existing.lang);

    if (winsOverExisting) bucket.set(row.qid, { value: row.value, lang, isBase });
  }

  const result = new Map<string, Map<string, string>>();
  for (const [target, bucket] of byLang) {
    const values = new Map<string, string>();
    for (const [qid, slot] of bucket) values.set(qid, slot.value);
    result.set(target, values);
  }
  return result;
}

/** Aliases are many-per-item, so they bucket into a list rather than a map. */
export function groupAliases(rows: readonly RawAliasRow[]): Map<string, { qid: string; value: string }[]> {
  const byLang = new Map<string, { qid: string; value: string }[]>();

  for (const row of rows) {
    const target = normalizeLanguage(row.lang);
    if (target === undefined) continue;
    const bucket = byLang.get(target);
    if (bucket === undefined) byLang.set(target, [{ qid: row.qid, value: row.value }]);
    else bucket.push({ qid: row.qid, value: row.value });
  }

  return byLang;
}

/**
 * Whether `Intl` accepts a tag for case mapping. Only `map-bms` is rejected in
 * the current data: its second subtag is neither a region nor a well-formed
 * variant, so the tag is structurally invalid even though the language is
 * real.
 */
export function supportsLocaleCase(lang: string): boolean {
  try {
    "A".toLocaleLowerCase(lang);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lower-cases under the rules of the name's own language.
 *
 * `uwdata` ships every display name in lower case in every language it covers,
 * German included, and this brings `wikidata` into line.
 *
 * Both normalisation passes are load-bearing. Turkish `İ` folds to `i` under
 * `tr`, but under the invariant rule it folds to `i` followed by a combining
 * dot above: a different string, and so a different lookup key. Normalising
 * after the fold collapses that back to NFC.
 */
export function fold(value: string, lang: string): string {
  const composed = value.normalize("NFC");
  try {
    return composed.toLocaleLowerCase(lang).normalize("NFC");
  } catch {
    return composed.toLowerCase().normalize("NFC");
  }
}

export interface PaletteChunkResult {
  chunk: PaletteChunk;
  /** Names the alphabet check removed, in upstream spelling, for the report. */
  droppedByScript: string[];
}

export function buildPaletteChunk(
  lang: string,
  items: readonly ColorItem[],
  labels: ReadonlyMap<string, string>,
  aliases: readonly { qid: string; value: string }[],
): PaletteChunkResult {
  // `items` is already in salience order, so the candidates inherit it.
  const candidates: { item: ColorItem; label: string }[] = [];
  for (const item of items) {
    const label = labels.get(item.qid);
    if (label === undefined) continue;
    candidates.push({ item, label: label.normalize("NFC") });
  }

  // Calibrated against this locale's own names, which is only possible once
  // they have all been collected. The check runs before the fold because case
  // does not affect script, and the report reads better in upstream spelling.
  const allowed = attestedScripts(candidates.map(candidate => candidate.label));

  const terms: TermEntry[] = [];
  const provenance: [string, string][] = [];
  const indexByQid = new Map<string, number>();
  const droppedByScript: string[] = [];

  for (const { item, label } of candidates) {
    if (!isScriptConsistent(label, allowed)) {
      droppedByScript.push(label);
      continue;
    }

    // Once the display name is folded, the key and the name are the same
    // string. A separate `toLowerCase()` key would be redundant here and, for
    // Turkish, actively wrong.
    const name = fold(label, lang);
    indexByQid.set(item.qid, terms.length);
    terms.push([name, name, item.centroid, null]);
    provenance.push([item.qid, item.hex]);
  }

  // `aliases` preserves raw SPARQL row order, which carries no salience
  // information (`ALIASES_QUERY` has no `ORDER BY`). Sort by each alias's
  // item's term index — which *is* salience order, per the loop above —
  // before applying first-wins, so the winner is deterministic. `Array.sort`
  // is stable, so multiple aliases on the same item keep their relative order.
  const aliasIndex: Record<string, number> = {};
  const orderedAliases = aliases
    .map(alias => ({ alias, termIndex: indexByQid.get(alias.qid) }))
    .filter((entry): entry is { alias: typeof aliases[number]; termIndex: number } => entry.termIndex !== undefined)
    .sort((a, b) => a.termIndex - b.termIndex);

  for (const { alias, termIndex } of orderedAliases) {
    const key = fold(alias.value, lang);
    // First wins, and the sort above means "first" is the most-linked item.
    if (!(key in aliasIndex)) aliasIndex[key] = termIndex;
  }

  return {
    chunk: { lang, model: "palette", terms, provenance, aliases: aliasIndex },
    droppedByScript,
  };
}

/**
 * The fraction of the catalogue this language names. `itemCount` is passed in
 * rather than hardcoded so that a later sync which grows the catalogue
 * recomputes every figure consistently instead of drifting against a stale
 * constant.
 *
 * `coverage` is rounded to 4 decimal places — ample for a display/threshold
 * figure, and it materially shrinks `meta.json`, which is inlined into
 * `dist/index.js` and paid for by every consumer regardless of whether they
 * use wikidata at all. `terms` and `itemCount` are exact counts and are never
 * rounded.
 */
export function paletteCoverage(chunk: PaletteChunk, itemCount: number): LanguageCoverage {
  const coverage = itemCount > 0 ? chunk.terms.length / itemCount : 0;
  return {
    model: "palette",
    terms: chunk.terms.length,
    coverage: Math.round(coverage * 10000) / 10000,
  };
}
