/**
 * Print a changelog's `## Unreleased` section to stdout, for GitHub release notes.
 *
 * Usage: `bun run scripts/print-unreleased.ts <changelog>`
 *
 * Prints nothing and exits 0 when the section is empty or absent — the publish
 * workflow substitutes a one-line fallback, and a thin changelog is not a
 * reason to fail a release that already published to npm.
 */

import { unreleasedNotes } from "./rollover-changelog";

const path = process.argv[2];
if (!path) {
  console.error("usage: bun run scripts/print-unreleased.ts <changelog>");
  process.exit(1);
}

const file = Bun.file(path);
if (await file.exists()) {
  const notes = unreleasedNotes(await file.text());
  if (notes) console.log(notes);
}
