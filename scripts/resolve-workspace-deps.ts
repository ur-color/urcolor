/**
 * Rewrite `workspace:` dependency ranges to published ranges, in place.
 *
 * Workspace protocol ranges are a Bun/npm install-time convention; npm's
 * registry rejects a manifest that still contains them. The publish workflow
 * therefore runs this against the package it is about to publish, after the
 * build and immediately before `npm publish`, on a checkout it then throws
 * away — the committed manifest keeps saying `workspace:*`.
 *
 * Ranges are translated the way the workspace itself resolves them:
 *
 * - `workspace:*` -> `^<version>` — a caret, not a pin. `@urcolor/vue` and an
 *   app that installed `urcolor` directly must be able to agree on one copy of
 *   `@urcolor/core`; two exact pins one patch apart would install two, and
 *   `instanceof Color` would start returning false across the seam.
 * - `workspace:^x.y.z` / `workspace:~x.y.z` -> the range as written, minus the
 *   protocol. An explicit range is a deliberate statement; it is kept.
 *
 * Usage: `bun run scripts/resolve-workspace-deps.ts packages/<name>`
 */

const DEP_FIELDS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
  "devDependencies",
] as const;

type Manifest = {
  name?: string;
  version?: string;
} & Partial<Record<(typeof DEP_FIELDS)[number], Record<string, string>>>;

/** Every workspace package's own version, keyed by package name. */
async function workspaceVersions(root: string): Promise<Map<string, string>> {
  const versions = new Map<string, string>();
  const glob = new Bun.Glob("packages/*/package.json");
  for await (const rel of glob.scan({ cwd: root })) {
    const pkg = (await Bun.file(`${root}/${rel}`).json()) as Manifest;
    if (pkg.name && pkg.version) versions.set(pkg.name, pkg.version);
  }
  return versions;
}

/** The published range for one `workspace:` specifier. */
function resolveRange(dep: string, range: string, versions: Map<string, string>): string {
  const rest = range.slice("workspace:".length);
  if (rest !== "*" && rest !== "^" && rest !== "~") return rest;

  const version = versions.get(dep);
  if (version === undefined) {
    throw new Error(`"${dep}" is not a workspace package, so "${range}" cannot be resolved`);
  }
  // `workspace:~` keeps its operator; `*` and `^` both become a caret.
  return `${rest === "~" ? "~" : "^"}${version}`;
}

export async function resolveWorkspaceDeps(dir: string, root = process.cwd()): Promise<string[]> {
  const path = `${dir}/package.json`;
  const manifest = (await Bun.file(path).json()) as Manifest;
  const versions = await workspaceVersions(root);
  const changes: string[] = [];

  for (const field of DEP_FIELDS) {
    const deps = manifest[field];
    if (!deps) continue;
    for (const [dep, range] of Object.entries(deps)) {
      if (!range.startsWith("workspace:")) continue;
      const resolved = resolveRange(dep, range, versions);
      deps[dep] = resolved;
      changes.push(`${field}.${dep}: ${range} -> ${resolved}`);
    }
  }

  // Only touch the file when something changed, so a package without workspace
  // deps is not reformatted by the round trip through JSON.
  if (changes.length > 0) await Bun.write(path, `${JSON.stringify(manifest, null, 2)}\n`);
  return changes;
}

if (import.meta.main) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: bun run scripts/resolve-workspace-deps.ts packages/<name>");
    process.exit(1);
  }
  const changes = await resolveWorkspaceDeps(dir);
  console.log(changes.length > 0 ? changes.join("\n") : `${dir}: no workspace ranges to resolve`);
}
