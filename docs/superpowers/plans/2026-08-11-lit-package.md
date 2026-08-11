# @urcolor/lit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@urcolor/lit`: 26 light-DOM custom elements plus 14 reactive controllers, at parity with `@urcolor/svelte`.

**Architecture:** Two base classes carry the whole design. `UrcolorPart` extends Lit's `ReactiveElement` and never renders, so it keeps the author's light-DOM children while still getting reactive properties; every root, control, track, range and thumb is one. `UrcolorPainter` extends `LitElement` with `createRenderRoot() { return this }` and owns all of its own content; the gradient elements are the only ones. Parts reach their root with `closest()` and register for updates.

**Tech Stack:** Lit 3, TypeScript, `bun build`, `bun test` with happy-dom.

## Global Constraints

- **Prerequisites:** `2026-08-11-react-remove-base-ui.md` and `2026-08-11-shared-gradient-stops.md` complete. This plan does not depend on the Preact plan.
- **Light DOM only.** Every element overrides `createRenderRoot()` to return `this`. No shadow roots, no `::part()`, no `<slot>`. User classes, Tailwind utilities and inherited custom properties must work exactly as they do in `@urcolor/svelte`.
- **Never clear author children.** Anything that can contain caller markup extends `UrcolorPart`, which does not render. Only gradient elements, which own their entire subtree, may render.
- Behaviour logic comes from `@urcolor/shared`. This package contributes element plumbing and nothing else. If a gap appears, it lands in `shared` in its own commit.
- **Translation source of truth:** the matching file under `packages/svelte/src/lib/components/`. Svelte is the newest zero-dependency package and its context shape is the contract each Lit root reproduces.
- Element names are `urcolor-<family>-<part>`, all lowercase: `urcolor-slider-root`, `urcolor-area-thumb`, `urcolor-swatch`. Families are `slider`, `area`, `wheel`, `ring`, `triangle`, `field`, `swatch`, `swatch-group`.
- Data attributes come from the `DATA_*` constants in `@urcolor/shared`, never as string literals.
- Registration is a side effect of importing the module. Every element file ends with `customElements.define(...)`, guarded against double registration.
- Package name `@urcolor/lit`, version `2.0.0`, `peerDependencies: { "lit": "^3.1" }`.

---

## File Structure

**Created**, under `packages/lit/src/`:

| Path | Responsibility |
| --- | --- |
| `base/UrcolorPart.ts` | Non-rendering light-DOM base: reactive props, root lookup, subscription |
| `base/UrcolorPainter.ts` | Rendering light-DOM base for elements owning their subtree |
| `base/define.ts` | `define(name, ctor)`, idempotent `customElements.define` |
| `base/RootHost.ts` | Mixin giving a root its subscriber set and `notify()` |
| `components/slider/*.ts` | 6 elements: root, control, track, range, thumb, gradient |
| `components/area/*.ts` | 3 elements: root, gradient, thumb |
| `components/wheel/*.ts` | 3 elements |
| `components/ring/*.ts` | 4 elements: root, track, gradient, thumb |
| `components/triangle/*.ts` | 3 elements |
| `components/field/*.ts` | 5 elements: root, input, increment, decrement, swatch |
| `components/swatch/UrcolorSwatch.ts` | 1 element |
| `components/swatch-group/UrcolorSwatchGroupRoot.ts` | 1 element |
| `controllers/*.ts` | 14 colour controllers |
| `index.ts` | Barrel: side-effect registration plus type and controller exports |

Plus `package.json`, `tsconfig.json`, `tsconfig.build.json`, `README.md`, and `test/*.test.ts`.

---

### Task 1: Package scaffold and base classes

**Files:**
- Create: `packages/lit/package.json`, `tsconfig.json`, `tsconfig.build.json`
- Create: `packages/lit/src/base/define.ts`
- Create: `packages/lit/src/base/UrcolorPart.ts`
- Create: `packages/lit/src/base/UrcolorPainter.ts`
- Create: `packages/lit/src/base/RootHost.ts`
- Test: `packages/lit/test/base.test.ts`

**Interfaces:**
- Consumes: `ReactiveElement`, `LitElement`, `PropertyValues` from `lit`.
- Produces:
  - `function define(name: string, ctor: CustomElementConstructor): void`
  - `interface RootHost { subscribe(part: { requestUpdate(): void }): () => void; notify(): void; }`
  - `class UrcolorPart extends ReactiveElement` with `protected root<T extends RootHost>(tagName: string): T`
  - `class UrcolorPainter extends LitElement` with the same `root()` helper

- [ ] **Step 1: Add the dependency**

Run: `bun add -D lit@^3.1` at the repo root.

- [ ] **Step 2: Write the manifest**

Create `packages/lit/package.json`:

```json
{
  "name": "@urcolor/lit",
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
    "build:js": "bun build ./src/index.ts --outdir ./dist --format esm --external lit --external @urcolor/core --external @urcolor/shared",
    "build:types": "tsc --declaration --emitDeclarationOnly --outDir dist --project tsconfig.build.json",
    "check": "tsc -p tsconfig.json --noEmit"
  },
  "keywords": ["color", "color-picker", "lit", "web-components", "custom-elements", "headless", "accessible", "oklch"],
  "author": { "name": "GrandMagus", "url": "https://github.com/GrandMagus02" },
  "homepage": "https://urcolor.vercel.app/",
  "repository": { "type": "git", "url": "https://github.com/ur-color/urcolor", "directory": "packages/lit" },
  "bugs": { "url": "https://github.com/ur-color/urcolor/issues" },
  "dependencies": {
    "@urcolor/core": "workspace:*",
    "@urcolor/shared": "workspace:*"
  },
  "peerDependencies": { "lit": "^3.1" },
  "devDependencies": { "lit": "^3.1", "typescript": "^5.9" }
}
```

Create `packages/lit/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "experimentalDecorators": false,
    "useDefineForClassFields": false
  },
  "include": ["src", "test"]
}
```

`useDefineForClassFields: false` is required by Lit's standard-decorator setup: class fields must not shadow the accessors Lit installs on the prototype.

Create `packages/lit/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "rootDir": "src",
    "outDir": "dist",
    "paths": {
      "@urcolor/core": ["../core/dist/index.d.ts"],
      "@urcolor/shared": ["../shared/dist/index.d.ts"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Write the failing test**

Create `packages/lit/test/base.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { define } from "../src/base/define";
import { UrcolorPart } from "../src/base/UrcolorPart";
import { RootHostMixin } from "../src/base/RootHost";

class TestRoot extends RootHostMixin(UrcolorPart) {
  static properties = { label: { type: String } };
  declare label: string;
}
define("test-root", TestRoot);

class TestPart extends UrcolorPart {
  renders = 0;
  connectedCallback(): void {
    super.connectedCallback();
    this.bindRoot<TestRoot>("test-root");
  }
  protected update(changed: Map<string, unknown>): void {
    this.renders += 1;
    super.update(changed);
  }
}
define("test-part", TestPart);

