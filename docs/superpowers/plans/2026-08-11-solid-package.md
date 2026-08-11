# @urcolor/solid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@urcolor/solid`: 26 components across 8 families plus 14 colour primitives, at parity with `@urcolor/svelte`.

**Architecture:** A direct translation of the Svelte package. Svelte's `$derived` becomes a Solid accessor, its context pair becomes `createContext` plus a throwing `useX()`, and its attachment functions become `onMount`/`onCleanup` over a `ref`. Solid's props are getters, so a context object of accessor functions maps one-to-one onto Svelte's getter-based context.

**Tech Stack:** Solid 1.9, `vite-plugin-solid`, TypeScript, `bun test` with happy-dom and `babel-preset-solid`.

## Global Constraints

- **Prerequisites:** `2026-08-11-react-remove-base-ui.md` and `2026-08-11-shared-gradient-stops.md` complete. Independent of the Preact, Lit and Alpine plans.
- **Translation source of truth:** the matching file under `packages/svelte/src/lib/components/`. Where this plan and that file disagree, the file wins.
- Behaviour logic comes from `@urcolor/shared`. Gaps land in `shared`, in their own commit.
- **Never destructure props.** Solid props are reactive getters; destructuring at the top of a component freezes them. Use `splitProps` and `mergeProps`, which is also how the props default values are expressed.
- Data attributes come from the `DATA_*` constants in `@urcolor/shared`.
- The public shape matches React and Svelte: `ColorSlider.Root`, `ColorSlider.Track` and so on, with `value` / `defaultValue` / `onValueChange` / `onValueCommit`. Not a signal tuple.
- Colour primitives follow Solid's convention and are named `createColor`, `createHSL`, … not `useColor`.
- Package name `@urcolor/solid`, version `2.0.0`, `peerDependencies: { "solid-js": "^1.9" }`. The build preserves JSX for downstream compilation, which is what Solid libraries must do.

---

## File Structure

**Created**, under `packages/solid/src/`:

| Path | Responsibility |
| --- | --- |
| `shared/context.ts` | `createContextPair`, the Solid twin of Svelte's |
| `shared/dataAttributes.ts` | Turning state into the `DATA_*` attribute object |
| `components/color-slider/**` | 6 components: root, control, track, range, thumb, gradient |
| `components/color-area/**` | 3 |
| `components/color-wheel/**` | 3 |
| `components/color-ring/**` | 4 |
| `components/color-triangle/**` | 3 |
| `components/color-field/**` | 5 |
| `components/color-swatch/ColorSwatch.tsx` | 1 |
| `components/color-swatch-group/**` | 1 |
| `primitives/*.ts` | 14 colour primitives |
| `index.ts` | Barrel |

Per family, the layout mirrors Svelte exactly: `root/ColorXRoot.tsx`, `root/context.ts`, `<part>/ColorX<Part>.tsx`, `index.parts.ts`, `index.ts`.

---

### Task 1: Package scaffold, test harness and the context helper

**Files:**
- Create: `packages/solid/package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.build.json`
- Create: `packages/solid/src/shared/context.ts`
- Modify: `preload.ts` (root), adding Solid JSX compilation for `bun test`
- Test: `packages/solid/test/context.test.tsx`

**Interfaces:**
- Produces: `function createContextPair<T>(name: string): { Provider: (props: { value: T; children: JSX.Element }) => JSX.Element; use(): T }`. `use()` throws `"<name>.* must be used within <name>Root"` outside the provider, matching Svelte's message exactly.

- [ ] **Step 1: Add dependencies**

Run: `bun add -D solid-js@^1.9 vite-plugin-solid babel-preset-solid @babel/core @solidjs/testing-library` at the repo root.

- [ ] **Step 2: Write the manifest**

Create `packages/solid/package.json`:

```json
{
  "name": "@urcolor/solid",
  "version": "2.0.0",
  "license": "MIT",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "solid": "./dist/source/index.jsx",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "bun run build:js && bun run build:types",
    "build:js": "vite build",
    "build:types": "tsc --declaration --emitDeclarationOnly --outDir dist --project tsconfig.build.json",
    "check": "tsc -p tsconfig.json --noEmit"
  },
  "keywords": ["color", "color-picker", "solid", "solidjs", "signals", "headless", "accessible", "oklch"],
  "author": { "name": "GrandMagus", "url": "https://github.com/GrandMagus02" },
  "homepage": "https://urcolor.vercel.app/",
  "repository": { "type": "git", "url": "https://github.com/ur-color/urcolor", "directory": "packages/solid" },
  "bugs": { "url": "https://github.com/ur-color/urcolor/issues" },
  "dependencies": {
    "@urcolor/core": "workspace:*",
    "@urcolor/shared": "workspace:*"
  },
  "peerDependencies": { "solid-js": "^1.9" },
  "devDependencies": { "solid-js": "^1.9", "vite": "^7.3.1", "vite-plugin-solid": "^2.11", "typescript": "^5.9" }
}
```

