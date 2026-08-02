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
