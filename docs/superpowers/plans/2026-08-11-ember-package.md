# @urcolor/ember Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@urcolor/ember`: a v2 addon with 26 components across 8 families plus 14 tracked colour stores, at parity with `@urcolor/svelte`.

**Architecture:** Ember has no context API, so parts reach root state by being yielded. Each root is a Glimmer component whose template yields a hash of contextual components, each pre-bound to the root instance. Authored in `.gts` template-tag format so components import directly and carry TypeScript types on their args.

**Tech Stack:** Ember 4.12+ (Octane semantics), Glimmer components, `@tracked`, `.gts` via `content-tag`, `@embroider/addon-dev` + rollup, `@glint/core` for typechecking, and a small Embroider + vite test app running qunit.

## Global Constraints

- **Prerequisites:** `2026-08-11-react-remove-base-ui.md` and `2026-08-11-shared-gradient-stops.md` complete. Independent of the Preact, Lit, Alpine and Solid plans.
- **Translation source of truth:** the matching file under `packages/svelte/src/lib/components/`. Svelte's context members become public getters on the root component class.
- Behaviour logic comes from `@urcolor/shared`. Gaps land in `shared`, in their own commit.
- **Yielded composition only.** A part is never importable and used standalone; it is reached through the root's yielded hash. This is the API the spec approved and it is what the documentation shows.
- Args are Ember's `@`-prefixed arguments: `@color`, `@onColorChange`, `@channel`. Note this differs from every other package's `value` / `onValueChange`, because Ember convention is to name the argument for what it is, and `@value` on a component that is not a form control reads wrong. The docs must state the mapping.
- Data attributes come from the `DATA_*` constants in `@urcolor/shared`.
- Package name `@urcolor/ember`, version `2.0.0`. `peerDependencies: { "ember-source": ">=4.12.0" }`.
- **This is the least-trodden path in the whole spec.** Tasks 1 and 2 are deliberately small and end in a working build before any component is written.

---

## File Structure

**Created**, under `packages/ember/`:

| Path | Responsibility |
| --- | --- |
| `src/components/color-slider/root.gts` | Root component + the yielded hash |
| `src/components/color-slider/control.gts` … | 5 more parts |
| `src/components/color-area/**` | 3 |
| `src/components/color-wheel/**` | 3 |
| `src/components/color-ring/**` | 4 |
| `src/components/color-triangle/**` | 3 |
| `src/components/color-field/**` | 5 |
| `src/components/color-swatch.gts` | 1 |
| `src/components/color-swatch-group/root.gts` | 1 |
| `src/stores/*.ts` | 14 tracked colour stores |
| `src/index.ts` | Barrel |
| `rollup.config.mjs`, `babel.config.json` | v2 addon build |
| `test-app/**` | Embroider + vite app running the render tests |

---

### Task 1: Addon scaffold that builds

Nothing about Ember's toolchain is verifiable by reading; this task exists to prove the build works before any component depends on it.

**Files:**
- Create: `packages/ember/package.json`, `rollup.config.mjs`, `babel.config.json`, `tsconfig.json`
- Create: `packages/ember/src/index.ts`
- Create: `packages/ember/src/stores/ColorStore.ts`

**Interfaces:**
- Produces: `class ColorStore` with a `@tracked` colour, and a package that builds to `declarations/` and `dist/`.

- [ ] **Step 1: Add dependencies**

Run at the repo root:

```bash
bun add -D ember-source@~5.12.0 @embroider/addon-dev@^7 @glint/core@^1.5 @glint/environment-ember-loose@^1.5 @glint/template@^1.5 @glimmer/component@^2 @rollup/plugin-babel rollup babel-plugin-ember-template-compilation @babel/plugin-transform-typescript decorator-transforms content-tag
```

- [ ] **Step 2: Write the manifest**

Create `packages/ember/package.json`:

