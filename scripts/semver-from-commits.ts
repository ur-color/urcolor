/**
 * Derive a semver bump and changelog entries from Conventional Commits.
 *
 * Pure functions only — no git, no filesystem — so the interesting decisions
 * (what counts as breaking, which section a type lands in, how a scope is
 * stripped) are testable without a repository to run against.
 *
 * The convention read here:
 *
 *   <type>[(scope)][!]: <subject>
 *   [body]
 *   [BREAKING CHANGE: ...]
 *
 * `!` after the type or a `BREAKING CHANGE:` footer means major. `feat` means
 * minor. Everything else that reaches a user — `fix`, `perf`, `revert` — means
 * patch. `chore`, `docs`, `test`, `ci`, `build`, `style` mean no release at
 * all: shipping a version whose only change was a typo in a comment wastes a
 * version number and tells a reader nothing.
 */

export type Bump = "major" | "minor" | "patch" | "none";

export type Commit = {
  /** Full message: subject line, then body. */
  message: string;
  /** Short hash, for the changelog entry. */
  hash?: string;
};

export type ParsedCommit = {
  type: string;
  scope?: string;
  subject: string;
  breaking: boolean;
  /** The `BREAKING CHANGE:` footer body, when there is one. */
  breakingNote?: string;
  hash?: string;
};

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<bang>!)?:\s*(?<subject>.+)$/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:\s*(?<note>[\s\S]+)$/m;

/**
 * Git trailers, which sit in the same footer block as `BREAKING CHANGE:` and
 * would otherwise be swallowed into the note — a changelog entry ending in
 * "Co-Authored-By: …" helps nobody.
 */
const TRAILER = /^(Co-Authored-By|Signed-off-by|Claude-Session|Reviewed-by|Refs|Closes|Fixes|Acked-by):/i;

/** The breaking-change note, trailers dropped and folded onto one line. */
function cleanNote(note: string): string {
  const lines: string[] = [];
  for (const line of note.split("\n")) {
    if (TRAILER.test(line.trim())) break;
    lines.push(line.trim());
  }
  return lines.join(" ").replace(/\s+/g, " ").trim();
}

/** Compare two `major.minor.patch` versions the way semver orders them. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/** Which release a commit type forces on its own, before breaking changes. */
const TYPE_BUMP: Record<string, Bump> = {
  feat: "minor",
  fix: "patch",
  perf: "patch",
  revert: "patch",
  refactor: "none",
  chore: "none",
  docs: "none",
  test: "none",
  ci: "none",
  build: "none",
  style: "none",
};

/** Changelog section per type, in the order Keep a Changelog lists them. */
const TYPE_SECTION: Record<string, string> = {
  feat: "Added",
  fix: "Fixed",
  perf: "Performance",
  revert: "Changed",
  refactor: "Changed",
};

const SECTION_ORDER = ["Added", "Changed", "Removed", "Fixed", "Performance"];

const RANK: Record<Bump, number> = { none: 0, patch: 1, minor: 2, major: 3 };

/** Parse one commit message, or `null` when it does not follow the convention. */
export function parseCommit(commit: Commit): ParsedCommit | null {
  const [header = "", ...rest] = commit.message.split("\n");
  const m = HEADER.exec(header.trim());
  if (!m?.groups) return null;

  const body = rest.join("\n");
  const footer = BREAKING_FOOTER.exec(body);
  return {
    type: m.groups.type as string,
    scope: m.groups.scope || undefined,
    subject: m.groups.subject as string,
    breaking: m.groups.bang === "!" || footer !== null,
    breakingNote: footer?.groups?.note ? cleanNote(footer.groups.note) : undefined,
    hash: commit.hash,
  };
}

/** The bump a single commit demands. */
export function bumpForCommit(parsed: ParsedCommit): Bump {
  // A breaking change is major whatever its type — `refactor!` reshapes an API
  // just as surely as `feat!` does, and on its own `refactor` releases nothing.
  if (parsed.breaking) return "major";
  return TYPE_BUMP[parsed.type] ?? "none";
}

/** The strongest bump any of these commits demands. */
export function bumpFor(commits: Commit[]): Bump {
  let result: Bump = "none";
  for (const commit of commits) {
    const parsed = parseCommit(commit);
    if (!parsed) continue;
    const bump = bumpForCommit(parsed);
    if (RANK[bump] > RANK[result]) result = bump;
  }
  return result;
}

/**
 * Apply a bump to a version.
 *
 * Pre-1.0.0 is deliberately *not* special-cased: this repository publishes
 * 1.x and 2.x, and the "breaking changes are minor while 0.x" convention would
 * silently downgrade a major here.
 */
export function nextVersion(current: string, bump: Bump): string {
  if (bump === "none") return current;
  const [major = 0, minor = 0, patch = 0] = current.split(".").map(Number);
  if ([major, minor, patch].some(n => !Number.isInteger(n))) {
    throw new Error(`"${current}" is not a plain major.minor.patch version`);
  }
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Render commits as Keep a Changelog sections.
 *
 * Breaking changes lead their section as **BREAKING**, matching how the
 * existing changelogs in this repository mark them, and carry the footer note
 * when the commit wrote one — that note is usually the migration instruction,
 * which is the part a reader actually needs.
 */
export function renderEntries(commits: Commit[]): string {
  const sections = new Map<string, string[]>();

  for (const commit of commits) {
    const parsed = parseCommit(commit);
    if (!parsed) continue;
    if (bumpForCommit(parsed) === "none") continue;

    const section = parsed.breaking
      ? (TYPE_SECTION[parsed.type] ?? "Changed")
      : (TYPE_SECTION[parsed.type] as string);
    const scope = parsed.scope ? `**${parsed.scope}:** ` : "";
    const prefix = parsed.breaking ? "**BREAKING:** " : "";
    const note = parsed.breakingNote ? ` ${parsed.breakingNote}` : "";
    const hash = parsed.hash ? ` (${parsed.hash})` : "";

    const lines = sections.get(section) ?? [];
    lines.push(`- ${prefix}${scope}${parsed.subject}${hash}${note}`);
    sections.set(section, lines);
  }

  return SECTION_ORDER
    .filter(s => sections.has(s))
    .map(s => `### ${s}\n\n${(sections.get(s) as string[]).join("\n")}`)
    .join("\n\n");
}
