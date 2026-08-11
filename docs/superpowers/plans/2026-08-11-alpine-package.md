# @urcolor/alpine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@urcolor/alpine`: an Alpine plugin that registers the `@urcolor/lit` custom elements and binds them to Alpine state through an `x-color` directive and a `$color` magic.

**Architecture:** Alpine has no component model, so this package adds no DOM of its own. Importing `@urcolor/lit` registers the 26 elements; the plugin's job is the two-way binding between an Alpine expression and an element's `color` property plus its `colorchange` event, and a template-level colour helper.

**Tech Stack:** Alpine 3, `@urcolor/lit`, TypeScript, `bun build`, `bun test` with happy-dom.

## Global Constraints

- **Prerequisite:** `2026-08-11-lit-package.md` complete. Every element this package binds to comes from there; none is defined here.
- No second DOM implementation. If a behaviour is missing, it is fixed in `@urcolor/lit` or `@urcolor/shared`, never reimplemented in the directive.
- The plugin is a default export usable as `Alpine.plugin(urcolor)`, matching every other Alpine plugin's contract.
- The directive is `x-color`. It binds to the root elements' `value` property and listens for the `colorchange` event those roots dispatch, both defined in the Lit plan's Task 2.
- Package name `@urcolor/alpine`, version `2.0.0`. `peerDependencies: { "alpinejs": "^3.13" }`, `dependencies` include `@urcolor/lit`.

---

## File Structure

**Created:**

| File | Responsibility |
| --- | --- |
| `packages/alpine/src/plugin.ts` | The `Alpine.plugin` entry: registers elements, directive and magic |
| `packages/alpine/src/directive.ts` | `x-color`, two-way binding to a root element |
| `packages/alpine/src/magic.ts` | `$color`, parse and convert helpers for templates |
| `packages/alpine/src/index.ts` | Barrel, default export |
| `packages/alpine/test/plugin.test.ts` | Directive and magic tests |
| `packages/alpine/package.json`, `tsconfig.json`, `tsconfig.build.json`, `README.md` | Package chrome |

---

### Task 1: Package scaffold and the plugin entry

**Files:**
- Create: `packages/alpine/package.json`, `tsconfig.json`, `tsconfig.build.json`
- Create: `packages/alpine/src/plugin.ts`
- Create: `packages/alpine/src/index.ts`
- Test: `packages/alpine/test/plugin.test.ts` (registration case only)

**Interfaces:**
- Consumes: `@urcolor/lit` for its registration side effect; Alpine's `Alpine` type.
- Produces:
  - `interface UrcolorPluginOptions { prefix?: string }`
  - `function urcolor(Alpine: Alpine): void`, also the module's default export.

- [ ] **Step 1: Add the dependency**

Run: `bun add -D alpinejs@^3.13 @types/alpinejs` at the repo root.

- [ ] **Step 2: Write the manifest**

Create `packages/alpine/package.json`:

```json
{
  "name": "@urcolor/alpine",
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
  "files": ["dist"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "bun run build:js && bun run build:types",
    "build:js": "bun build ./src/index.ts --outdir ./dist --format esm --external alpinejs --external lit --external @urcolor/core --external @urcolor/shared --external @urcolor/lit",
    "build:types": "tsc --declaration --emitDeclarationOnly --outDir dist --project tsconfig.build.json",
    "check": "tsc -p tsconfig.json --noEmit"
  },
  "keywords": ["color", "color-picker", "alpine", "alpinejs", "web-components", "headless", "oklch"],
  "author": { "name": "GrandMagus", "url": "https://github.com/GrandMagus02" },
  "homepage": "https://urcolor.vercel.app/",
  "repository": { "type": "git", "url": "https://github.com/ur-color/urcolor", "directory": "packages/alpine" },
  "bugs": { "url": "https://github.com/ur-color/urcolor/issues" },
  "dependencies": {
    "@urcolor/core": "workspace:*",
    "@urcolor/lit": "workspace:*",
    "@urcolor/shared": "workspace:*"
  },
  "peerDependencies": { "alpinejs": "^3.13" },
  "devDependencies": { "alpinejs": "^3.13", "@types/alpinejs": "^3.13", "typescript": "^5.9" }
}
```

`tsconfig.json` and `tsconfig.build.json` copy `packages/lit`'s, with `include` pointing at this package's `src` and `test`.

- [ ] **Step 3: Write the failing test**