```json
{
  "name": "@urcolor/ember",
  "version": "2.0.0",
  "license": "MIT",
  "type": "module",
  "exports": {
    ".": {
      "types": "./declarations/index.d.ts",
      "default": "./dist/index.js"
    },
    "./addon-main.js": "./addon-main.cjs"
  },
  "typesVersions": { "*": { "*": ["declarations/*"] } },
  "files": ["addon-main.cjs", "declarations", "dist"],
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "rollup --config && bun run build:types",
    "build:types": "glint --declaration",
    "check": "glint"
  },
  "keywords": ["color", "color-picker", "ember", "ember-addon", "glimmer", "octane", "headless", "oklch"],
  "author": { "name": "GrandMagus", "url": "https://github.com/GrandMagus02" },
  "homepage": "https://urcolor.vercel.app/",
  "repository": { "type": "git", "url": "https://github.com/ur-color/urcolor", "directory": "packages/ember" },
  "bugs": { "url": "https://github.com/ur-color/urcolor/issues" },
  "dependencies": {
    "@embroider/addon-shim": "^1.8.0",
    "@urcolor/core": "workspace:*",
    "@urcolor/shared": "workspace:*",
    "decorator-transforms": "^2"
  },
  "peerDependencies": {
    "ember-source": ">=4.12.0"
  },
  "ember-addon": {
    "main": "addon-main.cjs",
    "type": "addon",
    "version": 2
  }
}
```

Create `packages/ember/addon-main.cjs`:

```js
const { addonV1Shim } = require("@embroider/addon-shim");
module.exports = addonV1Shim(__dirname);
```

- [ ] **Step 3: Write the build config**

Create `packages/ember/rollup.config.mjs`:

```js
import { babel } from "@rollup/plugin-babel";
import { Addon } from "@embroider/addon-dev/rollup";

const addon = new Addon({ srcDir: "src", destDir: "dist" });

export default {
  output: addon.output(),
  plugins: [
    addon.publicEntrypoints(["index.js", "components/**/*.js", "stores/*.js"]),
    addon.appReexports([]),
    addon.dependencies(),
    babel({ extensions: [".js", ".ts", ".gts"], babelHelpers: "bundled" }),
    addon.gjs(),
    addon.keepAssets(["**/*.css"]),
    addon.clean(),
  ],
};
```

`appReexports` is empty on purpose: components are imported, never resolved by name, which is the whole point of choosing `.gts`.

Create `packages/ember/babel.config.json`:

```json
{
  "plugins": [
    ["@babel/plugin-transform-typescript", { "allExtensions": true, "onlyRemoveTypeImports": true, "allowDeclareFields": true }],
    ["babel-plugin-ember-template-compilation", { "targetFormat": "hbs", "transforms": [] }],
    ["decorator-transforms", { "runtime": { "import": "decorator-transforms/runtime" } }]
  ]
}
```

Create `packages/ember/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "glint": {
    "environment": ["ember-loose", "ember-template-imports"]
  },
  "compilerOptions": {
    "declarationDir": "declarations",
    "emitDeclarationOnly": true,
    "noEmit": false,
    "allowImportingTsExtensions": true,
    "rootDir": "src",
    "paths": {
      "@urcolor/core": ["../core/dist/index.d.ts"],
      "@urcolor/shared": ["../shared/dist/index.d.ts"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Write the first store, so there is something to build**

Create `packages/ember/src/stores/ColorStore.ts`:

```ts
import { tracked } from "@glimmer/tracking";
import { Color } from "@urcolor/core";
import { parseColor } from "@urcolor/shared";

const DEFAULT_COLOR = Color.parse("hsl(210, 80%, 50%)")!;

/**
 * Colour state as a tracked class.
 *
 * The Ember counterpart of `useColor` in React and `ColorStore` in Angular:
 * a class rather than a hook, because Ember has no render-time state.
 */
export class ColorStore {
  @tracked accessor #value: Color;

  constructor(initial?: Color | string) {
    this.#value = parseColor(initial) ?? DEFAULT_COLOR;
  }

  get value(): Color {
    return this.#value;
  }