The `"solid"` export condition pointing at un-compiled JSX is what lets a consumer's own Solid compiler process the components. Without it, Solid libraries break reactivity across the package boundary.

- [ ] **Step 3: Write the vite config**

Create `packages/solid/vite.config.ts`:

```ts
import { resolve } from "node:path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid({ ssr: false })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["solid-js", "solid-js/web", "solid-js/store", "@urcolor/core", "@urcolor/shared"],
    },
  },
});
```

`tsconfig.json` extends the root with `"jsx": "preserve"` and `"jsxImportSource": "solid-js"`; `tsconfig.build.json` adds the declaration settings and the `@urcolor/*` path map, copying `packages/lit/tsconfig.build.json`'s shape.

- [ ] **Step 4: Teach `bun test` to compile Solid JSX**

`preload.ts` at the repo root already registers a Bun plugin that pre-compiles Vue SFCs. Add a second plugin beside it, for `.tsx` files under `packages/solid/`:

```ts
import { transformAsync } from "@babel/core";
import solidPreset from "babel-preset-solid";

plugin({
  name: "solid-jsx",
  setup(build) {
    build.onLoad({ filter: /packages[\\/]solid[\\/].*\.tsx$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      const result = await transformAsync(source, {
        filename: args.path,
        presets: [
          [solidPreset, { generate: "dom", hydratable: false }],
          ["@babel/preset-typescript", { isTSX: true, allExtensions: true }],
        ],
      });
      return { contents: result?.code ?? source, loader: "js" };
    });
  },
});
```

The filter is path-scoped so React's `.tsx` files keep loading through Bun's own transpiler.

- [ ] **Step 5: Write the failing test**

Create `packages/solid/test/context.test.tsx`:

```tsx
import { describe, expect, it } from "bun:test";
import { render } from "@solidjs/testing-library";
import { createContextPair } from "../src/shared/context";

const pair = createContextPair<{ label: () => string }>("Widget");

function Consumer() {
  const ctx = pair.use();
  return <span data-testid="out">{ctx.label()}</span>;
}

describe("createContextPair", () => {
  it("passes the value down", () => {
    const { getByTestId, unmount } = render(() => (
      <pair.Provider value={{ label: () => "hello" }}>
        <Consumer />
      </pair.Provider>
    ));
    expect(getByTestId("out").textContent).toBe("hello");
    unmount();
  });

  it("throws a named error outside the provider", () => {
    expect(() => render(() => <Consumer />)).toThrow("Widget.* must be used within WidgetRoot");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `bun test packages/solid/test/context.test.tsx`
Expected: FAIL, cannot resolve `../src/shared/context`.

- [ ] **Step 7: Write the context helper**

Create `packages/solid/src/shared/context.ts`:

```tsx
import { createContext, useContext, type JSX } from "solid-js";

/**
 * A typed provider/consumer pair, the Solid twin of the Svelte package's
 * `createContextPair`.
 *
 * `use()` throws when called outside the matching root, so misuse surfaces as
 * a named error rather than an `undefined` dereference deeper in the tree.
 * The value is an object of accessor functions, which is how a Solid context
 * stays live: the object identity never changes, the functions read signals.
 */
export function createContextPair<T>(name: string) {
  const Context = createContext<T>();

  return {
    Provider(props: { value: T; children: JSX.Element }): JSX.Element {
      return <Context.Provider value={props.value}>{props.children}</Context.Provider>;
    },
    use(): T {
      const value = useContext(Context);
      if (value === undefined) throw new Error(`${name}.* must be used within ${name}Root`);
      return value;
    },
  };
}
```

- [ ] **Step 8: Run the tests**

Run: `bun test packages/solid/test/context.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 9: Commit**

```bash
git add packages/solid preload.ts package.json
git commit -m "feat(solid): scaffold the package and its context helper"
```

