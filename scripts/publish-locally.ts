/**
 * Publish packages from a developer machine, for the one case CI cannot cover:
 * npm demands a one-time password to *create* a package, and a CI token has no
 * way to supply one. Publishing an already-existing package works fine in CI —
 * this is only for a package's very first release.
 *
 * It reproduces exactly what the publish workflow does, in order:
 *
 *   build -> resolve workspace ranges -> verify publishable -> pack -> publish
 *
 * The manifest rewrite is undone immediately after packing, so the repository
 * is never left holding resolved ranges. Packing first also means the tarball
 * is fixed before npm is contacted: an OTP typed too late fails the upload, not
 * the contents.
 *
 * Publishes lack provenance, which needs the OIDC token only GitHub Actions
 * has. Every later version goes through CI and is attested normally.
 *
 * Usage:
 *   bun run scripts/publish-locally.ts --dry-run          # pack and verify only
 *   bun run scripts/publish-locally.ts                    # publish, npm prompts for the OTP
 *   bun run scripts/publish-locally.ts --otp 123456       # publish with the code inline
 *   bun run scripts/publish-locally.ts urcolor i18n       # a subset, in the order given
 */

import { $ } from "bun";
import { checkPublishable } from "./check-publishable";
import { resolveWorkspaceDeps } from "./resolve-workspace-deps";

/**
 * Dependency order: a package must not be published before something it
 * depends on, or npm briefly serves a manifest whose dependency cannot be
 * resolved. core first, then what depends only on core, then the bindings.
 */
const ORDER = [
  { name: "core", dir: "packages/core" },
  { name: "urcolor", dir: "packages/urcolor" },
  { name: "primitives", dir: "packages/primitives" },
  { name: "relative", dir: "packages/relative" },
  { name: "i18n", dir: "packages/i18n" },
  { name: "vue", dir: "packages/vue" },
  { name: "react", dir: "packages/react" },
  { name: "svelte", dir: "packages/svelte" },
  // ng-packagr writes the importable manifest into dist/; publishing from the
  // package root would ship one with no entry points.
  { name: "angular", dir: "packages/angular", publishDir: "packages/angular/dist" },
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const otpIndex = args.indexOf("--otp");
const otp = otpIndex >= 0 ? args[otpIndex + 1] : undefined;
const names = args.filter((a, i) => !a.startsWith("--") && i !== otpIndex + 1);

const selected = names.length > 0
  ? ORDER.filter(p => names.includes(p.name))
  : ORDER;

if (names.length > 0 && selected.length !== names.length) {
  const known = ORDER.map(p => p.name).join(", ");
  console.error(`unknown package in [${names.join(", ")}]. known: ${known}`);
  process.exit(1);
}

// Checked first, because npm answers a PUT from an unauthenticated client with
// 404 rather than 401 — the same status as a package that does not exist. That
// makes "you are not logged in" read as "this package is not in the registry",
// which sends you looking in the wrong place entirely.
if (!dryRun) {
  const who = await $`npm whoami`.nothrow().quiet();
  if (who.exitCode !== 0) {
    console.error("npm is not authenticated on this machine.");
    console.error("Run `npm login` first — publishing a package for the first time");
    console.error("needs a real login, since npm asks for a one-time password and a");
    console.error("CI token has no way to answer.");
    process.exit(1);
  }
  console.log(`Publishing as ${who.text().trim()}.`);
}

console.log(`Building all packages first — a stale dist is worse than no dist.`);
await $`bun run build`.quiet();

for (const pkg of selected) {
  const publishDir = pkg.publishDir ?? pkg.dir;
  const manifestPath = `${pkg.dir}/package.json`;
  const { name, version } = await Bun.file(manifestPath).json();
  console.log(`\n=== ${name}@${version} (from ${publishDir})`);

  // Resolve, verify and pack; then put the manifest back whatever happens, so
  // a failure here never leaves `^1.0.0` where `workspace:*` belongs.
  let tarball: string;
  try {
    const changes = await resolveWorkspaceDeps(publishDir);
    for (const change of changes) console.log(`  resolved ${change}`);

    const issues = await checkPublishable(publishDir);
    if (issues.length > 0) {
      console.error(`  not publishable:\n${issues.map(i => `    - ${i}`).join("\n")}`);
      process.exit(1);
    }

    const packed = await $`npm pack --pack-destination ${process.cwd()}`.cwd(publishDir).text();
    tarball = `${process.cwd()}/${packed.trim().split("\n").pop()}`;
    console.log(`  packed ${tarball.split("/").pop()}`);
  } finally {
    // Only tracked manifests need restoring; angular's dist is gitignored.
    await $`git checkout -- ${manifestPath}`.nothrow().quiet();
  }

  if (dryRun) {
    console.log(`  dry run: not publishing. Tarball kept at ${tarball}`);
    continue;
  }

  const otpArgs = otp ? ["--otp", otp] : [];
  const result = await $`npm publish ${tarball} --access public ${otpArgs}`.nothrow();
  if (result.exitCode !== 0) {
    console.error(`  publish failed for ${name}. Later packages were not attempted.`);
    process.exit(result.exitCode);
  }
  await $`rm -f ${tarball}`.quiet();
  console.log(`  published ${name}@${version}`);
}

console.log(`\nDone. Versions after this point publish through CI, with provenance.`);