function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  return { host, cleanup: () => host.remove() };
}

describe("UrcolorPart", () => {
  it("keeps author children", () => {
    const { host, cleanup } = mount(`<test-root><span id="kept">hi</span></test-root>`);
    expect(host.querySelector("#kept")).not.toBeNull();
    expect(host.querySelector("#kept")!.textContent).toBe("hi");
    cleanup();
  });

  it("finds its root through closest()", () => {
    const { host, cleanup } = mount(`<test-root><test-part></test-part></test-root>`);
    const part = host.querySelector("test-part") as TestPart;
    expect(part.rootElement).toBe(host.querySelector("test-root"));
    cleanup();
  });

  it("throws a named error when used outside its root", () => {
    const { host, cleanup } = mount(`<test-part></test-part>`);
    const part = host.querySelector("test-part") as TestPart;
    expect(() => part.rootElement).toThrow("test-part must be used within test-root");
    cleanup();
  });

  it("re-renders a part when the root notifies", async () => {
    const { host, cleanup } = mount(`<test-root><test-part></test-part></test-root>`);
    const root = host.querySelector("test-root") as TestRoot;
    const part = host.querySelector("test-part") as TestPart;
    const before = part.renders;
    root.notify();
    await part.updateComplete;
    expect(part.renders).toBeGreaterThan(before);
    cleanup();
  });

  it("unsubscribes on disconnect", async () => {
    const { host, cleanup } = mount(`<test-root><test-part></test-part></test-root>`);
    const root = host.querySelector("test-root") as TestRoot;
    const part = host.querySelector("test-part") as TestPart;
    part.remove();
    const before = part.renders;
    root.notify();
    await Promise.resolve();
    expect(part.renders).toBe(before);
    cleanup();
  });
});

