# @urcolor/preact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@urcolor/preact` at full parity with `@urcolor/react` by compiling the React source a second time with `react` aliased to `preact/compat`.

**Architecture:** `packages/preact/` holds no component source. It holds a vite config whose entry is `../react/src/index.ts` and whose resolver maps `react`, `react-dom` and `react/jsx-runtime` onto `preact/compat`, plus a tsconfig that maps the same names for declaration output. One API, one place to fix a bug.

**Tech Stack:** Preact 10, `preact/compat`, vite lib mode, TypeScript, `bun test` with happy-dom.

## Global Constraints

- **Prerequisite:** `docs/superpowers/plans/2026-08-11-react-remove-base-ui.md` must be complete. `grep -rn "base-ui" packages/react/` must print nothing before this plan starts.
- `packages/preact/src/` contains at most a re-export entry. Component code is never copied out of `packages/react/src/`.
- The React source may import only from `react` (core hooks and types), `@urcolor/core` and `@urcolor/shared`. No `react-dom` outside test files.
- The published package name is `@urcolor/preact`, version `2.0.0`, matching the other framework packages. `peerDependencies: { "preact": "^10.19" }`.
- Exported names are identical to `@urcolor/react`: the 8 component namespaces and the 14 `use*` hooks.
- Every change in this plan that touches `packages/react/src/` must leave `bun test packages/react/` green.

---

## File Structure

**Created:**

| File | Responsibility |
| --- | --- |
| `packages/preact/package.json` | Package metadata, scripts, peer dep on `preact` |
| `packages/preact/vite.config.ts` | Lib build of the React source under the compat alias |
| `packages/preact/tsconfig.json` | Editor/type config with the compat path map |
| `packages/preact/tsconfig.build.json` | Declaration emit into `dist` |
| `packages/preact/src/index.ts` | Re-export entry, one line |
| `packages/preact/README.md` | Package readme |
| `packages/preact/test/smoke.test.tsx` | 8 render tests, one per component |

**Modified:** ~20 files under `packages/react/src/` (Task 1, type-reference rewrite only), root `package.json`, `docs/guide/installation.md` and its three translations.

---

### Task 1: Remove global React namespace references

The React source refers to `React.CSSProperties`, `React.PointerEvent`, `React.MutableRefObject` and friends as a global namespace, which `@types/react` supplies via a UMD global. `preact/compat` has no such global, so every one of these must become an explicit named type import. `React.MutableRefObject` also has no compat equivalent and is deprecated in React 19's own types; it becomes `RefObject`.

**Files:**
- Modify: every file matched by the grep in step 1 (~20 files under `packages/react/src/`)
- Test: existing `bun test packages/react/`

**Interfaces:**
- Consumes: nothing new.
- Produces: a React source with zero `React.` namespace references, which is what makes Task 2's alias build type-check.

- [ ] **Step 1: Inventory the references**

Run:

```bash
grep -rn "React\.[A-Za-z]" packages/react/src | grep -v "\.test\." | grep -v stories
```

Expected: roughly 45 matches across ~20 files. Record the list; it is the task's checklist.

- [ ] **Step 2: Rewrite each reference to a named import**

For each file, add the types to its existing `import { ... } from "react"` statement as `type` members and drop the `React.` prefix. The full mapping:

| Was | Becomes |
| --- | --- |
| `React.CSSProperties` | `CSSProperties` |
| `React.ReactNode` | `ReactNode` |
| `React.ElementType` | `ElementType` |
| `React.Ref<T>` | `Ref<T>` |
| `React.RefObject<T>` | `RefObject<T>` |
| `React.MutableRefObject<T>` | `RefObject<T>` |
| `React.PointerEvent<T>` | `PointerEvent<T>` |
| `React.KeyboardEvent<T>` | `KeyboardEvent<T>` |
| `React.FocusEvent<T>` | `FocusEvent<T>` |
| `React.ChangeEvent<T>` | `ChangeEvent<T>` |

`PointerEvent`, `KeyboardEvent` and `FocusEvent` collide with DOM lib globals of the same name. Import them aliased so the collision is visible at the use site:

```tsx
import { type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
```

Worked example, `packages/react/src/components/color-area/root/ColorAreaRoot.tsx`:

