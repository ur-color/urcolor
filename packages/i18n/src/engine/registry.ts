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
