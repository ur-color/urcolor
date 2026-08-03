import { describe, expect, it } from "bun:test";
import { entryPaths, problems, workspaceRanges } from "./check-publishable";

describe("entryPaths", () => {
  it("collects the legacy fields", () => {
    expect(entryPaths({ main: "./dist/index.js", types: "./dist/index.d.ts" }))
      .toEqual(["./dist/index.js", "./dist/index.d.ts"]);
  });

  it("walks the exports tree down to its leaves", () => {
    expect(entryPaths({
      exports: {
        ".": { bun: "./src/index.ts", import: "./dist/index.js", types: "./dist/index.d.ts" },
        "./styles.css": "./dist/styles.css",
      },
    })).toEqual(["./src/index.ts", "./dist/index.js", "./dist/index.d.ts", "./dist/styles.css"]);
  });

  it("ignores the self-referential package.json export", () => {
    expect(entryPaths({ exports: { "./package.json": { default: "./package.json" } } })).toEqual([]);
  });

  it("deduplicates paths named by more than one condition", () => {
    expect(entryPaths({
      main: "./dist/index.js",
      exports: { ".": { require: "./dist/index.js", import: "./dist/index.js" } },
    })).toEqual(["./dist/index.js"]);
  });
});

describe("workspaceRanges", () => {
  it("finds unresolved ranges across every dependency field", () => {
    expect(workspaceRanges({
      dependencies: { "@urcolor/core": "workspace:*", "reka-ui": "^2.8.0" },
      peerDependencies: { "@urcolor/shared": "workspace:^1.0.0" },
    })).toEqual(["dependencies.@urcolor/core", "peerDependencies.@urcolor/shared"]);
  });

  it("passes a manifest whose ranges are all resolved", () => {
    expect(workspaceRanges({ dependencies: { "@urcolor/core": "^1.0.0" } })).toEqual([]);
  });
});

describe("problems", () => {
  const good = {
    name: "urcolor",
    version: "1.0.0",
    license: "MIT",
    exports: { ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } },
  };

  it("passes a complete manifest", () => {
    expect(problems(good, [])).toEqual([]);
  });

  it("reports metadata gaps", () => {
    expect(problems({ ...good, license: undefined }, [])).toEqual(["no `license`"]);
    expect(problems({ ...good, version: undefined }, [])).toEqual(["no `version`"]);
  });

  // The @urcolor/angular case: ng-packagr writes the importable manifest into
  // dist/, so publishing from the package root ships one with no entry points.
  // It installs fine and fails on the first import.
  it("rejects a manifest nothing can be imported from", () => {
    expect(problems({ name: "@urcolor/angular", version: "1.0.0", license: "MIT" }, []))
      .toEqual(["no entry points: nothing here can be imported"]);
  });

  it("reports entry points whose files are missing", () => {
    expect(problems(good, ["./dist/index.js"]))
      .toEqual(["entry point does not exist: ./dist/index.js"]);
  });

  it("reports a workspace range that would make npm reject the publish", () => {
    expect(problems({ ...good, dependencies: { "@urcolor/core": "workspace:*" } }, []))
      .toEqual(["unresolved workspace range: dependencies.@urcolor/core"]);
  });
});