```tsx
// before
import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
// ...
  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {

// after
import {
  forwardRef, useCallback, useMemo, useRef, useState,
  type CSSProperties, type ReactNode, type RefObject,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
// ...
  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
```

`React.MutableRefObject<T>` becomes `RefObject<T>`. In React 19's types `RefObject<T>` is already mutable, so no `| null` change is needed at the use sites; if `tsc` complains about a specific site, widen that one to `RefObject<T | null>` rather than reintroducing `MutableRefObject`.

- [ ] **Step 3: Verify no references remain**

Run:

```bash
grep -rn "React\.[A-Za-z]" packages/react/src | grep -v "\.test\." | grep -v stories
```

Expected: no output.

- [ ] **Step 4: Verify types and tests**

Run: `bun run lint && bun test packages/react/`
Expected: clean, all React tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src
git commit -m "refactor(react): import React types by name instead of the UMD namespace"
```

---

### Task 2: Scaffold the package and build the bundle

**Files:**
- Create: `packages/preact/package.json`
- Create: `packages/preact/vite.config.ts`
- Create: `packages/preact/src/index.ts`
- Create: `packages/preact/README.md`

**Interfaces:**
- Consumes: `packages/react/src/index.ts` as the build entry.
- Produces: `packages/preact/dist/index.js`, an ES module importing only `preact/compat`, `@urcolor/core` and `@urcolor/shared`.

- [ ] **Step 1: Add the dependency**

Run: `bun add -D preact@^10.19` at the repo root.
Expected: `preact` appears in the root `devDependencies`, giving every workspace package a resolvable copy.

- [ ] **Step 2: Write the package manifest**

Create `packages/preact/package.json`:

```json
{
  "name": "@urcolor/preact",
  "version": "2.0.0",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "bun run build:js && bun run build:types",
    "build:js": "vite build",
    "build:types": "tsc -p tsconfig.build.json"
  },
  "keywords": [
    "color",
    "color-picker",
    "preact",
    "headless",
    "accessible",
    "oklch",
    "color-slider",
    "color-wheel"
  ],
  "author": {
    "name": "GrandMagus",
    "url": "https://github.com/GrandMagus02"
  },
  "homepage": "https://urcolor.vercel.app/",
  "repository": {
    "type": "git",
    "url": "https://github.com/ur-color/urcolor",
    "directory": "packages/preact"
  },
  "bugs": {
    "url": "https://github.com/ur-color/urcolor/issues"
  },
  "dependencies": {
    "@urcolor/core": "workspace:*",
    "@urcolor/shared": "workspace:*"
  },
  "peerDependencies": {
    "preact": "^10.19"
  },
  "devDependencies": {
    "preact": "^10.19",
    "typescript": "^5.9",
    "vite": "^7.3.1"
  }
}
```

- [ ] **Step 3: Write the entry**

Create `packages/preact/src/index.ts`:

```ts
/**
 * `@urcolor/preact` has no component source of its own: it is the React
 * package compiled against `preact/compat`, so a fix lands in one place.
 * The alias that makes that work lives in `vite.config.ts` and
 * `tsconfig.build.json`.
 */
export * from "../../react/src/index";
```

- [ ] **Step 4: Write the vite config**

Create `packages/preact/vite.config.ts`:

```ts
import { resolve } from "node:path";
import { defineConfig } from "vite";

const compat = resolve(__dirname, "../../node_modules/preact/compat");

export default defineConfig({
  resolve: {
    alias: {
      "react/jsx-runtime": resolve(compat, "jsx-runtime"),
      "react-dom": compat,
      "react": compat,
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "preact",
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "preact",
        "preact/compat",
        "preact/hooks",
        "preact/jsx-runtime",
        "@urcolor/core",
        "@urcolor/shared",
      ],
    },
  },
});
```

Alias order matters: `react/jsx-runtime` and `react-dom` are listed before `react`, because vite matches string aliases by prefix and `react` would otherwise swallow both.

- [ ] **Step 5: Build**

Run: `bun run --cwd packages/preact build:js`
Expected: `packages/preact/dist/index.js` is written.

- [ ] **Step 6: Verify nothing React leaked into the bundle**

Run: `grep -c "\"react\"\|'react'" packages/preact/dist/index.js || true`
Expected: `0`. If the count is non-zero, the alias did not apply to some import; find it with `grep -n "react" packages/preact/dist/index.js`.

- [ ] **Step 7: Write the readme**

Create `packages/preact/README.md`:

```markdown
# @urcolor/preact