---

### Task 2: The ColorSlider family

The template task. Later families repeat its shape against a different Svelte source.

**Files:**
- Create: `packages/solid/src/components/color-slider/root/context.ts`
- Create: `packages/solid/src/components/color-slider/root/ColorSliderRoot.tsx`
- Create: `packages/solid/src/components/color-slider/control/ColorSliderControl.tsx`
- Create: `packages/solid/src/components/color-slider/track/ColorSliderTrack.tsx`
- Create: `packages/solid/src/components/color-slider/range/ColorSliderRange.tsx`
- Create: `packages/solid/src/components/color-slider/thumb/ColorSliderThumb.tsx`
- Create: `packages/solid/src/components/color-slider/gradient/ColorSliderGradient.tsx`
- Create: `packages/solid/src/components/color-slider/index.parts.ts`, `index.ts`
- Test: `packages/solid/test/color-slider.test.tsx`

**Translation source:** `packages/svelte/src/lib/components/color-slider/**`.

**Interfaces:**
- Produces:
  - `interface ColorSliderContextValue { color(): Color; colorSpace(): SpaceId; channel(): string; orientation(): "horizontal" | "vertical"; inverted(): boolean; disabled(): boolean; dragging(): boolean; sliderState(): SliderState; position(): number; setDisplayValue(next: number): void; commit(): void; setDragging(value: boolean): void; registerControl(el: HTMLElement): void; }`
  - `const colorSliderContext = createContextPair<ColorSliderContextValue>("ColorSlider")`
  - `ColorSliderRoot`, `ColorSliderControl`, `ColorSliderTrack`, `ColorSliderRange`, `ColorSliderThumb`, `ColorSliderGradient`
  - `export const ColorSlider = { Root, Control, Track, Range, Thumb, Gradient }`

Svelte's context is getters over `$derived`; here it is functions over signals. Every member is a function, including the ones that look like plain data, so nothing is read eagerly at provider construction.

- [ ] **Step 1: Write the failing test**

Create `packages/solid/test/color-slider.test.tsx`:

```tsx
import { describe, expect, it } from "bun:test";
import { createSignal } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { Color } from "@urcolor/core";
import { ColorSlider } from "../src/components/color-slider/index";

function Harness(props: { channel?: string; disabled?: boolean; inverted?: boolean; onChange?: (c: Color) => void }) {
  const [color, setColor] = createSignal(Color.parse("hsl(210, 80%, 50%)")!);
  return (
    <ColorSlider.Root
      value={color()}
      channel={props.channel ?? "h"}
      disabled={props.disabled}
      inverted={props.inverted}
      onValueChange={(next: Color) => { setColor(next); props.onChange?.(next); }}
    >
      <ColorSlider.Control>
        <ColorSlider.Track>
          <ColorSlider.Range />
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider.Control>
    </ColorSlider.Root>
  );
}

describe("ColorSlider", () => {
  it("gives the thumb slider semantics", () => {
    const { container, unmount } = render(() => <Harness />);
    const thumb = container.querySelector("[role='slider']")!;
    expect(thumb.getAttribute("aria-valuenow")).toBe("210");
    expect(thumb.getAttribute("aria-valuemax")).toBe("360");
    unmount();
  });

  it("marks orientation and disabled", () => {
    const { container, unmount } = render(() => <Harness disabled />);
    const root = container.firstElementChild!;
    expect(root.getAttribute("data-orientation")).toBe("horizontal");
    expect(root.getAttribute("data-disabled")).toBe("");
    unmount();
  });

  it("steps the channel on ArrowRight", () => {
    let seen: Color | undefined;
    const { container, unmount } = render(() => <Harness onChange={(c) => { seen = c; }} />);
    fireEvent.keyDown(container.querySelector("[role='slider']")!, { key: "ArrowRight" });
    expect(Math.round(seen!.to("hsl").get("h"))).toBe(211);
    unmount();
  });

  it("reverses arrow direction when inverted", () => {
    let seen: Color | undefined;
    const { container, unmount } = render(() => <Harness inverted onChange={(c) => { seen = c; }} />);
    fireEvent.keyDown(container.querySelector("[role='slider']")!, { key: "ArrowRight" });
    expect(Math.round(seen!.to("hsl").get("h"))).toBe(209);
    unmount();
  });

  it("moves the thumb when the value changes", () => {
    const { container, unmount } = render(() => <Harness />);
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    expect(thumb.style.left).toBe(`${(210 / 360) * 100}%`);
    fireEvent.keyDown(thumb, { key: "End" });
    expect(thumb.style.left).toBe("100%");
    unmount();
  });

  it("ignores keys when disabled", () => {
    let seen: Color | undefined;
    const { container, unmount } = render(() => <Harness disabled onChange={(c) => { seen = c; }} />);
    fireEvent.keyDown(container.querySelector("[role='slider']")!, { key: "ArrowRight" });
    expect(seen).toBeUndefined();
    unmount();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/solid/test/color-slider.test.tsx`