Create `packages/alpine/test/plugin.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import Alpine from "alpinejs";
import urcolor from "../src/index";

describe("urcolor plugin", () => {
  it("registers the x-color directive and the $color magic", () => {
    const directives: string[] = [];
    const magics: string[] = [];
    const fake = {
      directive: (name: string) => { directives.push(name); },
      magic: (name: string) => { magics.push(name); },
    } as unknown as typeof Alpine;

    urcolor(fake);

    expect(directives).toContain("color");
    expect(magics).toContain("color");
  });

  it("registers the Lit elements as a side effect", () => {
    expect(customElements.get("urcolor-slider-root")).toBeDefined();
    expect(customElements.get("urcolor-area-root")).toBeDefined();
    expect(customElements.get("urcolor-swatch")).toBeDefined();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `bun test packages/alpine/test/plugin.test.ts`
Expected: FAIL, cannot resolve `../src/index`.

- [ ] **Step 5: Write the plugin**

Create `packages/alpine/src/plugin.ts`:

```ts
import type { Alpine } from "alpinejs";
// Registering the elements is this import's whole purpose: Alpine binds to
// them, it does not define them.
import "@urcolor/lit";
import { registerColorDirective } from "./directive";
import { registerColorMagic } from "./magic";

/**
 * The plugin. Use it as `Alpine.plugin(urcolor)` before `Alpine.start()`.
 */
export function urcolor(Alpine: Alpine): void {
  registerColorDirective(Alpine);
  registerColorMagic(Alpine);
}
```

Create `packages/alpine/src/index.ts`:

```ts
export { urcolor } from "./plugin";
export { urcolor as default } from "./plugin";
```

- [ ] **Step 6: Run the tests**

Run: `bun test packages/alpine/test/plugin.test.ts`
Expected: PASS, 2 tests. Steps 5's imports of `./directive` and `./magic` must exist as stubs for this to compile; write them as empty `export function registerColorDirective(_: Alpine): void {}` and fill them in Tasks 2 and 3.

- [ ] **Step 7: Commit**

```bash
git add packages/alpine/
git commit -m "feat(alpine): add the plugin entry"
```

---

### Task 2: The x-color directive

**Files:**
- Modify: `packages/alpine/src/directive.ts`
- Test: `packages/alpine/test/directive.test.ts`

**Interfaces:**
- Consumes: `Alpine` from `alpinejs`, `Color` from `@urcolor/core`, `UrcolorSliderRoot` and siblings from `@urcolor/lit` (for typing only).
- Produces: `function registerColorDirective(Alpine: Alpine): void`, registering `x-color`.

Binding contract, both directions:
- Alpine expression evaluates to a `Color` or a colour string. The directive writes it to the element's `value` property, which every `@urcolor/lit` root exposes.
- The element dispatches `colorchange` with `detail.color`. The directive writes that back through the expression, when the expression is assignable.

- [ ] **Step 1: Write the failing test**

Create `packages/alpine/test/directive.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import Alpine from "alpinejs";
import { Color } from "@urcolor/core";
import urcolor from "../src/index";

Alpine.plugin(urcolor);

/** Mounts markup, starts Alpine over it, and waits for the first flush. */
async function mount(markup: string) {
  const host = document.createElement("div");
  host.innerHTML = markup;
  document.body.appendChild(host);
  Alpine.initTree(host);
  await Promise.resolve();
  await Promise.resolve();
  return { host, cleanup: () => { Alpine.destroyTree(host); host.remove(); } };
}

const TREE = `
  <div x-data="{ swatch: 'hsl(210, 80%, 50%)' }">
    <urcolor-slider-root x-color="swatch" channel="h">
      <urcolor-slider-control>
        <urcolor-slider-track><urcolor-slider-thumb></urcolor-slider-thumb></urcolor-slider-track>
      </urcolor-slider-control>
    </urcolor-slider-root>
  </div>`;