Headless, accessible colour picker primitives for Preact: colour slider, area,
wheel, ring, triangle, field, swatch and swatch group, over the `@urcolor/core`
colour engine.

## Install

```sh
bun add @urcolor/preact preact
```

## Usage

```tsx
import { useState } from "preact/hooks";
import { Color } from "@urcolor/core";
import { ColorSlider } from "@urcolor/preact";

export function HueSlider() {
  const [color, setColor] = useState(Color.parse("hsl(210, 80%, 50%)")!);

  return (
    <ColorSlider.Root value={color} channel="h" onValueChange={setColor}>
      <ColorSlider.Control>
        <ColorSlider.Track>
          <ColorSlider.Gradient />
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider.Control>
    </ColorSlider.Root>
  );
}
```

The API is identical to [`@urcolor/react`](../react/README.md): this package is
that source compiled against `preact/compat`.

Documentation: https://urcolor.vercel.app/components/preact/
```

- [ ] **Step 8: Commit**

```bash
git add packages/preact/
git commit -m "feat(preact): build the React source under preact/compat"
```

---

### Task 3: Declaration output

**Files:**
- Create: `packages/preact/tsconfig.json`
- Create: `packages/preact/tsconfig.build.json`

**Interfaces:**
- Consumes: Task 2's package.
- Produces: `packages/preact/dist/index.d.ts` typing the full API against `preact/compat`.

- [ ] **Step 1: Write the editor tsconfig**

Create `packages/preact/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "paths": {
      "react": ["../../node_modules/preact/compat"],
      "react-dom": ["../../node_modules/preact/compat"],
      "react/jsx-runtime": ["../../node_modules/preact/jsx-runtime"]
    }
  },
  "include": ["src", "../react/src", "test"]
}
```

- [ ] **Step 2: Write the build tsconfig**

Create `packages/preact/tsconfig.build.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "rootDir": "..",
    "outDir": "dist-types",
    "paths": {
      "react": ["../../node_modules/preact/compat"],
      "react-dom": ["../../node_modules/preact/compat"],
      "react/jsx-runtime": ["../../node_modules/preact/jsx-runtime"],
      "@urcolor/core": ["../core/dist/index.d.ts"],
      "@urcolor/shared": ["../shared/dist/index.d.ts"]
    }
  },
  "include": ["src", "../react/src"],
  "exclude": ["node_modules", "dist", "**/*.test.tsx", "**/*.test.ts", "**/*.stories.tsx"]
}
```

`rootDir` is the packages directory because the entry re-exports across a package boundary, so tsc emits `dist-types/preact/src/index.d.ts` and `dist-types/react/src/**`. Step 3 collapses that into the single path `package.json` advertises.

- [ ] **Step 3: Add the declaration re-export**

`build:types` in Task 2's manifest must also write the entry `dist/index.d.ts`. Replace the script with:

```json
    "build:types": "tsc -p tsconfig.build.json && bun run build:types:entry",
    "build:types:entry": "mkdir -p dist && printf 'export * from \"../dist-types/react/src/index\";\\n' > dist/index.d.ts"
```

and add `"dist-types"` to the package's `files` array beside `"dist"`.

- [ ] **Step 4: Build the types**

Run: `bun run --cwd packages/preact build:types`
Expected: `packages/preact/dist/index.d.ts` and `packages/preact/dist-types/react/src/index.d.ts` exist.

- [ ] **Step 5: Verify the types resolve**

Create a scratch file `packages/preact/type-probe.ts`:

```ts
import { ColorSlider, useColor } from "./dist/index";

const _root: typeof ColorSlider.Root = ColorSlider.Root;
const _hook: typeof useColor = useColor;
```

Run: `bun x tsc --noEmit --moduleResolution bundler --module esnext --target es2022 packages/preact/type-probe.ts`
Expected: no errors. Then delete the probe: `rm packages/preact/type-probe.ts`.

- [ ] **Step 6: Commit**

```bash
git add packages/preact/
git commit -m "feat(preact): emit declarations from the aliased React source"
```

---

### Task 4: Smoke tests

**Files:**
- Create: `packages/preact/test/smoke.test.tsx`

**Interfaces:**
- Consumes: `@urcolor/preact` via a relative import of the React source under the compat alias.
- Produces: 8 render tests proving every component mounts under Preact.

Bun's test runner has no vite resolver, so the alias comes from `bunfig.toml`'s existing preload mechanism is not enough here: use Bun's own `imports` map in the package's `package.json` instead, which the runner honours.

- [ ] **Step 1: Add the runtime alias for tests**

Add to `packages/preact/package.json`:

```json
  "imports": {
    "#react": "preact/compat",
    "#react-dom": "preact/compat",
    "#react/jsx-runtime": "preact/jsx-runtime"
  }
```

Then create `packages/preact/bunfig.toml`:

```toml
[test]
preload = ["../../setup-dom.ts"]

[test.alias]
"react" = "preact/compat"
"react-dom" = "preact/compat"
"react/jsx-runtime" = "preact/jsx-runtime"
```

- [ ] **Step 2: Write the failing test**

Create `packages/preact/test/smoke.test.tsx`:

```tsx
import { describe, expect, it } from "bun:test";
import { render } from "preact";
import { Color } from "@urcolor/core";
import {
  ColorArea, ColorField, ColorRing, ColorSlider,
  ColorSwatch, ColorSwatchGroup, ColorTriangle, ColorWheel,
} from "../src/index";

const COLOR = Color.parse("hsl(210, 80%, 50%)")!;

function mount(node: preact.ComponentChild) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  render(node as never, container as never);
  return {
    container,
    cleanup: () => { render(null, container as never); container.remove(); },
  };
}

describe("@urcolor/preact smoke", () => {
  it("mounts ColorSlider with slider semantics", () => {
    const { container, cleanup } = mount(
      <ColorSlider.Root value={COLOR} channel="h">
        <ColorSlider.Control><ColorSlider.Track><ColorSlider.Thumb /></ColorSlider.Track></ColorSlider.Control>
      </ColorSlider.Root>,
    );
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    expect(thumb.getAttribute("aria-valuenow")).toBe("210");
    cleanup();
  });

  it("steps the slider value on ArrowRight", () => {
    let next: Color | undefined;
    const { container, cleanup } = mount(
      <ColorSlider.Root value={COLOR} channel="h" onValueChange={(c: Color) => { next = c; }}>
        <ColorSlider.Control><ColorSlider.Track><ColorSlider.Thumb /></ColorSlider.Track></ColorSlider.Control>
      </ColorSlider.Root>,
    );
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    thumb.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    expect(Math.round(next!.to("hsl").get("h"))).toBe(211);
    cleanup();
  });

  it("mounts ColorArea", () => {
    const { container, cleanup } = mount(
      <ColorArea.Root value={COLOR}><ColorArea.Thumb /></ColorArea.Root>,
    );
    expect(container.querySelector("[data-orientation], [role='slider']")).not.toBeNull();
    cleanup();
  });

  it("mounts ColorWheel", () => {
    const { container, cleanup } = mount(
      <ColorWheel.Root value={COLOR}><ColorWheel.Thumb /></ColorWheel.Root>,
    );
    expect(container.firstElementChild).not.toBeNull();
    cleanup();
  });

  it("mounts ColorRing", () => {
    const { container, cleanup } = mount(
      <ColorRing.Root value={COLOR}><ColorRing.Track><ColorRing.Thumb /></ColorRing.Track></ColorRing.Root>,
    );
    expect(container.firstElementChild).not.toBeNull();
    cleanup();
  });

  it("mounts ColorTriangle", () => {
    const { container, cleanup } = mount(
      <ColorTriangle.Root value={COLOR}><ColorTriangle.Thumb /></ColorTriangle.Root>,
    );
    expect(container.firstElementChild).not.toBeNull();
    cleanup();
  });

  it("mounts ColorField with an input", () => {
    const { container, cleanup } = mount(
      <ColorField.Root value={COLOR}><ColorField.Input /></ColorField.Root>,
    );
    expect(container.querySelector("input")).not.toBeNull();
    cleanup();
  });

  it("mounts ColorSwatch standalone and inside a group", () => {
    const solo = mount(<ColorSwatch value="#ff0000" />);
    expect(solo.container.querySelector("[role='img']")).not.toBeNull();
    solo.cleanup();

    const grouped = mount(
      <ColorSwatchGroup.Root defaultValue={["#ff0000"]}>
        <ColorSwatch value="#ff0000" />
        <ColorSwatch value="#00ff00" />
      </ColorSwatchGroup.Root>,
    );
    const buttons = grouped.container.querySelectorAll("button");
    expect(buttons.length).toBe(2);
    expect(buttons[0]!.getAttribute("data-state")).toBe("on");
    grouped.cleanup();
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `bun test --cwd packages/preact`
Expected: PASS, 8 tests. A failure here is the plan's central risk materialising: read the error, and if it names a `preact/compat` gap, fix the React source to avoid that API rather than forking the file.

- [ ] **Step 4: Verify the props each root actually takes**

The smoke test above assumes `ColorArea.Root`, `ColorWheel.Root`, `ColorRing.Root`, `ColorTriangle.Root` and `ColorField.Root` all accept a `value` prop, as `ColorSlider.Root` does. Confirm against each root's props interface:

```bash
grep -rn "interface Color.*RootProps" -A 12 packages/react/src/components/*/root/*.tsx | grep -n "value\|channel\|xChannel"
```

Adjust the test's props to match whatever each root declares. Do not change the components to fit the test.

- [ ] **Step 5: Commit**

```bash
git add packages/preact/
git commit -m "test(preact): smoke-test every component under preact/compat"
```

---

### Task 5: Wire into the monorepo

**Files:**
- Modify: `package.json` (root `build` script)
- Modify: `docs/guide/installation.md`
- Modify: `docs/de/guide/installation.md`, `docs/es/guide/installation.md`, `docs/fr/guide/installation.md`

**Interfaces:**
- Consumes: Tasks 2-4 complete.
- Produces: `bun run build` builds Preact; the installation guide lists it.

- [ ] **Step 1: Add to the root build chain**

In the root `package.json`, append to the `build` script, after the `react` entry:

```
 && bun run --cwd packages/preact build
```

Preact must come after React, because it compiles React's source and links `@urcolor/core` and `@urcolor/shared` declaration output.

- [ ] **Step 2: Verify the full build**

Run: `bun run build`
Expected: every package builds including `packages/preact/dist`.

- [ ] **Step 3: Add to the English installation guide**

In `docs/guide/installation.md`: add Preact to the prerequisites list on line 5, add `| `@urcolor/preact` | Preact 10 components and hooks |` to the package table, and add a four-tab install block matching the existing `@urcolor/svelte` block at lines 73-85:

```
bun add @urcolor/preact
npm install @urcolor/preact
pnpm add @urcolor/preact
yarn add @urcolor/preact
```

Copy the exact tab markup from the surrounding blocks rather than inventing it.

- [ ] **Step 4: Mirror into the three translations**

Repeat step 3 in `docs/de/guide/installation.md`, `docs/es/guide/installation.md` and `docs/fr/guide/installation.md`. Package names and commands are identical; only the prose around them is translated, and the prerequisites line just gains "Preact 10" in the existing list.

- [ ] **Step 5: Verify the docs build**

Run: `bun run docs:build`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json docs/guide/installation.md docs/de docs/es docs/fr
git commit -m "feat(preact): wire the package into the build and install guide"
```

---

## Self-Review

**Spec coverage.** The spec's package-matrix row for `@urcolor/preact` — source `packages/react/src`, deps core and shared, vite lib mode with the three compat aliases — is Task 2. "No duplicated files" is enforced by the one-line entry in Task 2 step 3. The spec's constraint that "the React source may not use anything preact/compat lacks" is what Task 1 enforces and Task 4 verifies. Documentation pages for Preact are not here: they belong to the docs plan, which runs last once every API is settled. Only the installation guide, which is a build-wiring concern, is covered here.

**Known gap, deliberately left to execution.** Task 4 step 4 exists because this plan does not enumerate every root's props. The smoke test is written against `ColorSlider.Root`'s known signature and adapted to the others at execution time by reading them. Guessing them here would put wrong code in the plan.

**Risk.** If Task 4 fails on a `preact/compat` gap that cannot be worked around in the React source, the fallback in the spec applies: `@urcolor/preact` becomes a hand-port on `@urcolor/shared`, and this plan is replaced rather than patched. Discovering that early is why Preact is second in the build order.