Expected: FAIL, cannot resolve the component module.

- [ ] **Step 3: Write the context**

Create `packages/solid/src/components/color-slider/root/context.ts`:

```ts
import type { Color, SpaceId } from "@urcolor/core";
import type { SliderState } from "@urcolor/shared";
import { createContextPair } from "../../../shared/context";

/**
 * Everything a `ColorSlider` part needs from its root.
 *
 * Every member is a function rather than a value: Solid contexts hold one
 * object for the provider's lifetime, so reading through accessors is what
 * keeps a part subscribed to the root's signals.
 */
export interface ColorSliderContextValue {
  color(): Color;
  colorSpace(): SpaceId;
  channel(): string;
  orientation(): "horizontal" | "vertical";
  inverted(): boolean;
  disabled(): boolean;
  /** True while a pointer drag is in flight. */
  dragging(): boolean;
  /** The channel in display units, plus its bounds and axis flags. */
  sliderState(): SliderState;
  /** 0-1 offset of the thumb from the track's CSS start edge. */
  position(): number;
  /** Writes one display-space channel value back as a colour. */
  setDisplayValue(next: number): void;
  /** Reports the end of an interaction. */
  commit(): void;
  setDragging(value: boolean): void;
  /** The control registers the element position-to-value is measured against. */
  registerControl(el: HTMLElement | null): void;
  control(): HTMLElement | null;
}

export const colorSliderContext = createContextPair<ColorSliderContextValue>("ColorSlider");
```

- [ ] **Step 4: Write the root**

Create `packages/solid/src/components/color-slider/root/ColorSliderRoot.tsx`:

```tsx
import { createMemo, createSignal, mergeProps, splitProps, type JSX } from "solid-js";
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
import { colorSliderContext, type ColorSliderContextValue } from "./context";

const DEFAULT_COLOR = Color.parse("hsl(210, 80%, 50%)")!;

export interface ColorSliderRootProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** The colour value. */
  value?: Color | string | null;
  /** The colour used until the first interaction when `value` is not supplied. */
  defaultValue?: Color | string | null;
  /** The colour space mode, for example `"hsl"` or `"oklch"`. */
  colorSpace?: SpaceId;
  /** Which channel this slider controls, or `"alpha"`. */
  channel?: string;
  disabled?: boolean;
  /** The reading direction. */
  dir?: "ltr" | "rtl";
  /** Whether the slider runs opposite to its natural direction. */
  inverted?: boolean;
  orientation?: "horizontal" | "vertical";
  /** Called on every change, including mid-drag. */
  onValueChange?: (color: Color) => void;
  /** Called once at the end of an interaction. */
  onValueCommit?: (color: Color) => void;
}

export function ColorSliderRoot(rawProps: ColorSliderRootProps): JSX.Element {
  const props = mergeProps(
    { colorSpace: "hsl" as SpaceId, channel: "h", disabled: false, inverted: false, orientation: "horizontal" as const },
    rawProps,
  );
  const [, rest] = splitProps(props, [
    "value", "defaultValue", "colorSpace", "channel", "disabled",
    "dir", "inverted", "orientation", "onValueChange", "onValueCommit", "children",
  ]);

  /** Uncontrolled fallback, kept in sync so it and `value` never disagree. */
  const [internal, setInternal] = createSignal<Color>(
    parseColor(rawProps.value) ?? parseColor(rawProps.defaultValue) ?? DEFAULT_COLOR,
  );
  const [dragging, setDragging] = createSignal(false);
  const [control, registerControl] = createSignal<HTMLElement | null>(null);

  const color = createMemo(() => parseColor(props.value) ?? internal());

  const sliderState = createMemo<SliderState>(() => {
    const config = resolveChannelConfig(props.colorSpace, props.channel);
    return {
      value: colorToDisplayValue(color(), props.colorSpace, props.channel),
      min: config?.min ?? 0,
      max: config?.max ?? 100,
      step: config?.step ?? 1,
      orientation: props.orientation,
      dir: props.dir ?? "ltr",
      inverted: props.inverted,
      disabled: props.disabled,
    };
  });

  function setDisplayValue(next: number): void {
    if (Math.abs(next - sliderState().value) < FEEDBACK_EPSILON) return;
    const nextColor = applyDisplayValue(color(), props.colorSpace, props.channel, next);
    setInternal(nextColor);
    props.onValueChange?.(nextColor);
  }

  function commit(): void {
    props.onValueCommit?.(color());
  }

  const context: ColorSliderContextValue = {
    color,
    colorSpace: () => props.colorSpace,
    channel: () => props.channel,
    orientation: () => props.orientation,
    inverted: () => props.inverted,
    disabled: () => props.disabled,
    dragging,
    sliderState,
    position: () => positionFromValue(sliderState()),
    setDisplayValue,
    commit,
    setDragging,
    registerControl,
    control,
  };

  return (
    <colorSliderContext.Provider value={context}>
      <div
        dir={props.dir}
        {...{ [DATA_ORIENTATION]: props.orientation }}
        {...{ [DATA_DISABLED]: props.disabled ? "" : undefined }}
        {...{ [DATA_DRAGGING]: dragging() ? "" : undefined }}
        {...rest}
      >
        {props.children}
      </div>
    </colorSliderContext.Provider>
  );
}
```