describe("x-color", () => {
  it("pushes the Alpine value onto the element", async () => {
    const { host, cleanup } = await mount(TREE);
    const root = host.querySelector("urcolor-slider-root") as HTMLElement & { color: Color };
    await (root as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(Math.round(root.color.to("hsl").get("h"))).toBe(210);
    cleanup();
  });

  it("writes a colorchange back into the Alpine scope", async () => {
    const { host, cleanup } = await mount(TREE);
    const root = host.querySelector("urcolor-slider-root") as HTMLElement & { updateComplete: Promise<unknown> };
    await root.updateComplete;

    host.querySelector("urcolor-slider-thumb")!
      .dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    await root.updateComplete;
    await Promise.resolve();

    const scope = Alpine.$data(host.querySelector("[x-data]") as HTMLElement) as { swatch: Color | string };
    const value = typeof scope.swatch === "string" ? Color.parse(scope.swatch)! : scope.swatch;
    expect(Math.round(value.to("hsl").get("h"))).toBe(211);
    cleanup();
  });

  it("ignores a value that does not parse", async () => {
    const { host, cleanup } = await mount(
      `<div x-data="{ c: 'not-a-color' }"><urcolor-swatch x-color="c"></urcolor-swatch></div>`,
    );
    expect(() => Alpine.initTree(host)).not.toThrow();
    cleanup();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/alpine/test/directive.test.ts`
Expected: FAIL, `x-color` is a no-op stub.

- [ ] **Step 3: Write the directive**

Replace `packages/alpine/src/directive.ts`:

```ts
import type { Alpine } from "alpinejs";
import type { Color } from "@urcolor/core";
import { parseColor } from "@urcolor/shared";

/** The shape every `@urcolor/lit` root presents to a binding. */
interface ColorHost extends HTMLElement {
  value: Color | string | null;
}

/**
 * `x-color="expression"`, two-way.
 *
 * Down: whatever the expression evaluates to is parsed and written to the
 * element's `value`. Up: the element's `colorchange` event is written back
 * through the same expression, when Alpine can assign to it.
 */
export function registerColorDirective(Alpine: Alpine): void {
  Alpine.directive("color", (el, { expression }, { effect, evaluateLater, cleanup }) => {
    const host = el as ColorHost;
    const read = evaluateLater<Color | string | null>(expression);
    /** Alpine only produces a setter for an assignable expression. */
    const write = Alpine.evaluateLater<unknown>(el, `${expression} = __urcolor`);

    /** Suppresses the echo of a value this directive just pushed down. */
    let writingBack = false;

    effect(() => {
      read((incoming) => {
        if (writingBack) return;
        const parsed = parseColor(incoming);
        if (!parsed) return;
        host.value = parsed;
      });
    });

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ color: Color }>).detail;
      if (!detail?.color) return;
      writingBack = true;
      try {
        write(() => {}, { scope: { __urcolor: detail.color } });
      } finally {
        writingBack = false;
      }
    };

    host.addEventListener("colorchange", onChange);
    cleanup(() => { host.removeEventListener("colorchange", onChange); });
  });
}
```

If `Alpine.evaluateLater` on an assignment expression proves not to be assignable in Alpine 3.13 (a read-only expression such as a function call), the fallback is to skip the write silently: a one-way binding is the correct degradation, and the test's third case already covers not throwing.

- [ ] **Step 4: Run the tests**

Run: `bun test packages/alpine/test/directive.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/alpine/src/directive.ts packages/alpine/test/directive.test.ts
git commit -m "feat(alpine): bind Alpine state to the elements with x-color"
```

---

### Task 3: The $color magic

**Files:**
- Modify: `packages/alpine/src/magic.ts`
- Test: `packages/alpine/test/magic.test.ts`

**Interfaces:**
- Produces: `function registerColorMagic(Alpine: Alpine): void`, registering `$color`.

`$color` is the Alpine answer to the 14 hooks in the other packages. Alpine templates cannot hold a controller, so instead of 14 objects it exposes one callable:

- `$color(value)` returns a `Color`, or `null` when it does not parse.
- `$color(value).to("oklch").get("l")` is then plain `@urcolor/core`.
- `$color.channel(value, "hsl", "h")` returns the display-space channel value, using `colorToDisplayValue` so it matches what a slider shows.
- `$color.format(value, "hsl", "h")` returns the formatted string, via `formatChannelValue`.

- [ ] **Step 1: Write the failing test**

Create `packages/alpine/test/magic.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import Alpine from "alpinejs";
import urcolor from "../src/index";

Alpine.plugin(urcolor);

async function mount(markup: string) {
  const host = document.createElement("div");
  host.innerHTML = markup;
  document.body.appendChild(host);
  Alpine.initTree(host);
  await Promise.resolve();
  return { host, cleanup: () => { Alpine.destroyTree(host); host.remove(); } };
}

describe("$color", () => {
  it("parses a string into a Color", async () => {
    const { host, cleanup } = await mount(
      `<div x-data="{ c: 'hsl(210, 80%, 50%)' }"><span x-text="Math.round($color(c).to('hsl').get('h'))"></span></div>`,
    );
    expect(host.querySelector("span")!.textContent).toBe("210");
    cleanup();
  });

  it("reads a display-space channel", async () => {
    const { host, cleanup } = await mount(
      `<div x-data="{ c: 'hsl(210, 80%, 50%)' }"><span x-text="$color.channel(c, 'hsl', 's')"></span></div>`,
    );
    expect(host.querySelector("span")!.textContent).toBe("80");
    cleanup();
  });

  it("formats a channel", async () => {
    const { host, cleanup } = await mount(
      `<div x-data="{ c: 'hsl(210, 80%, 50%)' }"><span x-text="$color.format(c, 'hsl', 'h')"></span></div>`,
    );
    expect(host.querySelector("span")!.textContent).toContain("210");
    cleanup();
  });

  it("returns null for an unparseable value", async () => {
    const { host, cleanup } = await mount(
      `<div x-data="{ c: 'nope' }"><span x-text="$color(c) === null ? 'null' : 'color'"></span></div>`,
    );
    expect(host.querySelector("span")!.textContent).toBe("null");
    cleanup();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/alpine/test/magic.test.ts`
Expected: FAIL, `$color` is a no-op stub.

- [ ] **Step 3: Write the magic**

Replace `packages/alpine/src/magic.ts`:

```ts
import type { Alpine } from "alpinejs";
import type { Color, SpaceId } from "@urcolor/core";
import { colorToDisplayValue, formatChannelValue, parseColor } from "@urcolor/shared";

type ColorInput = Color | string | null | undefined;

export interface ColorMagic {
  (value: ColorInput): Color | null;
  /** The channel in the units a slider shows, not the native ones. */
  channel(value: ColorInput, space: SpaceId, channel: string): number | null;
  /** The channel formatted for display, degrees and percentages included. */
  format(value: ColorInput, space: SpaceId, channel: string): string;
}

/**
 * `$color`, the Alpine stand-in for the other packages' colour hooks.
 *
 * Alpine templates hold no state objects, so this is a function rather than
 * fourteen controllers: parse once, then use `@urcolor/core` directly.
 */
export function registerColorMagic(Alpine: Alpine): void {
  Alpine.magic("color", () => {
    const magic = ((value: ColorInput) => parseColor(value) ?? null) as ColorMagic;

    magic.channel = (value, space, channel) => {
      const color = parseColor(value);
      return color ? colorToDisplayValue(color, space, channel) : null;
    };

    magic.format = (value, space, channel) => {
      const color = parseColor(value);
      if (!color) return "";
      return formatChannelValue(space, channel, colorToDisplayValue(color, space, channel));
    };

    return magic;
  });
}
```

- [ ] **Step 4: Run the tests**

Run: `bun test packages/alpine/test/magic.test.ts`
Expected: PASS, 4 tests. If the `channel` assertion returns `80.00000001` rather than `80`, the display conversion is right and the test should assert with `Math.round`; fix the test, not the source.

- [ ] **Step 5: Commit**

```bash
git add packages/alpine/src/magic.ts packages/alpine/test/magic.test.ts
git commit -m "feat(alpine): add the \$color magic"
```

---

### Task 4: Component smoke coverage and wiring

**Files:**
- Create: `packages/alpine/test/components.test.ts`
- Create: `packages/alpine/README.md`
- Modify: root `package.json` (`build`, `lint`)
- Modify: `docs/guide/installation.md` and its three translations

- [ ] **Step 1: Write the component smoke test**

Create `packages/alpine/test/components.test.ts`, one case per family, each mounting the element tree inside an `x-data` scope with `x-color` bound and asserting the element received the colour:

```ts
import { describe, expect, it } from "bun:test";
import Alpine from "alpinejs";
import type { Color } from "@urcolor/core";
import urcolor from "../src/index";

Alpine.plugin(urcolor);

async function mount(markup: string) {
  const host = document.createElement("div");
  host.innerHTML = `<div x-data="{ c: 'hsl(210, 80%, 50%)' }">${markup}</div>`;
  document.body.appendChild(host);
  Alpine.initTree(host);
  await Promise.resolve();
  return { host, cleanup: () => { Alpine.destroyTree(host); host.remove(); } };
}

const FAMILIES: Array<[string, string]> = [
  ["slider", `<urcolor-slider-root x-color="c" channel="h"><urcolor-slider-control><urcolor-slider-track><urcolor-slider-thumb></urcolor-slider-thumb></urcolor-slider-track></urcolor-slider-control></urcolor-slider-root>`],
  ["area", `<urcolor-area-root x-color="c"><urcolor-area-thumb></urcolor-area-thumb></urcolor-area-root>`],
  ["wheel", `<urcolor-wheel-root x-color="c"><urcolor-wheel-thumb></urcolor-wheel-thumb></urcolor-wheel-root>`],
  ["ring", `<urcolor-ring-root x-color="c"><urcolor-ring-track><urcolor-ring-thumb></urcolor-ring-thumb></urcolor-ring-track></urcolor-ring-root>`],
  ["triangle", `<urcolor-triangle-root x-color="c"><urcolor-triangle-thumb></urcolor-triangle-thumb></urcolor-triangle-root>`],
  ["field", `<urcolor-field-root x-color="c"><urcolor-field-input></urcolor-field-input></urcolor-field-root>`],
  ["swatch", `<urcolor-swatch x-color="c"></urcolor-swatch>`],
  ["swatch-group", `<urcolor-swatch-group-root><urcolor-swatch value="#ff0000"></urcolor-swatch></urcolor-swatch-group-root>`],
];

describe("every family binds through x-color", () => {
  for (const [name, markup] of FAMILIES) {
    it(`mounts ${name}`, async () => {
      const { host, cleanup } = await mount(markup);
      const el = host.querySelector(`urcolor-${name === "swatch-group" ? "swatch-group-root" : name === "swatch" ? "swatch" : `${name}-root`}`) as HTMLElement & { updateComplete?: Promise<unknown>; value?: Color | string | null };
      await el.updateComplete;
      expect(el).not.toBeNull();
      if (name !== "swatch-group") expect(el.value).not.toBeNull();
      cleanup();
    });
  }
});
```

- [ ] **Step 2: Run it**

Run: `bun test packages/alpine/`
Expected: PASS, 8 component cases plus the 9 from Tasks 1-3.

- [ ] **Step 3: Write the readme**

Create `packages/alpine/README.md` with this usage block, and state plainly that the elements are the ones from `@urcolor/lit`, rendered in light DOM, so Tailwind applies:

```html
<script type="module">
  import Alpine from "alpinejs";
  import urcolor from "@urcolor/alpine";

  Alpine.plugin(urcolor);
  Alpine.start();
</script>

<div x-data="{ swatch: 'hsl(210, 80%, 50%)' }">
  <urcolor-slider-root x-color="swatch" channel="h">
    <urcolor-slider-control>
      <urcolor-slider-track class="relative block h-4 overflow-hidden rounded-xl">
        <urcolor-slider-gradient class="block"></urcolor-slider-gradient>
        <urcolor-slider-thumb class="size-4 rounded-full border-2 border-white shadow"></urcolor-slider-thumb>
      </urcolor-slider-track>
    </urcolor-slider-control>
  </urcolor-slider-root>

  <p x-text="$color.format(swatch, 'hsl', 'h')"></p>
</div>
```

- [ ] **Step 4: Wire into the root scripts**

Append to root `build`: ` && bun run --cwd packages/alpine build`, after the Lit entry. Append to root `lint`: ` && bun run --cwd packages/alpine check`.

- [ ] **Step 5: Add to the installation guide**

Add `@urcolor/alpine` to `docs/guide/installation.md` and the `de`, `es`, `fr` copies, as the Preact plan's Task 5 describes. Its package-table row reads `Alpine plugin over the custom elements`, and the prerequisites line gains "Alpine 3".

- [ ] **Step 6: Full verification**

Run: `bun test && bun run lint && bun run build && bun run docs:build`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add packages/alpine package.json docs
git commit -m "feat(alpine): cover every family and wire the package in"
```

---

## Self-Review

**Spec coverage.** The spec's Alpine section asks for three things: `Alpine.plugin(urcolor)` registering the Lit elements (Task 1), an `x-color` directive binding an expression to the element's colour property and its `colorchange` event (Task 2), and a `$color` magic (Task 3). "No second DOM implementation exists for Alpine" is structural here: the package's only DOM import is `@urcolor/lit`.

**One spec detail refined.** The spec says the directive binds "an element's `color` property". The Lit roots' settable property is `value`, with `color` as the read-only parsed getter, so the directive writes `value` and reads `detail.color` from the event. The spec is describing the concept; this is the concrete contract.

**Type consistency.** `registerColorDirective` and `registerColorMagic` are declared in Task 1's plugin and defined in Tasks 2 and 3 under those exact names. Task 1 step 6 requires them to exist as stubs first, so the plugin compiles before its pieces are written.

**Risk.** Alpine's `evaluateLater` on an assignment expression is the one uncertain mechanism, and Task 2 step 3 names the degradation if it does not hold. The component smoke test in Task 4 depends on every family from the Lit plan being complete, including `urcolor-field-input`, which is the only element there rendering a native control.