describe("define", () => {
  it("is idempotent", () => {
    class Twice extends UrcolorPart {}
    expect(() => { define("test-twice", Twice); define("test-twice", Twice); }).not.toThrow();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `bun test packages/lit/test/base.test.ts`
Expected: FAIL, cannot resolve `../src/base/define`.

- [ ] **Step 5: Write `define`**

Create `packages/lit/src/base/define.ts`:

```ts
/**
 * Registers an element, tolerating a second import of the same module.
 *
 * A bundler that ships two copies of this package would otherwise throw on
 * the duplicate name and take the whole page down; a colour picker is not
 * worth that.
 */
export function define(name: string, ctor: CustomElementConstructor): void {
  if (customElements.get(name)) return;
  customElements.define(name, ctor);
}
```

- [ ] **Step 6: Write the root host mixin**

Create `packages/lit/src/base/RootHost.ts`:

```ts
import type { ReactiveElement } from "lit";

/** A part that wants to be told when its root's state moved. */
export interface Subscriber {
  requestUpdate(): void;
}

export interface RootHost {
  subscribe(part: Subscriber): () => void;
  /** Asks every subscribed part to re-read the root and update. */
  notify(): void;
}

type Constructor<T> = new (...args: any[]) => T;

/**
 * Gives a root element a subscriber set.
 *
 * Lit has no context protocol here on purpose: parts find their root with
 * `closest()`, which is the same lookup the DOM already performs for CSS
 * inheritance, and the subscription is what turns that one-time lookup into
 * a live one.
 */
export function RootHostMixin<T extends Constructor<ReactiveElement>>(Base: T) {
  return class extends Base implements RootHost {
    #subscribers = new Set<Subscriber>();

    subscribe(part: Subscriber): () => void {
      this.#subscribers.add(part);
      return () => { this.#subscribers.delete(part); };
    }

    notify(): void {
      for (const part of this.#subscribers) part.requestUpdate();
    }

    protected updated(changed: Map<string, unknown>): void {
      // @ts-expect-error `updated` exists on ReactiveElement but not on T.
      super.updated?.(changed);
      this.notify();
    }
  };
}
```

- [ ] **Step 7: Write the part base**

Create `packages/lit/src/base/UrcolorPart.ts`:

```ts
import { ReactiveElement } from "lit";
import type { RootHost } from "./RootHost";

/**
 * A light-DOM element that never renders.
 *
 * Extending `ReactiveElement` rather than `LitElement` is the whole trick:
 * reactive properties, attribute reflection and the update lifecycle all
 * work, but nothing ever writes to the element's children, so the markup the
 * caller wrote inside it survives. `LitElement` with a light-DOM render root
 * would clear it on first update.
 */
export class UrcolorPart extends ReactiveElement {
  #root: (RootHost & HTMLElement) | null = null;
  #unsubscribe: (() => void) | null = null;
  #rootTag = "";

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  /**
   * Binds this part to the nearest ancestor of `tagName`. Call from
   * `connectedCallback` after `super.connectedCallback()`.
   */
  protected bindRoot<T extends RootHost & HTMLElement>(tagName: string): void {
    this.#rootTag = tagName;
    const found = this.closest(tagName) as T | null;
    this.#root = found;
    this.#unsubscribe = found?.subscribe(this) ?? null;
  }

  /** The bound root, or a named error explaining the misuse. */
  get rootElement(): RootHost & HTMLElement {
    const found = this.#root ?? (this.#rootTag ? this.closest(this.#rootTag) as (RootHost & HTMLElement) | null : null);
    if (!found) {
      throw new Error(`${this.localName} must be used within ${this.#rootTag || "its root"}`);
    }
    return found;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#root = null;
  }
}
```

- [ ] **Step 8: Write the painter base**

Create `packages/lit/src/base/UrcolorPainter.ts`:

```ts
import { LitElement } from "lit";
import type { RootHost } from "./RootHost";

/**
 * A light-DOM element that owns its entire subtree.
 *
 * Only the gradient elements qualify: they render either a canvas or a stack
 * of CSS layer spans, and never contain caller markup, so Lit clearing the
 * element's children is exactly the behaviour wanted.
 */
export class UrcolorPainter extends LitElement {
  #root: (RootHost & HTMLElement) | null = null;
  #unsubscribe: (() => void) | null = null;
  #rootTag = "";

  protected createRenderRoot(): HTMLElement {
    return this;
  }

  protected bindRoot<T extends RootHost & HTMLElement>(tagName: string): void {
    this.#rootTag = tagName;
    const found = this.closest(tagName) as T | null;
    this.#root = found;
    this.#unsubscribe = found?.subscribe(this) ?? null;
  }

  get rootElement(): RootHost & HTMLElement {
    const found = this.#root ?? (this.#rootTag ? this.closest(this.#rootTag) as (RootHost & HTMLElement) | null : null);
    if (!found) {
      throw new Error(`${this.localName} must be used within ${this.#rootTag || "its root"}`);
    }
    return found;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#root = null;
  }
}
```

- [ ] **Step 9: Run the tests**

Run: `bun test packages/lit/test/base.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 10: Commit**

```bash
git add packages/lit/
git commit -m "feat(lit): add the light-DOM element bases"
```

---

### Task 2: The ColorSlider family

This task is the template. Every later family repeats its shape against a different Svelte source, so the code here is written out in full and the later tasks reference it by name.

**Files:**
- Create: `packages/lit/src/components/slider/UrcolorSliderRoot.ts`
- Create: `packages/lit/src/components/slider/UrcolorSliderControl.ts`
- Create: `packages/lit/src/components/slider/UrcolorSliderTrack.ts`
- Create: `packages/lit/src/components/slider/UrcolorSliderRange.ts`
- Create: `packages/lit/src/components/slider/UrcolorSliderThumb.ts`
- Create: `packages/lit/src/components/slider/UrcolorSliderGradient.ts`
- Create: `packages/lit/src/components/slider/index.ts`
- Test: `packages/lit/test/slider.test.ts`

**Translation source:** `packages/svelte/src/lib/components/color-slider/**`. The root reproduces `ColorSliderContextValue` from `color-slider/root/context.svelte.ts`: `color`, `colorSpace`, `channel`, `orientation`, `inverted`, `disabled`, `dragging`, `sliderState`, `position`.

**Interfaces:**
- Consumes: `UrcolorPart`, `UrcolorPainter`, `RootHostMixin`, `define` from Task 1; from `@urcolor/shared`: `applyDisplayValue`, `colorToDisplayValue`, `createDragController`, `DATA_DISABLED`, `DATA_DRAGGING`, `DATA_ORIENTATION`, `FEEDBACK_EPSILON`, `parseColor`, `positionFromValue`, `resolveChannelConfig`, `sliderAria`, `valueFromKey`, `valueFromPosition`, `channelLabel`, `formatChannelValue`, and from the gradient-stops plan `sliderStops`, `gradientOpacity`, `SLIDER_CANVAS_STEPS`.
- Produces: `class UrcolorSliderRoot` exposing readonly getters `color`, `colorSpace`, `channel`, `orientation`, `inverted`, `disabled`, `dragging`, `sliderState`, `position`; elements `urcolor-slider-{root,control,track,range,thumb,gradient}`.

- [ ] **Step 1: Write the failing test**

Create `packages/lit/test/slider.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import "../src/components/slider/index";
import type { UrcolorSliderRoot } from "../src/components/slider/UrcolorSliderRoot";

function mount(markup: string) {
  const host = document.createElement("div");
  host.innerHTML = markup;
  document.body.appendChild(host);
  return { host, cleanup: () => host.remove() };
}

const TREE = `
  <urcolor-slider-root channel="h">
    <urcolor-slider-control>
      <urcolor-slider-track>
        <urcolor-slider-range></urcolor-slider-range>
        <urcolor-slider-thumb></urcolor-slider-thumb>
      </urcolor-slider-track>
    </urcolor-slider-control>
  </urcolor-slider-root>`;

async function settle(host: HTMLElement) {
  const root = host.querySelector("urcolor-slider-root") as UrcolorSliderRoot;
  await root.updateComplete;
  await Promise.resolve();
}

describe("urcolor-slider", () => {
  it("keeps the author's element tree intact", async () => {
    const { host, cleanup } = mount(TREE);
    await settle(host);
    expect(host.querySelector("urcolor-slider-control")).not.toBeNull();
    expect(host.querySelector("urcolor-slider-track")).not.toBeNull();
    expect(host.querySelector("urcolor-slider-thumb")).not.toBeNull();
    cleanup();
  });

  it("gives the thumb slider semantics from the colour", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-slider-root") as UrcolorSliderRoot;
    root.value = "hsl(210, 80%, 50%)";
    await settle(host);
    const thumb = host.querySelector("urcolor-slider-thumb")!;
    expect(thumb.getAttribute("role")).toBe("slider");
    expect(thumb.getAttribute("aria-valuenow")).toBe("210");
    expect(thumb.getAttribute("aria-valuemax")).toBe("360");
    cleanup();
  });

  it("marks orientation and disabled on the root", async () => {
    const { host, cleanup } = mount(
      `<urcolor-slider-root channel="h" orientation="vertical" disabled></urcolor-slider-root>`,
    );
    await settle(host);
    const root = host.querySelector("urcolor-slider-root")!;
    expect(root.getAttribute("data-orientation")).toBe("vertical");
    expect(root.getAttribute("data-disabled")).toBe("");
    cleanup();
  });

  it("steps the channel on ArrowRight and emits colorchange", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-slider-root") as UrcolorSliderRoot;
    root.value = "hsl(210, 80%, 50%)";
    await settle(host);

    let emitted: string | undefined;
    root.addEventListener("colorchange", (event) => {
      emitted = (event as CustomEvent<{ color: { to(space: string): { get(c: string): number } } }>).detail.color.to("hsl").get("h").toFixed(0);
    });

    const thumb = host.querySelector("urcolor-slider-thumb")!;
    thumb.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    await settle(host);

    expect(emitted).toBe("211");
    expect(host.querySelector("urcolor-slider-thumb")!.getAttribute("aria-valuenow")).toBe("211");
    cleanup();
  });

  it("positions the thumb from the value", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-slider-root") as UrcolorSliderRoot;
    root.value = "hsl(90, 80%, 50%)";
    await settle(host);
    const thumb = host.querySelector("urcolor-slider-thumb") as HTMLElement;
    expect(thumb.style.left).toBe("25%");
    cleanup();
  });

  it("ignores keys when disabled", async () => {
    const { host, cleanup } = mount(TREE);
    const root = host.querySelector("urcolor-slider-root") as UrcolorSliderRoot;
    root.value = "hsl(210, 80%, 50%)";
    root.disabled = true;
    await settle(host);

    let fired = false;
    root.addEventListener("colorchange", () => { fired = true; });
    host.querySelector("urcolor-slider-thumb")!
      .dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    await settle(host);
    expect(fired).toBe(false);
    cleanup();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/lit/test/slider.test.ts`
Expected: FAIL, cannot resolve `../src/components/slider/index`.

- [ ] **Step 3: Write the root**

Create `packages/lit/src/components/slider/UrcolorSliderRoot.ts`:

```ts
import { Color, type SpaceId } from "@urcolor/core";
import {
  applyDisplayValue,
  colorToDisplayValue,
  DATA_DISABLED,
  DATA_DRAGGING,
  DATA_ORIENTATION,
  FEEDBACK_EPSILON,
  parseColor,
  positionFromValue,
  resolveChannelConfig,
  type SliderState,
} from "@urcolor/shared";
import { define } from "../../base/define";
import { RootHostMixin } from "../../base/RootHost";
import { UrcolorPart } from "../../base/UrcolorPart";

const DEFAULT_COLOR = Color.parse("hsl(210, 80%, 50%)")!;

/**
 * The slider family's root: it holds the colour, publishes the derived state
 * its parts read, and is the element `closest()` finds.
 *
 * Interaction does not live here. `urcolor-slider-control` owns the pointer
 * and keyboard listeners, because it is the element position-to-value is
 * measured against, and `keydown` from the focused thumb bubbles to it.
 */
export class UrcolorSliderRoot extends RootHostMixin(UrcolorPart) {
  static properties = {
    value: {},
    colorSpace: { type: String, attribute: "color-space" },
    channel: { type: String },
    disabled: { type: Boolean, reflect: true },
    dir: { type: String },
    inverted: { type: Boolean },
    orientation: { type: String },
  };

  /** The colour, as a `Color` or any string `Color.parse` accepts. */
  declare value: Color | string | null;
  declare colorSpace: SpaceId;
  declare channel: string;
  declare disabled: boolean;
  declare dir: "ltr" | "rtl" | undefined;
  declare inverted: boolean;
  declare orientation: "horizontal" | "vertical";

  #internal: Color = DEFAULT_COLOR;
  #dragging = false;

  constructor() {
    super();
    this.value = null;
    this.colorSpace = "hsl";
    this.channel = "h";
    this.disabled = false;
    this.inverted = false;
    this.orientation = "horizontal";
  }

  get color(): Color {
    return parseColor(this.value) ?? this.#internal;
  }

  get dragging(): boolean {
    return this.#dragging;
  }

  /** Set by the control while a gesture is in flight. */
  set dragging(next: boolean) {
    if (this.#dragging === next) return;
    this.#dragging = next;
    this.requestUpdate();
  }

  get sliderState(): SliderState {
    const config = resolveChannelConfig(this.colorSpace, this.channel);
    return {
      value: colorToDisplayValue(this.color, this.colorSpace, this.channel),
      min: config?.min ?? 0,
      max: config?.max ?? 100,
      step: config?.step ?? 1,
      orientation: this.orientation,
      dir: this.dir ?? "ltr",
      inverted: this.inverted,
      disabled: this.disabled,
    };
  }

  /** 0-1 offset of the thumb from the track's CSS start edge. */
  get position(): number {
    return positionFromValue(this.sliderState);
  }

  /** Writes one display-space channel value back as a colour. */
  setDisplayValue(next: number): void {
    if (Math.abs(next - this.sliderState.value) < FEEDBACK_EPSILON) return;
    const nextColor = applyDisplayValue(this.color, this.colorSpace, this.channel, next);
    this.#internal = nextColor;
    if (this.value !== null && this.value !== undefined) this.value = nextColor;
    this.requestUpdate();
    this.dispatchEvent(new CustomEvent("colorchange", {
      detail: { color: nextColor },
      bubbles: true,
      composed: true,
    }));
  }

  /** Reports the end of an interaction. */
  commit(): void {
    this.dispatchEvent(new CustomEvent("colorcommit", {
      detail: { color: this.color },
      bubbles: true,
      composed: true,
    }));
  }

  protected update(changed: Map<string, unknown>): void {
    this.setAttribute(DATA_ORIENTATION, this.orientation);
    this.toggleAttribute(DATA_DISABLED, this.disabled);
    this.toggleAttribute(DATA_DRAGGING, this.#dragging);
    super.update(changed);
  }
}

define("urcolor-slider-root", UrcolorSliderRoot);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-slider-root": UrcolorSliderRoot;
  }
}
```

`disabled` reflects as a real attribute; `data-disabled` is written separately because the library's styling contract is the `DATA_*` set, and consumers select on it.

- [ ] **Step 4: Write the control**

Create `packages/lit/src/components/slider/UrcolorSliderControl.ts`. The listener block is a direct translation of the `interaction` attachment in `ColorSliderRoot.svelte`.

```ts
import {
  createDragController,
  DATA_DISABLED,
  DATA_ORIENTATION,
  valueFromKey,
  valueFromPosition,
  type DragController,
} from "@urcolor/shared";
import { define } from "../../base/define";
import { UrcolorPart } from "../../base/UrcolorPart";
import type { UrcolorSliderRoot } from "./UrcolorSliderRoot";

/**
 * The measured, interactive area of the slider.
 *
 * Every listener the family needs lives here: pointer capture converts a
 * position to a value against this element's box, and `keydown` from the
 * focused thumb bubbles up to it, so one host covers both input paths.
 */
export class UrcolorSliderControl extends UrcolorPart {
  #drag: DragController | null = null;
  #keyboardActive = false;

  get #root(): UrcolorSliderRoot {
    return this.rootElement as UrcolorSliderRoot;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.bindRoot<UrcolorSliderRoot>("urcolor-slider-root");

    this.#drag = createDragController({
      getElement: () => this,
      isDisabled: () => this.#root.disabled,
      onStart: () => { this.#root.dragging = true; },
      onMove: (point) => {
        const root = this.#root;
        const state = root.sliderState;
        const position = state.orientation === "vertical" ? point.normalizedY : point.normalizedX;
        root.setDisplayValue(valueFromPosition(state, position));
      },
      onEnd: () => {
        this.#root.dragging = false;
        this.#root.commit();
      },
    });

    this.addEventListener("pointerdown", this.#onPointerDown);
    this.addEventListener("pointermove", this.#onPointerMove);
    this.addEventListener("pointerup", this.#onPointerUp);
    this.addEventListener("pointercancel", this.#onPointerCancel);
    this.addEventListener("keydown", this.#onKeyDown);
    this.addEventListener("keyup", this.#onKeyUp);
  }

  disconnectedCallback(): void {
    this.removeEventListener("pointerdown", this.#onPointerDown);
    this.removeEventListener("pointermove", this.#onPointerMove);
    this.removeEventListener("pointerup", this.#onPointerUp);
    this.removeEventListener("pointercancel", this.#onPointerCancel);
    this.removeEventListener("keydown", this.#onKeyDown);
    this.removeEventListener("keyup", this.#onKeyUp);
    this.#drag?.cancel();
    this.#drag = null;
    super.disconnectedCallback();
  }

  #onPointerDown = (event: Event): void => {
    this.#drag?.pointerDown(event as PointerEvent);
    // `pointerDown` calls `preventDefault`, which suppresses the focus the
    // browser would have moved to the thumb; do it explicitly instead.
    if (this.#drag?.isDragging) this.querySelector<HTMLElement>("[role='slider']")?.focus();
  };

  #onPointerMove = (event: Event): void => { this.#drag?.pointerMove(event as PointerEvent); };
  #onPointerUp = (event: Event): void => { this.#drag?.pointerUp(event as PointerEvent); };

  #onPointerCancel = (): void => {
    this.#drag?.pointerCancel();
    this.#root.dragging = false;
  };

  #onKeyDown = (event: Event): void => {
    const keyEvent = event as KeyboardEvent;
    const root = this.#root;
    const next = valueFromKey(root.sliderState, keyEvent);
    if (next === undefined) return;
    keyEvent.preventDefault();
    this.#keyboardActive = true;
    root.setDisplayValue(next);
  };

  #onKeyUp = (): void => {
    if (!this.#keyboardActive) return;
    this.#keyboardActive = false;
    this.#root.commit();
  };

  protected update(changed: Map<string, unknown>): void {
    const root = this.#root;
    this.setAttribute(DATA_ORIENTATION, root.orientation);
    this.toggleAttribute(DATA_DISABLED, root.disabled);
    super.update(changed);
  }
}

define("urcolor-slider-control", UrcolorSliderControl);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-slider-control": UrcolorSliderControl;
  }
}
```

- [ ] **Step 5: Write the track**

Create `packages/lit/src/components/slider/UrcolorSliderTrack.ts`:

```ts
import { DATA_DISABLED, DATA_ORIENTATION } from "@urcolor/shared";
import { define } from "../../base/define";
import { UrcolorPart } from "../../base/UrcolorPart";
import type { UrcolorSliderRoot } from "./UrcolorSliderRoot";

/** The rail. Carries data attributes and nothing else. */
export class UrcolorSliderTrack extends UrcolorPart {
  connectedCallback(): void {
    super.connectedCallback();
    this.bindRoot<UrcolorSliderRoot>("urcolor-slider-root");
  }

  protected update(changed: Map<string, unknown>): void {
    const root = this.rootElement as UrcolorSliderRoot;
    this.setAttribute(DATA_ORIENTATION, root.orientation);
    this.toggleAttribute(DATA_DISABLED, root.disabled);
    super.update(changed);
  }
}

define("urcolor-slider-track", UrcolorSliderTrack);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-slider-track": UrcolorSliderTrack;
  }
}
```

- [ ] **Step 6: Write the range**

Create `packages/lit/src/components/slider/UrcolorSliderRange.ts`, translating `range/ColorSliderRange.svelte` including its `fillsFromStart` reasoning:

```ts
import { clamp, DATA_DISABLED, DATA_ORIENTATION, positionFromValue } from "@urcolor/shared";
import { define } from "../../base/define";
import { UrcolorPart } from "../../base/UrcolorPart";
import type { UrcolorSliderRoot } from "./UrcolorSliderRoot";

/** The filled share of the track, measured from the minimum end. */
export class UrcolorSliderRange extends UrcolorPart {
  connectedCallback(): void {
    super.connectedCallback();
    this.bindRoot<UrcolorSliderRoot>("urcolor-slider-root");
  }

  protected update(changed: Map<string, unknown>): void {
    const state = (this.rootElement as UrcolorSliderRoot).sliderState;
    const fraction = state.max === state.min
      ? 0
      : clamp((state.value - state.min) / (state.max - state.min), 0, 1);
    /**
     * Whether the minimum sits at the track's CSS start edge. Asking the
     * primitive where `min` renders keeps `dir`, `inverted` and vertical
     * flipping in one place instead of re-deriving them here.
     */
    const fillsFromStart = positionFromValue({ ...state, value: state.min }) === 0;

    this.style.position = "absolute";
    if (state.orientation === "vertical") {
      this.style.left = "0";
      this.style.right = "0";
      this.style.height = `${fraction * 100}%`;
      this.style.top = fillsFromStart ? "0" : "";
      this.style.bottom = fillsFromStart ? "" : "0";
    } else {
      this.style.top = "0";
      this.style.bottom = "0";
      this.style.width = `${fraction * 100}%`;
      this.style.left = fillsFromStart ? "0" : "";
      this.style.right = fillsFromStart ? "" : "0";
    }

    this.setAttribute(DATA_ORIENTATION, state.orientation);
    this.toggleAttribute(DATA_DISABLED, state.disabled);
    super.update(changed);
  }
}

define("urcolor-slider-range", UrcolorSliderRange);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-slider-range": UrcolorSliderRange;
  }
}
```

- [ ] **Step 7: Write the thumb**

Create `packages/lit/src/components/slider/UrcolorSliderThumb.ts`, translating `thumb/ColorSliderThumb.svelte`:

```ts
import {
  channelLabel,
  DATA_DISABLED,
  DATA_DRAGGING,
  DATA_ORIENTATION,
  formatChannelValue,
  sliderAria,
} from "@urcolor/shared";
import { define } from "../../base/define";
import { UrcolorPart } from "../../base/UrcolorPart";
import type { UrcolorSliderRoot } from "./UrcolorSliderRoot";

/**
 * The focusable handle.
 *
 * It is only focusable: `keydown` bubbles to `urcolor-slider-control`, which
 * owns every value change.
 */
export class UrcolorSliderThumb extends UrcolorPart {
  connectedCallback(): void {
    super.connectedCallback();
    this.bindRoot<UrcolorSliderRoot>("urcolor-slider-root");
  }

  protected update(changed: Map<string, unknown>): void {
    const root = this.rootElement as UrcolorSliderRoot;
    const state = root.sliderState;
    const aria = sliderAria(state);

    this.setAttribute("role", aria.role);
    this.setAttribute("aria-valuenow", String(aria["aria-valuenow"]));
    this.setAttribute("aria-valuemin", String(aria["aria-valuemin"]));
    this.setAttribute("aria-valuemax", String(aria["aria-valuemax"]));
    this.setAttribute("aria-orientation", aria["aria-orientation"]);
    if (aria["aria-disabled"]) this.setAttribute("aria-disabled", "true");
    else this.removeAttribute("aria-disabled");
    if (aria.tabindex === undefined) this.removeAttribute("tabindex");
    else this.setAttribute("tabindex", String(aria.tabindex));

    if (!this.hasAttribute("aria-label")) {
      this.setAttribute("aria-label", channelLabel(root.colorSpace, root.channel));
    }
    this.setAttribute("aria-valuetext", formatChannelValue(root.colorSpace, root.channel, state.value));

    const offset = `${root.position * 100}%`;
    this.style.position = "absolute";
    if (state.orientation === "vertical") {
      this.style.top = offset;
      this.style.left = "50%";
    } else {
      this.style.left = offset;
      this.style.top = "50%";
    }
    this.style.translate = "-50% -50%";

    this.setAttribute(DATA_ORIENTATION, state.orientation);
    this.toggleAttribute(DATA_DISABLED, state.disabled);
    this.toggleAttribute(DATA_DRAGGING, root.dragging);
    super.update(changed);
  }
}

define("urcolor-slider-thumb", UrcolorSliderThumb);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-slider-thumb": UrcolorSliderThumb;
  }
}
```

- [ ] **Step 8: Write the gradient**

Create `packages/lit/src/components/slider/UrcolorSliderGradient.ts`. This is the only element in the family extending `UrcolorPainter`, because it owns its whole subtree. Translate `gradient/ColorSliderGradient.svelte`, which after the gradient-stops plan is mostly rendering:

```ts
import { html, nothing, type TemplateResult } from "lit";
import type { SpaceId } from "@urcolor/core";
import {
  CHECKERBOARD_CSS,
  cssLinearStops,
  defaultStepsFor,
  drawLinearGradient,
  gradientOpacity,
  sliderStops,
  SLIDER_CANVAS_STEPS,
  type ChannelOverrides,
  type CssGradientLayer,
  type GradientRenderer,
} from "@urcolor/shared";
import { define } from "../../base/define";
import { UrcolorPainter } from "../../base/UrcolorPainter";
import type { UrcolorSliderRoot } from "./UrcolorSliderRoot";

const LAYER_STYLE = "position:absolute;inset:0;width:100%;height:100%;";

export class UrcolorSliderGradient extends UrcolorPainter {
  static properties = {
    colors: { type: Array },
    angle: { type: Number },
    interpolationSpace: { type: String, attribute: "interpolation-space" },
    channelOverrides: { attribute: false },
    renderer: { type: String },
  };

  declare colors: string[] | undefined;
  declare angle: number | undefined;
  declare interpolationSpace: SpaceId | undefined;
  declare channelOverrides: ChannelOverrides;
  declare renderer: GradientRenderer;

  constructor() {
    super();
    this.channelOverrides = { alpha: 1 };
    this.renderer = "auto";
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.bindRoot<UrcolorSliderRoot>("urcolor-slider-root");
    this.style.cssText = CHECKERBOARD_CSS + this.style.cssText;
  }

  get #root(): UrcolorSliderRoot {
    return this.rootElement as UrcolorSliderRoot;
  }

  get #effectiveAngle(): number {
    return this.angle ?? (this.#root.orientation === "vertical" ? 90 : 0);
  }

  #stops(steps: number) {
    const root = this.#root;
    return sliderStops({
      color: root.color,
      colorSpace: root.colorSpace,
      channel: root.channel,
      colors: this.colors,
      channelOverrides: this.channelOverrides,
      interpolationSpace: this.interpolationSpace,
      steps,
      mirrored: root.inverted,
    });
  }

  /**
   * `null` means the canvas: the caller asked for it, or no exact recipe
   * exists for this space and channel. A layer list means the `<canvas>` is
   * never created at all, which frees a capped WebGL context slot.
   */
  get #cssLayers(): CssGradientLayer[] | null {
    if (this.renderer === "canvas") return null;
    const root = this.#root;
    const steps = this.colors ? SLIDER_CANVAS_STEPS : defaultStepsFor(root.colorSpace, root.channel);
    const stops = this.#stops(steps);
    return stops ? cssLinearStops(stops, this.#effectiveAngle) : null;
  }

  protected render(): TemplateResult | typeof nothing {
    const root = this.#root;
    const opacity = gradientOpacity(root.color, root.channel, this.channelOverrides);
    const layers = this.#cssLayers;

    if (layers) {
      return html`
        <span style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:${opacity};">
          ${layers.map(layer => html`<span style=${LAYER_STYLE
            + `background-image:${layer.image};`
            + (layer.mask ? `mask-image:${layer.mask};-webkit-mask-image:${layer.mask};` : "")}></span>`)}
        </span>`;
    }

    return html`<canvas
      style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:${opacity};"
    ></canvas>`;
  }

  protected updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    const canvas = this.querySelector("canvas");
    if (!canvas) return;
    const stops = this.#stops(SLIDER_CANVAS_STEPS);
    if (!stops) return;
    drawLinearGradient(canvas, stops, this.#effectiveAngle, this.#root.channel === "alpha");
  }

  disconnectedCallback(): void {
    // WebGL contexts are a capped per-document resource; release ours.
    this.querySelector("canvas")?.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext();
    super.disconnectedCallback();
  }
}

define("urcolor-slider-gradient", UrcolorSliderGradient);

declare global {
  interface HTMLElementTagNameMap {
    "urcolor-slider-gradient": UrcolorSliderGradient;
  }
}
```

The Svelte version's `renderer="css"` dev warning is not reproduced here; add it only if `resolveCssGradient`'s `warnNoCssRecipe` is lifted into `shared` first, in which case call it in `#cssLayers` when `renderer === "css"` and the recipe came back null.

- [ ] **Step 9: Write the family barrel**

Create `packages/lit/src/components/slider/index.ts`:

```ts
import "./UrcolorSliderRoot";
import "./UrcolorSliderControl";
import "./UrcolorSliderTrack";
import "./UrcolorSliderRange";
import "./UrcolorSliderThumb";
import "./UrcolorSliderGradient";

export { UrcolorSliderRoot } from "./UrcolorSliderRoot";
export { UrcolorSliderControl } from "./UrcolorSliderControl";
export { UrcolorSliderTrack } from "./UrcolorSliderTrack";
export { UrcolorSliderRange } from "./UrcolorSliderRange";
export { UrcolorSliderThumb } from "./UrcolorSliderThumb";
export { UrcolorSliderGradient } from "./UrcolorSliderGradient";
```

- [ ] **Step 10: Run the tests**

Run: `bun test packages/lit/test/slider.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 11: Commit**

```bash
git add packages/lit/src/components/slider packages/lit/test/slider.test.ts
git commit -m "feat(lit): add the ColorSlider element family"
```

---

### Tasks 3-8: The remaining families

Each of these repeats Task 2's shape exactly: roots extend `RootHostMixin(UrcolorPart)` and expose the Svelte context's members as getters; parts extend `UrcolorPart`, call `bindRoot` in `connectedCallback` and write attributes and styles in `update()`; gradients extend `UrcolorPainter`. Read the named Svelte source before writing each one and translate it, rather than inferring behaviour from the element list.

Every task follows the same five steps, so they are given once here and referenced by number:

1. Write the smoke test at `packages/lit/test/<family>.test.ts`, following `slider.test.ts`: mount the element tree from an HTML string, assert the author's children survived, assert the root's data attributes, assert the thumb's or input's semantics, and drive one keyboard interaction end to end.
2. Run it and watch it fail.
3. Write the elements, translating the named Svelte files.
4. Run the test until it passes.
5. Commit as `feat(lit): add the <Component> element family`.

---

### Task 3: ColorArea

**Elements:** `urcolor-area-root`, `urcolor-area-gradient`, `urcolor-area-thumb`
**Source:** `packages/svelte/src/lib/components/color-area/**`
**Root getters**, from `color-area/root/context.svelte.ts`: `color`, `colorSpace`, `xChannelKey`, `yChannelKey`, `minX`, `maxX`, `minY`, `maxY`, `valueX`, `valueY`, `disabled`, `dragging`, `isSlidingFromLeft`, `isSlidingFromTop`, `thumbAlignment`.
**Note:** the root owns interaction directly; there is no Control part in this family, so the listener block from Task 2's control moves onto the root itself.

---

### Task 4: ColorWheel

**Elements:** `urcolor-wheel-root`, `urcolor-wheel-gradient`, `urcolor-wheel-thumb`
**Source:** `packages/svelte/src/lib/components/color-wheel/**`
**Root getters:** `color`, `colorSpace`, `angleChannel`, `radiusChannel`, `angleValue`, `radiusValue`, `angleMin`, `angleMax`, `radiusMin`, `radiusMax`, `startAngle`, `disabled`, `dragging`.
**Note:** the gradient uses `cssWheelPolar` and `samplePolarGrid` from `@urcolor/shared`, not `cssLinearStops`.

---

### Task 5: ColorRing

**Elements:** `urcolor-ring-root`, `urcolor-ring-track`, `urcolor-ring-gradient`, `urcolor-ring-thumb`
**Source:** `packages/svelte/src/lib/components/color-ring/**`
**Root getters:** `color`, `colorSpace`, `channel`, `disabled`, `dragging`, `value`, `min`, `max`, `step`, `startAngle`, `innerRadius`.
**Note:** the ring masks its conic gradient; the Svelte gradient's `-webkit-mask-image` fallback must be carried over, since Safari needed the prefixed property well past the point the ring started relying on it.

---

### Task 6: ColorTriangle

**Elements:** `urcolor-triangle-root`, `urcolor-triangle-gradient`, `urcolor-triangle-thumb`
**Source:** `packages/svelte/src/lib/components/color-triangle/**`
**Root getters:** `color`, `colorSpace`, `xChannelKey`, `yChannelKey`, `zChannelKey`, `isThreeChannel`, `minX`, `maxX`, `minY`, `maxY`, `minZ`, `maxZ`, `valueX`, `valueY`, `valueZ`, `vertices`, `positionVertices`, `thumbAlignment`, `disabled`.
**Note:** the root must carry `DATA_COLOR_TRIANGLE_ROOT` so the thumb can measure its container, and the drag controller needs the `hitTest` option with `clampToTriangle`.

---

### Task 7: ColorField

**Elements:** `urcolor-field-root`, `urcolor-field-input`, `urcolor-field-increment`, `urcolor-field-decrement`, `urcolor-field-swatch`
**Source:** `packages/svelte/src/lib/components/color-field/**`
**Root getters and methods**, from `color-field/root/context.svelte.ts`: `modelValue`, `displayValue`, `disabled`, `readOnly`, `isDecreaseDisabled`, `isIncreaseDisabled`, `format`, `handleIncrease(multiplier?)`, `handleDecrease(multiplier?)`, `handleMinMaxValue(type)`, `commitValue(value)`, `onInputChange(text)`.
**Note:** this is the only family whose context exposes methods rather than pure state, and the only one where a part is a native `<input>`. `urcolor-field-input` therefore renders one and extends `UrcolorPainter`; the increment and decrement elements stay `UrcolorPart` so a caller can put an icon inside them. `DATA_READONLY` applies here and nowhere else.

---

### Task 8: ColorSwatch and ColorSwatchGroup

**Elements:** `urcolor-swatch`, `urcolor-swatch-group-root`
**Source:** `packages/svelte/src/lib/components/color-swatch/ColorSwatch.svelte` and `color-swatch-group/**`
**Group getters:** `type`, `value`, `disabled`, `orientation`, `loopFocus`, `activeIndex`, `count`, `groupState`.
**Note:** `urcolor-swatch` is the one element with two modes. Standalone it is a plain painted box with `role="img"`, built from `swatchPaint` and `swatchStyle`. Inside a group it becomes a toggle: `toggleAria` supplies the state, and the group owns roving focus through `rovingIndexFromKey`, finding its items by shape with the `ITEM_SELECTOR` from `ColorSwatchGroupRoot.svelte` rather than by registration. Because it may need to be a `<button>` in one mode and not the other, it extends `UrcolorPart` and sets `role`, `tabindex` and the aria attributes on itself instead of rendering a child button.

---

### Task 9: The 14 colour controllers

**Files:**
- Create: `packages/lit/src/controllers/ColorController.ts` and 13 siblings
- Create: `packages/lit/src/controllers/index.ts`
- Test: `packages/lit/test/controllers.test.ts`

**Source:** `packages/svelte/src/lib/hooks/*` for behaviour, `packages/angular/src/services/*-store.ts` for the class shape.

**Interfaces:**
- Produces: `ColorController`, `ColorSpaceController`, `RgbController`, `HslController`, `HsvController`, `HwbController`, `OklchController`, `OklabController`, `LchController`, `LabController`, `P3Controller`, `A98Controller`, `ProPhotoController`, `Rec2020Controller`. Each implements Lit's `ReactiveController`, takes `(host: ReactiveControllerHost, initial?: Color | string)`, and calls `host.requestUpdate()` on every mutation.

- [ ] **Step 1: Write the failing test**

Create `packages/lit/test/controllers.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { Color } from "@urcolor/core";
import { ColorController, HslController } from "../src/controllers/index";

class FakeHost {
  updates = 0;
  controllers: unknown[] = [];
  addController(c: unknown) { this.controllers.push(c); }
  removeController() {}
  requestUpdate() { this.updates += 1; }
  updateComplete = Promise.resolve(true);
}

describe("ColorController", () => {
  it("registers itself with the host", () => {
    const host = new FakeHost();
    const controller = new ColorController(host, "hsl(210, 80%, 50%)");
    expect(host.controllers).toContain(controller);
  });

  it("exposes the parsed colour", () => {
    const controller = new ColorController(new FakeHost(), "hsl(210, 80%, 50%)");
    expect(Math.round(controller.value.to("hsl").get("h"))).toBe(210);
  });

  it("requests an update when set", () => {
    const host = new FakeHost();
    const controller = new ColorController(host, "hsl(210, 80%, 50%)");
    const before = host.updates;
    controller.value = Color.parse("hsl(90, 80%, 50%)")!;
    expect(host.updates).toBe(before + 1);
  });
});

describe("HslController", () => {
  it("reads and writes one channel", () => {
    const host = new FakeHost();
    const controller = new HslController(host, "hsl(210, 80%, 50%)");
    expect(Math.round(controller.h)).toBe(210);
    controller.h = 90;
    expect(Math.round(controller.value.to("hsl").get("h"))).toBe(90);
    expect(host.updates).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/lit/test/controllers.test.ts`
Expected: FAIL, cannot resolve `../src/controllers/index`.

- [ ] **Step 3: Write the base controller**

Create `packages/lit/src/controllers/ColorController.ts`:

```ts
import type { ReactiveController, ReactiveControllerHost } from "lit";
import { Color } from "@urcolor/core";
import { parseColor } from "@urcolor/shared";

const DEFAULT_COLOR = Color.parse("hsl(210, 80%, 50%)")!;

/**
 * Colour state bound to an element's update cycle.
 *
 * The Lit counterpart of `useColor` in React and `ColorStore` in Angular:
 * a controller rather than a hook, because Lit has no render-time state.
 */
export class ColorController implements ReactiveController {
  #host: ReactiveControllerHost;
  #value: Color;

  constructor(host: ReactiveControllerHost, initial?: Color | string) {
    this.#host = host;
    this.#value = parseColor(initial) ?? DEFAULT_COLOR;
    host.addController(this);
  }

  hostConnected(): void {}

  get value(): Color {
    return this.#value;
  }

  set value(next: Color | string) {
    const parsed = parseColor(next);
    if (!parsed) return;
    this.#value = parsed;
    this.#host.requestUpdate();
  }
}
```

- [ ] **Step 4: Write the space controllers**

The 13 space controllers are one shape parameterised by a `SpaceId` and its channel keys. Create `packages/lit/src/controllers/createSpaceController.ts`:

```ts
import type { ReactiveControllerHost } from "lit";
import type { Color, SpaceId } from "@urcolor/core";
import { channelsOf } from "@urcolor/shared";
import { ColorController } from "./ColorController";

/**
 * Builds a controller class exposing one accessor per channel of a space.
 *
 * `channelsOf` is the single source of which channels a space has, so a space
 * gaining a channel in `@urcolor/core` gains an accessor here for free.
 */
export function createSpaceController(space: SpaceId) {
  class SpaceController extends ColorController {
    constructor(host: ReactiveControllerHost, initial?: Color | string) {
      super(host, initial);
    }
  }

  for (const config of channelsOf(space)) {
    Object.defineProperty(SpaceController.prototype, config.key, {
      get(this: SpaceController) {
        return this.value.to(space).get(config.key);
      },
      set(this: SpaceController, next: number) {
        this.value = this.value.with({ space, [config.key]: next });
      },
      enumerable: true,
      configurable: true,
    });
  }

  return SpaceController;
}
```

Then create one file per space, for example `packages/lit/src/controllers/HslController.ts`:

```ts
import { createSpaceController } from "./createSpaceController";

const Base = createSpaceController("hsl");

/** `h`, `s`, `l` accessors over a shared colour. */
export class HslController extends Base {
  declare h: number;
  declare s: number;
  declare l: number;
}
```

Repeat for `rgb` (`r`, `g`, `b`), `hsv` (`h`, `s`, `v`), `hwb` (`h`, `w`, `b`), `oklch` (`l`, `c`, `h`), `oklab` (`l`, `a`, `b`), `lch` (`l`, `c`, `h`), `lab` (`l`, `a`, `b`), `p3`, `a98`, `prophoto`, `rec2020` (each `r`, `g`, `b`). Confirm the exact `SpaceId` strings and channel keys against `packages/shared/src/color-spaces.ts`'s `colorSpaces` map rather than assuming them.

`ColorSpaceController` is different: it holds a `SpaceId` and a `Color` together, mirroring `useColorSpace`. Translate `packages/svelte/src/lib/hooks/useColorSpace.svelte.ts`.

- [ ] **Step 5: Write the barrel and run the tests**

Create `packages/lit/src/controllers/index.ts` exporting all 14, then run: `bun test packages/lit/test/controllers.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/lit/src/controllers packages/lit/test/controllers.test.ts
git commit -m "feat(lit): add the colour reactive controllers"
```

---

### Task 10: Barrel, build and monorepo wiring

**Files:**
- Create: `packages/lit/src/index.ts`
- Create: `packages/lit/README.md`
- Modify: root `package.json`, root `lint` script
- Modify: `docs/guide/installation.md` and its three translations

- [ ] **Step 1: Write the barrel**

Create `packages/lit/src/index.ts`:

```ts
/**
 * Importing this module registers every element. The named exports are the
 * classes, for typing a query result or subclassing.
 */
export * from "./components/slider/index";
export * from "./components/area/index";
export * from "./components/wheel/index";
export * from "./components/ring/index";
export * from "./components/triangle/index";
export * from "./components/field/index";
export * from "./components/swatch/index";
export * from "./components/swatch-group/index";
export * from "./controllers/index";
export { define } from "./base/define";
export { UrcolorPart } from "./base/UrcolorPart";
export { UrcolorPainter } from "./base/UrcolorPainter";
```

- [ ] **Step 2: Build**

Run: `bun run --cwd packages/lit build`
Expected: `packages/lit/dist/index.js` and `dist/index.d.ts`.

- [ ] **Step 3: Wire into the root scripts**

In the root `package.json`, append to `build`:

```
 && bun run --cwd packages/lit build
```

and to `lint`, after the Angular check:

```
 && bun run --cwd packages/lit check
```

- [ ] **Step 4: Write the readme**

Create `packages/lit/README.md` following `packages/preact/README.md`'s structure, with this usage block:

```html
<script type="module">
  import "@urcolor/lit";

  const root = document.querySelector("urcolor-slider-root");
  root.value = "hsl(210, 80%, 50%)";
  root.addEventListener("colorchange", (event) => {
    console.log(event.detail.color.toString());
  });
</script>

<urcolor-slider-root channel="h">
  <urcolor-slider-control>
    <urcolor-slider-track>
      <urcolor-slider-gradient></urcolor-slider-gradient>
      <urcolor-slider-thumb></urcolor-slider-thumb>
    </urcolor-slider-track>
  </urcolor-slider-control>
</urcolor-slider-root>
```

State the light-DOM contract explicitly: these elements have no shadow root, so ordinary CSS and Tailwind classes apply to them and their children.

- [ ] **Step 5: Add to the installation guide**

Add `@urcolor/lit` to `docs/guide/installation.md` and its `de`, `es`, `fr` counterparts, exactly as the Preact plan's Task 5 describes: prerequisites line, package table row, four-tab install block.

- [ ] **Step 6: Full verification**

Run: `bun test && bun run lint && bun run build && bun run docs:build`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add packages/lit package.json docs
git commit -m "feat(lit): wire the package into the build and install guide"
```

---

## Self-Review

**Spec coverage.** Light DOM with `createRenderRoot()` returning `this` is Task 1, and the spec's warning that "Lit's `render()` will clear user-authored children" is answered structurally by `UrcolorPart` extending `ReactiveElement` instead of `LitElement`, so no root can make that mistake. `closest()` root lookup, `@property` state on roots and the `urcolor-*` naming are all in Task 2. The 26 parts are covered by Tasks 2-8; the 14 controllers by Task 9.

**Type consistency.** `bindRoot(tagName)` and the `rootElement` getter are defined in Task 1 and used under those names in every later task. `RootHostMixin`, `define`, `UrcolorPart` and `UrcolorPainter` likewise. `setDisplayValue` and `commit` are defined on `UrcolorSliderRoot` in Task 2 step 3 and called from the control in step 4.

**Detail asymmetry, deliberate.** Task 2 carries full code; Tasks 3-8 carry the element list, the exact context members to reproduce, the Svelte file to translate, and the family-specific traps. Retyping six near-identical variants of the same 400 lines would add length without adding information, and would risk drifting from the Svelte source, which is the actual specification. Each of those tasks still opens with its own written test and ends with its own commit.

**Risk.** happy-dom has no layout, so `getBoundingClientRect()` returns zeros and pointer-drag paths cannot be tested here; every family's test drives keyboard instead. The drag controller itself is already covered by `@urcolor/shared`'s own tests, so what goes untested is only the wiring, which is identical across families and exercised once through Task 2's control.
