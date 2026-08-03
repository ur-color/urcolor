import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveWorkspaceDeps } from "./resolve-workspace-deps";

let root = "";

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = "";
});

/** A throwaway workspace: `packages/<name>/package.json` for each entry. */
async function workspace(pkgs: Record<string, object>): Promise<string> {
  root = await mkdtemp(join(tmpdir(), "urcolor-ws-"));
  for (const [name, manifest] of Object.entries(pkgs)) {
    await Bun.write(join(root, "packages", name, "package.json"), JSON.stringify(manifest, null, 2));
  }
  return root;
}

async function manifestOf(dir: string): Promise<Record<string, Record<string, string>>> {
  return await Bun.file(join(dir, "package.json")).json();
}

describe("resolveWorkspaceDeps", () => {
  it("turns `workspace:*` into a caret range on the workspace version", async () => {
    const ws = await workspace({
      core: { name: "@urcolor/core", version: "1.2.3" },
      vue: { name: "@urcolor/vue", version: "0.1.0", dependencies: { "@urcolor/core": "workspace:*" } },
    });

    await resolveWorkspaceDeps(join(ws, "packages/vue"), ws);

    expect((await manifestOf(join(ws, "packages/vue"))).dependencies).toEqual({
      "@urcolor/core": "^1.2.3",
    });
  });

  it("resolves peer and optional deps too, and leaves registry ranges alone", async () => {
    const ws = await workspace({
      core: { name: "@urcolor/core", version: "1.2.3" },
      react: {
        name: "@urcolor/react",
        version: "0.0.1",
        dependencies: { "@urcolor/core": "workspace:*", "reka-ui": "^2.8.0" },
        peerDependencies: { "@urcolor/core": "workspace:*", react: ">=18" },
      },
    });

    await resolveWorkspaceDeps(join(ws, "packages/react"), ws);

    const m = await manifestOf(join(ws, "packages/react"));
    expect(m.dependencies).toEqual({ "@urcolor/core": "^1.2.3", "reka-ui": "^2.8.0" });
    expect(m.peerDependencies).toEqual({ "@urcolor/core": "^1.2.3", react: ">=18" });
  });

  it("resolves devDependencies too, so a build-only workspace range never reaches the tarball", async () => {
    const ws = await workspace({
      shared: { name: "@urcolor/shared", version: "1.0.0" },
      core: {
        name: "@urcolor/core",
        version: "2.0.0",
        devDependencies: { "@urcolor/shared": "workspace:*" },
      },
    });

    await resolveWorkspaceDeps(join(ws, "packages/core"), ws);

    expect((await manifestOf(join(ws, "packages/core"))).devDependencies).toEqual({
      "@urcolor/shared": "^1.0.0",
    });
  });

  it("keeps an explicit range, dropping only the protocol", async () => {
    const ws = await workspace({
      core: { name: "@urcolor/core", version: "1.2.3" },
      i18n: { name: "@urcolor/i18n", version: "0.0.4", dependencies: { "@urcolor/core": "workspace:~1.0.0" } },
    });

    await resolveWorkspaceDeps(join(ws, "packages/i18n"), ws);

    expect((await manifestOf(join(ws, "packages/i18n"))).dependencies).toEqual({
      "@urcolor/core": "~1.0.0",
    });
  });

  // A `workspace:` range naming something outside the workspace can never be
  // published — better to fail the release than to ship a broken manifest.
  it("throws rather than publishing an unresolvable range", async () => {
    const ws = await workspace({
      vue: { name: "@urcolor/vue", version: "0.1.0", dependencies: { "@urcolor/ghost": "workspace:*" } },
    });

    expect(resolveWorkspaceDeps(join(ws, "packages/vue"), ws)).rejects.toThrow(/not a workspace package/);
  });

  it("reports every rewrite it made", async () => {
    const ws = await workspace({
      core: { name: "@urcolor/core", version: "1.2.3" },
      urcolor: { name: "urcolor", version: "1.2.3", dependencies: { "@urcolor/core": "workspace:*" } },
    });

    expect(await resolveWorkspaceDeps(join(ws, "packages/urcolor"), ws)).toEqual([
      "dependencies.@urcolor/core: workspace:* -> ^1.2.3",
    ]);
  });
});
