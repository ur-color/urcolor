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

/**
 * Filter requested tags down to those that negotiate to something available,
 * preserving the caller's original tags. Mirrors `Intl.*.supportedLocalesOf`.
 */
export function filterSupportedLocales(
  requested: string | readonly string[],
  available: readonly string[],
): string[] {
  const requestedTags = typeof requested === "string" ? [requested] : requested;
  return requestedTags.filter(tag => negotiateLocale(tag, available) !== undefined);
}
