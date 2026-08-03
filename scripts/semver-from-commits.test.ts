import { describe, expect, it } from "bun:test";
import { bumpFor, nextVersion, parseCommit, renderEntries } from "./semver-from-commits";

const c = (message: string, hash?: string) => ({ message, hash });

describe("parseCommit", () => {
  it("reads type, scope and subject", () => {
    expect(parseCommit(c("feat(core): add an hsv space"))).toMatchObject({
      type: "feat",
      scope: "core",
      subject: "add an hsv space",
      breaking: false,
    });
  });

  it("treats a bang as breaking", () => {
    expect(parseCommit(c("refactor!: rename channelX to xChannel"))?.breaking).toBe(true);
  });

  it("treats a BREAKING CHANGE footer as breaking, and keeps the note", () => {
    const parsed = parseCommit(c("feat: new gamut mapping\n\nBREAKING CHANGE: gamutMap now returns Oklch."));
    expect(parsed?.breaking).toBe(true);
    expect(parsed?.breakingNote).toBe("gamutMap now returns Oklch.");
  });

  it("returns null for a message that is not conventional", () => {
    expect(parseCommit(c("fixed the thing"))).toBeNull();
    expect(parseCommit(c("Merge branch 'main'"))).toBeNull();
  });
});

describe("bumpFor", () => {
  it("takes the strongest bump present", () => {
    expect(bumpFor([c("fix: a"), c("feat: b"), c("chore: c")])).toBe("minor");
    expect(bumpFor([c("fix: a"), c("feat!: b")])).toBe("major");
  });

  it("releases nothing for housekeeping alone", () => {
    expect(bumpFor([c("docs: readme"), c("chore: deps"), c("test: more")])).toBe("none");
  });

  // A refactor is invisible to users — until it renames their props.
  it("makes a breaking refactor major, though a plain one releases nothing", () => {
    expect(bumpFor([c("refactor: extract a helper")])).toBe("none");
    expect(bumpFor([c("refactor!: move gradients to shared")])).toBe("major");
  });

  it("ignores commits that do not follow the convention", () => {
    expect(bumpFor([c("wip"), c("fix: real one")])).toBe("patch");
  });
});

describe("nextVersion", () => {
  it("bumps each level and zeroes the ones below", () => {
    expect(nextVersion("1.2.3", "major")).toBe("2.0.0");
    expect(nextVersion("1.2.3", "minor")).toBe("1.3.0");
    expect(nextVersion("1.2.3", "patch")).toBe("1.2.4");
  });

  it("leaves the version alone when nothing is releasable", () => {
    expect(nextVersion("1.2.3", "none")).toBe("1.2.3");
  });

  // 0.x is not special-cased: this repo ships 1.x and 2.x, and the "breaking is
  // minor while 0.x" convention would quietly downgrade a major.
  it("treats 0.x like any other version", () => {
    expect(nextVersion("0.4.1", "major")).toBe("1.0.0");
  });

  it("rejects a version it cannot parse rather than guessing", () => {
    expect(() => nextVersion("1.0.0-beta.1", "patch")).toThrow(/not a plain/);
  });
});

describe("renderEntries", () => {
  it("groups by section in Keep a Changelog order", () => {
    const out = renderEntries([c("fix: clamp alpha"), c("feat: add hwb"), c("perf: cache lookups")]);
    expect(out.indexOf("### Added")).toBeLessThan(out.indexOf("### Fixed"));
    expect(out.indexOf("### Fixed")).toBeLessThan(out.indexOf("### Performance"));
  });

  it("marks breaking changes and carries the migration note", () => {
    const out = renderEntries([c("feat!: drop culori\n\nBREAKING CHANGE: use Color.parse instead.")]);
    expect(out).toContain("**BREAKING:** drop culori");
    expect(out).toContain("use Color.parse instead.");
  });

  it("keeps the scope and the hash when present", () => {
    expect(renderEntries([c("fix(vue): stop re-parsing", "a1b2c3d")]))
      .toContain("- **vue:** stop re-parsing (a1b2c3d)");
  });

  it("leaves out commits that release nothing", () => {
    expect(renderEntries([c("chore: bump deps"), c("docs: fix a typo")])).toBe("");
  });
});