`{...{ [DATA_DISABLED]: cond ? "" : undefined }}` is how Solid conditionally omits an attribute in a spread; `undefined` removes it.

- [ ] **Step 5: Write the control**

Create `packages/solid/src/components/color-slider/control/ColorSliderControl.tsx`. The listener block translates the `interaction` attachment from `ColorSliderRoot.svelte`; in Solid it is `onMount` plus `onCleanup` over the element ref.

```tsx
import { onCleanup, onMount, splitProps, type JSX } from "solid-js";
import {
  createDragController,
  DATA_DISABLED,
  DATA_ORIENTATION,
  valueFromKey,
  valueFromPosition,
} from "@urcolor/shared";
import { colorSliderContext } from "../root/context";

export interface ColorSliderControlProps extends JSX.HTMLAttributes<HTMLDivElement> {}

/**
 * The measured, interactive area.
 *
 * Every listener the family needs lives here: pointer capture measures against
 * this element's box, and `keydown` from the focused thumb bubbles to it.
 */
export function ColorSliderControl(props: ColorSliderControlProps): JSX.Element {
  const ctx = colorSliderContext.use();
  const [, rest] = splitProps(props, ["children"]);
  let node!: HTMLDivElement;

  onMount(() => {
    ctx.registerControl(node);
    let keyboardActive = false;

    const drag = createDragController({
      getElement: () => node,
      isDisabled: () => ctx.disabled(),
      onStart: () => ctx.setDragging(true),
      onMove: (point) => {
        const state = ctx.sliderState();
        const position = state.orientation === "vertical" ? point.normalizedY : point.normalizedX;
        ctx.setDisplayValue(valueFromPosition(state, position));
      },
      onEnd: () => {
        ctx.setDragging(false);
        ctx.commit();
      },
    });

    const onPointerDown = (event: PointerEvent) => {
      drag.pointerDown(event);
      // `pointerDown` calls `preventDefault`, which suppresses the focus the
      // browser would have moved to the thumb; do it explicitly instead.
      if (drag.isDragging) node.querySelector<HTMLElement>("[role='slider']")?.focus();
    };
    const onPointerMove = (event: PointerEvent) => drag.pointerMove(event);
    const onPointerUp = (event: PointerEvent) => drag.pointerUp(event);
    const onPointerCancel = () => { drag.pointerCancel(); ctx.setDragging(false); };
    const onKeyDown = (event: KeyboardEvent) => {
      const next = valueFromKey(ctx.sliderState(), event);
      if (next === undefined) return;
      event.preventDefault();
      keyboardActive = true;
      ctx.setDisplayValue(next);
    };
    const onKeyUp = () => {
      if (!keyboardActive) return;
      keyboardActive = false;
      ctx.commit();
    };

    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", onPointerUp);
    node.addEventListener("pointercancel", onPointerCancel);
    node.addEventListener("keydown", onKeyDown);
    node.addEventListener("keyup", onKeyUp);

    onCleanup(() => {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", onPointerUp);
      node.removeEventListener("pointercancel", onPointerCancel);
      node.removeEventListener("keydown", onKeyDown);
      node.removeEventListener("keyup", onKeyUp);
      drag.cancel();
      ctx.setDragging(false);
      ctx.registerControl(null);
    });
  });

  return (
    <div
      ref={node}
      {...{ [DATA_ORIENTATION]: ctx.orientation() }}
      {...{ [DATA_DISABLED]: ctx.disabled() ? "" : undefined }}
      {...rest}
    >
      {props.children}
    </div>
  );
}
```