  set value(next: Color | string) {
    const parsed = parseColor(next);
    if (!parsed) return;
    this.#value = parsed;
  }
}
```

Create `packages/ember/src/index.ts`:

```ts
export { ColorStore } from "./stores/ColorStore";
```

- [ ] **Step 5: Build**

Run: `bun run --cwd packages/ember build`
Expected: `packages/ember/dist/index.js` and `packages/ember/declarations/index.d.ts`.

This step is the gate. If the build does not work here, with one plain TypeScript class and no templates, stop and fix the toolchain before writing anything else. Common failure: `@tracked accessor` needs `decorator-transforms` and standard decorators; if the repo's root `tsconfig.json` sets `experimentalDecorators: true`, override it to `false` in this package's config.

- [ ] **Step 6: Commit**

```bash
git add packages/ember/
git commit -m "feat(ember): scaffold the v2 addon"
```

---

### Task 2: The test app

Also front-loaded: render tests need an app, and finding that out after writing 26 components is the expensive order.

**Files:**
- Create: `packages/ember/test-app/**`
- Test: `packages/ember/test-app/tests/integration/smoke-test.gts`

**Interfaces:**
- Produces: `bun run --cwd packages/ember/test-app test` running qunit against the addon.

- [ ] **Step 1: Scaffold the app**

Create a minimal Embroider + vite app under `packages/ember/test-app` with `ember-source`, `ember-qunit`, `qunit`, `@ember/test-helpers`, `@embroider/vite`, `@embroider/core` and `@embroider/compat` as devDependencies, and `@urcolor/ember: "workspace:*"`. Follow the current `@embroider/app-blueprint` layout rather than an older `ember-cli` one.

Its `package.json` needs `"private": true` so it is never published, and a `test` script running `vite build && ember test --path dist` or the blueprint's equivalent.

- [ ] **Step 2: Write the failing test**

Create `packages/ember/test-app/tests/integration/smoke-test.gts`:

```gts
import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { ColorStore } from "@urcolor/ember";

module("Integration | urcolor", function (hooks) {
  setupRenderingTest(hooks);

  test("the addon's modules load in an app", async function (assert) {
    const store = new ColorStore("hsl(210, 80%, 50%)");
    assert.strictEqual(Math.round(store.value.to("hsl").get("h")), 210);

    await render(<template><span data-test-probe>ok</span></template>);
    assert.dom("[data-test-probe]").hasText("ok");
  });
});
```

- [ ] **Step 3: Run it**

Run: `bun run --cwd packages/ember/test-app test`
Expected: PASS, 2 assertions. As in Task 1, this is a gate: get it green before writing components.

- [ ] **Step 4: Exclude the test app from the workspace build**

The root `package.json` `workspaces` glob is `packages/*`, so `packages/ember/test-app` is not picked up automatically. Confirm with `bun pm ls | grep test-app` that it is not being hoisted into the published set, and confirm the root `build` script does not touch it.

- [ ] **Step 5: Commit**

```bash
git add packages/ember/test-app
git commit -m "test(ember): add the addon's test app"
```

---

### Task 3: The ColorSlider family

The template task. Later families repeat its shape.

**Files:**
- Create: `packages/ember/src/components/color-slider/root.gts`
- Create: `packages/ember/src/components/color-slider/control.gts`
- Create: `packages/ember/src/components/color-slider/track.gts`
- Create: `packages/ember/src/components/color-slider/range.gts`
- Create: `packages/ember/src/components/color-slider/thumb.gts`
- Create: `packages/ember/src/components/color-slider/gradient.gts`
- Test: `packages/ember/test-app/tests/integration/color-slider-test.gts`

**Translation source:** `packages/svelte/src/lib/components/color-slider/**`.

**Interfaces:**
- Produces: `ColorSliderRoot`, a Glimmer component with args `@color`, `@defaultColor`, `@colorSpace`, `@channel`, `@disabled`, `@dir`, `@inverted`, `@orientation`, `@onColorChange`, `@onColorCommit`, yielding `{ Control, Track, Range, Thumb, Gradient }`. Public getters on the class: `color`, `colorSpace`, `channel`, `orientation`, `inverted`, `disabled`, `dragging`, `sliderState`, `position`, plus the methods `setDisplayValue(next)` and `commit()`.
- Each part component takes one arg, `@slider`, the root instance, supplied by the yielded hash so the caller never passes it.

- [ ] **Step 1: Write the failing test**

Create `packages/ember/test-app/tests/integration/color-slider-test.gts`:

```gts
import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render, triggerKeyEvent } from "@ember/test-helpers";
import { tracked } from "@glimmer/tracking";
import { Color } from "@urcolor/core";
import { ColorSliderRoot } from "@urcolor/ember";

class State {
  @tracked accessor color = Color.parse("hsl(210, 80%, 50%)")!;
  setColor = (next: Color) => { this.color = next; };
}

module("Integration | ColorSlider", function (hooks) {
  setupRenderingTest(hooks);

  test("gives the thumb slider semantics", async function (assert) {
    const state = new State();
    await render(
      <template>
        <ColorSliderRoot @color={{state.color}} @onColorChange={{state.setColor}} @channel="h" as |slider|>
          <slider.Control>
            <slider.Track><slider.Thumb /></slider.Track>
          </slider.Control>
        </ColorSliderRoot>
      </template>,
    );
    assert.dom("[role='slider']").hasAttribute("aria-valuenow", "210");
    assert.dom("[role='slider']").hasAttribute("aria-valuemax", "360");
  });

  test("marks orientation and disabled on the root", async function (assert) {
    const state = new State();
    await render(
      <template>
        <ColorSliderRoot @color={{state.color}} @channel="h" @orientation="vertical" @disabled={{true}} as |slider|>
          <slider.Track><slider.Thumb /></slider.Track>
        </ColorSliderRoot>
      </template>,
    );
    assert.dom("[data-orientation='vertical']").exists();
    assert.dom("[data-disabled]").exists();
  });

  test("steps the channel on ArrowRight", async function (assert) {
    const state = new State();
    await render(
      <template>
        <ColorSliderRoot @color={{state.color}} @onColorChange={{state.setColor}} @channel="h" as |slider|>
          <slider.Control>
            <slider.Track><slider.Thumb /></slider.Track>
          </slider.Control>
        </ColorSliderRoot>
      </template>,
    );
    await triggerKeyEvent("[role='slider']", "keydown", "ArrowRight");
    assert.strictEqual(Math.round(state.color.to("hsl").get("h")), 211);
    assert.dom("[role='slider']").hasAttribute("aria-valuenow", "211");
  });

  test("ignores keys when disabled", async function (assert) {
    const state = new State();
    await render(
      <template>
        <ColorSliderRoot @color={{state.color}} @onColorChange={{state.setColor}} @channel="h" @disabled={{true}} as |slider|>
          <slider.Control>
            <slider.Track><slider.Thumb /></slider.Track>
          </slider.Control>
        </ColorSliderRoot>
      </template>,
    );
    await triggerKeyEvent("[role='slider']", "keydown", "ArrowRight");
    assert.strictEqual(Math.round(state.color.to("hsl").get("h")), 210);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun run --cwd packages/ember/test-app test`
Expected: FAIL, `ColorSliderRoot` is not exported.

- [ ] **Step 3: Write the root**

Create `packages/ember/src/components/color-slider/root.gts`:

```gts
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { hash } from "@ember/helper";
import { Color, type SpaceId } from "@urcolor/core";
import {
  applyDisplayValue,
  colorToDisplayValue,
  FEEDBACK_EPSILON,
  parseColor,
  positionFromValue,
  resolveChannelConfig,
  type SliderState,
} from "@urcolor/shared";
import ColorSliderControl from "./control";
import ColorSliderTrack from "./track";
import ColorSliderRange from "./range";
import ColorSliderThumb from "./thumb";
import ColorSliderGradient from "./gradient";

const DEFAULT_COLOR = Color.parse("hsl(210, 80%, 50%)")!;

export interface ColorSliderRootSignature {
  Element: HTMLDivElement;
  Args: {
    /** The colour value. */
    color?: Color | string | null;
    /** The colour used until the first interaction when `color` is not supplied. */
    defaultColor?: Color | string | null;
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
    onColorChange?: (color: Color) => void;
    /** Called once at the end of an interaction. */
    onColorCommit?: (color: Color) => void;
  };
  Blocks: {
    default: [{
      Control: typeof ColorSliderControl;
      Track: typeof ColorSliderTrack;
      Range: typeof ColorSliderRange;
      Thumb: typeof ColorSliderThumb;
      Gradient: typeof ColorSliderGradient;
    }];
  };
}

