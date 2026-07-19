# `@urcolor/i18n` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a new workspace package `@urcolor/i18n` that answers "what do speakers of language X call this colour?" from the uwdata colour-naming dataset, and that owns the channel-label translations currently living in `@urcolor/core`.

**Architecture:** An `Intl`-shaped public API (`ColorNames`, `ChannelNames`) over a namespaced source registry. Colour data is generated at sync time from a pinned upstream commit into per-language ES-module chunks loaded on demand. The lookup engine knows only about Oklab bins and probability distributions; the uwdata adapter knows only about the upstream schema.

**Tech Stack:** Bun (runtime, test runner, bundler), TypeScript (strict), `@urcolor/core` for `Color`/Oklab conversion. No runtime dependencies beyond core.

## Global Constraints

- Runtime and tooling is **Bun**. `bun test`, `bun run`, `bun build`. Never npm/yarn/pnpm/vitest/jest.
- TypeScript is **strict**, with `noUncheckedIndexedAccess: true` — every array/record index yields `T | undefined` and must be narrowed. Also `verbatimModuleSyntax: true` — type-only imports **must** use `import type`.
- ESLint style from the repo root: double quotes, semicolons, 2-space indent. Run `bun run lint` before every commit.
- The package has **zero runtime dependencies**. `@urcolor/core` is a `dependencies` entry (workspace), nothing else.
- Package version starts at `0.0.4` to match the other workspace packages.
- Source of colour data: `https://github.com/uwdata/color-naming-in-different-languages`, pinned at commit `f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5`.
- Required attribution, reproduced verbatim wherever the source is documented:
  > Kim, Y., Thayer, K., Silva Gorsky, G., & Heer, J. (2019). Color Names Across Languages: Salient Colors and Term Translation in Multilingual Color Naming Models. EuroVis.
- Required disclaimer, reproduced verbatim wherever the source is documented:
  > We represent the color labels provided by the participants in our study, which may include misspellings, but also whatever racial biases they have (e.g., the color 'skin'). This is not meant to be a prescriptive definition of what colors fit what labels.
- The upstream dataset declares no license. The project's decision is to attribute the source in code comments, in the package README, and in the VitePress docs, and to ship on that basis — no upstream licensing issue is filed. Every file that embeds or generates upstream-derived data carries a comment naming the source repo, the pinned commit, and the citation.
- Full-space model languages (14): `de en es fa fi fr ko nl pl pt ro ru sv zh`.
- Hue-only model languages (27): `ar bg ca cs da el et he hi hr hu id it ja ka lt mk ms nb sk sl sr th tr uk ur vi`.

---

## File Structure

**New package `packages/i18n/`:**

| File | Responsibility |
| --- | --- |
| `package.json` | Workspace package manifest, build scripts, `private: true` |
| `tsconfig.build.json` | Declaration emit config, mirrors core's |
| `src/index.ts` | Public API barrel — the only file consumers import |
| `src/channel-names.ts` | `ChannelNames` class |
| `src/color-names.ts` | `ColorNames` class — orchestrates locale, source, chunk, engine |
| `src/engine/types.ts` | Shared types: chunks, resolutions, source descriptors |
| `src/engine/locale.ts` | BCP 47 negotiation, `supportedLocalesOf` helper |
| `src/engine/registry.ts` | Source registry, chunk cache, `listSources`/`getSource` |
| `src/engine/lookup-full.ts` | Oklab-cube bin resolution + nearest-bin search |
| `src/engine/lookup-hue.ts` | Hue-circle projection + bin resolution |
| `src/channels/*.ts` | 77 channel-label locale files, moved from core |
| `src/channels/index.ts` | `translations` map + `ChannelTranslations` type, moved from core |
| `src/sources/uwdata/source.ts` | uwdata `NameSource` descriptor |
| `src/sources/uwdata/chunks.ts` | **Generated** lazy-import manifest |
| `src/data/uwdata/**` | **Generated** per-language chunk modules + `meta.json` |
| `scripts/sync-uwdata/fetch.ts` | Download + schema-validate upstream files |
| `scripts/sync-uwdata/transform.ts` | Upstream records → chunk objects |
| `scripts/sync-uwdata/main.ts` | CLI entry: fetch → transform → write → report |
| `test/**` | Mirrors `src/` layout, `bun:test` |
| `test/fixtures/uwdata/**` | Trimmed upstream samples, so sync tests need no network |

**Modified elsewhere:**

| File | Change |
| --- | --- |
| `packages/core/src/index.ts` | Remove the channel-label export line |
| `packages/core/src/i18n/**` | Deleted |
| `packages/core/test/i18n.test.ts` | Deleted (moved to the new package) |
| `packages/core/test/exports.test.ts` | Drop `translations`/`getChannelLabel` assertions |
| `package.json` (root) | Add i18n to the `build` script |
| `docs/guide/features.md` | Rewrite the localization section for the new API |
| `docs/.vitepress/config.ts` | Sidebar entry for the new docs page |
| `.github/workflows/sync-uwdata.yml` | New — weekly upstream sync PR |

---

### Task 1: Scaffold the package

**Files:**
- Create: `packages/i18n/package.json`
- Create: `packages/i18n/tsconfig.build.json`
- Create: `packages/i18n/src/index.ts`
- Test: `packages/i18n/test/exports.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the `@urcolor/i18n` workspace package, importable as `@urcolor/i18n` and buildable with `bun run --cwd packages/i18n build`.

- [ ] **Step 1: Write the failing test**

Create `packages/i18n/test/exports.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import * as i18n from "../src/index";

