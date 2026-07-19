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
  return requestedTags.filter(tag => negotiateLocale(tag, available) !== undefined);
}