/**
 * The slider family's root.
 *
 * Ember has no context API, so the parts are yielded pre-bound to this
 * instance rather than looking a provider up. Interaction lives on the
 * control, which is the element position-to-value is measured against and the
 * one `keydown` from the focused thumb bubbles to.
 */
export default class ColorSliderRoot extends Component<ColorSliderRootSignature> {
  /** Uncontrolled fallback, kept in sync so it and `@color` never disagree. */
  @tracked accessor internalColor: Color =
    parseColor(this.args.color) ?? parseColor(this.args.defaultColor) ?? DEFAULT_COLOR;

  @tracked accessor dragging = false;

  get color(): Color {
    return parseColor(this.args.color) ?? this.internalColor;
  }

  get colorSpace(): SpaceId { return this.args.colorSpace ?? "hsl"; }
  get channel(): string { return this.args.channel ?? "h"; }
  get orientation(): "horizontal" | "vertical" { return this.args.orientation ?? "horizontal"; }
  get inverted(): boolean { return this.args.inverted ?? false; }
  get disabled(): boolean { return this.args.disabled ?? false; }

  get sliderState(): SliderState {
    const config = resolveChannelConfig(this.colorSpace, this.channel);
    return {
      value: colorToDisplayValue(this.color, this.colorSpace, this.channel),
      min: config?.min ?? 0,
      max: config?.max ?? 100,
      step: config?.step ?? 1,
      orientation: this.orientation,
      dir: this.args.dir ?? "ltr",
      inverted: this.inverted,
      disabled: this.disabled,
    };
  }

