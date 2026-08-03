/**
 * Verify a built package before it is published.
 *
 * npm accepts almost anything: a manifest with no `exports` publishes happily
 * and only fails at `import` time, on a version number that can never be reused.
 * This checks the things that make a tarball actually installable, and the
 * publish workflow runs it between the build and `npm publish`.
 *
 * What it checks:
 *
 * - `name`, `version` and `license` are present. A missing license reads as
 *   "all rights reserved" to anyone auditing dependencies.
 * - Every entry point — `main`, `module`, `types`, `typings` and each string in
 *   the `exports` tree — points at a file that exists. This is what catches a
 *   package published from the wrong directory: `@urcolor/angular` builds via
 *   ng-packagr, which writes the real manifest into `dist/`, so publishing from
 *   the package root would have shipped a manifest with no entry points at all.
 * - No `workspace:` range survives. npm rejects those, and finding out during
 *   `npm publish` means the release is already half done.
 *
 * Usage: `bun run scripts/check-publishable.ts <publish-dir>`
 */

export type Manifest = {
  name?: string;
  version?: string;
  license?: string;
  main?: string;
  module?: string;
  types?: string;
  typings?: string;
  exports?: unknown;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

/** Every file path an entry point refers to, `exports` conditions included. */
export function entryPaths(manifest: Manifest): string[] {
  const paths: string[] = [];

  for (const field of ["main", "module", "types", "typings"] as const) {
    const value = manifest[field];
    if (typeof value === "string") paths.push(value);
  }

  // `exports` nests arbitrarily: subpaths, then conditions, then more
  // conditions. Only the leaf strings are files.
  const walk = (node: unknown): void => {
    if (typeof node === "string") {
      paths.push(node);
    } else if (Array.isArray(node)) {
      for (const item of node) walk(item);
    } else if (node && typeof node === "object") {
      for (const value of Object.values(node)) walk(value);
    }
  };
  walk(manifest.exports);

  // "./package.json" is the manifest itself, which trivially exists.
  return [...new Set(paths)].filter(p => p.startsWith(".") && p !== "./package.json");
}

/** Unresolved `workspace:` ranges, as `field.name` strings. */
export function workspaceRanges(manifest: Manifest): string[] {
  const found: string[] = [];
  for (const field of ["dependencies", "peerDependencies", "optionalDependencies"] as const) {
    for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
      if (range.startsWith("workspace:")) found.push(`${field}.${dep}`);
    }
  }
  return found;
}

/** Problems with `manifest`, given which of its entry paths exist. */
export function problems(manifest: Manifest, missingEntries: string[]): string[] {
  const issues: string[] = [];

  if (!manifest.name) issues.push("no `name`");
  if (!manifest.version) issues.push("no `version`");
  if (!manifest.license) issues.push("no `license`");
  if (entryPaths(manifest).length === 0) {
    issues.push("no entry points: nothing here can be imported");
  }
  for (const entry of missingEntries) issues.push(`entry point does not exist: ${entry}`);
  for (const range of workspaceRanges(manifest)) {
    issues.push(`unresolved workspace range: ${range}`);
  }
  return issues;
}

export async function checkPublishable(dir: string): Promise<string[]> {
  const manifestPath = `${dir}/package.json`;
  if (!(await Bun.file(manifestPath).exists())) return [`no package.json in ${dir}`];

  const manifest = (await Bun.file(manifestPath).json()) as Manifest;
  const missing: string[] = [];
  for (const entry of entryPaths(manifest)) {
    if (!(await Bun.file(`${dir}/${entry}`).exists())) missing.push(entry);
  }
  return problems(manifest, missing);
}

if (import.meta.main) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: bun run scripts/check-publishable.ts <publish-dir>");
    process.exit(1);
  }
  const issues = await checkPublishable(dir);
  if (issues.length > 0) {
    console.error(`${dir} is not publishable:`);
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  console.log(`${dir}: publishable`);
}
