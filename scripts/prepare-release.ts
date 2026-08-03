/**
 * Work out each package's next version from its commits, and write the
 * changelog entry and the version bump.
 *
 * Run by `.github/workflows/release-prepare.yml`, which opens a pull request
 * with the result. Merging that PR lands the version bumps on main, which is
 * what the existing `publish-<package>.yml` workflows trigger on — so the
 * release path is unchanged, only the bookkeeping in front of it is automated.
 *
 * A package's commits are those touching its directory since the tag its
 * current version was released under (`@urcolor/core@2.0.0`, the tag the
 * publish workflow creates). With no such tag — a package that has never
 * shipped — every commit touching the directory counts.
 *
 * Generated entries are *appended* under `## Unreleased`, never substituted for
 * what is already written there. The changelogs in this repository explain why
 * a change was made, which no commit subject line can reconstruct; the generated
 * lines are a floor, not a replacement, and the pull request is where a human
 * rewrites them into prose.
 *
 * Usage:
 *   bun run scripts/prepare-release.ts            # write changes
 *   bun run scripts/prepare-release.ts --dry-run  # print what would change
 *   bun run scripts/prepare-release.ts core vue   # only these packages
 */

import { $ } from "bun";
import { bumpFor, compareVersions, type Commit, nextVersion, renderEntries } from "./semver-from-commits";

const SEPARATOR = "<<<commit>>>";

type Package = { dir: string; name: string; version: string; short: string };

/** Every workspace package, with its manifest identity. */
async function packages(): Promise<Package[]> {
  const found: Package[] = [];
  const glob = new Bun.Glob("packages/*/package.json");
  for await (const rel of glob.scan({ cwd: process.cwd() })) {
    const manifest = await Bun.file(rel).json();
    if (!manifest.name || !manifest.version) continue;
    const dir = rel.replace(/\/package\.json$/, "");
    found.push({ dir, name: manifest.name, version: manifest.version, short: dir.split("/")[1] as string });
  }
  return found.sort((a, b) => a.short.localeCompare(b.short));
}

/**
 * The highest version this package was actually released at, from its git tags.
 *
 * The manifest version is the wrong baseline: a version bumped by hand and not
 * yet published would be bumped a second time here, turning an unreleased 2.0.0
 * into 3.0.0 and skipping the release the bump was made for. Tags are written
 * by the publish workflow, so they mark what genuinely shipped.
 */
async function lastReleased(name: string): Promise<string | null> {
  const tags = await $`git tag --list ${`${name}@*`}`.nothrow().quiet();
  if (tags.exitCode !== 0) return null;

  const versions = tags
    .text()
    .split("\n")
    .map(t => t.trim().slice(name.length + 1))
    .filter(v => /^\d+\.\d+\.\d+$/.test(v));

  if (versions.length === 0) return null;
  return versions.sort(compareVersions).pop() as string;
}

/** Commits touching `dir` since `tag`, or all of them when the tag is absent. */
async function commitsSince(dir: string, tag: string): Promise<Commit[]> {
  const exists = await $`git rev-parse -q --verify ${`refs/tags/${tag}`}`.nothrow().quiet();
  const range = exists.exitCode === 0 ? `${tag}..HEAD` : "HEAD";

  // %x1e (record separator) rather than a newline: commit bodies contain blank
  // lines, and BREAKING CHANGE footers live in them.
  const log = await $`git log ${range} --no-merges --format=${`${SEPARATOR}%h%x1f%B`} -- ${dir}`.nothrow().quiet();
  if (log.exitCode !== 0) return [];

  return log
    .text()
    .split(SEPARATOR)
    .filter(chunk => chunk.trim().length > 0)
    .map(chunk => {
      const [hash = "", message = ""] = chunk.split("\x1f");
      return { hash: hash.trim(), message: message.trim() };
    });
}

/** Insert `entries` directly under the `## Unreleased` heading. */
export function insertUnreleased(changelog: string, entries: string): string {
  const heading = /^## \[?Unreleased\]?[ \t]*$/m;
  const match = changelog.match(heading);
  if (match?.index === undefined) {
    throw new Error("no `## Unreleased` heading to write under");
  }
  const at = match.index + match[0].length;
  return `${changelog.slice(0, at)}\n\n${entries}${changelog.slice(at)}`;
}

// Everything above is importable; everything below runs only as a command.
// Without this guard, importing `insertUnreleased` from a test rewrites every
// manifest and changelog in the repository as a side effect of the import.
if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const only = args.filter(a => !a.startsWith("--"));

  const all = await packages();
  const selected = only.length > 0 ? all.filter(p => only.includes(p.short) || only.includes(p.name)) : all;

  if (only.length > 0 && selected.length !== only.length) {
    console.error(`unknown package. known: ${all.map(p => p.short).join(", ")}`);
    process.exit(1);
  }

  const released: string[] = [];

  for (const pkg of selected) {
    const baseline = await lastReleased(pkg.name);
    const commits = await commitsSince(pkg.dir, `${pkg.name}@${baseline ?? pkg.version}`);
    const bump = bumpFor(commits);

    if (bump === "none") {
      console.log(`${pkg.name}: nothing to release (${commits.length} commits, none user-facing)`);
      continue;
    }

    // Bump from what shipped, but never propose a version below the manifest:
    // a deliberate hand bump that has not been released yet is the floor.
    const computed = nextVersion(baseline ?? "0.0.0", bump);
    const next = compareVersions(computed, pkg.version) > 0 ? computed : pkg.version;

    // The manifest already holds the version these commits call for: the
    // release is staged and waiting to be published. Writing the entries again
    // would duplicate them under `## Unreleased`.
    if (next === pkg.version) {
      console.log(`${pkg.name}: already staged at ${pkg.version} (${bump} from ${commits.length} commits)`);
      continue;
    }

    const entries = renderEntries(commits);
    console.log(`${pkg.name}: ${pkg.version} -> ${next} (${bump}, from ${commits.length} commits)`);
    if (dryRun) {
      console.log(entries.replace(/^/gm, "    "));
      continue;
    }

    const manifestPath = `${pkg.dir}/package.json`;
    const manifest = await Bun.file(manifestPath).text();
    await Bun.write(manifestPath, manifest.replace(/("version":\s*")[^"]*(")/, `$1${next}$2`));

    const changelogPath = `${pkg.dir}/CHANGELOG.md`;
    if (await Bun.file(changelogPath).exists()) {
      await Bun.write(changelogPath, insertUnreleased(await Bun.file(changelogPath).text(), entries));
    } else {
      console.warn(`  no CHANGELOG.md — version bumped, entries not written`);
    }
    released.push(`${pkg.name} ${pkg.version} -> ${next}`);
  }

  if (!dryRun) {
    // Read by the workflow to decide whether a pull request is worth opening.
    await Bun.write("release-summary.txt", released.join("\n"));
    console.log(released.length > 0 ? `\n${released.length} package(s) to release` : "\nnothing to release");
  }
}