  /** 0-1 offset of the thumb from the track's CSS start edge. */
  get position(): number {
    return positionFromValue(this.sliderState);
  }

  /** Writes one display-space channel value back as a colour. */
  setDisplayValue = (next: number): void => {
    if (Math.abs(next - this.sliderState.value) < FEEDBACK_EPSILON) return;
    const nextColor = applyDisplayValue(this.color, this.colorSpace, this.channel, next);
    this.internalColor = nextColor;
    this.args.onColorChange?.(nextColor);
  };

  /** Reports the end of an interaction. */
  commit = (): void => {
    this.args.onColorCommit?.(this.color);
  };

  setDragging = (value: boolean): void => {
    this.dragging = value;
  };

  <template>
    <div
      dir={{@dir}}
      data-orientation={{this.orientation}}
      data-disabled={{if this.disabled ""}}
      data-dragging={{if this.dragging ""}}
      ...attributes
    >
      {{yield (hash
        Control=(component ColorSliderControl slider=this)
        Track=(component ColorSliderTrack slider=this)
        Range=(component ColorSliderRange slider=this)
        Thumb=(component ColorSliderThumb slider=this)
        Gradient=(component ColorSliderGradient slider=this)
      )}}
    </div>
  </template>
}
```

The literal `data-orientation` attribute names are unavoidable in a template: Glimmer has no computed attribute names. Assert them against the `DATA_*` constants in the test rather than trusting the strings.

- [ ] **Step 4: Write the control**

Create `packages/ember/src/components/color-slider/control.gts`. The listener block translates the `interaction` attachment from `ColorSliderRoot.svelte`; in Ember it is a modifier. Write it inline with `{{did-insert}}`-style semantics using a plain function modifier:

```gts
import Component from "@glimmer/component";
import { modifier } from "ember-modifier";
import {
  createDragController,
  valueFromKey,
  valueFromPosition,
} from "@urcolor/shared";
import type ColorSliderRoot from "./root";

export interface ColorSliderControlSignature {
  Element: HTMLDivElement;
  Args: { slider: ColorSliderRoot };
  Blocks: { default: [] };
}

/**
 * The measured, interactive area.
 *
 * One modifier owns pointer capture and keyboard: `keydown` from the focused
 * thumb bubbles here, so a single host covers both input paths.
 */
