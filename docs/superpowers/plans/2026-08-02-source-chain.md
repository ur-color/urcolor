# Default Source Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `uwdata` the default colour-name source and let `wikidata` answer the 278 locales `uwdata` doesn't cover, without ever merging the two.

**Architecture:** A new `resolveSourceChain` walks each requested tag's BCP 47 stripping ladder, checking every source in chain order at each rung — `Intl`'s lookup algorithm with the source chain as the inner loop. The default chain lives in the registry (set by `src/index.ts`), so `color-names.ts` stays ignorant of which datasets ship. Exactly one source answers an entire `ColorNames` instance, fixed at load time.

**Tech Stack:** TypeScript, Bun (`bun test`, `bun run`), `@urcolor/core`.

**Spec:** `docs/superpowers/specs/2026-08-02-source-chain-design.md`

## Global Constraints

- **Runtime is Bun.** `bun test`, `bun run <script>`. Never npm/node/vitest/jest.
- **Code style:** 2-space indent, double-quoted strings, semicolons, `export function` over `export const fn =`, explicit return types on exported functions.
- **Verification gates** (repo-wide `bun run lint` is polluted by ~327 pre-existing problems elsewhere — do not use it):
  - `cd /Users/grandmagus/Documents/Projects/urcolor && npx eslint packages/i18n` — clean, zero errors AND warnings.
  - `cd /Users/grandmagus/Documents/Projects/urcolor/packages/i18n && bun test` — currently **252 pass / 0 fail**.
- **Sources are never merged.** One source answers an entire instance, chosen at load time, never varying per lookup.
- **Backwards compatibility is absolute.** Passing `source` as a single string must keep its exact current meaning, including the `RangeError` when that source has no data for the locale. No existing call site may change behaviour.
- **The working tree has unrelated uncommitted user work** under `packages/react/` and `packages/vue/`. `git add` only the paths your task touches. Never `git add -A`, `git add .`, `git add -u`, or `git commit -a`.
- All paths are relative to `packages/i18n/` unless they start with `docs/`.

---

### Task 1: Extract `localeLadder` from `negotiateLocale`

A pure refactor that must be provably behaviour-preserving. `locale.ts` has no direct test today, so this task adds one that pins current behaviour first.

**Files:**
- Modify: `src/engine/locale.ts`
- Test: `test/engine/locale.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: `localeLadder(tag: string): string[]` exported from `src/engine/locale.ts`. `negotiateLocale` and `filterSupportedLocales` keep their exact current signatures and behaviour.

- [ ] **Step 1: Write the failing test**

Create `test/engine/locale.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { filterSupportedLocales, localeLadder, negotiateLocale } from "../../src/engine/locale";

describe("localeLadder", () => {
  it("strips subtags from most to least specific", () => {
    expect(localeLadder("zh-Hans-CN")).toEqual(["zh-Hans-CN", "zh-Hans", "zh"]);
  });

  it("returns a single rung for a bare tag", () => {
    expect(localeLadder("en")).toEqual(["en"]);
  });

  it("appends the lowercased primary subtag when casing differs", () => {
    // negotiateLocale's existing case-insensitive fallback: "ZH-Hant" must
    // still be able to reach a registered "zh".
    expect(localeLadder("ZH-Hant")).toEqual(["ZH-Hant", "ZH", "zh"]);
  });

  it("does not duplicate the primary subtag when it is already a rung", () => {
    expect(localeLadder("zh-Hant")).toEqual(["zh-Hant", "zh"]);
  });

  it("never emits an empty rung", () => {
    expect(localeLadder("")).toEqual([]);
    expect(localeLadder("en").every(rung => rung.length > 0)).toBe(true);
  });
});

describe("negotiateLocale (behaviour pinned before refactor)", () => {
  const available = ["en", "zh", "zh-Hant", "pt"];

  it("prefers an exact match", () => {
    expect(negotiateLocale("zh-Hant", available)).toBe("zh-Hant");
  });

  it("falls back by stripping subtags", () => {
    expect(negotiateLocale("pt-BR", available)).toBe("pt");
  });

  it("matches the primary subtag case-insensitively", () => {
    expect(negotiateLocale("EN-GB", available)).toBe("en");
  });

  it("takes the first requested tag that resolves", () => {
    expect(negotiateLocale(["xx", "pt-BR", "en"], available)).toBe("pt");
  });

  it("returns undefined when nothing resolves", () => {
    expect(negotiateLocale("xx", available)).toBeUndefined();
    expect(negotiateLocale([], available)).toBeUndefined();
  });

  it("accepts a bare string as well as an array", () => {
    expect(negotiateLocale("en", available)).toBe("en");
  });
});

