/**
 * Close the `## Unreleased` section of a changelog under a version heading.
 *
 * Run by the publish workflow after a release: everything accumulated under
 * `## Unreleased` becomes `## [<version>] - <date>`, and a fresh empty
 * `## Unreleased` takes its place for the next cycle.
 *
 * Both `## Unreleased` and `## [Unreleased]` are accepted — the changelogs in
 * this repo use the bare form, the Keep a Changelog examples use the bracketed
 * one, and a release must not hinge on which was typed. The heading written
 * back is always the bare form.
 *
 * Usage: `bun run scripts/rollover-changelog.ts <changelog> <version> [date]`
 */

// `[ \t]*` rather than `\s*`: the latter swallows the blank line after the
// heading, and the rollover would then weld the new version heading onto the
// first line of the notes.
const UNRELEASED = /^## \[?Unreleased\]?[ \t]*$/m;

/** The release notes: everything under `## Unreleased`, up to the next `## `. */
export function unreleasedNotes(changelog: string): string {
  const start = changelog.match(UNRELEASED);
  if (start?.index === undefined) return "";
  const rest = changelog.slice(start.index + start[0].length);
  const next = rest.search(/^## /m);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

/** Rewrite `## Unreleased` as `## [version] - date`, above a new empty one. */
export function rollover(changelog: string, version: string, date: string): string {
  const match = changelog.match(UNRELEASED);
  if (match?.index === undefined) {
    throw new Error("no `## Unreleased` heading to roll over");
  }
  return changelog.replace(UNRELEASED, `## Unreleased\n\n## [${version}] - ${date}`);
}

if (import.meta.main) {
  const [path, version, date] = process.argv.slice(2);
  if (!path || !version) {
    console.error("usage: bun run scripts/rollover-changelog.ts <changelog> <version> [date]");
    process.exit(1);
  }
  const file = Bun.file(path);
  if (!(await file.exists())) {
    console.error(`${path}: no changelog, nothing to roll over`);
    process.exit(1);
  }
  const stamp = date || new Date().toISOString().slice(0, 10);
  await Bun.write(path, rollover(await file.text(), version, stamp));
  console.log(`${path}: Unreleased -> [${version}] - ${stamp}`);
}
