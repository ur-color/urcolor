import type { Chunk, ChunkLoaders, NameSource } from "./types";

interface RegisteredSource {
  source: NameSource;
  loaders: ChunkLoaders;
  chunks: Map<string, Chunk>;
}

const registry = new Map<string, RegisteredSource>();

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

/**
 * Freezes the descriptor and its `languages` map before storing it, so a
 * caller holding a reference from {@link getSource}/{@link listSources}
 * can't mutate shared registry state — e.g. `ColorNames` re-reads
 * `languages` on every construction and `resolvedOptions()` call, so an
 * uncaught mutation there would silently corrupt locale negotiation for
 * every subsequent use of the source, not just the caller that mutated it.
 */
export function registerSource(source: NameSource, loaders: ChunkLoaders): void {
  const languages = Object.freeze({ ...source.languages });
  const frozenSource = Object.freeze({ ...source, languages });
  registry.set(source.id, { source: frozenSource, loaders, chunks: new Map() });
}

export function listSources(): NameSource[] {
  return [...registry.values()].map(entry => entry.source);
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