describe("filterSupportedLocales", () => {
  const available = ["en", "zh"];

  it("keeps the caller's original tags", () => {
    expect(filterSupportedLocales(["en-GB", "zh", "xx"], available)).toEqual(["en-GB", "zh"]);
  });

  it("returns an empty array when nothing resolves", () => {
    expect(filterSupportedLocales(["xx"], available)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/i18n && bun test test/engine/locale.test.ts`
Expected: FAIL — `localeLadder` is not exported. The `negotiateLocale` and `filterSupportedLocales` blocks should PASS already; if any of them fails, stop and report, because the pin does not match current behaviour.

- [ ] **Step 3: Extract the ladder**

Replace the body of `src/engine/locale.ts` above `filterSupportedLocales` with:

```ts
/**
 * The BCP 47 lookup ladder for one tag: the tag itself, then progressively
 * shorter prefixes ("zh-Hans-CN" -> "zh-Hans" -> "zh"), then the lowercased
 * primary subtag if that is not already a rung.
 *
 * The trailing lowercased rung preserves `negotiateLocale`'s long-standing
 * case-insensitive behaviour, which let a requested "EN-GB" reach a
 * registered "en". Extracted so that source-chain resolution walks exactly
 * the same ladder rather than a subtly different reimplementation of it.
 */
export function localeLadder(tag: string): string[] {
  const rungs: string[] = [];

  let candidate = tag;
  while (candidate.length > 0) {
    rungs.push(candidate);
    const cut = candidate.lastIndexOf("-");
    if (cut < 0) break;
    candidate = candidate.slice(0, cut);
  }

  const primary = tag.toLowerCase().split("-")[0];
  if (primary !== undefined && primary.length > 0 && !rungs.includes(primary)) {
    rungs.push(primary);
  }

  return rungs;
}

/**
 * BCP 47 lookup: try each requested tag's ladder in order and return the
 * first available match. Mirrors the "lookup" algorithm the `Intl`
 * constructors use.
 */
export function negotiateLocale(
  requested: string | readonly string[],
  available: readonly string[],
): string | undefined {
  const requestedTags = typeof requested === "string" ? [requested] : requested;
  const supported = new Set(available);

  for (const tag of requestedTags) {
    for (const rung of localeLadder(tag)) {
      if (supported.has(rung)) return rung;
    }
  }

  return undefined;
}
```

Leave `filterSupportedLocales` exactly as it is.

- [ ] **Step 4: Run the tests**

Run: `cd packages/i18n && bun test test/engine/locale.test.ts`
Expected: PASS, 13 tests (5 `localeLadder`, 6 `negotiateLocale`, 2 `filterSupportedLocales`).

- [ ] **Step 5: Confirm nothing else regressed**

Run: `cd packages/i18n && bun test` then `cd /Users/grandmagus/Documents/Projects/urcolor && npx eslint packages/i18n`
Expected: 252 + 14 = **266 pass / 0 fail**, lint clean. Locale negotiation underpins every `ColorNames` construction, so a regression here would surface across the whole suite.

- [ ] **Step 6: Commit**

```bash
git add packages/i18n/src/engine/locale.ts packages/i18n/test/engine/locale.test.ts
git commit -m "refactor(i18n): extract localeLadder from negotiateLocale"
```

---

### Task 2: Default source chain in the registry

**Files:**
- Modify: `src/engine/registry.ts`
- Test: `test/engine/registry.test.ts` (append)

**Interfaces:**
- Consumes: nothing.
- Produces: `setDefaultSources(ids: readonly string[]): void` and `getDefaultSources(): readonly string[]`, both from `src/engine/registry.ts`.

- [ ] **Step 1: Write the failing test**

Append to `test/engine/registry.test.ts`:

```ts
describe("default sources", () => {
  it("round-trips what was set", () => {
    setDefaultSources(["alpha", "beta"]);
    expect(getDefaultSources()).toEqual(["alpha", "beta"]);
  });

  it("returns a frozen array so callers cannot corrupt shared state", () => {
    setDefaultSources(["alpha"]);
    const sources = getDefaultSources();
    expect(Object.isFrozen(sources)).toBe(true);
    expect(() => (sources as string[]).push("beta")).toThrow();
    expect(getDefaultSources()).toEqual(["alpha"]);
  });

  it("copies its argument, so later mutation of the caller's array is ignored", () => {
    const mine = ["alpha"];
    setDefaultSources(mine);
    mine.push("beta");
    expect(getDefaultSources()).toEqual(["alpha"]);
  });
});
```

Add `setDefaultSources` and `getDefaultSources` to the existing import from `../../src/engine/registry`.

Note: this test mutates module-level registry state shared with other suites. `src/index.ts` sets the real default at import time, and `test/data.test.ts` (Task 5) asserts against it. Bun runs each test file in its own module registry, so the two do not interfere — but do not add default-source assertions to any file that also imports `src/index.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/i18n && bun test test/engine/registry.test.ts`
Expected: FAIL — `setDefaultSources` is not exported.

- [ ] **Step 3: Implement**

Add to `src/engine/registry.ts`, after the `registry` declaration:

```ts
let defaultSources: readonly string[] = Object.freeze<string[]>([]);

/**
 * Sets the source ids `ColorNames` consults, in priority order, when the
 * caller does not name one. Called by `src/index.ts` once both sources are
 * registered — the lookup layer never names a dataset itself, so adding a
 * source later is a one-line change in one file.
 *
 * The argument is copied and frozen for the same reason
 * {@link registerSource} freezes its descriptor: a caller holding the
 * returned reference must not be able to alter locale resolution for every
 * subsequent consumer.
 */
export function setDefaultSources(ids: readonly string[]): void {
  defaultSources = Object.freeze([...ids]);
}

export function getDefaultSources(): readonly string[] {
  return defaultSources;
}
```

- [ ] **Step 4: Run the tests**

Run: `cd packages/i18n && bun test test/engine/registry.test.ts`
Expected: PASS, including the 3 new tests.

- [ ] **Step 5: Commit**

```bash
git add packages/i18n/src/engine/registry.ts packages/i18n/test/engine/registry.test.ts
git commit -m "feat(i18n): add default source chain to the registry"
```

---

### Task 3: `resolveSourceChain`

**Files:**
- Create: `src/engine/source-chain.ts`
- Test: `test/engine/source-chain.test.ts`

**Interfaces:**
- Consumes: `localeLadder` (Task 1); `getDefaultSources` (Task 2); `getSource` from `src/engine/registry.ts`.
- Produces, both from `src/engine/source-chain.ts`:
  - `interface SourceChainMatch { source: string; locale: string }`
  - `normalizeChain(source: string | readonly string[] | undefined): string[]`
  - `resolveSourceChain(locales: string | readonly string[], chain: readonly string[]): SourceChainMatch | undefined`
  - `chainLocales(chain: readonly string[]): string[]`

- [ ] **Step 1: Write the failing test**

Create `test/engine/source-chain.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "bun:test";
import { registerSource, setDefaultSources } from "../../src/engine/registry";
import {
  chainLocales,
  normalizeChain,
  resolveSourceChain,
} from "../../src/engine/source-chain";
import type { NameSource } from "../../src/engine/types";

/** A registered source is all this module needs; the chunks are never loaded. */
function fakeSource(id: string, locales: string[]): NameSource {
  return {
    id,
    title: id,
    url: "https://example.invalid/",
    license: "CC0-1.0",
    citation: id,
    languages: Object.fromEntries(
      locales.map(locale => [locale, { model: "palette" as const, terms: 1, coverage: 1 }]),
    ),
  };
}

beforeAll(() => {
  // Mirrors the real shape: "narrow" is a strict subset of "broad", except
  // that "broad" also carries the script variant "zh-Hant" that "narrow"
  // can only reach by stripping to "zh".
  // Loaders are never invoked here — this module only reads `languages`.
  registerSource(fakeSource("narrow", ["en", "zh", "pt"]), {});
  registerSource(fakeSource("broad", ["en", "zh", "zh-Hant", "pt", "ka"]), {});
  setDefaultSources(["narrow", "broad"]);
});

describe("normalizeChain", () => {
  it("falls back to the registered default when given undefined", () => {
    expect(normalizeChain(undefined)).toEqual(["narrow", "broad"]);
  });

  it("wraps a single id", () => {
    expect(normalizeChain("broad")).toEqual(["broad"]);
  });

  it("copies an array so the caller cannot mutate it afterwards", () => {
    const mine = ["narrow"];
    const chain = normalizeChain(mine);
    mine.push("broad");
    expect(chain).toEqual(["narrow"]);
  });

  it("throws on an unknown id rather than silently skipping it", () => {
    // A typo must not degrade into a fallback that quietly answers from
    // some other source.
    expect(() => normalizeChain("nosuch")).toThrow(/nosuch/);
    expect(() => normalizeChain(["narrow", "nosuch"])).toThrow(/nosuch/);
  });

  it("throws on an empty chain", () => {
    expect(() => normalizeChain([])).toThrow(RangeError);
  });
});

describe("resolveSourceChain", () => {
  const chain = ["narrow", "broad"];

  it("prefers the first source in the chain when both have the locale", () => {
    expect(resolveSourceChain("en", chain)).toEqual({ source: "narrow", locale: "en" });
  });

  it("falls through to a later source for a locale the first lacks", () => {
    expect(resolveSourceChain("ka", chain)).toEqual({ source: "broad", locale: "ka" });
  });

  it("lets an exact rung in a later source beat a stripped rung in an earlier one", () => {
    // "zh-Hant" is exact in broad; narrow would only match by stripping to
    // "zh". The exact rung is reached first, so broad wins.
    expect(resolveSourceChain("zh-Hant", chain)).toEqual({ source: "broad", locale: "zh-Hant" });
  });

  it("still prefers the earlier source when the rung is exact in both", () => {
    expect(resolveSourceChain("zh", chain)).toEqual({ source: "narrow", locale: "zh" });
  });

  it("uses chain order once both sources only match by stripping", () => {
    expect(resolveSourceChain("pt-BR", chain)).toEqual({ source: "narrow", locale: "pt" });
  });

  it("honours a reversed chain", () => {
    expect(resolveSourceChain("en", ["broad", "narrow"])).toEqual({ source: "broad", locale: "en" });
  });

  it("keeps requested-tag order dominant over match quality", () => {
    // Intl semantics: an earlier requested tag's stripped match outranks a
    // later tag's exact match.
    expect(resolveSourceChain(["pt-BR", "ka"], chain)).toEqual({ source: "narrow", locale: "pt" });
  });

  it("returns undefined when no source has any requested locale", () => {
    expect(resolveSourceChain("xx", chain)).toBeUndefined();
    expect(resolveSourceChain([], chain)).toBeUndefined();
  });
});

describe("chainLocales", () => {
  it("unions the chain's locales without duplicates", () => {
    expect(chainLocales(["narrow", "broad"]).sort())
      .toEqual(["en", "ka", "pt", "zh", "zh-Hant"]);
  });

  it("returns a single source's locales unchanged", () => {
    expect(chainLocales(["narrow"]).sort()).toEqual(["en", "pt", "zh"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/i18n && bun test test/engine/source-chain.test.ts`
Expected: FAIL — cannot resolve `../../src/engine/source-chain`.

- [ ] **Step 3: Implement**

Create `src/engine/source-chain.ts`:

```ts
import { localeLadder } from "./locale";
import { getDefaultSources, getSource } from "./registry";

/** Which source answered, and the locale tag it answered under. */
export interface SourceChainMatch {
  source: string;
  locale: string;
}

/**
 * Turns the caller's `source` option into a concrete, validated chain.
 *
 * An unknown id throws here rather than being skipped: silently falling
 * through would turn a typo into an answer from the wrong dataset, which is
 * exactly the kind of invisible provenance error this package exists to
 * avoid. `getSource` already throws for unknown ids — this just makes sure
 * every entry is checked up front rather than lazily mid-walk.
 */
export function normalizeChain(source: string | readonly string[] | undefined): string[] {
  const chain = source === undefined
    ? [...getDefaultSources()]
    : typeof source === "string"
      ? [source]
      : [...source];

  if (chain.length === 0) {
    throw new RangeError(
      "An empty source chain resolves nothing. Omit `source` for the package default.",
    );
  }

  for (const id of chain) getSource(id);
  return chain;
}

function localesOf(sourceId: string): Set<string> {
  return new Set(Object.keys(getSource(sourceId).languages));
}

/**
 * Resolves the requested locale(s) against a chain of sources.
 *
 * This is `Intl`'s lookup algorithm with the chain as the inner loop: for
 * each requested tag, walk its ladder, and at every rung try each source in
 * priority order. Two consequences worth stating, because both were
 * deliberate design choices:
 *
 * - An exact rung in a later source beats a stripped rung in an earlier one.
 *   Requesting `zh-Hant` reaches a source that genuinely has Traditional
 *   Chinese rather than falling back to another source's Simplified `zh`.
 * - Requested-tag order still dominates. An earlier tag matching only by
 *   stripping outranks a later tag matching exactly, which is what
 *   `Intl.DisplayNames` does; inverting the loops would silently reorder the
 *   caller's stated locale preferences.
 */
export function resolveSourceChain(
  locales: string | readonly string[],
  chain: readonly string[],
): SourceChainMatch | undefined {
  const tags = typeof locales === "string" ? [locales] : locales;
  const available = chain.map(id => [id, localesOf(id)] as const);

  for (const tag of tags) {
    for (const rung of localeLadder(tag)) {
      for (const [source, locales_] of available) {
        if (locales_.has(rung)) return { source, locale: rung };
      }
    }
  }

  return undefined;
}

/** Every locale any source in the chain can answer, de-duplicated. */
export function chainLocales(chain: readonly string[]): string[] {
  const all = new Set<string>();
  for (const id of chain) {
    for (const locale of localesOf(id)) all.add(locale);
  }
  return [...all];
}
```

- [ ] **Step 4: Run the tests**

Run: `cd packages/i18n && bun test test/engine/source-chain.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Run the full suite and lint**

Run: `cd packages/i18n && bun test` then `cd /Users/grandmagus/Documents/Projects/urcolor && npx eslint packages/i18n`
Expected: PASS, lint clean. Nothing imports this module yet, so the count should be 266 + 15 = **281 pass**.

- [ ] **Step 6: Commit**

```bash
git add packages/i18n/src/engine/source-chain.ts packages/i18n/test/engine/source-chain.test.ts
git commit -m "feat(i18n): add source-chain resolution"
```

---

### Task 4: Wire the chain into `ColorNames`

**Files:**
- Modify: `src/color-names.ts`
- Test: `test/color-names.test.ts` (append)

**Interfaces:**
- Consumes: `normalizeChain`, `resolveSourceChain`, `chainLocales` (Task 3).
- Produces: `ColorNamesOptions.source?: string | readonly string[]`; `ColorNames.load(locales, options?)`; `ColorNames.supportedLocalesOf(locales, options?)`; `ResolvedColorNamesOptions.sources: string[]`.

- [ ] **Step 1: Write the failing test**

Append to `test/color-names.test.ts`. This registers its own throwaway sources so it does not depend on the shipped data or on `src/index.ts`:

```ts
describe("source chains", () => {
  const chunkFor = (lang: string): PaletteChunk => ({
    lang,
    model: "palette",
    terms: [["yellow", "yellow", [...Color.parse("#FFFF00")!.to("oklab").coords] as [number, number, number], null]],
    provenance: [["Q943", "FFFF00"]],
    aliases: {},
  });

  beforeAll(() => {
    registerSource(
      {
        id: "chain-narrow",
        title: "Narrow",
        url: "https://example.invalid/",
        license: "CC0-1.0",
        citation: "Narrow",
        languages: { en: { model: "palette", terms: 1, coverage: 1 }, zh: { model: "palette", terms: 1, coverage: 1 } },
      },
      { en: () => Promise.resolve({ default: chunkFor("en") }), zh: () => Promise.resolve({ default: chunkFor("zh") }) },
    );
    registerSource(
      {
        id: "chain-broad",
        title: "Broad",
        url: "https://example.invalid/",
        license: "CC0-1.0",
        citation: "Broad",
        languages: {
          en: { model: "palette", terms: 1, coverage: 1 },
          zh: { model: "palette", terms: 1, coverage: 1 },
          "zh-Hant": { model: "palette", terms: 1, coverage: 1 },
          ka: { model: "palette", terms: 1, coverage: 1 },
        },
      },
      {
        en: () => Promise.resolve({ default: chunkFor("en") }),
        zh: () => Promise.resolve({ default: chunkFor("zh") }),
        "zh-Hant": () => Promise.resolve({ default: chunkFor("zh-Hant") }),
        ka: () => Promise.resolve({ default: chunkFor("ka") }),
      },
    );
    setDefaultSources(["chain-narrow", "chain-broad"]);
  });

  it("uses the default chain when source is omitted entirely", async () => {
    const names = await ColorNames.load("ka");
    expect(names.resolvedOptions().source).toBe("chain-broad");
    expect(names.resolvedOptions().locale).toBe("ka");
  });

  it("prefers the first source in the default chain", async () => {
    const names = await ColorNames.load("en");
    expect(names.resolvedOptions().source).toBe("chain-narrow");
  });

  it("reports the whole chain it considered", async () => {
    const names = await ColorNames.load("en");
    expect(names.resolvedOptions().sources).toEqual(["chain-narrow", "chain-broad"]);
  });

  it("reports a single-element chain when pinned to one source", async () => {
    const names = await ColorNames.load("en", { source: "chain-broad" });
    expect(names.resolvedOptions().source).toBe("chain-broad");
    expect(names.resolvedOptions().sources).toEqual(["chain-broad"]);
  });

  it("keeps single-source behaviour unchanged, including the throw", async () => {
    // Backwards compatibility: pinning to a source that lacks the locale
    // must still reject rather than quietly falling back.
    await expect(ColorNames.load("ka", { source: "chain-narrow" })).rejects.toThrow(RangeError);
  });

  it("honours an explicit chain", async () => {
    const names = await ColorNames.load("ka", { source: ["chain-narrow", "chain-broad"] });
    expect(names.resolvedOptions().source).toBe("chain-broad");
  });

  it("honours a reversed chain", async () => {
    const names = await ColorNames.load("en", { source: ["chain-broad", "chain-narrow"] });
    expect(names.resolvedOptions().source).toBe("chain-broad");
  });

  it("lets an exact tag in a later source beat a stripped match in an earlier one", async () => {
    const names = await ColorNames.load("zh-Hant");
    expect(names.resolvedOptions().source).toBe("chain-broad");
    expect(names.resolvedOptions().locale).toBe("zh-Hant");
  });

  it("names every source tried when nothing resolves", async () => {
    const attempt = ColorNames.load("xx");
    await expect(attempt).rejects.toThrow(RangeError);
    await expect(attempt).rejects.toThrow(/chain-narrow/);
    await expect(attempt).rejects.toThrow(/chain-broad/);
  });

  it("rejects an empty chain rather than treating it as the default", async () => {
    await expect(ColorNames.load("en", { source: [] })).rejects.toThrow(RangeError);
  });

  it("rejects an unknown source id", async () => {
    await expect(ColorNames.load("en", { source: ["chain-narrow", "nosuch"] })).rejects.toThrow(/nosuch/);
  });

  it("unions the chain's locales in supportedLocalesOf", () => {
    expect(ColorNames.supportedLocalesOf(["ka", "en", "xx"])).toEqual(["ka", "en"]);
  });

  it("filters against a single source when one is named", () => {
    expect(ColorNames.supportedLocalesOf(["ka", "en"], { source: "chain-narrow" })).toEqual(["en"]);
  });

  it("still answers lookups from the source that won", async () => {
    const names = await ColorNames.load("ka");
    expect(names.of(Color.parse("#FFFF00")!)).toBe("yellow");
    expect(names.resolve(Color.parse("#FFFF00")!).source).toBe("chain-broad");
  });
});
```

Add `setDefaultSources` to the existing `registerSource` import from `../src/engine/registry`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/i18n && bun test test/color-names.test.ts`
Expected: FAIL — `ColorNames.load("ka")` requires an options argument with `source`.

- [ ] **Step 3: Make `source` optional and chain-aware**

In `src/color-names.ts`, replace the import of `negotiateLocale`/`filterSupportedLocales`:

```ts
import { filterSupportedLocales } from "./engine/locale";
import { chainLocales, normalizeChain, resolveSourceChain } from "./engine/source-chain";
```

(`negotiateLocale` is no longer used here — remove it from the import.)

Change the `source` field on `ColorNamesOptions`:

```ts
  /**
   * Which dataset(s) answer, in priority order.
   *
   * Omit it for the package default chain. A single id pins the instance to
   * that source and throws when it has no data for the locale — unchanged
   * from before this option became optional. An array walks the sources in
   * order.
   *
   * Sources are never merged: exactly one answers an entire instance, chosen
   * at load time and fixed thereafter, so two colours resolved from the same
   * instance always come from the same dataset. `resolvedOptions().source`
   * and `resolve().source` always name the one that answered.
   */
  source?: string | readonly string[];
```

Add `sources` to `ResolvedColorNamesOptions`, after `source`:

```ts
  /** The chain that was considered, in priority order. */
  sources: string[];
```

Delete the now-unused `localesOf` helper (the one that reads `getSource(sourceId).languages`) — `chainLocales` replaces it.

Replace the private field declarations and constructor:

```ts
export class ColorNames {
  readonly #locale: string;
  readonly #options: Required<Omit<ColorNamesOptions, "source">> & { source: string };
  readonly #sources: string[];
  readonly #chunk: Chunk;

  constructor(locales: string | readonly string[], options: ColorNamesOptions = {}) {
    const sources = normalizeChain(options.source);
    const match = resolveSourceChain(locales, sources);
    if (match === undefined) {
      throw new RangeError(
        `No source has data for the requested locale(s). Tried: ${sources.join(", ")}. `
        + "Use ColorNames.supportedLocalesOf() to check first.",
      );
    }

    const chunk = getLoadedChunk(match.source, match.locale);
    if (chunk === undefined) {
      throw new Error(
        `Colour data for "${match.locale}" from source "${match.source}" is not loaded. `
        + `Call await ColorNames.load(${JSON.stringify(locales)}) first.`,
      );
    }

    this.#locale = match.locale;
    this.#sources = sources;
    this.#chunk = chunk;
    this.#options = {
      source: match.source,
      style: options.style ?? "long",
      fallback: options.fallback ?? "nearest",
      maxDistance: options.maxDistance
        ?? (chunk.model === "palette" ? DEFAULT_PALETTE_MAX_DISTANCE : DEFAULT_MAX_DISTANCE),
      topN: options.topN ?? DEFAULT_TOP_N,
    };
  }
```

Replace `load`:

```ts
  /**
   * Resolve the source and locale, load the chunk, and construct an instance.
   *
   * The original `locales` and `options` are handed to the constructor rather
   * than the resolved pair, so `resolvedOptions().sources` still reports the
   * whole chain that was considered rather than collapsing to the winner.
   * Resolution is deterministic, so the constructor reaches the same match.
   */
  static async load(
    locales: string | readonly string[],
    options: ColorNamesOptions = {},
  ): Promise<ColorNames> {
    const sources = normalizeChain(options.source);
    const match = resolveSourceChain(locales, sources);
    if (match === undefined) {
      throw new RangeError(
        `No source has data for the requested locale(s). Tried: ${sources.join(", ")}.`,
      );
    }
    await loadChunk(match.source, match.locale);
    return new ColorNames(locales, options);
  }
```

Replace `supportedLocalesOf`:

```ts
  static supportedLocalesOf(
    locales: string | readonly string[],
    options: { source?: string | readonly string[] } = {},
  ): string[] {
    return filterSupportedLocales(locales, chainLocales(normalizeChain(options.source)));
  }
```

Add `sources` to `resolvedOptions()`'s returned object, right after `source`:

```ts
      sources: [...this.#sources],
```

- [ ] **Step 4: Run the tests**

Run: `cd packages/i18n && bun test test/color-names.test.ts`
Expected: PASS, including the 14 new tests.

- [ ] **Step 5: Run the full suite and lint**

Run: `cd packages/i18n && bun test` then `cd /Users/grandmagus/Documents/Projects/urcolor && npx eslint packages/i18n`
Expected: PASS, lint clean. Every existing `ColorNames` test still passes — none of them omit `source`, so all take the single-string path whose behaviour is unchanged.

- [ ] **Step 6: Commit**

```bash
git add packages/i18n/src/color-names.ts packages/i18n/test/color-names.test.ts
git commit -m "feat(i18n): accept an optional source chain on ColorNames"
```

---

### Task 5: Ship the default, verify against real data, document it

**Files:**
- Modify: `src/index.ts`
- Test: `test/data.test.ts` (append)
- Modify: `README.md`
- Modify: `docs/guide/color-naming.md`

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: the shipped default chain `["uwdata", "wikidata"]`.

- [ ] **Step 1: Set the default in `src/index.ts`**

Add `setDefaultSources` to the existing import from `./engine/registry`, and immediately after the two `registerSource` calls:

```ts
// uwdata answers the 20 locales it covers; wikidata answers the other 278.
// Order matters and lives here rather than in the lookup layer, which never
// names a dataset. Adding a third source later is a one-line change.
setDefaultSources(["uwdata", "wikidata"]);
```

Also re-export the accessors alongside the existing registry exports:

```ts
export { listSources, getSource, getDefaultSources } from "./engine/registry";
```

- [ ] **Step 2: Write the failing integration test**

Append to `test/data.test.ts`. These assert against the real shipped chunks, because `zh-Hant` is the only tag where the ladder and the chain interact and a fixture inventing that collision could drift from what ships:

```ts
describe("default source chain against shipped data", () => {
  it("defaults to uwdata for a locale both sources cover", async () => {
    const names = await ColorNames.load("en");
    expect(names.resolvedOptions().source).toBe("uwdata");
    expect(names.resolvedOptions().sources).toEqual(["uwdata", "wikidata"]);
  });

  it("falls through to wikidata for a locale uwdata lacks", async () => {
    const names = await ColorNames.load("ka");
    expect(names.resolvedOptions().source).toBe("wikidata");
    expect(names.colorOf("ყვითელი")).toBeDefined();
  });

  it("gives zh to uwdata but zh-Hant to wikidata", async () => {
    // The only tag where an exact rung in the later source outranks a
    // stripped rung in the earlier one.
    expect((await ColorNames.load("zh")).resolvedOptions().source).toBe("uwdata");

    const hant = await ColorNames.load("zh-Hant");
    expect(hant.resolvedOptions().source).toBe("wikidata");
    expect(hant.resolvedOptions().locale).toBe("zh-Hant");
  });

  it("resolves a region variant through the base tag", async () => {
    const names = await ColorNames.load("de-AT");
    expect(names.resolvedOptions().source).toBe("uwdata");
    expect(names.resolvedOptions().locale).toBe("de");
  });

  it("keeps thin uwdata locales on uwdata by design", async () => {
    // Romanian has 4 uwdata terms vs 65 in wikidata. The rule is
    // locale-level on purpose; callers wanting breadth pass wikidata.
    expect((await ColorNames.load("ro")).resolvedOptions().source).toBe("uwdata");
    expect((await ColorNames.load("ro", { source: ["wikidata"] })).resolvedOptions().source)
      .toBe("wikidata");
  });

  it("supports every wikidata locale through the default chain", () => {
    const supported = ColorNames.supportedLocalesOf(["ka", "chr", "en", "xx"]);
    expect(supported).toEqual(["ka", "chr", "en"]);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `cd packages/i18n && bun test test/data.test.ts`
Expected: PASS. If `zh-Hant` resolves to `uwdata`, the ladder/chain loop order is wrong — the rung loop must sit outside the source loop.

- [ ] **Step 4: Run the full suite, lint, and build**

Run these three:
```bash
cd /Users/grandmagus/Documents/Projects/urcolor && npx eslint packages/i18n
cd /Users/grandmagus/Documents/Projects/urcolor/packages/i18n && bun test
cd /Users/grandmagus/Documents/Projects/urcolor/packages/i18n && bun run build
```
Expected: lint clean, all tests pass, `dist/` emits.

- [ ] **Step 5: Update `README.md`**

Two changes.

First, the usage example at the top currently passes `source` explicitly. Show the default alongside it:

```ts
import { ColorNames, ChannelNames } from "@urcolor/i18n";
import { Color } from "@urcolor/core";

// Default chain: uwdata where it has the locale, wikidata for the rest.
const ko = await ColorNames.load("ko");
ko.of(Color.parse("#3b82f6")!);          // "파랑색"  (uwdata)
const ka = await ColorNames.load("ka");
ka.resolvedOptions().source;             // "wikidata"

// Pin to one source when provenance must be fixed.
await ColorNames.load("ko", { source: "uwdata" });
```

Second, find the line stating that `source` is required because provenance is never implicit, and replace that claim with:

```markdown
Sources are never merged. Exactly one source answers an entire `ColorNames`
instance — chosen at load time and fixed thereafter, so two colours resolved
from the same instance always come from the same dataset. Omitting `source`
lets the package pick using the default chain (`uwdata`, then `wikidata`);
provenance is then implicit in the *request* but still explicit in the
*result*, since `resolve().source` and `resolvedOptions().source` always name
the dataset that answered. Passing a single id pins the instance and throws if
that source lacks the locale.
```

Add a short subsection documenting the chain, the `zh-Hant` case, and this caveat:

```markdown
`uwdata` covers 20 locales but several of them thinly — Romanian has 4 terms,
Finnish 11, Swedish 16 — where `wikidata` has 65, 65, and 170. Because the
rule is locale-level, `load("ro")` stays on `uwdata`'s 4 terms. That is
deliberate: the two sources answer different questions, and switching between
them on a coverage threshold would return perceptual data for one language and
catalogue data for another with no defensible cutoff. Pass
`{ source: ["wikidata"] }` if you want breadth over perceptual fidelity.
```

- [ ] **Step 6: Update `docs/guide/color-naming.md`**

Three exact edits. The file is 185 lines; do not restructure it.

**(a) The intro, lines 3-9.** It currently ends "...and `source` is always required, so you always know which one produced an answer." Replace that trailing clause so the sentence reads:

```markdown
`@urcolor/i18n` answers "what does this colour get called?" in a given
language, from either of two independent sources: `uwdata`, crowdsourced
colour-perception data that models how speakers spontaneously name a region
of colour space, or `wikidata`, an editorial catalogue of discrete named
colours contributed by Wikidata editors. They answer different questions —
see [Sources](#sources) below. By default `uwdata` answers the 20 locales it
covers and `wikidata` answers the rest; whichever one answered is always
named by `resolvedOptions().source`.
```

**(b) The options table, line 113.** Replace the `source` row with:

```markdown
| `source` | source id, or an array of them | `["uwdata", "wikidata"]` | Which dataset(s) answer, in priority order. A single id pins the instance and throws if that source lacks the locale |
```

**(c) The Sources section, lines 158-162.** It currently opens "`source` is required. Datasets are namespaced and never merged, because they use different methodologies and blending them would produce answers no source actually supports." Replace that paragraph with:

```markdown
Datasets are namespaced and never merged, because they use different
methodologies and blending them would produce answers no source actually
supports. Exactly one source answers an entire `ColorNames` instance, chosen
at load time and fixed thereafter.

Omitting `source` walks the default chain — `uwdata` first, then `wikidata`.
Provenance is then implicit in the *request* but still explicit in the
*result*: `resolve().source` and `resolvedOptions().source` always name the
dataset that answered, and `resolvedOptions().sources` reports the whole chain
that was considered.

Requesting a tag one source has exactly beats a tag another only reaches by
stripping subtags, so `load("zh-Hant")` gets `wikidata`'s Traditional Chinese
rather than `uwdata`'s Simplified `zh`. `load("zh")` still gets `uwdata`.
```

Then add, at the end of that section:

```markdown
`uwdata` covers 20 locales but several thinly — Romanian has 4 terms, Finnish
11, Swedish 16, where `wikidata` has 65, 65, and 170. The chain is
locale-level, so `load("ro")` stays on `uwdata`'s 4 terms. That is deliberate:
switching sources on a coverage threshold would return perceptual data for one
language and catalogue data for another with no defensible cutoff. Pass
`{ source: ["wikidata"] }` when you want breadth over perceptual fidelity.
```

Verify the Romanian/Finnish/Swedish term counts against `packages/i18n/src/data/uwdata/meta.json` and `packages/i18n/src/data/wikidata/meta.json` before writing them; if any disagrees with the numbers above, the file wins — use it and tell me.

- [ ] **Step 7: Verify the docs build**

Run: `cd /Users/grandmagus/Documents/Projects/urcolor && bun run docs:build`
Expected: succeeds.

- [ ] **Step 8: Commit**

```bash
git add packages/i18n/src/index.ts packages/i18n/test/data.test.ts packages/i18n/README.md docs/guide/color-naming.md
git commit -m "feat(i18n): default to uwdata, falling back to wikidata"
```

---

## Verification

After Task 5, all of this must hold:

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
npx eslint packages/i18n          # clean
cd packages/i18n && bun test      # all pass
bun run build                     # dist/ emits
cd .. && bun run docs:build       # succeeds
```

And from a consumer's point of view:

```ts
import { Color } from "@urcolor/core";
import { ColorNames } from "@urcolor/i18n";

(await ColorNames.load("en")).resolvedOptions().source;       // "uwdata"
(await ColorNames.load("ka")).resolvedOptions().source;       // "wikidata"
(await ColorNames.load("zh")).resolvedOptions().source;       // "uwdata"
(await ColorNames.load("zh-Hant")).resolvedOptions().source;  // "wikidata"
(await ColorNames.load("en")).resolvedOptions().sources;      // ["uwdata", "wikidata"]

await ColorNames.load("ka", { source: "uwdata" });            // throws RangeError
```