const interaction = modifier((node: HTMLElement, [slider]: [ColorSliderRoot]) => {
  let keyboardActive = false;

  const drag = createDragController({
    getElement: () => node,
    isDisabled: () => slider.disabled,
    onStart: () => slider.setDragging(true),
    onMove: (point) => {
      const state = slider.sliderState;
      const position = state.orientation === "vertical" ? point.normalizedY : point.normalizedX;
      slider.setDisplayValue(valueFromPosition(state, position));
    },
    onEnd: () => { slider.setDragging(false); slider.commit(); },
  });

  const onPointerDown = (event: PointerEvent) => {
    drag.pointerDown(event);
    // `pointerDown` calls `preventDefault`, which suppresses the focus the
    // browser would have moved to the thumb; do it explicitly instead.
    if (drag.isDragging) node.querySelector<HTMLElement>("[role='slider']")?.focus();
  };
  const onPointerMove = (event: PointerEvent) => drag.pointerMove(event);
  const onPointerUp = (event: PointerEvent) => drag.pointerUp(event);
  const onPointerCancel = () => { drag.pointerCancel(); slider.setDragging(false); };
  const onKeyDown = (event: KeyboardEvent) => {
    const next = valueFromKey(slider.sliderState, event);
    if (next === undefined) return;
    event.preventDefault();
    keyboardActive = true;
    slider.setDisplayValue(next);
  };
  const onKeyUp = () => {
    if (!keyboardActive) return;
    keyboardActive = false;
    slider.commit();
  };

  node.addEventListener("pointerdown", onPointerDown);
  node.addEventListener("pointermove", onPointerMove);
  node.addEventListener("pointerup", onPointerUp);
  node.addEventListener("pointercancel", onPointerCancel);
  node.addEventListener("keydown", onKeyDown);
  node.addEventListener("keyup", onKeyUp);

  return () => {
    node.removeEventListener("pointerdown", onPointerDown);
    node.removeEventListener("pointermove", onPointerMove);
    node.removeEventListener("pointerup", onPointerUp);
    node.removeEventListener("pointercancel", onPointerCancel);
    node.removeEventListener("keydown", onKeyDown);
    node.removeEventListener("keyup", onKeyUp);
    drag.cancel();
    slider.setDragging(false);
  };
});