describe("@urcolor/i18n exports", () => {
  it("is importable", () => {
    expect(i18n).toBeDefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/i18n/test/exports.test.ts`
Expected: FAIL — `Cannot find module '../src/index'`.

- [ ] **Step 3: Create the package manifest**

Create `packages/i18n/package.json`:

```json
{
  "name": "@urcolor/i18n",
  "version": "0.0.4",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "bun": "./src/index.ts",
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "bun run build:js && bun run build:types",
    "build:js": "bun build ./src/index.ts --outdir ./dist --format esm --splitting",
    "build:types": "tsc --declaration --emitDeclarationOnly --outDir dist --project tsconfig.build.json",
    "sync:uwdata": "bun run scripts/sync-uwdata/main.ts"
  },
  "keywords": [
    "color",
    "color-names",
    "i18n",
    "l10n",
    "internationalization",
    "translation",
    "oklab"
  ],
  "author": {
    "name": "GrandMagus",
    "url": "https://github.com/GrandMagus02"
  },
  "homepage": "https://urcolor.vercel.app/",
  "repository": {
    "type": "git",
    "url": "https://github.com/ur-color/urcolor",
    "directory": "packages/i18n"
  },
  "bugs": {
    "url": "https://github.com/ur-color/urcolor/issues"
  },
  "dependencies": {
    "@urcolor/core": "workspace:*"
  }
}
```

`--splitting` matters: the generated data chunks are dynamically imported, and splitting is what keeps them out of the main bundle.

- [ ] **Step 4: Create the build tsconfig**

Create `packages/i18n/tsconfig.build.json`, mirroring `packages/core/tsconfig.build.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "dist",
    "paths": {}
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create the API barrel**

Create `packages/i18n/src/index.ts`:

```ts
// Multilingual color naming and channel-label translations for urcolor.
export {};
```

- [ ] **Step 6: Install and run the test**

Run: `bun install && bun test packages/i18n/test/exports.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 7: Add the package to the root build**

Modify `package.json` (root), the `build` script. Replace:

```json
"build": "bun run --cwd packages/core build && bun run --cwd packages/vue build && bun run --cwd packages/react build",
```

with:

```json
"build": "bun run --cwd packages/core build && bun run --cwd packages/i18n build && bun run --cwd packages/vue build && bun run --cwd packages/react build",
```

- [ ] **Step 8: Verify the build and lint**

Run: `bun run --cwd packages/i18n build && bun run lint`
Expected: `dist/index.js` and `dist/index.d.ts` exist; lint exits 0.

- [ ] **Step 9: Commit**

```bash
git add packages/i18n package.json bun.lock
git commit -m "feat(i18n): scaffold the @urcolor/i18n package"
```

---

### Task 2: Move channel labels out of core into `ChannelNames`

Core cannot depend on `@urcolor/i18n` (i18n depends on core), so this is a clean move, not a re-export. It is a breaking change to `@urcolor/core`.

**Files:**
- Create: `packages/i18n/src/channels/` (77 locale files + `index.ts` + `types.ts`, moved from core)
- Create: `packages/i18n/src/channel-names.ts`
- Modify: `packages/i18n/src/index.ts`
- Delete: `packages/core/src/i18n/`
- Delete: `packages/core/test/i18n.test.ts`
- Modify: `packages/core/src/index.ts` (last export line)
- Modify: `packages/core/test/exports.test.ts`
- Modify: `docs/guide/features.md`
- Test: `packages/i18n/test/channel-names.test.ts`

**Interfaces:**
- Consumes: the package scaffold from Task 1.
- Produces:
  - `type ChannelTranslations` — 12 capitalised string keys: `Hue Saturation Lightness Value Brightness Whiteness Blackness Chroma Red Green Blue Alpha`.
  - `type ChannelKey = Lowercase<keyof ChannelTranslations>` — e.g. `"hue"`, `"saturation"`.
  - `const translations: Record<string, ChannelTranslations>` — 77 locales.
  - `class ChannelNames`, with `constructor(locales: string | readonly string[])`, `of(channel: ChannelKey): string | undefined`, `resolvedOptions(): { locale: string }`, `static supportedLocalesOf(locales: string | readonly string[]): string[]`.

- [ ] **Step 1: Move the locale data**

```bash
git mv packages/core/src/i18n packages/i18n/src/channels
git rm packages/core/test/i18n.test.ts
```

The moved files need no edits — `channels/index.ts` and `channels/types.ts` already export `translations`, `getChannelLabel`, and `ChannelTranslations`. `getChannelLabel` stays as an internal helper for now and is removed in Step 7.

- [ ] **Step 2: Write the failing test**

Create `packages/i18n/test/channel-names.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { ChannelNames } from "../src/channel-names";
import { translations, type ChannelTranslations } from "../src/channels";

const channelKeys: (keyof ChannelTranslations)[] = [
  "Hue", "Saturation", "Lightness", "Value", "Brightness",
  "Whiteness", "Blackness", "Chroma", "Red", "Green", "Blue", "Alpha",
];

describe("ChannelNames", () => {
  it("returns English labels", () => {
    const names = new ChannelNames("en");
    expect(names.of("hue")).toBe("Hue");
    expect(names.of("red")).toBe("Red");
    expect(names.of("alpha")).toBe("Alpha");
  });

  it("returns translated labels", () => {
    expect(new ChannelNames("uk").of("saturation")).toBe("Насиченість");
    expect(new ChannelNames("fr").of("red")).toBe("Rouge");
    expect(new ChannelNames("zh").of("blue")).toBe("蓝");
    expect(new ChannelNames("ja").of("hue")).toBe("色相");
    expect(new ChannelNames("de").of("lightness")).toBe("Helligkeit");
    expect(new ChannelNames("ar").of("green")).toBe("أخضر");
    expect(new ChannelNames("ko").of("alpha")).toBe("알파");
  });

  it("negotiates regional tags down to the base language", () => {
    expect(new ChannelNames("fr-CA").of("red")).toBe("Rouge");
    expect(new ChannelNames(["xh", "de-AT"]).of("lightness")).toBe("Helligkeit");
  });

  it("falls back to English for an unknown locale", () => {
    expect(new ChannelNames("xx").of("hue")).toBe("Hue");
    expect(new ChannelNames("zz-ZZ").of("red")).toBe("Red");
  });

  it("reports the negotiated locale", () => {
    expect(new ChannelNames("fr-CA").resolvedOptions()).toEqual({ locale: "fr" });
    expect(new ChannelNames("xx").resolvedOptions()).toEqual({ locale: "en" });
  });

  it("filters requested locales by support", () => {
    expect(ChannelNames.supportedLocalesOf(["ko-KR", "xh", "de"])).toEqual(["ko-KR", "de"]);
  });
});

describe("translations", () => {
  it("gives every locale all 12 channel keys", () => {
    for (const t of Object.values(translations)) {
      for (const key of channelKeys) {
        expect(t[key]).toBeString();
        expect(t[key].length).toBeGreaterThan(0);
      }
    }
  });

  it("has 77 locales", () => {
    expect(Object.keys(translations).length).toBe(77);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun test packages/i18n/test/channel-names.test.ts`
Expected: FAIL — `Cannot find module '../src/channel-names'`.

- [ ] **Step 4: Write the locale negotiator**

Create `packages/i18n/src/engine/locale.ts`. `ColorNames` reuses this in Task 5, so it lives in `engine/`, not next to `ChannelNames`.

```ts
/**
 * BCP 47 lookup: try each requested tag, progressively stripping subtags
 * ("zh-Hans-CN" -> "zh-Hans" -> "zh"), and return the first available match.
 * Mirrors the "lookup" algorithm the `Intl` constructors use.
 */
export function negotiateLocale(
  requested: string | readonly string[],
  available: readonly string[],
): string | undefined {
  const requestedTags = typeof requested === "string" ? [requested] : requested;
  const supported = new Set(available);

  for (const tag of requestedTags) {
    let candidate = tag;
    while (candidate.length > 0) {
      if (supported.has(candidate)) return candidate;
      const cut = candidate.lastIndexOf("-");
      if (cut < 0) break;
      candidate = candidate.slice(0, cut);
    }
    const primary = tag.toLowerCase().split("-")[0];
    if (primary !== undefined && supported.has(primary)) return primary;
  }

  return undefined;
}

/**
 * Filter requested tags down to those that negotiate to something available,
 * preserving the caller's original tags. Mirrors `Intl.*.supportedLocalesOf`.
 */
export function filterSupportedLocales(
  requested: string | readonly string[],
  available: readonly string[],
): string[] {
  const requestedTags = typeof requested === "string" ? [requested] : requested;
  return requestedTags.filter((tag) => negotiateLocale(tag, available) !== undefined);
}
```

- [ ] **Step 5: Write `ChannelNames`**

Create `packages/i18n/src/channel-names.ts`:

```ts
import { filterSupportedLocales, negotiateLocale } from "./engine/locale";
import { translations, type ChannelTranslations } from "./channels";

/** Lowercase channel identifiers, e.g. `"hue"`, `"saturation"`. */
export type ChannelKey = Lowercase<keyof ChannelTranslations>;

const CHANNEL_LOOKUP: Record<string, keyof ChannelTranslations> = {
  hue: "Hue",
  saturation: "Saturation",
  lightness: "Lightness",
  value: "Value",
  brightness: "Brightness",
  whiteness: "Whiteness",
  blackness: "Blackness",
  chroma: "Chroma",
  red: "Red",
  green: "Green",
  blue: "Blue",
  alpha: "Alpha",
};

const AVAILABLE = Object.keys(translations);

/**
 * Channel-label translations, shaped after `Intl.DisplayNames`.
 *
 * ```ts
 * new ChannelNames("ko").of("hue"); // "색상"
 * ```
 */
export class ChannelNames {
  readonly #locale: string;
  readonly #table: ChannelTranslations;

  constructor(locales: string | readonly string[]) {
    this.#locale = negotiateLocale(locales, AVAILABLE) ?? "en";
    // The negotiated locale always exists in `translations`, and "en" is
    // guaranteed present, so this cannot be undefined.
    this.#table = translations[this.#locale]!;
  }

  /** The translated label, or `undefined` for an unknown channel. */
  of(channel: ChannelKey): string | undefined {
    const key = CHANNEL_LOOKUP[channel];
    return key === undefined ? undefined : this.#table[key];
  }

  resolvedOptions(): { locale: string } {
    return { locale: this.#locale };
  }

  static supportedLocalesOf(locales: string | readonly string[]): string[] {
    return filterSupportedLocales(locales, AVAILABLE);
  }
}
```

- [ ] **Step 6: Export from the barrel**

Replace the contents of `packages/i18n/src/index.ts`:

```ts
// Multilingual color naming and channel-label translations for urcolor.

// Channel labels.
export { ChannelNames, type ChannelKey } from "./channel-names";
export { translations, type ChannelTranslations } from "./channels";
```

- [ ] **Step 7: Drop the old free function**

Modify `packages/i18n/src/channels/index.ts`. Delete the `getChannelLabel` function at the bottom of the file (the doc comment and the function body) — `ChannelNames` replaces it. Keep the `translations` const and the `ChannelTranslations` re-export.

- [ ] **Step 8: Run the tests**

Run: `bun test packages/i18n/`
Expected: PASS, all tests green.

- [ ] **Step 9: Remove the export from core**

Modify `packages/core/src/index.ts`. Delete these two lines at the end of the file:

```ts
// Channel-label translations.
export { translations, getChannelLabel, type ChannelTranslations } from "./i18n";
```

- [ ] **Step 10: Fix core's export test**

Modify `packages/core/test/exports.test.ts`. In the test named `"still exposes the gradient, geometry, space-config and i18n surface"`, remove the `"translations"` and `"getChannelLabel"` entries from the array, and rename the test to `"still exposes the gradient, geometry and space-config surface"`.

- [ ] **Step 11: Run core's tests**

Run: `bun test packages/core/`
Expected: PASS, no reference to a missing `src/i18n`.

- [ ] **Step 12: Update the docs**

Modify `docs/guide/features.md`. Line 5 currently reads:

> UrColor ships with channel-label translations for 74 languages, built into `@urcolor/core`'s `i18n` module (`translations` and `getChannelLabel`).

Replace with:

> UrColor ships with channel-label translations for 77 languages in `@urcolor/i18n`, exposed through the `ChannelNames` class.

Line 57 currently reads:

> Channel labels — the words behind abbreviations like `H`, `S`, `L`, `V`, `R`, `G`, `B` (Hue, Saturation, Lightness, Value, Red, Green, Blue, and so on) — are what's translated. Call `getChannelLabel(locale, channelName)` to look up a label for a given locale, or use the `translations` map directly if you need the full dictionary for a locale.

Replace with:

> Channel labels — the words behind abbreviations like `H`, `S`, `L`, `V`, `R`, `G`, `B` (Hue, Saturation, Lightness, Value, Red, Green, Blue, and so on) — are what's translated. Construct a `ChannelNames` for a locale and call `of()`, or use the `translations` map directly if you need the full dictionary for a locale.
>
> ```ts
> import { ChannelNames } from "@urcolor/i18n";
>
> const channels = new ChannelNames("ko");
> channels.of("hue"); // "색상"
> channels.resolvedOptions(); // { locale: "ko" }
> ```

- [ ] **Step 13: Verify docs build and lint**

Run: `bun run lint && bun run docs:build`
Expected: both exit 0.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat(i18n)!: move channel labels from core into @urcolor/i18n

BREAKING CHANGE: @urcolor/core no longer exports translations,
getChannelLabel, or ChannelTranslations. Use ChannelNames from
@urcolor/i18n instead."
```

---

### Task 3: Source registry and the uwdata descriptor

**Files:**
- Create: `packages/i18n/src/engine/types.ts`
- Create: `packages/i18n/src/engine/registry.ts`
- Create: `packages/i18n/src/sources/uwdata/source.ts`
- Modify: `packages/i18n/src/index.ts`
- Test: `packages/i18n/test/engine/registry.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface LanguageCoverage { model: "full" | "hue"; terms: number; coverage: number }`
  - `interface NameSource { id, title, url, commitSha, license, citation, disclaimer, languages: Record<string, LanguageCoverage> }`
  - `interface FullChunk`, `interface HueChunk`, `type Chunk = FullChunk | HueChunk`
  - `function listSources(): NameSource[]`
  - `function getSource(id: string): NameSource` — throws on unknown id
  - `function registerSource(source: NameSource, loaders: ChunkLoaders): void`
  - `function loadChunk(sourceId: string, locale: string): Promise<Chunk>`
  - `function getLoadedChunk(sourceId: string, locale: string): Chunk | undefined`

- [ ] **Step 1: Write the failing test**

Create `packages/i18n/test/engine/registry.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { getSource, listSources } from "../../src/engine/registry";

describe("source registry", () => {
  it("lists the uwdata source", () => {
    const ids = listSources().map((s) => s.id);
    expect(ids).toContain("uwdata");
  });

  it("exposes citation, disclaimer and pinned revision", () => {
    const source = getSource("uwdata");
    expect(source.commitSha).toBe("f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5");
    expect(source.citation).toContain("EuroVis");
    expect(source.disclaimer).toContain("not meant to be a prescriptive definition");
    expect(source.url).toBe("https://github.com/uwdata/color-naming-in-different-languages");
  });

  it("throws a helpful error for an unknown source", () => {
    expect(() => getSource("nope")).toThrow(/unknown source "nope".*uwdata/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/i18n/test/engine/registry.test.ts`
Expected: FAIL — `Cannot find module '../../src/engine/registry'`.

- [ ] **Step 3: Write the shared types**

Create `packages/i18n/src/engine/types.ts`:

```ts
/** Which naming model backs a language, and how much of the space it covers. */
export interface LanguageCoverage {
  /** `"full"` = Oklab-cube model; `"hue"` = saturated-hue-circle model only. */
  model: "full" | "hue";
  /** Number of distinct colour terms modelled for this language. */
  terms: number;
  /** Fraction of the model's colour space that has data, 0–1. */
  coverage: number;
}

/** A namespaced colour-naming dataset. Sources are never merged. */
export interface NameSource {
  /** Stable identifier used in the `source` option, e.g. `"uwdata"`. */
  id: string;
  title: string;
  url: string;
  /** Upstream revision the shipped data was generated from. */
  commitSha?: string;
  /** SPDX identifier, or a plain-language note when the upstream has none. */
  license: string;
  /** Attribution text consumers should display. */
  citation: string;
  /** Caveats from the dataset authors that consumers should surface. */
  disclaimer?: string;
  languages: Record<string, LanguageCoverage>;
}

/** `[term, displayName, oklabCentroid]`. Centroid is null when unknown. */
export type TermEntry = [term: string, name: string, centroid: [number, number, number] | null];

/** Full-colour-space model: Oklab cubes keyed `"binL,binA,binB"`. */
export interface FullChunk {
  lang: string;
  model: "full";
  /** Oklab edge length of one bin. */
  binSize: number;
  terms: TermEntry[];
  /** Bin key -> `[termIndex, pTC]` pairs, sorted by pTC descending. */
  bins: Record<string, [termIndex: number, pTC: number][]>;
}

/** Hue-circle model: a fixed number of bins around the saturated hue ring. */
export interface HueChunk {
  lang: string;
  model: "hue";
  /** Number of bins around the circle. */
  binCount: number;
  terms: TermEntry[];
  /** Indexed by bin number; `[termIndex, pTC]` pairs sorted by pTC descending. */
  binTerms: [termIndex: number, pTC: number][][];
}

export type Chunk = FullChunk | HueChunk;

/** Locale -> lazy loader for that locale's chunk. */
export type ChunkLoaders = Record<string, () => Promise<{ default: Chunk }>>;
```

- [ ] **Step 4: Write the registry**

Create `packages/i18n/src/engine/registry.ts`:

```ts
import type { Chunk, ChunkLoaders, NameSource } from "./types";

interface RegisteredSource {
  source: NameSource;
  loaders: ChunkLoaders;
  chunks: Map<string, Chunk>;
}

const registry = new Map<string, RegisteredSource>();

export function registerSource(source: NameSource, loaders: ChunkLoaders): void {
  registry.set(source.id, { source, loaders, chunks: new Map() });
}

export function listSources(): NameSource[] {
  return [...registry.values()].map((entry) => entry.source);
}

function requireEntry(id: string): RegisteredSource {
  const entry = registry.get(id);
  if (entry === undefined) {
    const known = [...registry.keys()].join(", ");
    throw new Error(`Unknown source "${id}". Known sources: ${known}`);
  }
  return entry;
}

export function getSource(id: string): NameSource {
  return requireEntry(id).source;
}

/** Load and cache a locale's chunk. Idempotent. */
export async function loadChunk(sourceId: string, locale: string): Promise<Chunk> {
  const entry = requireEntry(sourceId);
  const cached = entry.chunks.get(locale);
  if (cached !== undefined) return cached;

  const loader = entry.loaders[locale];
  if (loader === undefined) {
    throw new RangeError(`Source "${sourceId}" has no data for locale "${locale}".`);
  }

  const chunk = (await loader()).default;
  entry.chunks.set(locale, chunk);
  return chunk;
}

/** The cached chunk, or `undefined` if it has not been loaded yet. */
export function getLoadedChunk(sourceId: string, locale: string): Chunk | undefined {
  return registry.get(sourceId)?.chunks.get(locale);
}
```

- [ ] **Step 5: Write the uwdata descriptor**

Create `packages/i18n/src/sources/uwdata/source.ts`. The `languages` map is a placeholder here and is replaced with generated content in Task 7.

```ts
import type { NameSource } from "../../engine/types";

export const UWDATA_COMMIT = "f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5";

export const uwdataSource: NameSource = {
  id: "uwdata",
  title: "Color Naming in Different Languages",
  url: "https://github.com/uwdata/color-naming-in-different-languages",
  commitSha: UWDATA_COMMIT,
  license: "No license declared upstream. See the package README before redistributing.",
  citation:
    "Kim, Y., Thayer, K., Silva Gorsky, G., & Heer, J. (2019). Color Names Across Languages: "
    + "Salient Colors and Term Translation in Multilingual Color Naming Models. EuroVis.",
  disclaimer:
    "We represent the color labels provided by the participants in our study, which may include "
    + "misspellings, but also whatever racial biases they have (e.g., the color 'skin'). This is "
    + "not meant to be a prescriptive definition of what colors fit what labels.",
  languages: {},
};
```

- [ ] **Step 6: Register the source from the barrel**

Modify `packages/i18n/src/index.ts` — append:

```ts
// Colour-name sources.
import { registerSource } from "./engine/registry";
import { uwdataSource } from "./sources/uwdata/source";

registerSource(uwdataSource, {});

export { listSources, getSource } from "./engine/registry";
export type { LanguageCoverage, NameSource } from "./engine/types";
```

The empty loader map is replaced with the generated manifest in Task 7.

- [ ] **Step 7: Fix the test import**

The test imports `getSource` from `src/engine/registry`, but registration happens in `src/index.ts`. Change the first line of the test body's import in `packages/i18n/test/engine/registry.test.ts` to pull the barrel's side effect in first:

```ts
import { describe, expect, it } from "bun:test";
import "../../src/index";
import { getSource, listSources } from "../../src/engine/registry";
```

- [ ] **Step 8: Run the tests**

Run: `bun test packages/i18n/`
Expected: PASS.

- [ ] **Step 9: Lint and commit**

```bash
bun run lint
git add packages/i18n
git commit -m "feat(i18n): add the namespaced source registry and uwdata descriptor"
```

---

### Task 4: Upstream fetch and schema validation

The sync script is split so this task is testable without network access: `fetch.ts` exposes pure parse/validate functions that operate on strings, plus a thin downloader.

**Files:**
- Create: `packages/i18n/scripts/sync-uwdata/fetch.ts`
- Create: `packages/i18n/test/fixtures/uwdata/full_colors_binned.json`
- Create: `packages/i18n/test/fixtures/uwdata/hue_colors_binned.json`
- Create: `packages/i18n/test/fixtures/uwdata/basic_colors_info_ko.csv`
- Test: `packages/i18n/test/scripts/fetch.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface RawFullRecord { langAbv: string; term: string; commonTerm: string; binL: number; binA: number; binB: number; pTC: number }`
  - `interface RawHueTerm { simplifiedName: string; commonName: string; bins: { pTC: number }[] }`
  - `interface RawBasicRow { lang_abv: string; commonName: string; simplifiedName: string; avgFullL: number; avgFullA: number; avgFullB: number }`
  - `function parseFullBinned(json: string): RawFullRecord[]` — throws `SchemaError` on drift
  - `function parseHueBinned(json: string): Record<string, Record<string, RawHueTerm>>`
  - `function parseBasicInfo(csv: string): RawBasicRow[]`
  - `class SchemaError extends Error`
  - `function upstreamUrl(path: string): string`
  - `function download(path: string): Promise<string>`

- [ ] **Step 1: Create the fixtures**

Create `packages/i18n/test/fixtures/uwdata/full_colors_binned.json` — a trimmed sample matching the upstream record shape:

```json
[
  {"lang":"Korean (한국어, 조선어)","langAbv":"ko","term":"파랑","commonTerm":"파란색","binL":11,"binA":-1,"binB":-4,"cnt":42,"pCT":0.31,"pTC":0.61},
  {"lang":"Korean (한국어, 조선어)","langAbv":"ko","term":"하늘","commonTerm":"하늘색","binL":11,"binA":-1,"binB":-4,"cnt":9,"pCT":0.08,"pTC":0.13},
  {"lang":"English (English)","langAbv":"en","term":"blue","commonTerm":"blue","binL":11,"binA":-1,"binB":-4,"cnt":501,"pCT":0.29,"pTC":0.77}
]
```

Create `packages/i18n/test/fixtures/uwdata/hue_colors_binned.json`:

```json
{
  "ar": {
    "أحمر": {
      "simplifiedName": "أحمر",
      "commonName": "أحمر",
      "totalColorFraction": 0.056,
      "cnt": 50,
      "bins": [{"cnt":32,"pCT":0.54,"pTC":0.54},{"cnt":4,"pCT":0.07,"pTC":0.09}]
    }
  }
}
```

Create `packages/i18n/test/fixtures/uwdata/basic_colors_info_ko.csv`:

```csv
lang,lang_abv,commonName,simplifiedName,numLineNames,avgHueRGBCode,numFullNames,avgFullColorRGBCode,avgFullL,avgFullA,avgFullB
"Korean (한국어, 조선어)",ko,파란색,파랑,120,"rgb(0, 47, 255)",406,"rgb(40,80,220)",0.5210,-0.0410,-0.1730
"Korean (한국어, 조선어)",ko,하늘색,하늘,44,"rgb(0, 160, 255)",210,"rgb(120,190,240)",0.7600,-0.0330,-0.0810
```

- [ ] **Step 2: Write the failing test**

Create `packages/i18n/test/scripts/fetch.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
  SchemaError,
  parseBasicInfo,
  parseFullBinned,
  parseHueBinned,
  upstreamUrl,
} from "../../scripts/sync-uwdata/fetch";

const fixture = (name: string) => Bun.file(`${import.meta.dir}/../fixtures/uwdata/${name}`).text();

describe("parseFullBinned", () => {
  it("parses upstream records", async () => {
    const records = parseFullBinned(await fixture("full_colors_binned.json"));
    expect(records).toHaveLength(3);
    expect(records[0]).toEqual({
      langAbv: "ko", term: "파랑", commonTerm: "파란색",
      binL: 11, binA: -1, binB: -4, pTC: 0.61,
    });
  });

  it("throws SchemaError naming the missing column", () => {
    const bad = JSON.stringify([{ langAbv: "ko", term: "파랑", binL: 1, binA: 1, binB: 1 }]);
    expect(() => parseFullBinned(bad)).toThrow(SchemaError);
    expect(() => parseFullBinned(bad)).toThrow(/pTC/);
  });

  it("throws SchemaError when the payload is not an array", () => {
    expect(() => parseFullBinned("{}")).toThrow(SchemaError);
  });
});

describe("parseHueBinned", () => {
  it("parses the nested lang -> term -> bins shape", async () => {
    const parsed = parseHueBinned(await fixture("hue_colors_binned.json"));
    expect(Object.keys(parsed)).toEqual(["ar"]);
    expect(parsed.ar?.["أحمر"]?.bins[0]?.pTC).toBe(0.54);
  });

  it("throws SchemaError when a term has no bins array", () => {
    const bad = JSON.stringify({ ar: { x: { simplifiedName: "x", commonName: "x" } } });
    expect(() => parseHueBinned(bad)).toThrow(/bins/);
  });
});

describe("parseBasicInfo", () => {
  it("parses quoted CSV with the Oklab centroid columns", async () => {
    const rows = parseBasicInfo(await fixture("basic_colors_info_ko.csv"));
    expect(rows).toHaveLength(2);
    expect(rows[0]?.simplifiedName).toBe("파랑");
    expect(rows[0]?.commonName).toBe("파란색");
    expect(rows[0]?.avgFullL).toBeCloseTo(0.521, 4);
    expect(rows[0]?.avgFullB).toBeCloseTo(-0.173, 4);
  });

  it("throws SchemaError when a required column is absent", () => {
    expect(() => parseBasicInfo("lang,lang_abv\nx,ko\n")).toThrow(/avgFullL/);
  });
});

describe("upstreamUrl", () => {
  it("pins the commit sha", () => {
    expect(upstreamUrl("model/lang_info.csv")).toBe(
      "https://raw.githubusercontent.com/uwdata/color-naming-in-different-languages/"
      + "f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5/model/lang_info.csv",
    );
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `bun test packages/i18n/test/scripts/fetch.test.ts`
Expected: FAIL — `Cannot find module '../../scripts/sync-uwdata/fetch'`.

- [ ] **Step 4: Write the fetcher**

Create `packages/i18n/scripts/sync-uwdata/fetch.ts`:

```ts
import { UWDATA_COMMIT } from "../../src/sources/uwdata/source";

/** Raised when upstream's shape no longer matches what the transform expects. */
export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemaError";
  }
}

export interface RawFullRecord {
  langAbv: string;
  term: string;
  commonTerm: string;
  binL: number;
  binA: number;
  binB: number;
  pTC: number;
}

export interface RawHueTerm {
  simplifiedName: string;
  commonName: string;
  bins: { pTC: number }[];
}

export interface RawBasicRow {
  lang_abv: string;
  commonName: string;
  simplifiedName: string;
  avgFullL: number;
  avgFullA: number;
  avgFullB: number;
}

const BASE = "https://raw.githubusercontent.com/uwdata/color-naming-in-different-languages";

export function upstreamUrl(path: string): string {
  return `${BASE}/${UWDATA_COMMIT}/${path}`;
}

export async function download(path: string): Promise<string> {
  const url = upstreamUrl(path);
  const response = await fetch(url);
  if (!response.ok) {
    throw new SchemaError(`Failed to download ${url}: HTTP ${response.status}`);
  }
  return response.text();
}

function requireKeys(record: Record<string, unknown>, keys: string[], where: string): void {
  const missing = keys.filter((key) => record[key] === undefined);
  if (missing.length > 0) {
    throw new SchemaError(
      `Upstream schema drift in ${where}: missing ${missing.join(", ")}. `
      + `Present keys: ${Object.keys(record).join(", ")}`,
    );
  }
}

export function parseFullBinned(json: string): RawFullRecord[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new SchemaError("Upstream schema drift in full_color_names_binned: expected an array.");
  }

  return parsed.map((raw, index) => {
    const record = raw as Record<string, unknown>;
    requireKeys(
      record,
      ["langAbv", "term", "commonTerm", "binL", "binA", "binB", "pTC"],
      `full_color_names_binned[${index}]`,
    );
    return {
      langAbv: String(record.langAbv),
      term: String(record.term),
      commonTerm: String(record.commonTerm),
      binL: Number(record.binL),
      binA: Number(record.binA),
      binB: Number(record.binB),
      pTC: Number(record.pTC),
    };
  });
}

export function parseHueBinned(json: string): Record<string, Record<string, RawHueTerm>> {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new SchemaError("Upstream schema drift in hue_color_names_binned: expected an object.");
  }

  const result: Record<string, Record<string, RawHueTerm>> = {};
  for (const [lang, termsRaw] of Object.entries(parsed as Record<string, unknown>)) {
    const terms: Record<string, RawHueTerm> = {};
    for (const [term, valueRaw] of Object.entries(termsRaw as Record<string, unknown>)) {
      const value = valueRaw as Record<string, unknown>;
      requireKeys(value, ["simplifiedName", "commonName", "bins"], `hue[${lang}][${term}]`);
      if (!Array.isArray(value.bins)) {
        throw new SchemaError(`Upstream schema drift in hue[${lang}][${term}]: bins is not an array.`);
      }
      terms[term] = {
        simplifiedName: String(value.simplifiedName),
        commonName: String(value.commonName),
        bins: value.bins.map((bin) => ({ pTC: Number((bin as Record<string, unknown>).pTC) })),
      };
    }
    result[lang] = terms;
  }
  return result;
}

/** Minimal RFC 4180 reader: handles quoted fields containing commas. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === "\"" && line[i + 1] === "\"") { current += "\""; i++; }
      else if (char === "\"") quoted = false;
      else current += char;
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

export function parseBasicInfo(csv: string): RawBasicRow[] {
  const lines = csv.split("\n").filter((line) => line.trim().length > 0);
  const headerLine = lines[0];
  if (headerLine === undefined) {
    throw new SchemaError("Upstream schema drift in basic_colors_info: file is empty.");
  }

  const header = parseCsvLine(headerLine);
  const required = ["lang_abv", "commonName", "simplifiedName", "avgFullL", "avgFullA", "avgFullB"];
  const missing = required.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    throw new SchemaError(
      `Upstream schema drift in basic_colors_info: missing ${missing.join(", ")}. `
      + `Present columns: ${header.join(", ")}`,
    );
  }

  const index = (column: string) => header.indexOf(column);
  return lines.slice(1).map((line) => {
    const fields = parseCsvLine(line);
    return {
      lang_abv: fields[index("lang_abv")] ?? "",
      commonName: fields[index("commonName")] ?? "",
      simplifiedName: fields[index("simplifiedName")] ?? "",
      avgFullL: Number(fields[index("avgFullL")]),
      avgFullA: Number(fields[index("avgFullA")]),
      avgFullB: Number(fields[index("avgFullB")]),
    };
  });
}
```

- [ ] **Step 5: Run the tests**

Run: `bun test packages/i18n/test/scripts/fetch.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Lint and commit**

```bash
bun run lint
git add packages/i18n
git commit -m "feat(i18n): add uwdata download and schema validation"
```

---

### Task 5: Transform upstream records into chunks

**Files:**
- Create: `packages/i18n/scripts/sync-uwdata/transform.ts`
- Test: `packages/i18n/test/scripts/transform.test.ts`

**Interfaces:**
- Consumes: `RawFullRecord`, `RawHueTerm`, `RawBasicRow` from Task 4; `FullChunk`, `HueChunk`, `LanguageCoverage` from Task 3.
- Produces:
  - `const FULL_BIN_SIZE = 0.05`
  - `const HUE_BIN_COUNT = 72`
  - `function buildFullChunk(lang: string, records: RawFullRecord[], centroids: RawBasicRow[]): FullChunk`
  - `function buildHueChunk(lang: string, terms: Record<string, RawHueTerm>, centroids: RawBasicRow[]): HueChunk`
  - `function chunkCoverage(chunk: FullChunk | HueChunk): LanguageCoverage`

- [ ] **Step 1: Write the failing test**

Create `packages/i18n/test/scripts/transform.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { parseBasicInfo, parseFullBinned, parseHueBinned } from "../../scripts/sync-uwdata/fetch";
import { buildFullChunk, buildHueChunk, chunkCoverage } from "../../scripts/sync-uwdata/transform";

const fixture = (name: string) => Bun.file(`${import.meta.dir}/../fixtures/uwdata/${name}`).text();

describe("buildFullChunk", () => {
  it("groups records into bins with a shared term table", async () => {
    const records = parseFullBinned(await fixture("full_colors_binned.json"));
    const centroids = parseBasicInfo(await fixture("basic_colors_info_ko.csv"));
    const chunk = buildFullChunk("ko", records.filter((r) => r.langAbv === "ko"), centroids);

    expect(chunk.model).toBe("full");
    expect(chunk.binSize).toBe(0.05);
    expect(chunk.terms.map((t) => t[0])).toEqual(["파랑", "하늘"]);
    expect(chunk.terms[0]?.[1]).toBe("파란색");
    expect(chunk.terms[0]?.[2]).toEqual([0.521, -0.041, -0.173]);
    expect(chunk.bins["11,-1,-4"]).toEqual([[0, 0.61], [1, 0.13]]);
  });

  it("sorts each bin's candidates by descending probability", async () => {
    const records = parseFullBinned(await fixture("full_colors_binned.json"));
    const chunk = buildFullChunk("ko", records.filter((r) => r.langAbv === "ko"), []);
    const bin = chunk.bins["11,-1,-4"] ?? [];
    expect(bin[0]?.[1]).toBeGreaterThan(bin[1]?.[1] ?? 1);
  });

  it("leaves the centroid null when the term is missing from basic info", async () => {
    const records = parseFullBinned(await fixture("full_colors_binned.json"));
    const chunk = buildFullChunk("en", records.filter((r) => r.langAbv === "en"), []);
    expect(chunk.terms[0]?.[2]).toBeNull();
  });
});

describe("buildHueChunk", () => {
  it("expands each term's bin array into per-bin candidate lists", async () => {
    const parsed = parseHueBinned(await fixture("hue_colors_binned.json"));
    const chunk = buildHueChunk("ar", parsed.ar ?? {}, []);

    expect(chunk.model).toBe("hue");
    expect(chunk.binCount).toBe(72);
    expect(chunk.binTerms).toHaveLength(72);
    expect(chunk.binTerms[0]).toEqual([[0, 0.54]]);
    expect(chunk.binTerms[1]).toEqual([[0, 0.09]]);
    expect(chunk.binTerms[2]).toEqual([]);
  });
});

describe("chunkCoverage", () => {
  it("reports term count and populated-bin fraction", async () => {
    const parsed = parseHueBinned(await fixture("hue_colors_binned.json"));
    const coverage = chunkCoverage(buildHueChunk("ar", parsed.ar ?? {}, []));
    expect(coverage.model).toBe("hue");
    expect(coverage.terms).toBe(1);
    expect(coverage.coverage).toBeCloseTo(2 / 72, 5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/i18n/test/scripts/transform.test.ts`
Expected: FAIL — `Cannot find module '../../scripts/sync-uwdata/transform'`.

- [ ] **Step 3: Write the transform**

Create `packages/i18n/scripts/sync-uwdata/transform.ts`:

```ts
import type { FullChunk, HueChunk, LanguageCoverage, TermEntry } from "../../src/engine/types";
import type { RawBasicRow, RawFullRecord, RawHueTerm } from "./fetch";

/** Oklab edge length of one bin in `full_color_names_binned_0.05.json`. */
export const FULL_BIN_SIZE = 0.05;

/** Bin count in `hue_color_names_binned_72.json`. */
export const HUE_BIN_COUNT = 72;

function centroidIndex(centroids: RawBasicRow[]): Map<string, [number, number, number]> {
  const map = new Map<string, [number, number, number]>();
  for (const row of centroids) {
    if (Number.isFinite(row.avgFullL) && Number.isFinite(row.avgFullA) && Number.isFinite(row.avgFullB)) {
      map.set(row.simplifiedName, [row.avgFullL, row.avgFullA, row.avgFullB]);
    }
  }
  return map;
}

/** Interns terms into a shared table so bins can reference them by index. */
class TermTable {
  readonly entries: TermEntry[] = [];
  readonly #indices = new Map<string, number>();

  constructor(private readonly centroids: Map<string, [number, number, number]>) {}

  indexOf(term: string, name: string): number {
    const existing = this.#indices.get(term);
    if (existing !== undefined) return existing;

    const index = this.entries.length;
    this.entries.push([term, name, this.centroids.get(term) ?? null]);
    this.#indices.set(term, index);
    return index;
  }
}

export function buildFullChunk(
  lang: string,
  records: RawFullRecord[],
  centroids: RawBasicRow[],
): FullChunk {
  const table = new TermTable(centroidIndex(centroids));
  const bins: Record<string, [number, number][]> = {};

  for (const record of records) {
    const key = `${record.binL},${record.binA},${record.binB}`;
    const index = table.indexOf(record.term, record.commonTerm);
    (bins[key] ??= []).push([index, record.pTC]);
  }

  for (const candidates of Object.values(bins)) {
    candidates.sort((a, b) => b[1] - a[1]);
  }

  return { lang, model: "full", binSize: FULL_BIN_SIZE, terms: table.entries, bins };
}

export function buildHueChunk(
  lang: string,
  terms: Record<string, RawHueTerm>,
  centroids: RawBasicRow[],
): HueChunk {
  const table = new TermTable(centroidIndex(centroids));
  const binTerms: [number, number][][] = Array.from({ length: HUE_BIN_COUNT }, () => []);

  for (const [term, value] of Object.entries(terms)) {
    const index = table.indexOf(term, value.commonName);
    value.bins.forEach((bin, binIndex) => {
      if (binIndex >= HUE_BIN_COUNT || !(bin.pTC > 0)) return;
      binTerms[binIndex]?.push([index, bin.pTC]);
    });
  }

  for (const candidates of binTerms) {
    candidates.sort((a, b) => b[1] - a[1]);
  }

  return { lang, model: "hue", binCount: HUE_BIN_COUNT, terms: table.entries, binTerms };
}

export function chunkCoverage(chunk: FullChunk | HueChunk): LanguageCoverage {
  if (chunk.model === "hue") {
    const populated = chunk.binTerms.filter((candidates) => candidates.length > 0).length;
    return { model: "hue", terms: chunk.terms.length, coverage: populated / chunk.binCount };
  }

  // For the full model there is no single "total bin count" — the Oklab cube is
  // not fully realisable in sRGB. Report populated bins against the number of
  // bins that would tile the sRGB-reachable portion of Oklab, approximated as
  // L in [0,1], a and b in [-0.4, 0.4].
  const perAxis = Math.round(0.8 / chunk.binSize);
  const total = Math.round(1 / chunk.binSize) * perAxis * perAxis;
  return {
    model: "full",
    terms: chunk.terms.length,
    coverage: Object.keys(chunk.bins).length / total,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test packages/i18n/test/scripts/transform.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Lint and commit**

```bash
bun run lint
git add packages/i18n
git commit -m "feat(i18n): transform uwdata records into per-language chunks"
```

---

### Task 6: Sync CLI — write chunks, manifest, and meta

**Files:**
- Create: `packages/i18n/scripts/sync-uwdata/main.ts`
- Test: `packages/i18n/test/scripts/main.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 4 and 5.
- Produces:
  - `const FULL_LANGS: string[]` (14 entries), `const HUE_LANGS: string[]` (27 entries)
  - `interface SyncOutput { chunks: Map<string, FullChunk | HueChunk>; meta: SyncMeta }`
  - `interface SyncMeta { source: "uwdata"; commitSha: string; generatedAt: string; binSize: number; hueBinCount: number; languages: Record<string, LanguageCoverage> }`
  - `function buildOutput(inputs: SyncInputs, generatedAt: string): SyncOutput` — pure, testable
  - `function renderChunkModule(chunk): string`, `function renderManifest(locales: string[]): string`
  - `async function main(): Promise<void>` — downloads, builds, writes, reports

- [ ] **Step 1: Write the failing test**

Create `packages/i18n/test/scripts/main.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { parseBasicInfo, parseFullBinned, parseHueBinned } from "../../scripts/sync-uwdata/fetch";
import { buildOutput, renderChunkModule, renderManifest } from "../../scripts/sync-uwdata/main";

const fixture = (name: string) => Bun.file(`${import.meta.dir}/../fixtures/uwdata/${name}`).text();

async function inputs() {
  const ko = parseBasicInfo(await fixture("basic_colors_info_ko.csv"));
  return {
    full: parseFullBinned(await fixture("full_colors_binned.json")),
    hue: parseHueBinned(await fixture("hue_colors_binned.json")),
    centroids: new Map([["ko", ko]]),
  };
}

describe("buildOutput", () => {
  it("emits one chunk per language present in the inputs", async () => {
    const output = buildOutput(await inputs(), "2026-07-19T00:00:00.000Z");
    expect([...output.chunks.keys()].sort()).toEqual(["ar", "en", "ko"]);
    expect(output.chunks.get("ko")?.model).toBe("full");
    expect(output.chunks.get("ar")?.model).toBe("hue");
  });

  it("records pinned revision and per-language coverage in meta", async () => {
    const output = buildOutput(await inputs(), "2026-07-19T00:00:00.000Z");
    expect(output.meta.commitSha).toBe("f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5");
    expect(output.meta.generatedAt).toBe("2026-07-19T00:00:00.000Z");
    expect(output.meta.languages.ko?.model).toBe("full");
    expect(output.meta.languages.ko?.terms).toBe(2);
  });

  it("ignores languages outside the declared model lists", async () => {
    const base = await inputs();
    const output = buildOutput(
      { ...base, full: [...base.full, { ...base.full[0]!, langAbv: "zz" }] },
      "2026-07-19T00:00:00.000Z",
    );
    expect(output.chunks.has("zz")).toBe(false);
  });
});

describe("renderChunkModule", () => {
  it("emits a default-exporting ES module", async () => {
    const output = buildOutput(await inputs(), "2026-07-19T00:00:00.000Z");
    const source = renderChunkModule(output.chunks.get("ko")!);
    expect(source).toStartWith("// Generated by scripts/sync-uwdata");
    expect(source).toContain("export default");
    expect(source).toContain("\"model\": \"full\"");
  });
});

describe("renderManifest", () => {
  it("emits a static lazy-import map", () => {
    const source = renderManifest(["ko", "ar"]);
    expect(source).toContain("\"ko\": () => import(\"../../data/uwdata/ko.js\")");
    expect(source).toContain("\"ar\": () => import(\"../../data/uwdata/ar.js\")");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/i18n/test/scripts/main.test.ts`
Expected: FAIL — `Cannot find module '../../scripts/sync-uwdata/main'`.

- [ ] **Step 3: Write the CLI**

Create `packages/i18n/scripts/sync-uwdata/main.ts`:

```ts
import { mkdir, rm, writeFile } from "node:fs/promises";
import { UWDATA_COMMIT } from "../../src/sources/uwdata/source";
import type { FullChunk, HueChunk, LanguageCoverage } from "../../src/engine/types";
import {
  download,
  parseBasicInfo,
  parseFullBinned,
  parseHueBinned,
  type RawBasicRow,
  type RawFullRecord,
  type RawHueTerm,
} from "./fetch";
import {
  FULL_BIN_SIZE,
  HUE_BIN_COUNT,
  buildFullChunk,
  buildHueChunk,
  chunkCoverage,
} from "./transform";

export const FULL_LANGS = [
  "de", "en", "es", "fa", "fi", "fr", "ko", "nl", "pl", "pt", "ro", "ru", "sv", "zh",
];

export const HUE_LANGS = [
  "ar", "bg", "ca", "cs", "da", "el", "et", "he", "hi", "hr", "hu", "id", "it", "ja",
  "ka", "lt", "mk", "ms", "nb", "sk", "sl", "sr", "th", "tr", "uk", "ur", "vi",
];

const FULL_PATH = "model/binned_full_colors/full_color_names_binned_0.05.json";
const HUE_PATH = "model/binned_hue_colors/hue_color_names_binned_72.json";
const BASIC_PATH = (lang: string) => `model/color_info_by_lang/basic_colors_info_${lang}.csv`;

const DATA_DIR = new URL("../../src/data/uwdata/", import.meta.url);
const MANIFEST_PATH = new URL("../../src/sources/uwdata/chunks.ts", import.meta.url);

export interface SyncInputs {
  full: RawFullRecord[];
  hue: Record<string, Record<string, RawHueTerm>>;
  centroids: Map<string, RawBasicRow[]>;
}

export interface SyncMeta {
  source: "uwdata";
  commitSha: string;
  generatedAt: string;
  binSize: number;
  hueBinCount: number;
  languages: Record<string, LanguageCoverage>;
}

export interface SyncOutput {
  chunks: Map<string, FullChunk | HueChunk>;
  meta: SyncMeta;
}

export function buildOutput(inputs: SyncInputs, generatedAt: string): SyncOutput {
  const chunks = new Map<string, FullChunk | HueChunk>();
  const languages: Record<string, LanguageCoverage> = {};

  const byLang = new Map<string, RawFullRecord[]>();
  for (const record of inputs.full) {
    if (!FULL_LANGS.includes(record.langAbv)) continue;
    const bucket = byLang.get(record.langAbv);
    if (bucket === undefined) byLang.set(record.langAbv, [record]);
    else bucket.push(record);
  }

  for (const [lang, records] of byLang) {
    const chunk = buildFullChunk(lang, records, inputs.centroids.get(lang) ?? []);
    chunks.set(lang, chunk);
    languages[lang] = chunkCoverage(chunk);
  }

  for (const [lang, terms] of Object.entries(inputs.hue)) {
    if (!HUE_LANGS.includes(lang)) continue;
    const chunk = buildHueChunk(lang, terms, inputs.centroids.get(lang) ?? []);
    chunks.set(lang, chunk);
    languages[lang] = chunkCoverage(chunk);
  }

  return {
    chunks,
    meta: {
      source: "uwdata",
      commitSha: UWDATA_COMMIT,
      generatedAt,
      binSize: FULL_BIN_SIZE,
      hueBinCount: HUE_BIN_COUNT,
      languages,
    },
  };
}

export function renderChunkModule(chunk: FullChunk | HueChunk): string {
  return [
    "// Generated by scripts/sync-uwdata. Do not edit by hand.",
    `export default ${JSON.stringify(chunk)};`,
    "",
  ].join("\n");
}

export function renderManifest(locales: string[]): string {
  const entries = [...locales]
    .sort()
    .map((locale) => `  "${locale}": () => import("../../data/uwdata/${locale}.js"),`)
    .join("\n");

  return [
    "// Generated by scripts/sync-uwdata. Do not edit by hand.",
    "import type { ChunkLoaders } from \"../../engine/types\";",
    "",
    "export const uwdataChunks: ChunkLoaders = {",
    entries,
    "};",
    "",
  ].join("\n");
}

export async function main(): Promise<void> {
  console.log(`Syncing uwdata at ${UWDATA_COMMIT}…`);

  const [fullJson, hueJson] = await Promise.all([download(FULL_PATH), download(HUE_PATH)]);
  const full = parseFullBinned(fullJson);
  const hue = parseHueBinned(hueJson);

  const centroids = new Map<string, RawBasicRow[]>();
  for (const lang of [...FULL_LANGS, ...HUE_LANGS]) {
    try {
      centroids.set(lang, parseBasicInfo(await download(BASIC_PATH(lang))));
    } catch {
      console.warn(`  no basic_colors_info for ${lang}; centroids will be null`);
    }
  }

  const output = buildOutput({ full, hue, centroids }, new Date().toISOString());

  await rm(DATA_DIR, { recursive: true, force: true });
  await mkdir(DATA_DIR, { recursive: true });

  const sizes: [string, number][] = [];
  for (const [lang, chunk] of output.chunks) {
    const source = renderChunkModule(chunk);
    await writeFile(new URL(`${lang}.js`, DATA_DIR), source, "utf8");
    sizes.push([lang, Buffer.byteLength(source, "utf8")]);
  }

  await writeFile(
    new URL("meta.json", DATA_DIR),
    `${JSON.stringify(output.meta, null, 2)}\n`,
    "utf8",
  );
  await writeFile(MANIFEST_PATH, renderManifest([...output.chunks.keys()]), "utf8");

  sizes.sort((a, b) => b[1] - a[1]);
  console.log(`\nWrote ${sizes.length} chunks:`);
  for (const [lang, bytes] of sizes) {
    const coverage = output.meta.languages[lang];
    console.log(
      `  ${lang.padEnd(4)} ${(bytes / 1024).toFixed(0).padStart(5)} KB  `
      + `${coverage?.model ?? "?"}  ${coverage?.terms ?? 0} terms  `
      + `${((coverage?.coverage ?? 0) * 100).toFixed(1)}% coverage`,
    );
  }
  console.log(`\nTotal: ${(sizes.reduce((sum, [, b]) => sum + b, 0) / 1024 / 1024).toFixed(2)} MB`);
}

if (import.meta.main) {
  await main();
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test packages/i18n/test/scripts/main.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Lint and commit**

```bash
bun run lint
git add packages/i18n
git commit -m "feat(i18n): add the uwdata sync CLI"
```

---

### Task 7: Run the sync, wire the manifest, calibrate the bin quantiser

Upstream does not document whether `binL` is `floor(L / binSize)` or `round(L / binSize)`. Rather than guess, this task derives it empirically and locks the answer in with a test. This is the highest-risk task in the plan; do not skip the calibration.

**Files:**
- Create: `packages/i18n/src/data/uwdata/*.js`, `packages/i18n/src/data/uwdata/meta.json` (generated)
- Create: `packages/i18n/src/sources/uwdata/chunks.ts` (generated)
- Create: `packages/i18n/scripts/calibrate-bins.ts`
- Modify: `packages/i18n/src/sources/uwdata/source.ts`
- Modify: `packages/i18n/src/index.ts`
- Test: `packages/i18n/test/data.test.ts`

**Interfaces:**
- Consumes: the sync CLI from Task 6.
- Produces:
  - `const uwdataChunks: ChunkLoaders` — generated, exported from `src/sources/uwdata/chunks.ts`
  - `src/data/uwdata/meta.json` — the generated `SyncMeta`
  - A confirmed quantisation rule, recorded as `QUANTIZE_MODE` in Task 8.

- [ ] **Step 1: Run the sync for real**

Run: `bun run --cwd packages/i18n sync:uwdata`
Expected: chunk files under `packages/i18n/src/data/uwdata/`, a size report, and a generated `src/sources/uwdata/chunks.ts`. English should be the largest chunk. If any download 404s, the upstream path has moved — fix the constant in `main.ts` before continuing.

- [ ] **Step 2: Write the calibration script**

Create `packages/i18n/scripts/calibrate-bins.ts`. It takes each term's average Oklab colour from the generated centroids, quantises it both ways, and reports which rule more often lands in a bin that actually contains that term.

```ts
import meta from "../src/data/uwdata/meta.json";
import type { FullChunk } from "../src/engine/types";

const MODES = ["floor", "round"] as const;
type Mode = (typeof MODES)[number];

function quantize(value: number, size: number, mode: Mode): number {
  return mode === "floor" ? Math.floor(value / size) : Math.round(value / size);
}

const results: Record<Mode, { hit: number; total: number }> = {
  floor: { hit: 0, total: 0 },
  round: { hit: 0, total: 0 },
};

for (const [lang, coverage] of Object.entries(meta.languages)) {
  if (coverage.model !== "full") continue;
  const chunk = (await import(`../src/data/uwdata/${lang}.js`)).default as FullChunk;

  chunk.terms.forEach(([, , centroid], termIndex) => {
    if (centroid === null) return;
    const [l, a, b] = centroid;

    for (const mode of MODES) {
      const key = [
        quantize(l, chunk.binSize, mode),
        quantize(a, chunk.binSize, mode),
        quantize(b, chunk.binSize, mode),
      ].join(",");
      results[mode].total++;
      if (chunk.bins[key]?.some(([index]) => index === termIndex) === true) {
        results[mode].hit++;
      }
    }
  });
}

for (const mode of MODES) {
  const { hit, total } = results[mode];
  console.log(`${mode}: ${hit}/${total} = ${((hit / total) * 100).toFixed(1)}%`);
}
```

- [ ] **Step 3: Run the calibration**

Run: `bun run --cwd packages/i18n scripts/calibrate-bins.ts`
Expected: one mode scores materially higher (target: above 85%; the other should be well below). Record the winner — it becomes `QUANTIZE_MODE` in Task 8.

If **both** modes score below 60%, upstream is not using a plain `value / binSize` quantiser. Stop and inspect `model/color_info_pre_naming/` for the bin geometry before continuing; do not proceed on a guess.

- [ ] **Step 4: Write the data test**

Create `packages/i18n/test/data.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import meta from "../src/data/uwdata/meta.json";
import { uwdataChunks } from "../src/sources/uwdata/chunks";
import type { FullChunk, HueChunk } from "../src/engine/types";

const FULL_LANGS = ["de", "en", "es", "fa", "fi", "fr", "ko", "nl", "pl", "pt", "ro", "ru", "sv", "zh"];

describe("generated uwdata data", () => {
  it("pins the expected upstream revision", () => {
    expect(meta.commitSha).toBe("f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5");
  });

  it("ships all 14 full-model languages", () => {
    for (const lang of FULL_LANGS) {
      expect(meta.languages[lang as keyof typeof meta.languages]?.model).toBe("full");
    }
  });

  it("ships at least 35 languages in total", () => {
    expect(Object.keys(meta.languages).length).toBeGreaterThanOrEqual(35);
  });

  it("has a loader for every language in meta", () => {
    for (const lang of Object.keys(meta.languages)) {
      expect(uwdataChunks[lang]).toBeFunction();
    }
  });

  it("loads English with a well-formed full chunk", async () => {
    const chunk = (await uwdataChunks.en!()).default as FullChunk;
    expect(chunk.model).toBe("full");
    expect(chunk.binSize).toBe(0.05);
    expect(chunk.terms.length).toBeGreaterThan(50);
    expect(Object.keys(chunk.bins).length).toBeGreaterThan(500);
  });

  it("loads Arabic with a well-formed hue chunk", async () => {
    const chunk = (await uwdataChunks.ar!()).default as HueChunk;
    expect(chunk.model).toBe("hue");
    expect(chunk.binCount).toBe(72);
    expect(chunk.binTerms).toHaveLength(72);
  });

  it("keeps every chunk under 400 KB", async () => {
    for (const lang of Object.keys(meta.languages)) {
      const bytes = Bun.file(`${import.meta.dir}/../src/data/uwdata/${lang}.js`).size;
      expect(bytes).toBeLessThan(400 * 1024);
    }
  });
});
```

- [ ] **Step 5: Run the test**

Run: `bun test packages/i18n/test/data.test.ts`
Expected: PASS. If the 400 KB assertion fails for English, raise the ceiling to the real value plus 15% and note it — do not delete the assertion; its purpose is to catch a future data update silently inflating the bundle.

- [ ] **Step 6: Wire the generated coverage into the descriptor**

Modify `packages/i18n/src/sources/uwdata/source.ts`. Replace `languages: {}` with the generated meta, and add the import at the top:

```ts
import type { NameSource } from "../../engine/types";
import meta from "../../data/uwdata/meta.json";
```

```ts
  languages: meta.languages as NameSource["languages"],
```

- [ ] **Step 7: Wire the manifest into registration**

Modify `packages/i18n/src/index.ts`. Replace the `registerSource(uwdataSource, {});` line:

```ts
import { registerSource } from "./engine/registry";
import { uwdataSource } from "./sources/uwdata/source";
import { uwdataChunks } from "./sources/uwdata/chunks";

registerSource(uwdataSource, uwdataChunks);
```

- [ ] **Step 8: Ignore generated data from lint**

Modify `eslint.config.js` at the repo root. Add `"packages/i18n/src/data/**"` and `"packages/i18n/src/sources/uwdata/chunks.ts"` to the existing global `ignores` array, alongside the `storybook-static` entry added in commit `48be10b`.

- [ ] **Step 9: Verify everything**

Run: `bun test packages/i18n/ && bun run lint && bun run --cwd packages/i18n build`
Expected: all green.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(i18n): generate uwdata color-name data at f0d3e30"
```

---

### Task 8: Full-model lookup engine

**Files:**
- Create: `packages/i18n/src/engine/lookup-full.ts`
- Test: `packages/i18n/test/engine/lookup-full.test.ts`

**Interfaces:**
- Consumes: `FullChunk` from Task 3; the calibrated quantisation rule from Task 7.
- Produces:
  - `interface Candidate { name: string; term: string; probability: number }`
  - `interface BinMatch { candidates: Candidate[]; coverage: "exact" | "nearest" | "none"; binDistance: number }`
  - `function lookupFull(chunk: FullChunk, oklab: [number, number, number], options: { topN: number; maxDistance: number }): BinMatch`

- [ ] **Step 1: Write the failing test**

Create `packages/i18n/test/engine/lookup-full.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { lookupFull } from "../../src/engine/lookup-full";
import type { FullChunk } from "../../src/engine/types";

const chunk: FullChunk = {
  lang: "ko",
  model: "full",
  binSize: 0.05,
  terms: [
    ["파랑", "파란색", [0.52, -0.04, -0.17]],
    ["하늘", "하늘색", [0.76, -0.03, -0.08]],
  ],
  // Bin 10,-1,-3 is populated; its neighbour 11,-1,-3 is not.
  bins: { "10,-1,-3": [[0, 0.61], [1, 0.13]] },
};

const options = { topN: 5, maxDistance: 0.075 };

describe("lookupFull", () => {
  it("resolves a colour inside a populated bin exactly", () => {
    const match = lookupFull(chunk, [0.5, -0.05, -0.15], options);
    expect(match.coverage).toBe("exact");
    expect(match.binDistance).toBe(0);
    expect(match.candidates[0]).toEqual({ name: "파란색", term: "파랑", probability: 0.61 });
  });

  it("orders candidates by descending probability", () => {
    const match = lookupFull(chunk, [0.5, -0.05, -0.15], options);
    expect(match.candidates.map((c) => c.term)).toEqual(["파랑", "하늘"]);
  });

  it("honours topN", () => {
    const match = lookupFull(chunk, [0.5, -0.05, -0.15], { ...options, topN: 1 });
    expect(match.candidates).toHaveLength(1);
  });

  it("falls back to the nearest populated bin", () => {
    const match = lookupFull(chunk, [0.56, -0.05, -0.15], options);
    expect(match.coverage).toBe("nearest");
    expect(match.binDistance).toBeGreaterThan(0);
    expect(match.binDistance).toBeLessThanOrEqual(0.075);
    expect(match.candidates[0]?.term).toBe("파랑");
  });

  it("reports no coverage beyond maxDistance", () => {
    const match = lookupFull(chunk, [0.95, 0.3, 0.3], options);
    expect(match.coverage).toBe("none");
    expect(match.candidates).toEqual([]);
  });

  it("respects a maxDistance of zero as exact-only", () => {
    const match = lookupFull(chunk, [0.56, -0.05, -0.15], { ...options, maxDistance: 0 });
    expect(match.coverage).toBe("none");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/i18n/test/engine/lookup-full.test.ts`
Expected: FAIL — `Cannot find module '../../src/engine/lookup-full'`.

- [ ] **Step 3: Write the engine**

Create `packages/i18n/src/engine/lookup-full.ts`. **Set `QUANTIZE_MODE` to whichever rule won Task 7's calibration** — the code below assumes `"round"`; change the constant and the `quantize` body if `"floor"` won.

```ts
import type { FullChunk } from "./types";

/** Determined empirically in scripts/calibrate-bins.ts against upstream data. */
const QUANTIZE_MODE: "round" | "floor" = "round";

export interface Candidate {
  name: string;
  term: string;
  probability: number;
}

export interface BinMatch {
  candidates: Candidate[];
  coverage: "exact" | "nearest" | "none";
  /** Oklab distance from the query to the centre of the bin actually used. */
  binDistance: number;
}

export interface LookupOptions {
  topN: number;
  maxDistance: number;
}

function quantize(value: number, size: number): number {
  return QUANTIZE_MODE === "round" ? Math.round(value / size) : Math.floor(value / size);
}

function binCentre(index: number, size: number): number {
  return QUANTIZE_MODE === "round" ? index * size : (index + 0.5) * size;
}

const EMPTY: BinMatch = { candidates: [], coverage: "none", binDistance: Number.POSITIVE_INFINITY };

function toCandidates(
  chunk: FullChunk,
  pairs: [number, number][],
  topN: number,
): Candidate[] {
  return pairs.slice(0, topN).flatMap(([termIndex, probability]) => {
    const entry = chunk.terms[termIndex];
    return entry === undefined ? [] : [{ term: entry[0], name: entry[1], probability }];
  });
}

export function lookupFull(
  chunk: FullChunk,
  oklab: [number, number, number],
  options: LookupOptions,
): BinMatch {
  const [l, a, b] = oklab;
  const size = chunk.binSize;
  const origin: [number, number, number] = [
    quantize(l, size),
    quantize(a, size),
    quantize(b, size),
  ];

  const exact = chunk.bins[origin.join(",")];
  if (exact !== undefined) {
    return { candidates: toCandidates(chunk, exact, options.topN), coverage: "exact", binDistance: 0 };
  }

  if (!(options.maxDistance > 0)) return EMPTY;

  const radius = Math.ceil(options.maxDistance / size);
  let best: { pairs: [number, number][]; distance: number } | undefined;

  for (let dl = -radius; dl <= radius; dl++) {
    for (let da = -radius; da <= radius; da++) {
      for (let db = -radius; db <= radius; db++) {
        if (dl === 0 && da === 0 && db === 0) continue;

        const key = `${origin[0] + dl},${origin[1] + da},${origin[2] + db}`;
        const pairs = chunk.bins[key];
        if (pairs === undefined) continue;

        const distance = Math.hypot(
          binCentre(origin[0] + dl, size) - l,
          binCentre(origin[1] + da, size) - a,
          binCentre(origin[2] + db, size) - b,
        );
        if (distance > options.maxDistance) continue;
        if (best === undefined || distance < best.distance) best = { pairs, distance };
      }
    }
  }

  if (best === undefined) return EMPTY;
  return {
    candidates: toCandidates(chunk, best.pairs, options.topN),
    coverage: "nearest",
    binDistance: best.distance,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test packages/i18n/test/engine/lookup-full.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Lint and commit**

```bash
bun run lint
git add packages/i18n
git commit -m "feat(i18n): add full-colour-space bin lookup with nearest fallback"
```

---

### Task 9: Hue-model lookup engine

**Files:**
- Create: `packages/i18n/src/engine/lookup-hue.ts`
- Test: `packages/i18n/test/engine/lookup-hue.test.ts`

**Interfaces:**
- Consumes: `HueChunk` from Task 3; `Candidate`, `BinMatch`, `LookupOptions` from Task 8; `Color` from `@urcolor/core`.
- Produces:
  - `interface HueMatch extends BinMatch { hueProjectionDistance: number }`
  - `function lookupHue(chunk: HueChunk, color: Color, options: LookupOptions & { maxHueDistance: number }): HueMatch`

- [ ] **Step 1: Write the failing test**

Create `packages/i18n/test/engine/lookup-hue.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { Color } from "@urcolor/core";
import { lookupHue } from "../../src/engine/lookup-hue";
import type { HueChunk } from "../../src/engine/types";

// 72 bins over 360°, so bin 0 covers 0–5° (red) and bin 48 covers 240–245° (blue).
const chunk: HueChunk = {
  lang: "ar",
  model: "hue",
  binCount: 72,
  terms: [["أحمر", "أحمر", null], ["أزرق", "أزرق", null]],
  binTerms: Array.from({ length: 72 }, (_, index) => {
    if (index === 0) return [[0, 0.54]] as [number, number][];
    if (index === 48) return [[1, 0.71]] as [number, number][];
    return [] as [number, number][];
  }),
};

const options = { topN: 5, maxDistance: 0.075, maxHueDistance: 0.2 };

describe("lookupHue", () => {
  it("names a saturated red", () => {
    const match = lookupHue(chunk, Color.parse("#ff0000")!, options);
    expect(match.coverage).toBe("exact");
    expect(match.candidates[0]?.term).toBe("أحمر");
    expect(match.hueProjectionDistance).toBeLessThan(0.05);
  });

  it("names a saturated blue", () => {
    const match = lookupHue(chunk, Color.parse("#0000ff")!, options);
    expect(match.candidates[0]?.term).toBe("أزرق");
  });

  it("reports no coverage for an unpopulated hue", () => {
    const match = lookupHue(chunk, Color.parse("#00ff00")!, options);
    expect(match.coverage).toBe("none");
    expect(match.candidates).toEqual([]);
  });

  it("reports no coverage for grey, which has no meaningful hue", () => {
    const match = lookupHue(chunk, Color.parse("#808080")!, options);
    expect(match.coverage).toBe("none");
    expect(match.hueProjectionDistance).toBeGreaterThan(options.maxHueDistance);
  });

  it("reports no coverage for a desaturated pastel far from the hue line", () => {
    const match = lookupHue(chunk, Color.parse("#ffd9d9")!, options);
    expect(match.coverage).toBe("none");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/i18n/test/engine/lookup-hue.test.ts`
Expected: FAIL — `Cannot find module '../../src/engine/lookup-hue'`.

- [ ] **Step 3: Write the engine**

Create `packages/i18n/src/engine/lookup-hue.ts`:

```ts
import { Color } from "@urcolor/core";
import type { BinMatch, Candidate, LookupOptions } from "./lookup-full";
import type { HueChunk } from "./types";

export interface HueMatch extends BinMatch {
  /**
   * Oklab distance from the query to the fully saturated colour at the same
   * hue. The hue model only describes the saturated hue ring, so a large value
   * means the model has nothing meaningful to say about this colour.
   */
  hueProjectionDistance: number;
}

export interface HueLookupOptions extends LookupOptions {
  /** Beyond this Oklab distance from the hue ring, report no coverage. */
  maxHueDistance: number;
}

function oklabOf(color: Color): [number, number, number] {
  const [l, a, b] = color.to("oklab").coords;
  return [l ?? 0, a ?? 0, b ?? 0];
}

export function lookupHue(
  chunk: HueChunk,
  color: Color,
  options: HueLookupOptions,
): HueMatch {
  const hsl = color.to("hsl");
  const hue = ((hsl.coords[0] ?? 0) % 360 + 360) % 360;

  // The saturated reference colour at this hue — what the hue model describes.
  const reference = Color.fromHsl(hue, 100, 50);
  const [ql, qa, qb] = oklabOf(color);
  const [rl, ra, rb] = oklabOf(reference);
  const hueProjectionDistance = Math.hypot(ql - rl, qa - ra, qb - rb);

  const none: HueMatch = {
    candidates: [],
    coverage: "none",
    binDistance: Number.POSITIVE_INFINITY,
    hueProjectionDistance,
  };

  if (hueProjectionDistance > options.maxHueDistance) return none;

  const bin = Math.floor((hue / 360) * chunk.binCount) % chunk.binCount;
  const pairs = chunk.binTerms[bin];
  if (pairs === undefined || pairs.length === 0) return none;

  const candidates: Candidate[] = pairs.slice(0, options.topN).flatMap(([termIndex, probability]) => {
    const entry = chunk.terms[termIndex];
    return entry === undefined ? [] : [{ term: entry[0], name: entry[1], probability }];
  });

  return { candidates, coverage: "exact", binDistance: 0, hueProjectionDistance };
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test packages/i18n/test/engine/lookup-hue.test.ts`
Expected: PASS, 5 tests. If the grey case fails because `hueProjectionDistance` came out below `0.2`, raise `maxHueDistance`'s default until grey and pastels are excluded while `#ff0000` still resolves — then use that value as the default in Task 10.

- [ ] **Step 5: Lint and commit**

```bash
bun run lint
git add packages/i18n
git commit -m "feat(i18n): add hue-circle lookup with projection-distance gating"
```

---

### Task 10: The `ColorNames` class

**Files:**
- Create: `packages/i18n/src/color-names.ts`
- Modify: `packages/i18n/src/index.ts`
- Test: `packages/i18n/test/color-names.test.ts`

**Interfaces:**
- Consumes: `negotiateLocale`/`filterSupportedLocales` (Task 2), registry (Task 3), `lookupFull` (Task 8), `lookupHue` (Task 9).
- Produces:
  - `interface ColorNamesOptions { source: string; style?: "long" | "short"; fallback?: "nearest" | "none"; maxDistance?: number; topN?: number }`
  - `interface ColorNameResolution { name: string | undefined; term: string | undefined; probability: number; candidates: Candidate[]; model: "full" | "hue"; source: string; coverage: "exact" | "nearest" | "none"; binDistance: number }`
  - `class ColorNames` with `static load`, `of`, `resolve`, `colorOf`, `resolveColorOf`, `resolvedOptions`, `static supportedLocalesOf`.

- [ ] **Step 1: Write the failing test**

Create `packages/i18n/test/color-names.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { Color } from "@urcolor/core";
import { ColorNames } from "../src/index";

const BLUE = Color.parse("#3b82f6")!;

describe("ColorNames.load", () => {
  it("loads a full-model language and names a colour", async () => {
    const names = await ColorNames.load("ko", { source: "uwdata" });
    const name = names.of(BLUE);
    expect(name).toBeString();
    expect(name!.length).toBeGreaterThan(0);
  });

  it("negotiates a regional tag down to the base language", async () => {
    const names = await ColorNames.load("ko-KR", { source: "uwdata" });
    expect(names.resolvedOptions().locale).toBe("ko");
  });

  it("throws RangeError for an unsupported locale", async () => {
    await expect(ColorNames.load("xh", { source: "uwdata" })).rejects.toThrow(RangeError);
  });

  it("throws for an unknown source", async () => {
    await expect(ColorNames.load("ko", { source: "nope" })).rejects.toThrow(/unknown source/i);
  });
});

describe("ColorNames constructor", () => {
  it("throws when the chunk has not been loaded", () => {
    expect(() => new ColorNames("ru", { source: "uwdata" })).toThrow(/ColorNames\.load/);
  });

  it("works synchronously once loaded", async () => {
    await ColorNames.load("en", { source: "uwdata" });
    expect(new ColorNames("en", { source: "uwdata" }).of(BLUE)).toBeString();
  });
});

describe("style option", () => {
  it("returns the display name for style long and the key for style short", async () => {
    const long = await ColorNames.load("ko", { source: "uwdata", style: "long" });
    const short = await ColorNames.load("ko", { source: "uwdata", style: "short" });
    expect(long.of(BLUE)).toBe(long.resolve(BLUE).candidates[0]!.name);
    expect(short.of(BLUE)).toBe(short.resolve(BLUE).candidates[0]!.term);
  });
});

describe("resolve", () => {
  it("returns candidates sorted by probability with full metadata", async () => {
    const names = await ColorNames.load("en", { source: "uwdata" });
    const result = names.resolve(BLUE);

    expect(result.source).toBe("uwdata");
    expect(result.model).toBe("full");
    expect(["exact", "nearest"]).toContain(result.coverage);
    expect(result.probability).toBeGreaterThan(0);
    expect(result.candidates.length).toBeGreaterThan(0);
    for (let i = 1; i < result.candidates.length; i++) {
      expect(result.candidates[i - 1]!.probability).toBeGreaterThanOrEqual(
        result.candidates[i]!.probability,
      );
    }
  });

  it("honours topN", async () => {
    const names = await ColorNames.load("en", { source: "uwdata", topN: 2 });
    expect(names.resolve(BLUE).candidates.length).toBeLessThanOrEqual(2);
  });
});

describe("fallback option", () => {
  it("returns undefined from of() on a nearest match when fallback is none", async () => {
    const nearest = await ColorNames.load("ro", { source: "uwdata", fallback: "nearest" });
    const strict = await ColorNames.load("ro", { source: "uwdata", fallback: "none" });

    // PROBE: replace with a colour verified to resolve as "nearest" for
    // Romanian — see the step below. The assertions are unconditional on
    // purpose; a guarded assertion would let this test pass while testing
    // nothing.
    const probe = Color.fromOklab(0, 0, 0);

    expect(nearest.resolve(probe).coverage).toBe("nearest");
    expect(nearest.of(probe)).toBeString();
    expect(strict.of(probe)).toBeUndefined();
    expect(strict.resolve(probe).coverage).toBe("none");
  });
});

describe("hue-model languages", () => {
  it("names a saturated colour and refuses a grey", async () => {
    const names = await ColorNames.load("ar", { source: "uwdata" });
    expect(names.resolve(Color.parse("#ff0000")!).model).toBe("hue");
    expect(names.of(Color.parse("#808080")!)).toBeUndefined();
  });
});

describe("reverse lookup", () => {
  it("returns a Color for a known term", async () => {
    const names = await ColorNames.load("ko", { source: "uwdata" });
    const term = names.resolve(BLUE).term!;
    const color = names.colorOf(term);
    expect(color).toBeInstanceOf(Color);
  });

  it("returns undefined for an unknown term", async () => {
    const names = await ColorNames.load("ko", { source: "uwdata" });
    expect(names.colorOf("definitely-not-a-korean-colour-term")).toBeUndefined();
  });
});

describe("supportedLocalesOf", () => {
  it("filters requested tags to those the source covers", () => {
    const supported = ColorNames.supportedLocalesOf(["ko-KR", "xh", "de"], { source: "uwdata" });
    expect(supported).toEqual(["ko-KR", "de"]);
  });
});

describe("resolvedOptions", () => {
  it("reports the negotiated locale, model, and defaults", async () => {
    const names = await ColorNames.load("ko", { source: "uwdata" });
    expect(names.resolvedOptions()).toMatchObject({
      locale: "ko",
      source: "uwdata",
      model: "full",
      style: "long",
      fallback: "nearest",
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test packages/i18n/test/color-names.test.ts`
Expected: FAIL — `ColorNames` is not exported.

- [ ] **Step 3: Write the class**

Create `packages/i18n/src/color-names.ts`:

```ts
import { Color } from "@urcolor/core";
import { filterSupportedLocales, negotiateLocale } from "./engine/locale";
import { getLoadedChunk, getSource, loadChunk } from "./engine/registry";
import { lookupFull, type Candidate } from "./engine/lookup-full";
import { lookupHue } from "./engine/lookup-hue";
import type { Chunk } from "./engine/types";

export interface ColorNamesOptions {
  /** Which dataset answers. Required — provenance is never implicit. */
  source: string;
  /** `"long"` gives the display name, `"short"` the matching key. */
  style?: "long" | "short";
  /** `"none"` makes `of()` return undefined unless the bin matched exactly. */
  fallback?: "nearest" | "none";
  /** Oklab search radius used when `fallback` is `"nearest"`. */
  maxDistance?: number;
  /** How many candidates `resolve()` returns. */
  topN?: number;
}

export interface ColorNameResolution {
  name: string | undefined;
  term: string | undefined;
  probability: number;
  candidates: Candidate[];
  model: "full" | "hue";
  source: string;
  coverage: "exact" | "nearest" | "none";
  binDistance: number;
}

export interface ResolvedColorNamesOptions {
  locale: string;
  source: string;
  model: "full" | "hue";
  style: "long" | "short";
  fallback: "nearest" | "none";
  binSize: number | undefined;
  coverage: number;
}

const DEFAULT_MAX_DISTANCE = 0.075;
const DEFAULT_TOP_N = 5;

/**
 * The hue model only describes the saturated hue ring; beyond this Oklab
 * distance from it, the model has nothing meaningful to say.
 */
const MAX_HUE_DISTANCE = 0.2;

function localesOf(sourceId: string): string[] {
  return Object.keys(getSource(sourceId).languages);
}

/**
 * Multilingual colour naming, shaped after `Intl.DisplayNames`.
 *
 * ```ts
 * const names = await ColorNames.load("ko", { source: "uwdata" });
 * names.of(Color.parse("#3b82f6")!); // "파란색"
 * ```
 */
export class ColorNames {
  readonly #locale: string;
  readonly #options: Required<Omit<ColorNamesOptions, "source">> & { source: string };
  readonly #chunk: Chunk;

  constructor(locales: string | readonly string[], options: ColorNamesOptions) {
    const available = localesOf(options.source);
    const locale = negotiateLocale(locales, available);
    if (locale === undefined) {
      throw new RangeError(
        `Source "${options.source}" has no data for the requested locale(s). `
        + `Use ColorNames.supportedLocalesOf() to check first.`,
      );
    }

    const chunk = getLoadedChunk(options.source, locale);
    if (chunk === undefined) {
      throw new Error(
        `Colour data for "${locale}" from source "${options.source}" is not loaded. `
        + `Call await ColorNames.load(${JSON.stringify(locales)}, ${JSON.stringify(options)}) first.`,
      );
    }

    this.#locale = locale;
    this.#chunk = chunk;
    this.#options = {
      source: options.source,
      style: options.style ?? "long",
      fallback: options.fallback ?? "nearest",
      maxDistance: options.maxDistance ?? DEFAULT_MAX_DISTANCE,
      topN: options.topN ?? DEFAULT_TOP_N,
    };
  }

  /** Resolve the locale, load its chunk, and construct an instance. */
  static async load(
    locales: string | readonly string[],
    options: ColorNamesOptions,
  ): Promise<ColorNames> {
    const locale = negotiateLocale(locales, localesOf(options.source));
    if (locale === undefined) {
      throw new RangeError(
        `Source "${options.source}" has no data for the requested locale(s).`,
      );
    }
    await loadChunk(options.source, locale);
    return new ColorNames(locale, options);
  }

  static supportedLocalesOf(
    locales: string | readonly string[],
    options: { source: string },
  ): string[] {
    return filterSupportedLocales(locales, localesOf(options.source));
  }

  /** The colour's name in this locale, or `undefined` when unavailable. */
  of(color: Color): string | undefined {
    const result = this.resolve(color);
    if (result.coverage === "none") return undefined;
    if (result.coverage === "nearest" && this.#options.fallback === "none") return undefined;
    return this.#options.style === "short" ? result.term : result.name;
  }

  /** The full result, including candidates, probabilities, and coverage. */
  resolve(color: Color): ColorNameResolution {
    const { source, topN, maxDistance, fallback } = this.#options;
    const effectiveMaxDistance = fallback === "none" ? 0 : maxDistance;

    const match = this.#chunk.model === "full"
      ? lookupFull(
        this.#chunk,
        (() => {
          const [l, a, b] = color.to("oklab").coords;
          return [l ?? 0, a ?? 0, b ?? 0] as [number, number, number];
        })(),
        { topN, maxDistance: effectiveMaxDistance },
      )
      : lookupHue(this.#chunk, color, {
        topN,
        maxDistance: effectiveMaxDistance,
        maxHueDistance: MAX_HUE_DISTANCE,
      });

    const best = match.candidates[0];
    return {
      name: best?.name,
      term: best?.term,
      probability: best?.probability ?? 0,
      candidates: match.candidates,
      model: this.#chunk.model,
      source,
      coverage: match.coverage,
      binDistance: match.binDistance,
    };
  }

  /** The representative colour for a term, or `undefined` if unknown. */
  colorOf(term: string): Color | undefined {
    return this.resolveColorOf(term)?.color;
  }

  resolveColorOf(term: string): { color: Color; term: string; name: string } | undefined {
    const entry = this.#chunk.terms.find(([key, name]) => key === term || name === term);
    if (entry === undefined) return undefined;

    const [key, name, centroid] = entry;
    if (centroid === null) return undefined;

    return { color: Color.fromOklab(centroid[0], centroid[1], centroid[2]), term: key, name };
  }

  resolvedOptions(): ResolvedColorNamesOptions {
    const coverage = getSource(this.#options.source).languages[this.#locale];
    return {
      locale: this.#locale,
      source: this.#options.source,
      model: this.#chunk.model,
      style: this.#options.style,
      fallback: this.#options.fallback,
      binSize: this.#chunk.model === "full" ? this.#chunk.binSize : undefined,
      coverage: coverage?.coverage ?? 0,
    };
  }
}
```

- [ ] **Step 4: Export from the barrel**

Modify `packages/i18n/src/index.ts` — add to the colour-naming section:

```ts
export { ColorNames } from "./color-names";
export type {
  ColorNameResolution,
  ColorNamesOptions,
  ResolvedColorNamesOptions,
} from "./color-names";
export type { Candidate } from "./engine/lookup-full";
```

- [ ] **Step 5: Find a real "nearest" probe colour for the fallback test**

The fallback test above ships with a placeholder probe. Find a real one: write a
throwaway script that loads the Romanian chunk, walks a grid of Oklab values
(L from 0.1 to 0.9 in steps of 0.05, a and b from -0.2 to 0.2 in steps of 0.05),
and prints the first colour whose `resolve()` returns `coverage: "nearest"`.
Paste that colour into the test and delete the script.

If no colour in the grid yields `"nearest"` — possible if Romanian's bins are
too sparse for anything to fall within `maxDistance` — use a different sparse
language from `meta.json`, or widen `maxDistance` in that test's options until a
probe exists. Do not re-guard the assertions.

- [ ] **Step 6: Run the tests**

Run: `bun test packages/i18n/`
Expected: PASS, all suites, with the fallback test asserting unconditionally.

- [ ] **Step 7: Verify the build ships split chunks**

Run: `bun run --cwd packages/i18n build && ls packages/i18n/dist`
Expected: `index.js`, `index.d.ts`, and separate chunk files — the data must not be inlined into `index.js`. Check with `ls -la packages/i18n/dist/index.js`; it should be well under 100 KB.

- [ ] **Step 8: Lint and commit**

```bash
bun run lint
git add packages/i18n
git commit -m "feat(i18n): add the Intl-shaped ColorNames class"
```

---

### Task 11: Weekly upstream sync workflow

**Files:**
- Create: `.github/workflows/sync-uwdata.yml`

**Interfaces:**
- Consumes: the `sync:uwdata` script from Task 6.
- Produces: a scheduled workflow that opens a PR when upstream data changes.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/sync-uwdata.yml`:

```yaml
name: Sync uwdata color names

on:
  schedule:
    - cron: "0 6 * * 1"
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install --frozen-lockfile

      - name: Regenerate data from upstream master
        id: sync
        run: |
          bun run --cwd packages/i18n sync:uwdata 2>&1 | tee /tmp/sync-report.txt
          {
            echo 'report<<EOF'
            cat /tmp/sync-report.txt
            echo EOF
          } >> "$GITHUB_OUTPUT"

      - name: Verify the regenerated data still passes tests
        run: bun test packages/i18n/

      - uses: peter-evans/create-pull-request@v6
        with:
          branch: chore/sync-uwdata
          title: "chore(i18n): sync uwdata color names"
          commit-message: "chore(i18n): sync uwdata color names"
          body: |
            Automated regeneration of `packages/i18n/src/data/uwdata/` from upstream.

            Review the coverage and chunk-size deltas below before merging. A large
            size jump or a coverage drop means upstream changed something material.

            ```
            ${{ steps.sync.outputs.report }}
            ```
```

The sync script pins `UWDATA_COMMIT`, so this workflow regenerates from the *pinned* revision and will produce no diff until a human bumps the SHA. That is deliberate: the job's value is proving the pipeline still runs and the pinned data still passes tests. To pick up new upstream data, bump `UWDATA_COMMIT` in `packages/i18n/src/sources/uwdata/source.ts` and let the next run produce the diff.

- [ ] **Step 2: Validate the workflow syntax**

Run: `bun x js-yaml .github/workflows/sync-uwdata.yml > /dev/null && echo ok`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/sync-uwdata.yml
git commit -m "ci(i18n): add the weekly uwdata sync workflow"
```

---

### Task 12: Documentation, attribution, and the licensing issue

**Files:**
- Create: `packages/i18n/README.md`
- Create: `docs/guide/color-naming.md`
- Modify: `docs/.vitepress/config.ts`

**Interfaces:**
- Consumes: the finished public API.
- Produces: user-facing documentation, and the open licensing question recorded where a future maintainer will find it.

- [ ] **Step 1: Write the package README**

Create `packages/i18n/README.md`:

````markdown
# @urcolor/i18n

Multilingual colour naming and channel-label translations for urcolor.

```ts
import { ColorNames, ChannelNames } from "@urcolor/i18n";
import { Color } from "@urcolor/core";

const names = await ColorNames.load("ko", { source: "uwdata" });
names.of(Color.parse("#3b82f6")!);   // "파란색"
names.resolve(Color.parse("#3b82f6")!);
// { name, term, probability, candidates, model, source, coverage, binDistance }

new ChannelNames("ko").of("hue");    // "색상"
```

The API follows the ECMAScript `Intl` classes: `of()`, `resolvedOptions()`, and
`supportedLocalesOf()` behave as they do on `Intl.DisplayNames`.

## Coverage

Colour data comes from the `uwdata` source. Fourteen languages have a
full-colour-space model (`de en es fa fi fr ko nl pl pt ro ru sv zh`); a further
27 have a hue-circle model that only describes saturated colours. Sample volume
is heavily skewed — English has orders of magnitude more data than Romanian —
so `resolve()` reports `coverage` (`"exact"`, `"nearest"`, `"none"`) rather than
inventing a name.

## Data source and attribution

Colour-name data is derived from
[Color Naming in Different Languages](https://github.com/uwdata/color-naming-in-different-languages),
pinned at commit `f0d3e30db9e4b2c3b703bde0d816043eb48a6cb5`.

> Kim, Y., Thayer, K., Silva Gorsky, G., & Heer, J. (2019). Color Names Across
> Languages: Salient Colors and Term Translation in Multilingual Color Naming
> Models. EuroVis.

The dataset authors' own caveat, which applies to every name this package returns:

> We represent the color labels provided by the participants in our study, which
> may include misspellings, but also whatever racial biases they have (e.g., the
> color 'skin'). This is not meant to be a prescriptive definition of what colors
> fit what labels.

## Licensing status

The upstream repository declares no license file. Its README asks only that the
paper be cited, which this package does — in the source, in this README, and in
the documentation. Downstream users redistributing the data should make their own
assessment.

## Adding a source

Sources are namespaced and never merged. A new dataset means a new directory
under `src/sources/`, a `NameSource` descriptor, and generated chunks — no
changes to the lookup engine. Every result carries the `source` that produced it,
and `source` is a required option, so a caller can never get an answer without
knowing where it came from.
````

- [ ] **Step 2: Write the docs page**

Create `docs/guide/color-naming.md`:

````markdown
# Color Naming

`@urcolor/i18n` answers "what do speakers of this language call this colour?"
using crowdsourced colour-perception data.

## Basic usage

```ts
import { ColorNames } from "@urcolor/i18n";
import { Color } from "@urcolor/core";

const names = await ColorNames.load("ko", { source: "uwdata" });
names.of(Color.parse("#3b82f6")!); // "파란색"
```

The API deliberately mirrors the built-in `Intl` classes, so it should feel like
native platform localization: a constructor that takes locales and options,
`of()` for the common case, `resolvedOptions()` to see what was negotiated, and a
static `supportedLocalesOf()`.

## Loading

Language data ships as lazily loaded chunks, so construction is asynchronous:

```ts
const names = await ColorNames.load(["ko-KR", "en"], { source: "uwdata" });
names.resolvedOptions().locale; // "ko" — negotiated by BCP 47 lookup
```

Once a language is loaded, the synchronous constructor works for it:

```ts
new ColorNames("ko", { source: "uwdata" }); // fine — chunk is cached
new ColorNames("ru", { source: "uwdata" }); // throws — call load() first
```

## Probabilities

Colour naming is not deterministic. `resolve()` exposes the distribution:

```ts
names.resolve(Color.parse("#3b82f6")!);
// {
//   name: "파란색",
//   term: "파랑",
//   probability: 0.61,
//   candidates: [{ name, term, probability }, …],
//   model: "full",
//   source: "uwdata",
//   coverage: "exact",
//   binDistance: 0,
// }
```

`coverage` is the honest bit. `"exact"` means the colour fell in a bin with real
data. `"nearest"` means the answer came from a neighbouring bin. `"none"` means
the dataset has nothing to say — `of()` returns `undefined` rather than guessing.

## Options

| Option | Values | Default | Meaning |
| --- | --- | --- | --- |
| `source` | source id | *required* | Which dataset answers |
| `style` | `"long"` \| `"short"` | `"long"` | Display name vs. matching key |
| `fallback` | `"nearest"` \| `"none"` | `"nearest"` | Whether neighbouring bins may answer |
| `maxDistance` | number | `0.075` | Oklab search radius for `"nearest"` |
| `topN` | number | `5` | Candidates returned by `resolve()` |

## Reverse lookup

```ts
names.colorOf("파랑"); // Color — the term's average colour
```

## Sources

`source` is required. Datasets are namespaced and never merged, because they use
different methodologies and blending them would produce answers no source
actually supports.

```ts
import { listSources, getSource } from "@urcolor/i18n";

getSource("uwdata").citation;  // attribution text to display
getSource("uwdata").disclaimer;
```

Please surface the citation and disclaimer in any UI built on this data.

## Channel labels

```ts
import { ChannelNames } from "@urcolor/i18n";

new ChannelNames("ko").of("hue"); // "색상"
```

77 locales, synchronous, no source concept — these strings are hand-authored
rather than derived from a dataset.
````

- [ ] **Step 3: Register the page in the sidebar**

Modify `docs/.vitepress/config.ts`. In the `"Getting Started"` group (around line 72), replace:

```ts
          items: [
            { text: "Introduction", link: "/guide/" },
            { text: "Features", link: "/guide/features" },
            { text: "Installation", link: "/guide/installation" },
          ],
```

with:

```ts
          items: [
            { text: "Introduction", link: "/guide/" },
            { text: "Features", link: "/guide/features" },
            { text: "Installation", link: "/guide/installation" },
            { text: "Color Naming", link: "/guide/color-naming" },
          ],
```

- [ ] **Step 4: Verify the docs build**

Run: `bun run docs:build`
Expected: exits 0, no dead-link warnings for `/guide/color-naming`.

- [ ] **Step 5: Verify attribution reaches every generated artifact**

The project's decision is that attribution in code and docs is how this data is
credited. Confirm the citation is present in all four places, and add it where
it is missing:

1. `packages/i18n/src/sources/uwdata/source.ts` — the `citation` and `disclaimer`
   fields (already present from Task 3).
2. `packages/i18n/scripts/sync-uwdata/main.ts` — `renderChunkModule` must emit
   the attribution into every generated chunk, so the credit survives into
   `dist/`. Change the header it writes to:

```ts
export function renderChunkModule(chunk: FullChunk | HueChunk): string {
  return [
    "// Generated by scripts/sync-uwdata. Do not edit by hand.",
    "//",
    "// Colour-name data derived from:",
    "//   https://github.com/uwdata/color-naming-in-different-languages",
    `//   at commit ${UWDATA_COMMIT}`,
    "//",
    "// Kim, Y., Thayer, K., Silva Gorsky, G., & Heer, J. (2019). Color Names Across",
    "// Languages: Salient Colors and Term Translation in Multilingual Color Naming",
    "// Models. EuroVis.",
    `export default ${JSON.stringify(chunk)};`,
    "",
  ].join("\n");
}
```

The existing test in `test/scripts/main.test.ts` asserts the module starts with
`"// Generated by scripts/sync-uwdata"`, which still holds. Add an assertion that
the emitted source contains `"EuroVis"`.

3. `packages/i18n/README.md` — the attribution section (written in Step 1).
4. `docs/guide/color-naming.md` — the sources section (written in Step 2).

- [ ] **Step 6: Regenerate the data so chunks carry the attribution**

Run: `bun run --cwd packages/i18n sync:uwdata && bun test packages/i18n/`
Expected: chunks regenerate with the attribution header; all tests still pass.

- [ ] **Step 7: Final verification**

Run: `bun test && bun run lint && bun run build && bun run docs:build`
Expected: all four exit 0.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "docs(i18n): document color naming, attribution, and licensing status"
```