- [ ] **Step 6: Write the track, range and thumb**

`ColorSliderTrack.tsx` is the trivial one: read `ctx.orientation()` and `ctx.disabled()`, spread `rest`, render `props.children`.

`ColorSliderRange.tsx` translates `range/ColorSliderRange.svelte`, including its `fillsFromStart` comment, computing the style in a `createMemo`:

```tsx
const layout = createMemo(() => {
  const state = ctx.sliderState();
  const fraction = state.max === state.min
    ? 0
    : clamp((state.value - state.min) / (state.max - state.min), 0, 1);
  /**
   * Whether the minimum sits at the track's CSS start edge. Asking the
   * primitive where `min` renders keeps `dir`, `inverted` and vertical
   * flipping in one place instead of re-deriving them here.
   */
  const fillsFromStart = positionFromValue({ ...state, value: state.min }) === 0;
  return state.orientation === "vertical"
    ? { "position": "absolute", "left": "0", "right": "0", "height": `${fraction * 100}%`, ...(fillsFromStart ? { top: "0" } : { bottom: "0" }) }
    : { "position": "absolute", "top": "0", "bottom": "0", "width": `${fraction * 100}%`, ...(fillsFromStart ? { left: "0" } : { right: "0" }) };
});
```

`ColorSliderThumb.tsx` translates `thumb/ColorSliderThumb.svelte`: spread `sliderAria(ctx.sliderState())`, set `aria-label` from `channelLabel` unless the caller gave one, `aria-valuetext` from `formatChannelValue`, and position absolutely from `ctx.position()`. Note that Solid's JSX takes `tabindex` lowercase, so the aria object spreads without the rename React needed.

- [ ] **Step 7: Write the gradient**

`ColorSliderGradient.tsx` translates `gradient/ColorSliderGradient.svelte`, which after the gradient-stops plan is mostly rendering. Structure: a `createMemo` for `cssLayers`, a `<Show>` choosing between the layer stack and a `<canvas>`, and an `onMount`/`createEffect` painting the canvas with `drawLinearGradient`. Release the WebGL context in `onCleanup`, as the Svelte version does: contexts are a capped per-document resource.

- [ ] **Step 8: Write the barrels**

`index.parts.ts` exports each component as `Root`, `Control`, `Track`, `Range`, `Thumb`, `Gradient` with its props type, matching `packages/svelte/src/lib/components/color-slider/index.parts.ts`. `index.ts` does `import * as ColorSlider from "./index.parts"; export { ColorSlider };` plus the named props types, matching React's.

- [ ] **Step 9: Run the tests**