export default class ColorSliderControl extends Component<ColorSliderControlSignature> {
  <template>
    <div
      {{interaction @slider}}
      data-orientation={{@slider.orientation}}
      data-disabled={{if @slider.disabled ""}}
      ...attributes
    >{{yield}}</div>
  </template>
}
```

`ember-modifier` must be added to the addon's `dependencies`; it is the standard way to attach DOM behaviour in Octane and has no lighter alternative in a v2 addon.

- [ ] **Step 5: Write the track, range, thumb and gradient**

`track.gts` is the trivial one: a div carrying `data-orientation` and `data-disabled` from `@slider`, yielding its block.

`range.gts` translates `range/ColorSliderRange.svelte`, computing the layout in a getter on the component class (Glimmer templates cannot compute), including the `fillsFromStart` reasoning, and applying it with `{{style}}`-free direct attribute binding: build the whole style string in the getter and bind `style={{this.layout}}` through `htmlSafe`.

`thumb.gts` translates `thumb/ColorSliderThumb.svelte`: a getter returning the `sliderAria` object, bound attribute by attribute in the template, plus `aria-label` from `channelLabel`, `aria-valuetext` from `formatChannelValue`, and the absolute position from `@slider.position`.

`gradient.gts` translates `gradient/ColorSliderGradient.svelte`, which after the gradient-stops plan is mostly rendering: a getter for the CSS layers, an `{{#if}}` between the layer stack and a `<canvas>`, and a modifier painting the canvas with `drawLinearGradient` and releasing the WebGL context on teardown.

- [ ] **Step 6: Export and run the tests**

Add the six components to `packages/ember/src/index.ts`, then run: `bun run --cwd packages/ember build && bun run --cwd packages/ember/test-app test`
Expected: PASS, the 4 slider tests plus Task 2's smoke test.

- [ ] **Step 7: Commit**

```bash
git add packages/ember
git commit -m "feat(ember): add the ColorSlider family"
```

---

### Tasks 4-9: The remaining families

Each repeats Task 3's shape: a root Glimmer component exposing the Svelte context's members as public getters and yielding a `hash` of `(component X slider=this)`, parts taking `@slider` and rendering one element, a gradient translating its Svelte counterpart. Read the named Svelte source before writing each one.

Every task follows the same five steps:

1. Write the render test at `packages/ember/test-app/tests/integration/<family>-test.gts`, following `color-slider-test.gts`: render the yielded tree, assert the root's data attributes, assert the thumb's or input's semantics, drive one `triggerKeyEvent`, and assert the resulting colour on the tracked state.
2. Run it and watch it fail.
3. Write the components, translating the named Svelte files.
4. Run the test until it passes.
5. Commit as `feat(ember): add the <Component> family`.

The yielded hash and the root's public getters per family, matching the Lit and Solid plans:

- **Task 4, ColorArea.** Yields `{ Gradient, Thumb }`. Source `color-area/**`. Getters: `color`, `colorSpace`, `xChannelKey`, `yChannelKey`, `minX`, `maxX`, `minY`, `maxY`, `valueX`, `valueY`, `disabled`, `dragging`, `isSlidingFromLeft`, `isSlidingFromTop`, `thumbAlignment`. The root carries the interaction modifier itself; there is no Control part.
- **Task 5, ColorWheel.** Yields `{ Gradient, Thumb }`. Source `color-wheel/**`. Getters: `color`, `colorSpace`, `angleChannel`, `radiusChannel`, `angleValue`, `radiusValue`, `angleMin`, `angleMax`, `radiusMin`, `radiusMax`, `startAngle`, `disabled`, `dragging`. Gradient uses `cssWheelPolar` and `samplePolarGrid`.
- **Task 6, ColorRing.** Yields `{ Track, Gradient, Thumb }`. Source `color-ring/**`. Getters: `color`, `colorSpace`, `channel`, `disabled`, `dragging`, `value`, `min`, `max`, `step`, `startAngle`, `innerRadius`. Carry the `-webkit-mask-image` fallback.
- **Task 7, ColorTriangle.** Yields `{ Gradient, Thumb }`. Source `color-triangle/**`. Getters: `color`, `colorSpace`, `xChannelKey`, `yChannelKey`, `zChannelKey`, `isThreeChannel`, `minX`, `maxX`, `minY`, `maxY`, `minZ`, `maxZ`, `valueX`, `valueY`, `valueZ`, `vertices`, `positionVertices`, `thumbAlignment`, `disabled`. Root carries `data-color-triangle-root`; the drag controller needs `hitTest` with `clampToTriangle`.
- **Task 8, ColorField.** Yields `{ Input, Increment, Decrement, Swatch }`. Source `color-field/**`. Getters and methods: `modelValue`, `displayValue`, `disabled`, `readOnly`, `isDecreaseDisabled`, `isIncreaseDisabled`, `format`, `handleIncrease`, `handleDecrease`, `handleMinMaxValue`, `commitValue`, `onInputChange`. `data-readonly` applies here only.
- **Task 9, ColorSwatch and ColorSwatchGroup.** `ColorSwatch` is the one importable standalone component in the package, since a lone swatch has no root; inside a group it is reached through the group's yielded `{ Swatch }`. Source `color-swatch/ColorSwatch.svelte` and `color-swatch-group/**`. Group getters: `type`, `value`, `disabled`, `orientation`, `loopFocus`, `activeIndex`, `count`, `groupState`. The group finds its items by shape with the `ITEM_SELECTOR` from `ColorSwatchGroupRoot.svelte`.

---

### Task 10: The 14 colour stores

**Files:**
- Create: `packages/ember/src/stores/*.ts` (13 more beside `ColorStore`)
- Test: `packages/ember/test-app/tests/unit/stores-test.ts`

**Source:** `packages/angular/src/services/*-store.ts` for the class shape, `packages/svelte/src/lib/hooks/*` for behaviour.

**Interfaces:**
- Produces: `ColorStore` (Task 1), `ColorSpaceStore`, `RgbStore`, `HslStore`, `HsvStore`, `HwbStore`, `OklchStore`, `OklabStore`, `LchStore`, `LabStore`, `P3Store`, `A98Store`, `ProPhotoStore`, `Rec2020Store`. Names match Angular's exactly, so the two idiomatic-class packages agree.

- [ ] **Step 1: Write the failing test**

Create `packages/ember/test-app/tests/unit/stores-test.ts`:

```ts
import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import { HslStore } from "@urcolor/ember";

module("Unit | stores", function (hooks) {
  setupTest(hooks);

  test("HslStore reads and writes one channel", function (assert) {
    const store = new HslStore("hsl(210, 80%, 50%)");
    assert.strictEqual(Math.round(store.h), 210);
    store.h = 90;
    assert.strictEqual(Math.round(store.value.to("hsl").get("h")), 90);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun run --cwd packages/ember/test-app test`
Expected: FAIL, `HslStore` is not exported.

- [ ] **Step 3: Read Angular's shape and match it**

Run: `cat packages/angular/src/services/hsl-store.ts`

Reproduce the same members, with Angular's `signal`/`computed` becoming `@tracked accessor` and getters. Confirm each space's `SpaceId` string and channel keys against the `colorSpaces` map in `packages/shared/src/color-spaces.ts`.

- [ ] **Step 4: Write the stores, export, and run**

Run: `bun run --cwd packages/ember build && bun run --cwd packages/ember/test-app test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ember
git commit -m "feat(ember): add the colour stores"
```

---

### Task 11: Wiring

**Files:**
- Create: `packages/ember/README.md`
- Modify: root `package.json` (`build`, `lint`)
- Modify: `docs/guide/installation.md` and its three translations

- [ ] **Step 1: Wire the root scripts**

Append to `build`: ` && bun run --cwd packages/ember build`. Append to `lint`: ` && bun run --cwd packages/ember check`.

- [ ] **Step 2: Write the readme**

`packages/ember/README.md`, following `packages/preact/README.md`, with the yielded-composition usage block from the spec and an explicit note that Ember's args are `@color` / `@onColorChange` where the other packages use `value` / `onValueChange`.

- [ ] **Step 3: Add to the installation guide**

Add `@urcolor/ember` to `docs/guide/installation.md` and the `de`, `es`, `fr` copies, as the Preact plan's Task 5 describes. The prerequisites line gains "Ember 4.12+".

- [ ] **Step 4: Full verification**

Run: `bun test && bun run lint && bun run build && bun run --cwd packages/ember/test-app test && bun run docs:build`
Expected: all clean.

- [ ] **Step 5: Commit**

```bash
git add packages/ember package.json docs
git commit -m "feat(ember): wire the package into the build and install guide"
```

---

## Self-Review

**Spec coverage.** v2 addon in `.gts` with `@embroider/addon-dev` + rollup: Task 1. Yielded contextual components with the exact template shape the spec approved: Task 3 step 3. Octane semantics throughout: `@tracked accessor` and Glimmer components everywhere. `@tracked` classes named to mirror Angular's stores: Task 10. The test app the spec called "a meaningful build to stand up for 8 tests, and worth it": Task 2.

**Type consistency.** `setDisplayValue`, `commit`, `setDragging`, `sliderState`, `position` are declared on `ColorSliderRoot` in Task 3 step 3 and called under those names from the control in step 4. Every family's yielded hash keys match the part component names.

**Two deviations from the other plans, both forced by Ember.**

1. Args are `@color` / `@onColorChange`, not `value` / `onValueChange`. Ember names an argument for what it is, and the docs must carry the mapping so someone moving between packages is not surprised.
2. `ember-modifier` is a runtime dependency. Octane has no lighter way to attach DOM listeners from a v2 addon, and reimplementing it would be worse than depending on it.

**Risk, and how the task order answers it.** Ember is the least-trodden path in the spec. Tasks 1 and 2 are therefore deliberately tiny and each ends at a green gate: one plain class that builds, then one trivial render test that runs. If the toolchain resists, that is discovered in the first two tasks rather than after 26 components are written.