Run: `bun test packages/solid/test/color-slider.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 10: Commit**

```bash
git add packages/solid/src/components/color-slider packages/solid/test/color-slider.test.tsx
git commit -m "feat(solid): add the ColorSlider family"
```

---

### Tasks 3-8: The remaining families

Each repeats Task 2's shape: a context of accessor functions, a root owning state and the drag controller, parts reading the context, a gradient translating its Svelte counterpart. Read the named Svelte source before writing each one.

Every task follows the same five steps:

1. Write the smoke test at `packages/solid/test/<family>.test.tsx`, following `color-slider.test.tsx`: render a harness with a signal, assert the root's data attributes, assert the thumb's or input's semantics, drive one keyboard interaction, and assert the resulting colour.
2. Run it and watch it fail.
3. Write the components, translating the named Svelte files.
4. Run the test until it passes.
5. Commit as `feat(solid): add the <Component> family`.

The context member lists are identical to the Lit plan's Tasks 3-8, with each `readonly x: T` becoming `x(): T`:

- **Task 3, ColorArea.** Root, Gradient, Thumb. Source `color-area/**`. Members: `color`, `colorSpace`, `xChannelKey`, `yChannelKey`, `minX`, `maxX`, `minY`, `maxY`, `valueX`, `valueY`, `disabled`, `dragging`, `isSlidingFromLeft`, `isSlidingFromTop`, `thumbAlignment`. The root owns interaction; there is no Control part.
- **Task 4, ColorWheel.** Root, Gradient, Thumb. Source `color-wheel/**`. Members: `color`, `colorSpace`, `angleChannel`, `radiusChannel`, `angleValue`, `radiusValue`, `angleMin`, `angleMax`, `radiusMin`, `radiusMax`, `startAngle`, `disabled`, `dragging`. Gradient uses `cssWheelPolar` and `samplePolarGrid`.
- **Task 5, ColorRing.** Root, Track, Gradient, Thumb. Source `color-ring/**`. Members: `color`, `colorSpace`, `channel`, `disabled`, `dragging`, `value`, `min`, `max`, `step`, `startAngle`, `innerRadius`. Carry the `-webkit-mask-image` fallback.
- **Task 6, ColorTriangle.** Root, Gradient, Thumb. Source `color-triangle/**`. Members: `color`, `colorSpace`, `xChannelKey`, `yChannelKey`, `zChannelKey`, `isThreeChannel`, `minX`, `maxX`, `minY`, `maxY`, `minZ`, `maxZ`, `valueX`, `valueY`, `valueZ`, `vertices`, `positionVertices`, `thumbAlignment`, `disabled`. Root carries `DATA_COLOR_TRIANGLE_ROOT`; the drag controller needs `hitTest` with `clampToTriangle`.
- **Task 7, ColorField.** Root, Input, Increment, Decrement, Swatch. Source `color-field/**`. Members: `modelValue`, `displayValue`, `disabled`, `readOnly`, `isDecreaseDisabled`, `isIncreaseDisabled`, `format`, plus the methods `handleIncrease`, `handleDecrease`, `handleMinMaxValue`, `commitValue`, `onInputChange` (already functions, so they carry over unchanged). `DATA_READONLY` applies here only.
- **Task 8, ColorSwatch and ColorSwatchGroup.** Source `color-swatch/ColorSwatch.svelte` and `color-swatch-group/**`. Group members: `type`, `value`, `disabled`, `orientation`, `loopFocus`, `activeIndex`, `count`, `groupState`. The swatch has two modes, painted box or group toggle, and the group finds its items by shape with the `ITEM_SELECTOR` from `ColorSwatchGroupRoot.svelte`.

---

### Task 9: The 14 colour primitives

**Files:**
- Create: `packages/solid/src/primitives/createColor.ts` and 13 siblings
- Create: `packages/solid/src/primitives/index.ts`
- Test: `packages/solid/test/primitives.test.ts`

**Source:** `packages/svelte/src/lib/hooks/*`.

**Interfaces:**
- Produces: `createColor`, `createColorSpace`, `createRGB`, `createHSL`, `createHSV`, `createHWB`, `createOKLCh`, `createOKLab`, `createLCh`, `createLab`, `createP3`, `createA98`, `createProPhoto`, `createRec2020`. Each returns an object of accessors plus setters, in the same shape the Svelte hook returns.

- [ ] **Step 1: Write the failing test**

Create `packages/solid/test/primitives.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { createRoot } from "solid-js";
import { createColor, createHSL } from "../src/primitives/index";

describe("createColor", () => {
  it("exposes the parsed colour", () => {
    createRoot((dispose) => {
      const color = createColor("hsl(210, 80%, 50%)");
      expect(Math.round(color.value().to("hsl").get("h"))).toBe(210);
      dispose();
    });
  });

  it("updates on set", () => {
    createRoot((dispose) => {
      const color = createColor("hsl(210, 80%, 50%)");
      color.setValue("hsl(90, 80%, 50%)");
      expect(Math.round(color.value().to("hsl").get("h"))).toBe(90);
      dispose();
    });
  });
});

describe("createHSL", () => {
  it("reads and writes one channel", () => {
    createRoot((dispose) => {
      const hsl = createHSL("hsl(210, 80%, 50%)");
      expect(Math.round(hsl.h())).toBe(210);
      hsl.setH(90);
      expect(Math.round(hsl.h())).toBe(90);
      dispose();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/solid/test/primitives.test.ts`
Expected: FAIL, cannot resolve `../src/primitives/index`.

- [ ] **Step 3: Read the Svelte hooks and match their return shape**

Run: `cat packages/svelte/src/lib/hooks/useColor.svelte.ts packages/svelte/src/lib/hooks/useHSL.ts`

The Solid version returns the same members, with each reactive value becoming an accessor and each mutation a `setX` function. Do not invent a different shape: a user porting between packages should recognise it.

- [ ] **Step 4: Write the primitives**

Write `createColor` first (signal over a `Color`, `parseColor` on input, ignore unparseable), then a `createSpacePrimitive(space)` factory building the 12 space primitives from `channelsOf(space)`, then `createColorSpace` translating `useColorSpace.svelte.ts`. Confirm each space's `SpaceId` string and channel keys against the `colorSpaces` map in `packages/shared/src/color-spaces.ts`.

- [ ] **Step 5: Run the tests**

Run: `bun test packages/solid/test/primitives.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/solid/src/primitives packages/solid/test/primitives.test.ts
git commit -m "feat(solid): add the colour primitives"
```

---

### Task 10: Barrel, build, lint and wiring

**Files:**
- Create: `packages/solid/src/index.ts`, `packages/solid/README.md`
- Modify: root `package.json` (`build`, `lint`), `eslint.config.js`
- Modify: `docs/guide/installation.md` and its three translations

- [ ] **Step 1: Write the barrel**

`packages/solid/src/index.ts` exports the 8 component namespaces and the 14 primitives, mirroring `packages/react/src/index.ts`'s structure.

- [ ] **Step 2: Build**

Run: `bun run --cwd packages/solid build`
Expected: `dist/index.js` and `dist/index.d.ts`. Confirm the `"solid"` export condition's target exists; if `vite-plugin-solid` does not emit un-compiled JSX at `dist/source/index.jsx`, either add a second build step that copies `src` into `dist/source`, or drop the `"solid"` condition and document that the package ships pre-compiled. Do not leave the condition pointing at a missing file.

- [ ] **Step 3: Add the eslint plugin**

Run: `bun add -D eslint-plugin-solid` at the root, then register it in `eslint.config.js` for `packages/solid/**/*.tsx`, following how the config already scopes `eslint-plugin-vue` and `eslint-plugin-svelte`. `solid/reactivity` is the rule that catches the destructured-props mistake this package must avoid.

- [ ] **Step 4: Wire the root scripts**

Append to `build`: ` && bun run --cwd packages/solid build`. Append to `lint`: ` && bun run --cwd packages/solid check`.

- [ ] **Step 5: Write the readme**

`packages/solid/README.md`, following `packages/preact/README.md`, with a Solid usage block using `createSignal` and `ColorSlider.Root`.

- [ ] **Step 6: Add to the installation guide**

Add `@urcolor/solid` to `docs/guide/installation.md` and the `de`, `es`, `fr` copies, as the Preact plan's Task 5 describes.

- [ ] **Step 7: Full verification**

Run: `bun test && bun run lint && bun run build && bun run docs:build`
Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add packages/solid package.json eslint.config.js docs
git commit -m "feat(solid): wire the package into the build and install guide"
```

---

## Self-Review

**Spec coverage.** The spec's Solid row asks for its own source tree, Svelte-shaped, on core and shared, built with `vite-plugin-solid` preserving JSX: Task 1 and Task 10. `createContext` composition and `create*` primitive naming: Tasks 1, 2 and 9. "Solid's `Root` accepts the same `value`/`defaultValue`/`onValueChange` pair rather than a signal tuple" is enforced by `ColorSliderRootProps` in Task 2 step 4.

**Type consistency.** `createContextPair` is defined in Task 1 and used in every family. `ColorSliderContextValue`'s members are declared in Task 2 step 3 and read under those names in steps 5-7. `registerControl` / `control` appear in the interface and are supplied by the root in step 4.

**Detail asymmetry, deliberate.** Task 2 carries full code; Tasks 3-8 carry the exact context members, the Svelte file to translate and the family-specific traps. The Svelte source is the specification, and retyping six variants here would risk drifting from it.

**Risks.** Two are worth naming. `bun test` compiling Solid JSX through a Babel plugin in `preload.ts` (Task 1 step 4) is new machinery in this repo and may need iteration; if it resists, the fallback is a vitest config scoped to `packages/solid`, which is what most Solid libraries use. And the `"solid"` export condition (Task 10 step 2) must point at a file that actually exists, which is why that step ends with an explicit either-or rather than an assumption.
