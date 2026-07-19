# Vue reka-parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `@urcolor/vue` in line with the reka-ui color-picker source — prop/event name parity, one focusable thumb per surface that announces every channel, missing props and events added, and the duplicated color-model / pointer-drag / gradient-canvas logic extracted into shared composables.

**Architecture:** Three ordered phases. Phase A is a pure mechanical file move (shared utils + one Checkerboard) with no behavior change. Phase B walks component-by-component through parity renames and a11y fixes, each component landing its own tests. Phase C extracts the now-uniform color model, pointer drag and gradient lifecycle into `src/shared/` composables — done last on purpose, because every root has an identical emit set by then, which makes the extraction a small diff instead of a rewrite. Phase D updates docs.

**Tech Stack:** Vue 3.5 SFCs, TypeScript, reka-ui 2.8 primitives (`Primitive`, `createContext`, `useForwardExpose`, `VisuallyHidden`, `SliderRoot`, `ListboxRoot`), `@urcolor/core` for `Color` / `colorSpaces` / `getChannelConfig` / `displayToNative` / `nativeToDisplay`, `bun test` with `@vue/test-utils`, VitePress for docs.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-19-vue-reka-parity-design.md`. Read it before starting.
- Breaking change on branch `release/v1`. **No deprecated aliases.** Old prop and event names are removed outright.
- Channel values stay urcolor keys (`"h"`, `"s"`, `"l"`, `"alpha"`, …) typed as `string`. Do **not** introduce reka's `ColorChannel` union.
- Announced channel names come from the `label` field on `ChannelConfig` in `packages/core/src/color-spaces.ts` (`"Hue"`, `"Saturation"`, `"Lightness"`). Never announce the raw key.
- All four root emits carry `Color`, never a hex string: `update:modelValue` (`Color | undefined`), `update:color` (`Color`), `change` (`Color`), `changeEnd` (`Color`).
- `changeEnd` fires on `pointerup` only when the value changed since `pointerdown`, and on every keyboard interaction that changes the value.
- `aria-disabled` is emitted only when disabled (`:aria-disabled="disabled || undefined"`). Never render `aria-disabled="false"`.
- `tabindex` on a focusable thumb is `0` when enabled, `undefined` when disabled. Never `-1`, never hardcoded `0`.
- Shift modifier multiplier is **×10** everywhere.
- `packages/react` is out of scope. Do not edit it.
- Package manager is Bun. Run tests with `bun test`, never `npm`/`vitest`.
- Run from repo root: `bun test`, `bun run lint`, `bun run docs:build`.
- **Baseline at branch base (measured 2026-07-19):** `bun test` → 484 pass, 5 todo, 0 fail. `vue-tsc --noEmit` → exactly 2 errors, both `packages/core/test/geometry.test.ts(218)` `TS18048: 'inset' is possibly 'undefined'`. `bun run lint` eslint → ~182 pre-existing errors, all style rules.
- **Gate:** no new failures and no new vue-tsc errors versus that baseline. Those 2 core errors are out of scope — do not fix them. eslint deltas are advisory: log any new ones to the ledger rather than blocking on the pre-existing 182.
- Commit after every task. Conventional Commits. Body explains why, not what.

---

# Phase A — mechanical extraction (no behavior change)

## Task 1: Move `ColorArea/utils.ts` to `src/shared/utils.ts`

Today `ColorArea/utils.ts` is a grab-bag that `ColorField`, `ColorTriangle`, `ColorWheel` and `ColorRing` reach into across folder boundaries, and Triangle/Wheel/Ring each additionally define their own local `snap` and cyclic-wrap copies. This task moves the file and adds the one helper the local copies need, so later tasks can delete those copies.

**Files:**
- Create: `packages/vue/src/shared/utils.ts`
- Delete: `packages/vue/src/components/ColorArea/utils.ts`
- Modify: every file importing from `"./utils"` or `"../ColorArea/utils"` (find them in Step 1)
- Test: `packages/vue/test/shared-utils.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `packages/vue/src/shared/utils.ts` exporting, unchanged from the current file — `ActiveDirection`, `clamp`, `getDecimalCount`, `roundValue`, `snapToStep`, `linearScale`, `convertValueToPercentage`, `getLabel`, `getThumbInBoundsOffset`, `hasMinStepsBetweenValues`, `getClosestThumbIndex`, `PAGE_KEYS`, `ARROW_KEYS`, `useFormControl`, `useSize`, `useCollection` — plus one new export:
  ```ts
  export function cyclicWrap(value: number, min: number, max: number): number
  ```

- [ ] **Step 1: List every importer**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -rn "ColorArea/utils\|from \"\./utils\"" packages/vue/src --include=*.vue --include=*.ts
```

Record the list. Every hit must be updated in Step 5.

- [ ] **Step 2: Write the failing test**

Create `packages/vue/test/shared-utils.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { clamp, convertValueToPercentage, cyclicWrap, snapToStep } from "../src/shared/utils";

describe("shared/utils", () => {
  it("clamps into range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it("snaps to the nearest step and clamps", () => {
    expect(snapToStep(0.34, 0, 1, 0.1)).toBe(0.3);
    expect(snapToStep(7, 0, 5, 1)).toBe(5);
  });

  it("converts a value to a percentage of its range", () => {
    expect(convertValueToPercentage(50, 0, 100)).toBe(50);
    expect(convertValueToPercentage(180, 0, 360)).toBe(50);
  });

  describe("cyclicWrap", () => {
    it("wraps past the maximum back to the minimum", () => {
      expect(cyclicWrap(370, 0, 360)).toBe(10);
    });

    it("wraps below the minimum back to the maximum", () => {
      expect(cyclicWrap(-10, 0, 360)).toBe(350);
    });

    it("leaves in-range values untouched", () => {
      expect(cyclicWrap(180, 0, 360)).toBe(180);
    });

    it("returns min when the range is degenerate", () => {
      expect(cyclicWrap(5, 3, 3)).toBe(3);
    });
  });
});
```

- [ ] **Step 3: Run it to make sure it fails**

Run: `bun test packages/vue/test/shared-utils.test.ts`
Expected: FAIL — cannot resolve `../src/shared/utils`.

- [ ] **Step 4: Move the file and add `cyclicWrap`**

```bash
mkdir -p packages/vue/src/shared
git mv packages/vue/src/components/ColorArea/utils.ts packages/vue/src/shared/utils.ts
```

Append to `packages/vue/src/shared/utils.ts`, directly after the `getClosestThumbIndex` function:

```ts
/**
 * Wrap a value cyclically into [min, max), used for angular channels such as hue
 * where stepping past 360 should land back near 0 rather than clamping.
 */
export function cyclicWrap(value: number, min: number, max: number): number {
  const range = max - min;
  if (range <= 0)
    return min;
  return ((value - min) % range + range) % range + min;
}
```

- [ ] **Step 5: Repoint every importer**

For each hit from Step 1, rewrite the specifier:

| In | Old | New |
|---|---|---|
| `components/ColorArea/*.vue` | `from "./utils"` | `from "../../shared/utils"` |
| `components/ColorField/*.vue` | `from "../ColorArea/utils"` | `from "../../shared/utils"` |
| `components/ColorTriangle/*.vue`, `ColorWheel/*.vue`, `ColorRing/*.vue` | `from "../ColorArea/utils"` | `from "../../shared/utils"` |

`components/ColorArea/index.ts` currently re-exports `ActiveDirection` from `"./utils"`. Change that line to:

```ts
export type { ActiveDirection } from "../../shared/utils";
```

Note: `ColorField/utils.ts` (which holds `usePressedHold`) is a different file and stays where it is.

- [ ] **Step 6: Run the full suite**

Run: `bun test`
Expected: PASS, including the new `shared-utils.test.ts`. No test should change behavior — this is a move.

- [ ] **Step 7: Typecheck**

Run: `bun run lint`
Expected: no errors. A missed import path shows up here as an unresolved module.

- [ ] **Step 8: Commit**

```bash
git add packages/vue/src/shared/utils.ts packages/vue/src/components packages/vue/test/shared-utils.test.ts
git commit -m "refactor(vue): move shared utils out of ColorArea

Four component folders reached into ColorArea/utils.ts across folder
boundaries, and three of them kept private snap and cyclic-wrap copies
on top. Hoisting the module to src/shared gives those copies a single
home to collapse into."
```

---

## Task 2: Collapse the five Checkerboard components into one

`ColorAreaCheckerboard`, `ColorSliderCheckerboard` and `ColorTriangleCheckerboard` are byte-identical; `ColorRingCheckerboard` and `ColorWheelCheckerboard` add `borderRadius: 50%`. Public names stay — the five files become thin wrappers.

**Files:**
- Create: `packages/vue/src/shared/Checkerboard.vue`
- Modify: `packages/vue/src/components/ColorArea/ColorAreaCheckerboard.vue`, `ColorSlider/ColorSliderCheckerboard.vue`, `ColorTriangle/ColorTriangleCheckerboard.vue`, `ColorRing/ColorRingCheckerboard.vue`, `ColorWheel/ColorWheelCheckerboard.vue`
- Test: `packages/vue/test/Checkerboard.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `shared/Checkerboard.vue` with props `{ as?: string; asChild?: boolean; shape?: "rect" | "circle" }`, `shape` defaulting to `"rect"`.

- [ ] **Step 1: Write the failing test**

Create `packages/vue/test/Checkerboard.test.ts`:

```ts
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "bun:test";
import Checkerboard from "../src/shared/Checkerboard.vue";
import { ColorAreaCheckerboard } from "../src/components/ColorArea";
import { ColorWheelCheckerboard } from "../src/components/ColorWheel";

describe("shared Checkerboard", () => {
  it("renders a square checkerboard by default", () => {
    const wrapper = mount(Checkerboard);
    expect(wrapper.attributes("style")).toContain("repeating-conic-gradient");
    expect(wrapper.attributes("style")).not.toContain("border-radius");
  });

  it("rounds the checkerboard when shape is circle", () => {
    const wrapper = mount(Checkerboard, { props: { shape: "circle" } });
    expect(wrapper.attributes("style")).toContain("border-radius: 50%");
  });

  it("keeps ColorAreaCheckerboard square", () => {
    const wrapper = mount(ColorAreaCheckerboard);
    expect(wrapper.attributes("style")).not.toContain("border-radius");
  });

  it("keeps ColorWheelCheckerboard round", () => {
    const wrapper = mount(ColorWheelCheckerboard);
    expect(wrapper.attributes("style")).toContain("border-radius: 50%");
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `bun test packages/vue/test/Checkerboard.test.ts`
Expected: FAIL — cannot resolve `../src/shared/Checkerboard.vue`.

- [ ] **Step 3: Create the shared component**

Create `packages/vue/src/shared/Checkerboard.vue`:

```vue
<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface CheckerboardProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
  /** `circle` rounds the checkerboard for radial surfaces such as the ring and wheel. */
  shape?: "rect" | "circle";
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";

const props = withDefaults(defineProps<CheckerboardProps>(), {
  as: "div",
  shape: "rect",
});

useForwardExpose();

const style = computed(() => ({
  position: "absolute" as const,
  inset: "0",
  pointerEvents: "none" as const,
  background: "repeating-conic-gradient(rgb(230, 230, 230) 0% 25%, white 0% 50%) 0% 50% / 16px 16px",
  ...(props.shape === "circle" ? { borderRadius: "50%" } : {}),
}));
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    :style="style"
  />
</template>
```

- [ ] **Step 4: Rewrite the five wrappers**

`packages/vue/src/components/ColorArea/ColorAreaCheckerboard.vue` — replace the whole file:

```vue
<script lang="ts">
import type { CheckerboardProps } from "../../shared/Checkerboard.vue";

export interface ColorAreaCheckerboardProps extends Omit<CheckerboardProps, "shape"> {}
</script>

<script setup lang="ts">
import Checkerboard from "../../shared/Checkerboard.vue";

const props = withDefaults(defineProps<ColorAreaCheckerboardProps>(), {
  as: "div",
});
</script>

<template>
  <Checkerboard v-bind="props" shape="rect" />
</template>
```

`ColorSlider/ColorSliderCheckerboard.vue` and `ColorTriangle/ColorTriangleCheckerboard.vue` — identical, with the interface renamed to `ColorSliderCheckerboardProps` / `ColorTriangleCheckerboardProps`.

`ColorRing/ColorRingCheckerboard.vue` and `ColorWheel/ColorWheelCheckerboard.vue` — identical, with the interface renamed to `ColorRingCheckerboardProps` / `ColorWheelCheckerboardProps` and `shape="circle"` in the template.

- [ ] **Step 5: Run the tests**

Run: `bun test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/vue/src/shared/Checkerboard.vue packages/vue/src/components packages/vue/test/Checkerboard.test.ts
git commit -m "refactor(vue): collapse five Checkerboard copies into one

Three of the five were byte-identical and two differed only by a border
radius. A shape prop covers both cases; the public component names stay
as thin wrappers so consumer imports are unaffected."
```

---

# Phase B — parity and accessibility, component by component

## Task 3: ColorArea root — rename props, add emits, add `role="group"`

**Files:**
- Modify: `packages/vue/src/components/ColorArea/ColorAreaRoot.vue`
- Test: `packages/vue/test/ColorArea.test.ts:12-37` (the `ColorArea` harness) and new cases

**Interfaces:**
- Consumes: `shared/utils.ts` from Task 1.
- Produces:
  ```ts
  export interface ColorAreaRootProps {
    // ... existing, with channelX/channelY replaced by:
    xChannel?: string;
    yChannel?: string;
    xName?: string;
    yName?: string;
  }
  export type ColorAreaRootEmits = {
    "update:modelValue": [payload: Color | undefined];
    "update:color": [payload: Color];
    "change": [payload: Color];
    "changeEnd": [payload: Color];
  };
  ```
  `ColorAreaRootContext` is unchanged apart from keeping its existing `xChannelKey` / `yChannelKey` field names — those are internal and already reka-shaped.

Note: `packages/vue/test/ColorArea.test.ts` **already** passes `xChannel` / `yChannel` to the root. Those props do not exist yet, so Vue drops them onto the DOM as attributes and the test only passes because `"h"` / `"s"` happen to be the HSL defaults. This task makes the test mean what it says.

- [ ] **Step 1: Write the failing test**

Append to `packages/vue/test/ColorArea.test.ts`, inside the top-level `describe("given default ColorArea", ...)` block:

```ts
  it("should not render aria-disabled when enabled", () => {
    const root = wrapper.find("[role=\"group\"]");
    expect(root.exists()).toBe(true);
    expect(root.attributes("aria-disabled")).toBeUndefined();
  });

  it("should emit change and changeEnd alongside update:modelValue on a keyboard step", async () => {
    const slider = wrapper.find("[role=\"slider\"]");
    await slider.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")).toHaveLength(1);
    expect(wrapper.emitted("change")).toHaveLength(1);
    expect(wrapper.emitted("changeEnd")).toHaveLength(1);
  });

  it("should respect a non-default yChannel", async () => {
    const local = mount(ColorArea, { props: { yChannel: "l" }, attachTo: document.body });
    const slider = local.find("[role=\"slider\"]");
    await slider.trigger("keydown", { key: "ArrowDown" });
    const emitted = local.emitted("update:modelValue")?.[0]?.[0] as Color;
    const hsl = emitted.to("hsl");
    // lightness moved, saturation did not
    expect(Math.round(hsl.get("l") * 100)).toBe(51);
    expect(Math.round(hsl.get("s") * 100)).toBe(50);
  });
```

Then extend the `ColorArea` harness at the top of the file so it forwards the new props and events:

```ts
const ColorArea = defineComponent({
  props: {
    disabled: { type: Boolean, default: false },
    invertedX: { type: Boolean, default: false },
    invertedY: { type: Boolean, default: false },
    yChannel: { type: String, default: "s" },
  },
  emits: ["update:modelValue", "update:color", "change", "changeEnd"],
  setup(props, { emit }) {
    return () =>
      h(ColorAreaRoot, {
        "defaultValue": "hsl(180, 50%, 50%)",
        "colorSpace": "hsl",
        "xChannel": "h",
        "yChannel": props.yChannel,
        "disabled": props.disabled,
        "invertedX": props.invertedX,
        "invertedY": props.invertedY,
        "name": "slider-area",
        "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
        "onUpdate:color": (v: Color) => emit("update:color", v),
        "onChange": (v: Color) => emit("change", v),
        "onChangeEnd": (v: Color) => emit("changeEnd", v),
      }, {
        default: () => h(ColorAreaThumb),
      });
  },
});
```

Also update the two `emits: [...]` / `onValueCommit` references in the form `describe` block lower in the file to use `changeEnd`.

- [ ] **Step 2: Run it to make sure it fails**

Run: `bun test packages/vue/test/ColorArea.test.ts`
Expected: FAIL — no `[role="group"]`, and `change` / `changeEnd` are never emitted.

- [ ] **Step 3: Rename the props**

In `ColorAreaRoot.vue`, in the `ColorAreaRootProps` interface, replace:

```ts
  /** Which channel maps to the X axis (e.g. 's' for HSL saturation, or 'alpha' for opacity). */
  channelX?: string;
  /** Which channel maps to the Y axis (e.g. 'l' for HSL lightness, or 'alpha' for opacity). */
  channelY?: string;
```

with:

```ts
  /** Which channel maps to the X axis (e.g. 's' for HSL saturation, or 'alpha' for opacity). */
  xChannel?: string;
  /** Which channel maps to the Y axis (e.g. 'l' for HSL lightness, or 'alpha' for opacity). */
  yChannel?: string;
  /** The name of the hidden input carrying the raw X channel value for form submission. */
  xName?: string;
  /** The name of the hidden input carrying the raw Y channel value for form submission. */
  yName?: string;
```

Update the two computed resolvers:

```ts
const xChannelKey = computed(() => props.xChannel ?? spaceConfig.value?.channels[0]?.key ?? "h");
const yChannelKey = computed(() => props.yChannel ?? spaceConfig.value?.channels[1]?.key ?? "s");
```

- [ ] **Step 4: Replace the emits**

Replace the `ColorAreaRootEmits` type:

```ts
export type ColorAreaRootEmits = {
  /** Event handler called when the color value changes */
  "update:modelValue": [payload: Color | undefined];
  /** Event handler called when the color value changes. Mirrors `update:modelValue`; present for API parity. */
  "update:color": [payload: Color];
  /** Event handler called on every value change, including mid-drag. */
  "change": [payload: Color];
  /** Event handler called when the value changes at the end of an interaction. */
  "changeEnd": [payload: Color];
};
```

In `updateValues`, replace the emit block:

```ts
    const newColor = displayValuesToColor(nextValues);
    if (newColor) {
      colorRef.value = newColor;
      emits("update:modelValue", newColor);
      emits("update:color", newColor);
      emits("change", newColor);
      if (commit) emits("changeEnd", newColor);
    }
```

In `handleSlideEnd`, replace `emits("valueCommit", colorRef.value)` with `emits("changeEnd", colorRef.value)`.

- [ ] **Step 5: Add `role="group"`, fix `aria-disabled`, add the axis inputs**

In the template, on the `Primitive`, replace `:aria-disabled="disabled"` with:

```
      role="group"
      :aria-disabled="disabled || undefined"
```

Below the existing `VisuallyHidden` form input, add the two axis inputs:

```vue
      <VisuallyHidden
        v-if="isFormControl && xName"
        as="input"
        type="text"
        :value="currentModelValue[0]?.[0] ?? ''"
        :name="xName"
        :disabled="disabled"
      />

      <VisuallyHidden
        v-if="isFormControl && yName"
        as="input"
        type="text"
        :value="currentModelValue[0]?.[1] ?? ''"
        :name="yName"
        :disabled="disabled"
      />
```

- [ ] **Step 6: Run the tests**

Run: `bun test packages/vue/test/ColorArea.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/vue/src/components/ColorArea/ColorAreaRoot.vue packages/vue/test/ColorArea.test.ts
git commit -m "feat(vue)!: align ColorAreaRoot props and events with reka

BREAKING CHANGE: channelX/channelY are now xChannel/yChannel and the
valueCommit event is now changeEnd. update:color, change and xName/yName
form inputs are added. The existing test already assumed the reka names,
so it was silently passing on the HSL defaults rather than on the props
it declared."
```

---

## Task 4: Add `ColorAreaArea`

reka splits ColorArea into a state root and an interaction surface. The surface carries `role="application"` so screen readers hand arrow keys through to the widget instead of consuming them for browse mode.

**Files:**
- Create: `packages/vue/src/components/ColorArea/ColorAreaArea.vue`
- Modify: `packages/vue/src/components/ColorArea/ColorAreaRoot.vue` (move handlers off), `packages/vue/src/components/ColorArea/index.ts`
- Test: `packages/vue/test/ColorArea.test.ts`

**Interfaces:**
- Consumes: `injectColorAreaRootContext` from Task 3.
- Produces: `ColorAreaArea` + `ColorAreaAreaProps` (`{ as?: string; asChild?: boolean }`, `as` defaulting to `"div"`), and four new context members the area needs:
  ```ts
  interface ColorAreaRootContext {
    // ...existing...
    handleKeyDown: (event: KeyboardEvent) => void;
    handleSlideStart: (event: PointerEvent) => void;
    handleSlideMove: (event: PointerEvent) => void;
    handleSlideEnd: () => void;
    snapshotValues: () => void;
  }
  ```

- [ ] **Step 1: Write the failing test**

In `packages/vue/test/ColorArea.test.ts`, change the harness slot so the thumb sits inside an area, and import `ColorAreaArea`:

```ts
import {
  ColorAreaArea,
  ColorAreaRoot,
  ColorAreaThumb,
} from "../src/components/ColorArea";
```

```ts
      }, {
        default: () => h(ColorAreaArea, null, { default: () => h(ColorAreaThumb) }),
      });
```

Add:

```ts
  it("should expose the interaction surface as an application region", () => {
    const area = wrapper.find("[role=\"application\"]");
    expect(area.exists()).toBe(true);
    expect(area.attributes("aria-roledescription")).toBe("Color picker");
  });
```

All existing keyboard cases in the file trigger `keydown` on `[role="slider"]`, which is inside the area, so they keep working through bubbling.

- [ ] **Step 2: Run it to make sure it fails**

Run: `bun test packages/vue/test/ColorArea.test.ts`
Expected: FAIL — `ColorAreaArea` is not exported.

- [ ] **Step 3: Expose the handlers on the context**

In `ColorAreaRoot.vue`, extract the inline template keydown into a named function placed just after `handleBoundaryKey`:

```ts
function handleKeyDown(event: KeyboardEvent) {
  if (disabled.value)
    return;
  if (event.key === "Home") { handleBoundaryKey("x", minX.value); event.preventDefault(); }
  else if (event.key === "End") { handleBoundaryKey("x", maxX.value); event.preventDefault(); }
  else if (event.key === "PageUp") { handleBoundaryKey("y", minY.value); event.preventDefault(); }
  else if (event.key === "PageDown") { handleBoundaryKey("y", maxY.value); event.preventDefault(); }
  else if (ARROW_KEYS.includes(event.key)) { handleStepKeyDown(event); event.preventDefault(); }
}

function snapshotValues() {
  valuesBeforeSlideStartRef.value = currentModelValue.value;
}
```

Note the last branch is now `ARROW_KEYS.includes(...)` rather than `PAGE_KEYS.concat(ARROW_KEYS).includes(...)`. The page keys are already consumed above, so the concat was dead. Remove the now-unused `PAGE_KEYS` import.

Add all five to `ColorAreaRootContext` (interface and `provideColorAreaRootContext` call): `handleKeyDown`, `handleSlideStart`, `handleSlideMove`, `handleSlideEnd`, `snapshotValues`.

- [ ] **Step 4: Strip the handlers off the root template**

In `ColorAreaRoot.vue`'s template, delete the `@keydown`, `@pointerdown`, `@pointermove` and `@pointerup` bindings from the `Primitive` entirely. The root keeps `role="group"`, `dir`, `aria-disabled`, `data-disabled` and the thumb-transform style.

- [ ] **Step 5: Create the area component**

Create `packages/vue/src/components/ColorArea/ColorAreaArea.vue`:

```vue
<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorAreaAreaProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { Primitive, useForwardExpose } from "reka-ui";
import { injectColorAreaRootContext } from "./ColorAreaRoot.vue";

withDefaults(defineProps<ColorAreaAreaProps>(), {
  as: "div",
});

const rootContext = injectColorAreaRootContext();
useForwardExpose();

function onPointerDown(event: PointerEvent) {
  if (rootContext.disabled.value)
    return;
  const target = event.target as HTMLElement;
  target.setPointerCapture(event.pointerId);
  event.preventDefault();
  const thumb = rootContext.thumbRef.value;
  if (thumb && thumb.contains(target)) {
    thumb.focus();
  } else {
    rootContext.snapshotValues();
    rootContext.handleSlideStart(event);
  }
}

function onPointerMove(event: PointerEvent) {
  if (rootContext.disabled.value)
    return;
  const target = event.target as HTMLElement;
  if (target.hasPointerCapture(event.pointerId))
    rootContext.handleSlideMove(event);
}

function onPointerUp(event: PointerEvent) {
  if (rootContext.disabled.value)
    return;
  const target = event.target as HTMLElement;
  if (target.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId);
    rootContext.handleSlideEnd();
  }
}
</script>

<template>
  <Primitive
    :as-child="asChild"
    :as="as"
    role="application"
    aria-roledescription="Color picker"
    :aria-disabled="rootContext.disabled.value || undefined"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :style="{ touchAction: 'none' }"
    @keydown="rootContext.handleKeyDown"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <slot />
  </Primitive>
</template>
```

- [ ] **Step 6: Export it**

In `packages/vue/src/components/ColorArea/index.ts`, add alongside the existing exports:

```ts
export { default as ColorAreaArea } from "./ColorAreaArea.vue";
export type { ColorAreaAreaProps } from "./ColorAreaArea.vue";
```

- [ ] **Step 7: Run the tests**

Run: `bun test packages/vue/test/ColorArea.test.ts`
Expected: PASS, including every pre-existing keyboard case.

- [ ] **Step 8: Commit**

```bash
git add packages/vue/src/components/ColorArea packages/vue/test/ColorArea.test.ts
git commit -m "feat(vue)!: split the ColorArea interaction surface into ColorAreaArea

BREAKING CHANGE: gradient, checkerboard and thumb must now be wrapped in
ColorAreaArea. The surface carries role=application so screen readers
pass arrow keys to the widget instead of consuming them for browse mode."
```

---

## Task 5: ColorArea thumb — announce both channels

**Files:**
- Modify: `packages/vue/src/components/ColorArea/ColorAreaThumb.vue`
- Test: `packages/vue/test/ColorArea.test.ts`

**Interfaces:**
- Consumes: `injectColorAreaRootContext` (needs `colorSpace`, `xChannelKey`, `yChannelKey`, already present).
- Produces: a helper that later tasks reuse — create it here:
  ```ts
  // packages/vue/src/shared/channel-labels.ts
  export function channelLabel(colorSpace: SpaceId, channelKey: string): string
  export function formatChannelValue(colorSpace: SpaceId, channelKey: string, value: number): string
  ```
  `channelLabel` returns `"Alpha"` for `"alpha"`, otherwise the `label` from `getChannelConfig`, falling back to the raw key. `formatChannelValue` rounds to the channel's step precision and appends `"%"` for `format === "percentage"`, `"°"` for `format === "degree"`, nothing otherwise.

- [ ] **Step 1: Write the failing test**

Create `packages/vue/test/channel-labels.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { channelLabel, formatChannelValue } from "../src/shared/channel-labels";

describe("channel-labels", () => {
  it("returns the human label for a channel key", () => {
    expect(channelLabel("hsl", "h")).toBe("Hue");
    expect(channelLabel("hsl", "s")).toBe("Saturation");
  });

  it("labels alpha without consulting the space", () => {
    expect(channelLabel("hsl", "alpha")).toBe("Alpha");
  });

  it("falls back to the raw key for an unknown channel", () => {
    expect(channelLabel("hsl", "zzz")).toBe("zzz");
  });

  it("formats degree channels with a degree sign", () => {
    expect(formatChannelValue("hsl", "h", 210.4)).toBe("210°");
  });

  it("formats percentage channels with a percent sign", () => {
    expect(formatChannelValue("hsl", "s", 63.7)).toBe("64%");
  });
});
```

Add to `packages/vue/test/ColorArea.test.ts`:

```ts
  it("should label the thumb with both channel names", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("aria-label")).toBe("Hue, Saturation");
    expect(thumb.attributes("aria-roledescription")).toBe("Color thumb");
  });

  it("should announce both channel values via aria-valuetext", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("aria-valuetext")).toBe("Hue 180°, Saturation 50%");
  });
```

The existing case `"should have a single thumb with role=slider and 2D slider role description"` asserts `aria-roledescription="2D slider"`. Change its selector and expectation to `"Color thumb"`, and rename it to `"should have a single thumb with role=slider and a colour thumb role description"`. The `[aria-roledescription="2D slider"]` selector in the disabled block must change to `[role="slider"]`.

- [ ] **Step 2: Run it to make sure it fails**

Run: `bun test packages/vue/test/channel-labels.test.ts packages/vue/test/ColorArea.test.ts`
Expected: FAIL — module missing, and the thumb has no `aria-label` or `aria-valuetext`.

- [ ] **Step 3: Create the label helper**

Create `packages/vue/src/shared/channel-labels.ts`:

```ts
import type { SpaceId } from "@urcolor/core";
import { getChannelConfig } from "@urcolor/core";

const ALPHA_LABEL = "Alpha";

/** Human-readable name for a channel, as announced to assistive technology. */
export function channelLabel(colorSpace: SpaceId, channelKey: string): string {
  if (channelKey === "alpha")
    return ALPHA_LABEL;
  return getChannelConfig(colorSpace, channelKey)?.label ?? channelKey;
}

/** A channel value rendered with its unit, for `aria-valuetext`. */
export function formatChannelValue(colorSpace: SpaceId, channelKey: string, value: number): string {
  if (channelKey === "alpha")
    return `${Math.round(value)}%`;
  const config = getChannelConfig(colorSpace, channelKey);
  if (!config)
    return String(Math.round(value));
  const decimals = (String(config.step).split(".")[1] || "").length;
  const rounded = value.toFixed(decimals);
  if (config.format === "percentage")
    return `${rounded}%`;
  if (config.format === "degree")
    return `${rounded}°`;
  return rounded;
}
```

- [ ] **Step 4: Wire it into the thumb**

In `ColorAreaThumb.vue`, add to the script:

```ts
import { channelLabel, formatChannelValue } from "../../shared/channel-labels";

const xLabel = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.xChannelKey.value));
const yLabel = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.yChannelKey.value));
const ariaLabel = computed(() => `${xLabel.value}, ${yLabel.value}`);
const ariaValueText = computed(() => {
  const v = value.value;
  if (!v)
    return undefined;
  const space = rootContext.colorSpace.value;
  const x = formatChannelValue(space, rootContext.xChannelKey.value, v[0] ?? 0);
  const y = formatChannelValue(space, rootContext.yChannelKey.value, v[1] ?? 0);
  return `${xLabel.value} ${x}, ${yLabel.value} ${y}`;
});
```

The `getLabel` import and the `label` computed are no longer used — `getLabel` returns `undefined` for a single-thumb widget, which is exactly the unlabeled-slider bug. Delete both.

In the template, replace:

```
      :aria-label="($attrs['aria-label'] as string) || label"
```
```
      aria-roledescription="2D slider"
```

with:

```
      :aria-label="($attrs['aria-label'] as string) || ariaLabel"
      :aria-valuetext="ariaValueText"
      aria-roledescription="Color thumb"
```

- [ ] **Step 5: Run the tests**

Run: `bun test packages/vue/test/channel-labels.test.ts packages/vue/test/ColorArea.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/vue/src/shared/channel-labels.ts packages/vue/src/components/ColorArea/ColorAreaThumb.vue packages/vue/test
git commit -m "fix(vue): announce both ColorArea channels on the thumb

The Y channel had no aria-valuenow and no aria-valuetext, so it was
invisible to assistive tech, and getLabel returns undefined for a
single-thumb widget, leaving the slider unlabeled. aria-valuetext now
carries both channels with their units, matching reka."
```

---

## Task 6: ColorWheel — one thumb

**Files:**
- Delete: `packages/vue/src/components/ColorWheel/ColorWheelThumbX.vue`, `ColorWheelThumbY.vue`
- Modify: `packages/vue/src/components/ColorWheel/ColorWheelThumb.vue`, `ColorWheelRoot.vue`, `index.ts`
- Test: `packages/vue/test/ColorWheel.test.ts` (new file)

**Interfaces:**
- Consumes: `channelLabel` / `formatChannelValue` from Task 5.
- Produces: `ColorWheelRootContext` loses `activeDirection`, `thumbXElement` and `thumbYElement`, and gains `thumbElement: Ref<HTMLElement | undefined>`. Root props `channelAngle` / `channelRadius` become `angleChannel` / `radiusChannel`. Emits become the standard four.

- [ ] **Step 1: Write the failing test**

Create `packages/vue/test/ColorWheel.test.ts`:

```ts
import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "bun:test";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { ColorWheelRoot, ColorWheelThumb } from "../src/components/ColorWheel";

const ColorWheel = defineComponent({
  props: { disabled: { type: Boolean, default: false } },
  emits: ["update:modelValue", "change", "changeEnd"],
  setup(props, { emit }) {
    return () =>
      h(ColorWheelRoot, {
        "defaultValue": "hsl(180, 50%, 50%)",
        "colorSpace": "hsl",
        "angleChannel": "h",
        "radiusChannel": "s",
        "disabled": props.disabled,
        "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
        "onChange": (v: Color) => emit("change", v),
        "onChangeEnd": (v: Color) => emit("changeEnd", v),
      }, { default: () => h(ColorWheelThumb) });
  },
});

describe("given default ColorWheel", () => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockImplementation(id => id);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();

  let wrapper: VueWrapper;

  beforeEach(() => {
    document.body.innerHTML = "";
    wrapper = mount(ColorWheel, { attachTo: document.body });
  });

  it("should render exactly one slider", () => {
    expect(wrapper.findAll("[role=\"slider\"]")).toHaveLength(1);
  });

  it("should label the thumb with both channel names", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("aria-label")).toBe("Hue, Saturation");
    expect(thumb.attributes("aria-roledescription")).toBe("Color thumb");
    expect(thumb.attributes("aria-valuetext")).toBe("Hue 180°, Saturation 50%");
  });

  it("should expose the angle channel range on aria-valuemin/max/now", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("aria-valuenow")).toBe("180");
    expect(thumb.attributes("aria-valuemin")).toBe("0");
    expect(thumb.attributes("aria-valuemax")).toBe("360");
  });

  it("should be tabbable when enabled", () => {
    expect(wrapper.find("[role=\"slider\"]").attributes("tabindex")).toBe("0");
  });

  describe("when disabled", () => {
    beforeEach(async () => {
      await wrapper.setProps({ disabled: true });
    });

    it("should drop out of the tab order", () => {
      expect(wrapper.find("[role=\"slider\"]").attributes("tabindex")).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `bun test packages/vue/test/ColorWheel.test.ts`
Expected: FAIL — two sliders found, no `aria-label`.

- [ ] **Step 3: Rename the root props and emits**

In `ColorWheelRoot.vue`: rename props `channelAngle` → `angleChannel` and `channelRadius` → `radiusChannel`, updating the two computed resolvers that read them. Replace the emits type with the standard four (copy the `ColorAreaRootEmits` shape from Task 3, renamed `ColorWheelRootEmits`) and update every `emit("valueCommit", ...)` call site to emit `change` on each value set and `changeEnd` on commit.

Delete the local `snap` helper and import `snapToStep` from `../../shared/utils`. Delete the local cyclic-wrap expression in `handleKeyDown` and use `cyclicWrap` from the same module.

On the root `Primitive`, change `:aria-disabled="disabled"` to `:aria-disabled="disabled || undefined"` so an enabled wheel stops rendering `aria-disabled="false"`.

Remove `activeDirection`, `thumbXElement` and `thumbYElement` from `ColorWheelRootContext` (interface and provide call); add `thumbElement: Ref<HTMLElement | undefined>` backed by a new `const thumbElement = ref<HTMLElement>()`. Remove the `activeDirection` derivation from the pointermove handler — with one thumb there is no axis to select.

- [ ] **Step 4: Fold the sub-thumbs into `ColorWheelThumb`**

Replace `packages/vue/src/components/ColorWheel/ColorWheelThumb.vue` entirely:

```vue
<script lang="ts">
import type { PrimitiveProps } from "reka-ui";

export interface ColorWheelThumbProps extends /* @vue-ignore */ PrimitiveProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { Primitive, useForwardExpose } from "reka-ui";
import { channelLabel, formatChannelValue } from "../../shared/channel-labels";
import { injectColorWheelRootContext } from "./ColorWheelRoot.vue";

withDefaults(defineProps<ColorWheelThumbProps>(), { as: "span" });

const rootContext = injectColorWheelRootContext();
const { forwardRef, currentElement: thumbElement } = useForwardExpose();

onMounted(() => {
  if (thumbElement.value)
    rootContext.thumbElement.value = thumbElement.value;
});
onUnmounted(() => {
  if (rootContext.thumbElement.value === thumbElement.value)
    rootContext.thumbElement.value = undefined;
});

const angleDeg = computed(() => {
  const range = rootContext.angleMax.value - rootContext.angleMin.value;
  if (range === 0) return rootContext.startAngle.value;
  const normalized = (rootContext.currentAngleValue.value - rootContext.angleMin.value) / range;
  return normalized * 360 + rootContext.startAngle.value;
});

const radiusPercent = computed(() => {
  const range = rootContext.radiusMax.value - rootContext.radiusMin.value;
  if (range === 0) return 0;
  return (rootContext.currentRadiusValue.value - rootContext.radiusMin.value) / range * 50;
});

const angleLabel = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.angleChannelKey.value));
const radiusLabel = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.radiusChannelKey.value));
const ariaLabel = computed(() => `${angleLabel.value}, ${radiusLabel.value}`);
const ariaValueText = computed(() => {
  const space = rootContext.colorSpace.value;
  const a = formatChannelValue(space, rootContext.angleChannelKey.value, rootContext.currentAngleValue.value);
  const r = formatChannelValue(space, rootContext.radiusChannelKey.value, rootContext.currentRadiusValue.value);
  return `${angleLabel.value} ${a}, ${radiusLabel.value} ${r}`;
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    role="slider"
    :tabindex="rootContext.disabled.value ? undefined : 0"
    :aria-label="($attrs['aria-label'] as string) || ariaLabel"
    :aria-valuenow="rootContext.currentAngleValue.value"
    :aria-valuemin="rootContext.angleMin.value"
    :aria-valuemax="rootContext.angleMax.value"
    :aria-valuetext="ariaValueText"
    aria-roledescription="Color thumb"
    :aria-disabled="rootContext.disabled.value || undefined"
    :data-disabled="rootContext.disabled.value ? '' : undefined"
    :as-child="asChild"
    :as="as"
    :style="{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: `rotate(${angleDeg}deg) translateY(-${radiusPercent}cqmin) translate(-50%, -50%)`,
      transformOrigin: '0 0',
    }"
  >
    <slot />
  </Primitive>
</template>
```

- [ ] **Step 5: Delete the sub-thumbs and their exports**

```bash
git rm packages/vue/src/components/ColorWheel/ColorWheelThumbX.vue packages/vue/src/components/ColorWheel/ColorWheelThumbY.vue
```

Remove the corresponding `export { default as ColorWheelThumbX }` / `ThumbY` lines and their prop-type exports from `packages/vue/src/components/ColorWheel/index.ts`.

- [ ] **Step 6: Run the tests**

Run: `bun test packages/vue/test/ColorWheel.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A packages/vue/src/components/ColorWheel packages/vue/test/ColorWheel.test.ts
git commit -m "feat(vue)!: give ColorWheel a single thumb

BREAKING CHANGE: ColorWheelThumbX and ColorWheelThumbY are removed;
ColorWheelThumb is now the slider itself. channelAngle/channelRadius are
renamed angleChannel/radiusChannel and valueCommit becomes changeEnd.

The two sub-thumbs were both absolutely positioned at 100% x 100% and
overlapped exactly, so pointer hit-testing always resolved to whichever
painted last. One thumb announcing both channels via aria-valuetext
removes the ambiguity and matches reka."
```

---

## Task 7: ColorTriangle — one thumb and a corrected key map

**Files:**
- Delete: `packages/vue/src/components/ColorTriangle/ColorTriangleThumbX.vue`, `ColorTriangleThumbY.vue`, `ColorTriangleThumbZ.vue`
- Modify: `packages/vue/src/components/ColorTriangle/ColorTriangleThumb.vue`, `ColorTriangleRoot.vue`, `index.ts`
- Test: `packages/vue/test/ColorTriangle.test.ts` (new file)

**Interfaces:**
- Consumes: `channelLabel` / `formatChannelValue` (Task 5), `snapToStep` (Task 1).
- Produces: root props `channelX`/`channelY`/`channelZ` become `xChannel`/`yChannel`/`zChannel`; context drops `activeDirection`, `thumbXElement`, `thumbYElement`, `thumbZElement` and keeps only `thumbElement`; emits become the standard four.

Key map after this task, replacing both `handleKeyDown2Channel` and the key half of `handleKeyDown3Channel`:

| Key | Effect |
|---|---|
| ArrowLeft / ArrowRight | x −/+ `stepX` |
| ArrowUp / ArrowDown | y +/− `stepY` |
| PageUp / PageDown | z +/− `stepZ` (3-channel only; no-op in 2-channel) |
| Home / End | x → `xMin` / `xMax` |
| Shift + any | ×10 |

- [ ] **Step 1: Write the failing test**

Create `packages/vue/test/ColorTriangle.test.ts`:

```ts
import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "bun:test";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { ColorTriangleRoot, ColorTriangleThumb } from "../src/components/ColorTriangle";

function makeTriangle(extra: Record<string, unknown> = {}) {
  return defineComponent({
    emits: ["update:modelValue", "change", "changeEnd"],
    setup(_, { emit }) {
      return () =>
        h(ColorTriangleRoot, {
          "defaultValue": "hsv(180, 50%, 50%)",
          "colorSpace": "hsv",
          "xChannel": "s",
          "yChannel": "v",
          "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
          "onChange": (v: Color) => emit("change", v),
          "onChangeEnd": (v: Color) => emit("changeEnd", v),
          ...extra,
        }, { default: () => h(ColorTriangleThumb) });
    },
  });
}

describe("given a two-channel ColorTriangle", () => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockImplementation(id => id);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();

  let wrapper: VueWrapper;

  beforeEach(() => {
    document.body.innerHTML = "";
    wrapper = mount(makeTriangle(), { attachTo: document.body });
  });

  it("should render exactly one slider", () => {
    expect(wrapper.findAll("[role=\"slider\"]")).toHaveLength(1);
  });

  it("should label the thumb with human channel names, not raw keys", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("aria-label")).toBe("Saturation, Brightness");
    expect(thumb.attributes("aria-roledescription")).toBe("Color thumb");
  });

  it("arrowRight should move X, not Y", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "ArrowRight" });
    const emitted = wrapper.emitted("update:modelValue")?.[0]?.[0] as Color;
    const hsv = emitted.to("hsv");
    expect(Math.round(hsv.get("s") * 100)).toBe(51);
    expect(Math.round(hsv.get("v") * 100)).toBe(50);
  });

  it("arrowUp should move Y, not X", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "ArrowUp" });
    const emitted = wrapper.emitted("update:modelValue")?.[0]?.[0] as Color;
    const hsv = emitted.to("hsv");
    expect(Math.round(hsv.get("s") * 100)).toBe(50);
    expect(Math.round(hsv.get("v") * 100)).toBe(51);
  });

  it("shift+arrowRight should move X by ten steps", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "ArrowRight", shiftKey: true });
    const emitted = wrapper.emitted("update:modelValue")?.[0]?.[0] as Color;
    expect(Math.round(emitted.to("hsv").get("s") * 100)).toBe(60);
  });

  it("home should send X to its minimum", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "Home" });
    const emitted = wrapper.emitted("update:modelValue")?.[0]?.[0] as Color;
    expect(Math.round(emitted.to("hsv").get("s") * 100)).toBe(0);
  });
});

describe("given a three-channel ColorTriangle", () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    document.body.innerHTML = "";
    wrapper = mount(makeTriangle({ zChannel: "h" }), { attachTo: document.body });
  });

  it("should still render exactly one slider", () => {
    expect(wrapper.findAll("[role=\"slider\"]")).toHaveLength(1);
  });

  it("should announce all three channels", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("aria-label")).toBe("Saturation, Brightness, Hue");
    expect(thumb.attributes("aria-valuetext")).toContain("Hue ");
  });

  it("pageUp should move the Z channel", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "PageUp" });
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `bun test packages/vue/test/ColorTriangle.test.ts`
Expected: FAIL — multiple sliders, `aria-label` is the raw key `"s"`, and `ArrowRight` moves Y.

- [ ] **Step 3: Rename root props and emits**

In `ColorTriangleRoot.vue`: rename `channelX` / `channelY` / `channelZ` → `xChannel` / `yChannel` / `zChannel`, updating the resolvers. Replace the emits type with the standard four and update the call sites (`change` on every set, `changeEnd` on commit). Delete the local `snap` helper in favour of `snapToStep` from `../../shared/utils`. On the root `Primitive`, change `:aria-disabled="disabled"` to `:aria-disabled="disabled || undefined"`.

- [ ] **Step 4: Replace both keyboard handlers with one**

Delete `handleKeyDown2Channel` and `handleKeyDown3Channel`. Add:

```ts
const STEP_KEY_AXES: Record<string, { axis: "x" | "y" | "z"; sign: number }> = {
  ArrowRight: { axis: "x", sign: 1 },
  ArrowLeft: { axis: "x", sign: -1 },
  ArrowUp: { axis: "y", sign: 1 },
  ArrowDown: { axis: "y", sign: -1 },
  PageUp: { axis: "z", sign: 1 },
  PageDown: { axis: "z", sign: -1 },
};

function stepFor(axis: "x" | "y" | "z"): number {
  if (axis === "x") return xConfig.value?.step ?? 1;
  if (axis === "y") return yConfig.value?.step ?? 1;
  return zConfig.value?.step ?? 1;
}

function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled)
    return;

  if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    setChannelValues({ x: event.key === "Home" ? xMin.value : xMax.value }, { commit: true });
    return;
  }

  const spec = STEP_KEY_AXES[event.key];
  if (!spec)
    return;
  if (spec.axis === "z" && !isThreeChannel.value)
    return;

  event.preventDefault();
  const multiplier = event.shiftKey ? 10 : 1;
  const delta = stepFor(spec.axis) * spec.sign * multiplier;
  const current = spec.axis === "x"
    ? currentXValue.value
    : spec.axis === "y" ? currentYValue.value : currentZValue.value;

  setChannelValues({ [spec.axis]: current + delta }, { commit: true });
}
```

`setChannelValues(partial, { commit })` is the existing update path in this file — reuse whatever it is currently called there; it must snap each supplied axis with `snapToStep`, clamp barycentric coordinates back inside the triangle exactly as the current 2-channel handler does with `u + w <= 1`, write `colorRef`, and emit `update:modelValue` + `update:color` + `change`, plus `changeEnd` when `commit` is true. If no such single function exists yet, extract one from the current handlers before deleting them.

The hardcoded `step = 0.05` and the ×4 shift multiplier both disappear here: `stepFor` reads each channel's configured step and the multiplier is ×10, matching every other component.

Bind `handleKeyDown` on the root `Primitive`'s `@keydown`.

- [ ] **Step 5: Fold the sub-thumbs into `ColorTriangleThumb`**

Keep the existing `thumbPosition` computed in `ColorTriangleThumb.vue` verbatim. Add to the script:

```ts
import { channelLabel, formatChannelValue } from "../../shared/channel-labels";

const space = computed(() => rootContext.colorSpace.value);
const labels = computed(() => {
  const base = [
    channelLabel(space.value, rootContext.xChannelKey.value),
    channelLabel(space.value, rootContext.yChannelKey.value),
  ];
  if (rootContext.isThreeChannel.value)
    base.push(channelLabel(space.value, rootContext.zChannelKey.value));
  return base;
});
const ariaLabel = computed(() => labels.value.join(", "));
const ariaValueText = computed(() => {
  const parts = [
    `${labels.value[0]} ${formatChannelValue(space.value, rootContext.xChannelKey.value, rootContext.currentXValue.value)}`,
    `${labels.value[1]} ${formatChannelValue(space.value, rootContext.yChannelKey.value, rootContext.currentYValue.value)}`,
  ];
  if (rootContext.isThreeChannel.value)
    parts.push(`${labels.value[2]} ${formatChannelValue(space.value, rootContext.zChannelKey.value, rootContext.currentZValue.value)}`);
  return parts.join(", ");
});
```

Replace the template's `Primitive` attributes — drop `aria-roledescription="2D slider"` and the three sub-thumb elements, and add:

```
    role="slider"
    :tabindex="rootContext.disabled.value ? undefined : 0"
    :aria-label="($attrs['aria-label'] as string) || ariaLabel"
    :aria-valuenow="rootContext.currentXValue.value"
    :aria-valuemin="rootContext.xMin.value"
    :aria-valuemax="rootContext.xMax.value"
    :aria-valuetext="ariaValueText"
    aria-roledescription="Color thumb"
    :aria-disabled="rootContext.disabled.value || undefined"
```

The children become just `<slot />`.

- [ ] **Step 6: Delete the sub-thumbs and their exports**

```bash
git rm packages/vue/src/components/ColorTriangle/ColorTriangleThumbX.vue \
       packages/vue/src/components/ColorTriangle/ColorTriangleThumbY.vue \
       packages/vue/src/components/ColorTriangle/ColorTriangleThumbZ.vue
```

Remove their export lines from `packages/vue/src/components/ColorTriangle/index.ts`.

- [ ] **Step 7: Run the tests**

Run: `bun test packages/vue/test/ColorTriangle.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A packages/vue/src/components/ColorTriangle packages/vue/test/ColorTriangle.test.ts
git commit -m "feat(vue)!: give ColorTriangle a single thumb and fix its key map

BREAKING CHANGE: ColorTriangleThumbX/Y/Z are removed, channelX/Y/Z are
renamed xChannel/yChannel/zChannel, valueCommit becomes changeEnd, and
the arrow keys swap axes to match ColorArea.

Three-channel mode previously exposed three stacked tabindex=0 elements
covering the same 100% x 100% box. The key map also drove X with the
vertical arrows, duplicated PageUp/PageDown on Home/End, ignored the
configured channel step in favour of a hardcoded 0.05, and used a x4
shift multiplier where every sibling used x10."
```

---

## Task 8: ColorRing thumb — label it and honour disabled

**Files:**
- Modify: `packages/vue/src/components/ColorRing/ColorRingThumb.vue`, `ColorRingRoot.vue`
- Test: `packages/vue/test/ColorRing.test.ts` (new file)

**Interfaces:**
- Consumes: `channelLabel` / `formatChannelValue` (Task 5), `snapToStep` / `cyclicWrap` (Task 1).
- Produces: `ColorRingRootEmits` becomes the standard four.

- [ ] **Step 1: Write the failing test**

Create `packages/vue/test/ColorRing.test.ts`:

```ts
import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "bun:test";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { ColorRingRoot, ColorRingThumb, ColorRingTrack } from "../src/components/ColorRing";

const ColorRing = defineComponent({
  props: { disabled: { type: Boolean, default: false } },
  emits: ["update:modelValue", "change", "changeEnd"],
  setup(props, { emit }) {
    return () =>
      h(ColorRingRoot, {
        "defaultValue": "hsl(180, 50%, 50%)",
        "colorSpace": "hsl",
        "channel": "h",
        "disabled": props.disabled,
        "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
        "onChange": (v: Color) => emit("change", v),
        "onChangeEnd": (v: Color) => emit("changeEnd", v),
      }, { default: () => h(ColorRingTrack, null, { default: () => h(ColorRingThumb) }) });
  },
});

describe("given default ColorRing", () => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockImplementation(id => id);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();

  let wrapper: VueWrapper;

  beforeEach(() => {
    document.body.innerHTML = "";
    wrapper = mount(ColorRing, { attachTo: document.body });
  });

  it("should label the thumb with the channel name", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("aria-label")).toBe("Hue");
    expect(thumb.attributes("aria-valuetext")).toBe("180°");
  });

  it("should be tabbable when enabled", () => {
    expect(wrapper.find("[role=\"slider\"]").attributes("tabindex")).toBe("0");
  });

  describe("when disabled", () => {
    beforeEach(async () => {
      await wrapper.setProps({ disabled: true });
    });

    it("should drop out of the tab order", () => {
      expect(wrapper.find("[role=\"slider\"]").attributes("tabindex")).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `bun test packages/vue/test/ColorRing.test.ts`
Expected: FAIL — no `aria-label`, and `tabindex` stays `"0"` when disabled.

- [ ] **Step 3: Fix the thumb**

In `ColorRingThumb.vue`, add to the script:

```ts
import { channelLabel, formatChannelValue } from "../../shared/channel-labels";

const label = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.channelKey.value));
const ariaValueText = computed(() => formatChannelValue(rootContext.colorSpace.value, rootContext.channelKey.value, rootContext.currentValue.value));
```

In the template, replace `tabindex="0"` with `:tabindex="rootContext.disabled.value ? undefined : 0"`, replace `:aria-disabled="rootContext.disabled.value"` with `:aria-disabled="rootContext.disabled.value || undefined"`, and add:

```
    :aria-label="($attrs['aria-label'] as string) || label"
    :aria-valuetext="ariaValueText"
```

- [ ] **Step 4: Standardise the root emits**

In `ColorRingRoot.vue`, replace the emits type with the standard four and update the call sites: `change` on every value set, `changeEnd` where `valueCommit` fired. Delete the local `snap` helper and the inline cyclic-wrap expression, importing `snapToStep` and `cyclicWrap` from `../../shared/utils`. On the root `Primitive`, change `:aria-disabled="disabled"` to `:aria-disabled="disabled || undefined"`.

- [ ] **Step 5: Run the tests**

Run: `bun test packages/vue/test/ColorRing.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/vue/src/components/ColorRing packages/vue/test/ColorRing.test.ts
git commit -m "fix(vue): label the ColorRing thumb and honour disabled

BREAKING CHANGE: valueCommit becomes changeEnd.

tabindex was hardcoded to 0, so a disabled ring stayed in the tab order,
and the slider had no accessible name at all."
```

---

## Task 9: ColorSlider root — add the missing props and widen the context

`ColorSliderRoot` is the only root that does not extend `PrimitiveProps`, so it cannot be retagged or used with `asChild`. It also has no form input, no `defaultValue`, no slot props, and its context is too thin for `ColorSliderGradient` to skip redraws mid-drag — which is why that gradient is the only one repainting on every drag frame.

**Files:**
- Modify: `packages/vue/src/components/ColorSlider/ColorSliderRoot.vue`
- Test: `packages/vue/test/ColorSlider.test.ts` (new file)

**Interfaces:**
- Consumes: `useFormControl` from `shared/utils` (Task 1).
- Produces:
  ```ts
  export interface ColorSliderRootProps {
    as?: string;
    asChild?: boolean;
    modelValue?: Color | string | null;
    defaultValue?: Color | string;
    colorSpace?: SpaceId;
    channel?: string;
    disabled?: boolean;
    dir?: "ltr" | "rtl";
    inverted?: boolean;
    orientation?: "horizontal" | "vertical";
    step?: number;
    name?: string;
    required?: boolean;
  }
  export interface ColorSliderRootContext {
    colorRef: Ref<Color | undefined>;
    channel: Ref<string>;
    colorSpace: Ref<SpaceId>;
    orientation: Ref<"horizontal" | "vertical">;
    inverted: Ref<boolean>;
    disabled: Ref<boolean>;
    min: Ref<number>;
    max: Ref<number>;
    step: Ref<number>;
    channelValue: Ref<number>;
    isDragging: Ref<boolean>;
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `packages/vue/test/ColorSlider.test.ts`:

```ts
import type { VueWrapper } from "@vue/test-utils";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "bun:test";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { ColorSliderRoot, ColorSliderThumb, ColorSliderTrack } from "../src/components/ColorSlider";

const ColorSlider = defineComponent({
  props: { disabled: { type: Boolean, default: false } },
  emits: ["update:modelValue", "change", "changeEnd"],
  setup(props, { emit }) {
    return () =>
      h(ColorSliderRoot, {
        "defaultValue": "hsl(180, 50%, 50%)",
        "colorSpace": "hsl",
        "channel": "h",
        "name": "hue",
        "disabled": props.disabled,
        "onUpdate:modelValue": (v: Color | undefined) => emit("update:modelValue", v),
        "onChange": (v: Color) => emit("change", v),
        "onChangeEnd": (v: Color) => emit("changeEnd", v),
      }, { default: () => h(ColorSliderTrack, null, { default: () => h(ColorSliderThumb) }) });
  },
});

describe("given default ColorSlider", () => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockImplementation(id => id);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();

  let wrapper: VueWrapper;

  beforeEach(() => {
    document.body.innerHTML = "";
    wrapper = mount(ColorSlider, { attachTo: document.body });
  });

  it("should seed from defaultValue when uncontrolled", () => {
    expect(wrapper.find("[role=\"slider\"]").attributes("aria-valuenow")).toBe("180");
  });

  it("should emit change and changeEnd on a keyboard step", async () => {
    await wrapper.find("[role=\"slider\"]").trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("change")).toBeTruthy();
    expect(wrapper.emitted("changeEnd")).toBeTruthy();
  });
});

describe("given a ColorSlider in a form", () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    document.body.innerHTML = "";
    wrapper = mount(defineComponent({
      setup() {
        return () => h("form", [h(ColorSlider)]);
      },
    }), { attachTo: document.body });
  });

  it("should render a hidden input", () => {
    expect(wrapper.find("input[name=\"hue\"]").exists()).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `bun test packages/vue/test/ColorSlider.test.ts`
Expected: FAIL — `defaultValue` is ignored so `aria-valuenow` is `210` from `DEFAULT_COLOR`, the thumb has no `aria-label`, and no hidden input exists.

- [ ] **Step 3: Extend the props**

In `ColorSliderRoot.vue`, replace the props interface with the one from **Interfaces** above, and the defaults with:

```ts
const props = withDefaults(defineProps<ColorSliderRootProps>(), {
  as: "span",
  colorSpace: "hsl",
  channel: "h",
  disabled: false,
  defaultValue: "hsl(0, 100%, 50%)",
});
```

Delete the module-level `DEFAULT_COLOR` constant and seed from the prop instead:

```ts
const colorRef = shallowRef<Color | undefined>(parseColor(props.modelValue ?? props.defaultValue));
```

- [ ] **Step 4: Standardise the emits and widen the context**

Replace `ColorSliderRootEmits` with the standard four. In the `internalValue` setter, emit `update:modelValue`, `update:color` and `change`; keep the `SliderRoot` `@value-commit` handler but have it emit `changeEnd`.

Add the new context members:

```ts
const isDragging = ref(false);
const min = computed(() => channelConfig.value?.min ?? 0);
const max = computed(() => channelConfig.value?.max ?? 100);
const step = computed(() => props.step ?? channelConfig.value?.step ?? 1);
const channelValue = computed(() => internalValue.value[0] ?? min.value);

provideColorSliderRootContext({
  colorRef,
  channel: toRef(props, "channel"),
  colorSpace: toRef(props, "colorSpace"),
  orientation: orientationRef,
  inverted: invertedRef,
  disabled: toRef(props, "disabled"),
  min,
  max,
  step,
  channelValue,
  isDragging,
});
```

Bind `min`, `max` and `step` on `SliderRoot` instead of reading `channelConfig` inline, and set `isDragging` from `SliderRoot`'s pointer lifecycle: `@pointerdown="isDragging = true"` and `@pointerup="isDragging = false"` on the `SliderRoot`.

- [ ] **Step 5: Add the hidden form input and slot props**

Add to the script:

```ts
const { forwardRef, currentElement } = useForwardExpose();
const isFormControl = useFormControl(currentElement);

defineSlots<{
  default?: (props: { modelValue: Color | undefined }) => any;
}>();
```

Wrap the slot and input in the template:

```vue
  <SliderRoot
    ...
  >
    <slot :model-value="colorRef" />

    <VisuallyHidden
      v-if="isFormControl && name"
      as="input"
      type="hidden"
      :value="colorRef?.toString() ?? ''"
      :name="name"
      :required="required"
      :disabled="disabled"
    />
  </SliderRoot>
```

Import `VisuallyHidden` from `reka-ui` and `useFormControl` from `../../shared/utils`.

- [ ] **Step 6: Run the tests**

Run: `bun test packages/vue/test/ColorSlider.test.ts`
Expected: PASS. The thumb's `aria-label` is Task 10's concern and its test lands there.

- [ ] **Step 7: Commit**

```bash
git add packages/vue/src/components/ColorSlider/ColorSliderRoot.vue packages/vue/test/ColorSlider.test.ts
git commit -m "feat(vue)!: fill in the missing ColorSliderRoot API

BREAKING CHANGE: valueCommit becomes changeEnd.

The root was the only one not extending PrimitiveProps, so it could not
be retagged or used with asChild, and it had no defaultValue, no form
input and no slot props. The context also lacked isDragging, which is
why ColorSliderGradient was the only gradient repainting on every drag
frame."
```

---

## Task 10: ColorSlider thumb and gradient

**Files:**
- Modify: `packages/vue/src/components/ColorSlider/ColorSliderThumb.vue`, `ColorSliderGradient.vue`
- Test: `packages/vue/test/ColorSlider.test.ts`

**Interfaces:**
- Consumes: the widened context from Task 9, `channelLabel` / `formatChannelValue` from Task 5.
- Produces: `ColorSliderThumb` slot props `{ channelName: string; channelValue: number }`.

- [ ] **Step 1: Write the failing test**

Add to `packages/vue/test/ColorSlider.test.ts`, inside `describe("given default ColorSlider", ...)`:

```ts
  it("should label the thumb with the channel name", () => {
    const thumb = wrapper.find("[role=\"slider\"]");
    expect(thumb.attributes("aria-label")).toBe("Hue");
    expect(thumb.attributes("aria-valuetext")).toBe("180°");
  });
```

Run: `bun test packages/vue/test/ColorSlider.test.ts`
Expected: FAIL — the thumb has no `aria-label`.

- [ ] **Step 2: Label the thumb**

Replace `packages/vue/src/components/ColorSlider/ColorSliderThumb.vue`'s script and template body with:

```vue
<script setup lang="ts">
import { computed } from "vue";
import { SliderThumb } from "reka-ui";
import { channelLabel, formatChannelValue } from "../../shared/channel-labels";
import { injectColorSliderRootContext } from "./ColorSliderRoot.vue";

withDefaults(defineProps<ColorSliderThumbProps>(), { as: "span" });

const rootContext = injectColorSliderRootContext();

const channelName = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.channel.value));
const channelValue = computed(() => rootContext.channelValue.value);
const ariaValueText = computed(() => formatChannelValue(rootContext.colorSpace.value, rootContext.channel.value, channelValue.value));

defineSlots<{
  default?: (props: { channelName: string; channelValue: number }) => any;
}>();
</script>

<template>
  <SliderThumb
    :as="as"
    :as-child="asChild"
    :aria-label="($attrs['aria-label'] as string) || channelName"
    :aria-valuetext="ariaValueText"
  >
    <slot :channel-name="channelName" :channel-value="channelValue" />
  </SliderThumb>
</template>
```

Keep the existing `ColorSliderThumbProps` interface block at the top of the file unchanged.

- [ ] **Step 3: Gate the gradient on drag**

In `ColorSliderGradient.vue`, mirror what the other gradients already do. Add to the script:

```ts
watch(() => rootContext.isDragging.value, (dragging, wasDragging) => {
  if (wasDragging && !dragging)
    render();
});
```

and guard the existing value watch so it skips while dragging:

```ts
watch(sources, () => {
  if (!rootContext.isDragging.value)
    render();
}, { immediate: true });
```

`sources` is whatever the current watch already tracks in this file — do not change what it observes, only when it fires.

- [ ] **Step 4: Run the tests**

Run: `bun test packages/vue/test/ColorSlider.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/vue/src/components/ColorSlider packages/vue/test/ColorSlider.test.ts
git commit -m "feat(vue): name the ColorSlider thumb and skip gradient redraws mid-drag"
```

---

## Task 11: ColorField — props, spinbutton range, wheel and input filtering

**Files:**
- Modify: `packages/vue/src/components/ColorField/ColorFieldRoot.vue`, `ColorFieldInput.vue`
- Test: `packages/vue/test/ColorField.test.ts`

**Interfaces:**
- Consumes: `channelLabel` / `formatChannelValue` (Task 5).
- Produces: `ColorFieldRootProps` gains `placeholder?: string`, `disableWheelChange?: boolean`, `locale?: string`, `defaultValue?: Color | string`; `readOnly` is renamed `readonly`. `ColorFieldRootContext` gains `placeholder: Ref<string | undefined>`, `disableWheelChange: Ref<boolean>`, `handleWheel: (event: WheelEvent) => void`, and renames `readOnly` → `readonly`.

- [ ] **Step 1: Write the failing test**

Append to `packages/vue/test/ColorField.test.ts` (adapt the existing harness in that file to pass `channel: "h"`, `colorSpace: "hsl"`):

```ts
describe("ColorFieldInput accessibility and input handling", () => {
  it("should announce the channel range on the spinbutton", () => {
    const input = wrapper.find("[role=\"spinbutton\"]");
    expect(input.attributes("aria-valuemin")).toBe("0");
    expect(input.attributes("aria-valuemax")).toBe("360");
  });

  it("should name the spinbutton after its channel", () => {
    expect(wrapper.find("[role=\"spinbutton\"]").attributes("aria-label")).toBe("Hue");
  });

  it("should use a numeric inputmode for numeric channels", () => {
    expect(wrapper.find("[role=\"spinbutton\"]").attributes("inputmode")).toBe("numeric");
  });

  it("should increment on wheel up when focused", async () => {
    const input = wrapper.find("input");
    await input.trigger("focus");
    await input.trigger("wheel", { deltaY: -1 });
    expect(wrapper.emitted("update:modelValue")).toBeTruthy();
  });

  it("should ignore the wheel when disableWheelChange is set", async () => {
    const local = mountField({ disableWheelChange: true });
    const input = local.find("input");
    await input.trigger("focus");
    await input.trigger("wheel", { deltaY: -1 });
    expect(local.emitted("update:modelValue")).toBeFalsy();
  });
});
```

`mountField(props)` is a small factory to add near the top of the file, mounting the existing field harness with extra props merged in.

- [ ] **Step 2: Run it to make sure it fails**

Run: `bun test packages/vue/test/ColorField.test.ts`
Expected: FAIL — `aria-valuemin` is absent, `inputmode` is `"text"`, no wheel handling.

- [ ] **Step 3: Extend the root**

In `ColorFieldRoot.vue`: add the four new props (`placeholder`, `disableWheelChange` defaulting to `false`, `locale`, `defaultValue` defaulting to `"hsl(0, 100%, 50%)"`), rename `readOnly` to `readonly` throughout (prop, context field, template `data-readonly`), add `role="group"` to the root `Primitive`, and add `update:color` to the emits alongside the existing ones.

Add the wheel handler to the context:

```ts
function handleWheel(event: WheelEvent) {
  if (props.disableWheelChange || props.disabled || props.readonly)
    return;
  event.preventDefault();
  if (event.deltaY > 0)
    handleDecrease();
  else
    handleIncrease();
}
```

Provide `placeholder`, `disableWheelChange` and `handleWheel` on the context. The context is also missing four members `ColorFieldInput` needs in Step 4 — add them:

```ts
  channel: toRef(props, "channel"),
  colorSpace: toRef(props, "colorSpace"),
  min: effectiveMin,
  max: effectiveMax,
```

`effectiveMin` / `effectiveMax` are the computeds this root already derives from the channel config; they were simply never exposed.

- [ ] **Step 4: Fix the input**

In `ColorFieldInput.vue`, delete the dead `const parsed = ...` line in `onBlur`. Add to the script:

```ts
import { channelLabel } from "../../shared/channel-labels";

const isFocused = ref(false);
const channelName = computed(() => channelLabel(rootContext.colorSpace.value, rootContext.channel.value));

function onWheel(event: WheelEvent) {
  if (!isFocused.value)
    return;
  rootContext.handleWheel(event);
}

function onBeforeInput(event: InputEvent) {
  if (rootContext.format.value === "hex")
    return;
  if (event.data && /[^\d.-]/.test(event.data)) {
    event.preventDefault();
    return;
  }
  const target = event.target as HTMLInputElement;
  const next = target.value.slice(0, target.selectionStart ?? 0) + (event.data ?? "") + target.value.slice(target.selectionEnd ?? 0);
  if (next === "" || next === "-" || next === "." || next === "-.")
    return;
  if (Number.isNaN(Number(next)))
    event.preventDefault();
}
```

Set `isFocused` in `onFocus` (`isFocused.value = true`) and `onBlur` (`isFocused.value = false`).

In the template, replace the two hardcoded `undefined` range bindings and the fixed `inputmode`:

```
    :aria-valuemin="rootContext.min.value"
    :aria-valuemax="rootContext.max.value"
    :aria-valuetext="rootContext.displayValue.value"
    :aria-label="($attrs['aria-label'] as string) || channelName"
    :placeholder="rootContext.placeholder.value"
    :inputmode="rootContext.format.value === 'hex' ? 'text' : 'numeric'"
    :readonly="rootContext.readonly.value || undefined"
    :data-readonly="rootContext.readonly.value ? '' : undefined"
    @wheel="onWheel"
    @beforeinput="onBeforeInput"
```

`rootContext.min` / `rootContext.max` must be added to `ColorFieldRootContext` in Step 3 if they are not already provided — the root already computes `effectiveMin` / `effectiveMax`; expose those under the names `min` and `max`.

Rename every `rootContext.readOnly` reference in this file to `rootContext.readonly`.

- [ ] **Step 5: Run the tests**

Run: `bun test packages/vue/test/ColorField.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/vue/src/components/ColorField packages/vue/test/ColorField.test.ts
git commit -m "feat(vue)!: complete the ColorField API and fix its spinbutton

BREAKING CHANGE: the readOnly prop is renamed readonly.

aria-valuemin and aria-valuemax were bound to a literal undefined even
though the root computed the range, leaving a spinbutton with no
announced bounds and no accessible name. Adds placeholder, locale,
disableWheelChange, wheel stepping and numeric input filtering."
```

---

## Task 12: ColorSwatch — give it an accessible name

**Files:**
- Modify: `packages/vue/src/components/ColorSwatch/ColorSwatchRoot.vue`
- Test: `packages/vue/test/ColorSwatch.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `ColorSwatchRootProps` gains `label?: string`. Slot props `{ color: string; alpha: number }`. New attributes `aria-roledescription="color swatch"`, `data-no-color`.

- [ ] **Step 1: Write the failing test**

Append to `packages/vue/test/ColorSwatch.test.ts`:

```ts
describe("ColorSwatch accessible name", () => {
  it("should use the label prop when given", () => {
    const wrapper = mount(ColorSwatchRoot, { props: { modelValue: "#ff0000", label: "Brand red" } });
    expect(wrapper.attributes("aria-label")).toBe("Brand red");
    expect(wrapper.attributes("aria-roledescription")).toBe("color swatch");
  });

  it("should fall back to the colour string", () => {
    const wrapper = mount(ColorSwatchRoot, { props: { modelValue: "#ff0000" } });
    expect(wrapper.attributes("aria-label")).toBeTruthy();
  });

  it("should mark an empty swatch with data-no-color", () => {
    const wrapper = mount(ColorSwatchRoot);
    expect(wrapper.attributes("data-no-color")).toBe("");
    expect(wrapper.attributes("aria-label")).toBe("transparent");
  });

  it("should expose colour and alpha to the slot", () => {
    const wrapper = mount(ColorSwatchRoot, {
      props: { modelValue: "rgb(255 0 0 / 0.5)", alpha: true },
      slots: { default: "<template #default=\"{ alpha }\"><span>{{ alpha }}</span></template>" },
    });
    expect(wrapper.text()).toBe("0.5");
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `bun test packages/vue/test/ColorSwatch.test.ts`
Expected: FAIL — no `aria-label`, no `data-no-color`, no slot props.

- [ ] **Step 3: Implement**

In `ColorSwatchRoot.vue`, add `label?: string` to the props interface, then add to the script:

```ts
const hasColor = computed(() => Boolean(color.value) && alphaValue.value > 0);
const accessibleName = computed(() => props.label ?? (hasColor.value ? colorString.value : "transparent"));

defineSlots<{
  default?: (props: { color: string; alpha: number }) => any;
}>();
```

In the template:

```vue
  <Primitive
    :ref="forwardRef"
    :as="as"
    :as-child="asChild"
    role="img"
    :aria-label="accessibleName"
    aria-roledescription="color swatch"
    :data-no-color="hasColor ? undefined : ''"
    :style="swatchStyle"
  >
    <slot :color="colorString" :alpha="alphaValue" />
  </Primitive>
```

- [ ] **Step 4: Run the tests**

Run: `bun test packages/vue/test/ColorSwatch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/vue/src/components/ColorSwatch packages/vue/test/ColorSwatch.test.ts
git commit -m "fix(vue): give ColorSwatch an accessible name

role=img with no name announces as an unnamed image. Adds a label prop
with a colour-string fallback, plus the data-no-color hook and slot
props reka exposes."
```

---

## Task 13: Replace ColorSwatchGroup with ColorSwatchPicker

The current group hand-rolls `role="group"` where `radiogroup` is correct, sets `aria-pressed` alongside `aria-checked` (invalid on `radio` and `checkbox` roles), leaves items unnamed, and duplicates its whole template across the `rovingFocus` branches. Listbox already solves all of it.

**Files:**
- Create: `packages/vue/src/components/ColorSwatchPicker/ColorSwatchPickerRoot.vue`, `ColorSwatchPickerItem.vue`, `ColorSwatchPickerItemSwatch.vue`, `ColorSwatchPickerItemIndicator.vue`, `index.ts`
- Delete: `packages/vue/src/components/ColorSwatchGroup/` (whole directory)
- Modify: `packages/vue/src/index.ts`, `packages/vue/src/namespaced/index.ts`
- Test: `packages/vue/test/ColorSwatchPicker.test.ts` (new file)

**Interfaces:**
- Consumes: `ColorSwatchRoot` (Task 12).
- Produces:
  ```ts
  export interface ColorSwatchPickerRootProps extends Omit<ListboxRootProps, "by"> {
    modelValue?: string | string[];
    defaultValue?: string | string[];
  }
  export type ColorSwatchPickerRootEmits = ListboxRootEmits;
  export interface ColorSwatchPickerItemProps extends ListboxItemProps { value: string }
  export const [injectColorSwatchPickerItemContext, provideColorSwatchPickerItemContext]
    = createContext<{ color: Ref<string> }>("ColorSwatchPickerItem");
  ```

- [ ] **Step 1: Write the failing test**

Create `packages/vue/test/ColorSwatchPicker.test.ts`:

```ts
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "bun:test";
import { defineComponent, h } from "vue";
import {
  ColorSwatchPickerItem,
  ColorSwatchPickerItemSwatch,
  ColorSwatchPickerRoot,
} from "../src/components/ColorSwatchPicker";

const COLORS = ["#ff0000", "#00ff00", "#0000ff"];

function makePicker(rootProps: Record<string, unknown> = {}) {
  return defineComponent({
    emits: ["update:modelValue"],
    setup(_, { emit }) {
      return () =>
        h(ColorSwatchPickerRoot, {
          "onUpdate:modelValue": (v: unknown) => emit("update:modelValue", v),
          ...rootProps,
        }, {
          default: () => COLORS.map(c =>
            h(ColorSwatchPickerItem, { value: c }, { default: () => h(ColorSwatchPickerItemSwatch) })),
        });
    },
  });
}

describe("ColorSwatchPicker", () => {
  it("should expose a listbox with one option per swatch", () => {
    const wrapper = mount(makePicker(), { attachTo: document.body });
    expect(wrapper.find("[role=\"listbox\"]").exists()).toBe(true);
    expect(wrapper.findAll("[role=\"option\"]")).toHaveLength(3);
  });

  it("should name each option after its colour", () => {
    const wrapper = mount(makePicker(), { attachTo: document.body });
    const first = wrapper.findAll("[role=\"option\"]")[0]!;
    expect(first.attributes("aria-label")).toBeTruthy();
    expect(first.attributes("data-color")).toBe("#ff0000");
  });

  it("should select a swatch on click", async () => {
    const wrapper = mount(makePicker(), { attachTo: document.body });
    await wrapper.findAll("[role=\"option\"]")[1]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.[0]?.[0]).toBe("#00ff00");
  });

  it("should collect several values when multiple is set", async () => {
    const wrapper = mount(makePicker({ multiple: true }), { attachTo: document.body });
    const options = wrapper.findAll("[role=\"option\"]");
    await options[0]!.trigger("click");
    await options[2]!.trigger("click");
    const last = wrapper.emitted("update:modelValue")?.at(-1)?.[0] as string[];
    expect(last).toEqual(["#ff0000", "#0000ff"]);
  });

  it("should mark the selected option with aria-selected", async () => {
    const wrapper = mount(makePicker({ defaultValue: "#00ff00" }), { attachTo: document.body });
    const options = wrapper.findAll("[role=\"option\"]");
    expect(options[1]!.attributes("aria-selected")).toBe("true");
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `bun test packages/vue/test/ColorSwatchPicker.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 3: Create the root**

Create `packages/vue/src/components/ColorSwatchPicker/ColorSwatchPickerRoot.vue`:

```vue
<script lang="ts">
import type { ListboxRootEmits, ListboxRootProps } from "reka-ui";

export interface ColorSwatchPickerRootProps extends /* @vue-ignore */ Omit<ListboxRootProps, "by"> {
  as?: string;
  asChild?: boolean;
  /** The selected colour, or colours when `multiple` is set. */
  modelValue?: string | string[];
  /** The initially selected colour(s) when uncontrolled. */
  defaultValue?: string | string[];
  /** Allow selecting more than one swatch. */
  multiple?: boolean;
  disabled?: boolean;
  loop?: boolean;
  orientation?: "horizontal" | "vertical";
  dir?: "ltr" | "rtl";
}

export type ColorSwatchPickerRootEmits = ListboxRootEmits;
</script>

<script setup lang="ts">
import { computed } from "vue";
import { ListboxContent, ListboxRoot, useForwardExpose, useVModel } from "reka-ui";

const props = withDefaults(defineProps<ColorSwatchPickerRootProps>(), {
  as: "div",
  disabled: false,
  loop: false,
  orientation: "horizontal",
  dir: "ltr",
});
const emits = defineEmits<ColorSwatchPickerRootEmits>();

useForwardExpose();

const modelValue = useVModel(props, "modelValue", emits as any, {
  defaultValue: props.defaultValue ?? (props.multiple ? [] : ""),
  passive: (props.modelValue === undefined) as false,
});

defineSlots<{
  default?: (props: { modelValue: string | string[] | undefined }) => any;
}>();

const listboxProps = computed(() => ({
  multiple: props.multiple,
  disabled: props.disabled,
  loop: props.loop,
  orientation: props.orientation,
  dir: props.dir,
}));
</script>

<template>
  <ListboxRoot
    v-bind="listboxProps"
    v-model="modelValue"
    as-child
  >
    <ListboxContent :as="as" :as-child="asChild">
      <slot :model-value="modelValue" />
    </ListboxContent>
  </ListboxRoot>
</template>
```

- [ ] **Step 4: Create the item, swatch and indicator**

`ColorSwatchPickerItem.vue`:

```vue
<script lang="ts">
import type { Ref } from "vue";
import type { ListboxItemProps } from "reka-ui";
import { createContext } from "reka-ui";

export interface ColorSwatchPickerItemProps extends /* @vue-ignore */ ListboxItemProps {
  as?: string;
  asChild?: boolean;
  /** The colour this swatch represents, as a CSS colour string. */
  value: string;
  disabled?: boolean;
}

export const [injectColorSwatchPickerItemContext, provideColorSwatchPickerItemContext]
  = createContext<{ color: Ref<string> }>("ColorSwatchPickerItem");
</script>

<script setup lang="ts">
import { computed, toRef } from "vue";
import { ListboxItem, useForwardExpose } from "reka-ui";
import { Color } from "@urcolor/core";

const props = withDefaults(defineProps<ColorSwatchPickerItemProps>(), {
  as: "div",
  disabled: false,
});

useForwardExpose();

provideColorSwatchPickerItemContext({ color: toRef(props, "value") });

const accessibleName = computed(() => {
  const parsed = Color.parse(props.value);
  return parsed ? parsed.toString() : props.value;
});
</script>

<template>
  <ListboxItem
    :value="value"
    :disabled="disabled"
    :as="as"
    :as-child="asChild"
    :aria-label="accessibleName"
    :data-color="value"
    :style="{ ['--urcolor-swatch-picker-item-color' as any]: value }"
  >
    <slot />
  </ListboxItem>
</template>
```

`ColorSwatchPickerItemSwatch.vue`:

```vue
<script lang="ts">
import type { ColorSwatchRootProps } from "../ColorSwatch/ColorSwatchRoot.vue";

export interface ColorSwatchPickerItemSwatchProps extends Omit<ColorSwatchRootProps, "modelValue"> {}
</script>

<script setup lang="ts">
import ColorSwatchRoot from "../ColorSwatch/ColorSwatchRoot.vue";
import { injectColorSwatchPickerItemContext } from "./ColorSwatchPickerItem.vue";

const props = withDefaults(defineProps<ColorSwatchPickerItemSwatchProps>(), {
  as: "div",
});

const itemContext = injectColorSwatchPickerItemContext();
</script>

<template>
  <ColorSwatchRoot v-bind="props" :model-value="itemContext.color.value">
    <slot />
  </ColorSwatchRoot>
</template>
```

`ColorSwatchPickerItemIndicator.vue`:

```vue
<script lang="ts">
import type { ListboxItemIndicatorProps } from "reka-ui";

export interface ColorSwatchPickerItemIndicatorProps extends /* @vue-ignore */ ListboxItemIndicatorProps {
  as?: string;
  asChild?: boolean;
}
</script>

<script setup lang="ts">
import { ListboxItemIndicator } from "reka-ui";

const props = withDefaults(defineProps<ColorSwatchPickerItemIndicatorProps>(), {
  as: "span",
});
</script>

<template>
  <ListboxItemIndicator v-bind="props">
    <slot />
  </ListboxItemIndicator>
</template>
```

`index.ts`:

```ts
export { default as ColorSwatchPickerRoot } from "./ColorSwatchPickerRoot.vue";
export type { ColorSwatchPickerRootEmits, ColorSwatchPickerRootProps } from "./ColorSwatchPickerRoot.vue";
export { default as ColorSwatchPickerItem, injectColorSwatchPickerItemContext } from "./ColorSwatchPickerItem.vue";
export type { ColorSwatchPickerItemProps } from "./ColorSwatchPickerItem.vue";
export { default as ColorSwatchPickerItemSwatch } from "./ColorSwatchPickerItemSwatch.vue";
export type { ColorSwatchPickerItemSwatchProps } from "./ColorSwatchPickerItemSwatch.vue";
export { default as ColorSwatchPickerItemIndicator } from "./ColorSwatchPickerItemIndicator.vue";
export type { ColorSwatchPickerItemIndicatorProps } from "./ColorSwatchPickerItemIndicator.vue";
```

- [ ] **Step 5: Delete the old group and repoint the barrels**

```bash
git rm -r packages/vue/src/components/ColorSwatchGroup
rm -f packages/vue/test/ColorSwatchGroup.test.ts
```

In `packages/vue/src/index.ts`, replace:

```ts
export * from "./components/ColorSwatchGroup";
```

with:

```ts
export * from "./components/ColorSwatchPicker";
```

Apply the equivalent change in `packages/vue/src/namespaced/index.ts` — read that file first and follow its existing namespacing convention.

- [ ] **Step 6: Run the tests**

Run: `bun test packages/vue/test/ColorSwatchPicker.test.ts`
Expected: PASS.

- [ ] **Step 7: Full suite and typecheck**

Run: `bun test && bun run lint`
Expected: PASS. Storybook stories still referencing `ColorSwatchGroup` will fail the typecheck — delete `packages/vue/src/components/ColorSwatchGroup.stories.ts` if it survived the directory removal, and add a `ColorSwatchPicker.stories.ts` mirroring the shape of the neighbouring story files.

- [ ] **Step 8: Commit**

```bash
git add -A packages/vue/src packages/vue/test
git commit -m "feat(vue)!: replace ColorSwatchGroup with ColorSwatchPicker

BREAKING CHANGE: ColorSwatchGroupRoot and ColorSwatchGroupItem are
removed in favour of ColorSwatchPickerRoot, ColorSwatchPickerItem,
ColorSwatchPickerItemSwatch and ColorSwatchPickerItemIndicator.

The old group set aria-pressed alongside aria-checked, which is invalid
on radio and checkbox roles, used role=group where radiogroup was
correct for single selection, and left every item unnamed. Building on
Listbox gets correct roles, roving focus, typeahead and multi-select
without reimplementing any of it."
```

---

# Phase C — extraction, now that every root is uniform

## Task 14: Extract `useColorChannelModel`

Every root repeats the same block: `parseColor`, a local `ALPHA_CONFIG`, the external-`modelValue` watch, the `Math.abs(diff) > 0.001` feedback-loop guard, display↔native conversion, the hidden form input, and the four emits. Doing this after Phase B means all six call sites now emit the same events, so this is a substitution rather than a redesign.

**Files:**
- Create: `packages/vue/src/shared/useColorChannelModel.ts`
- Modify: `ColorAreaRoot.vue`, `ColorTriangleRoot.vue`, `ColorWheelRoot.vue`, `ColorRingRoot.vue`, `ColorSliderRoot.vue`
- Test: `packages/vue/test/useColorChannelModel.test.ts`

**Interfaces:**
- Consumes: `shared/utils.ts`.
- Produces:
  ```ts
  export interface UseColorChannelModelOptions {
    colorSpace: Ref<SpaceId>;
    channels: Ref<string[]>;
    modelValue: Ref<Color | string | null | undefined>;
    defaultValue: Ref<Color | string>;
    emit: (event: "update:modelValue" | "update:color" | "change" | "changeEnd", payload: Color | undefined) => void;
  }

  export interface UseColorChannelModelReturn {
    /** The current colour. */
    colorRef: ShallowRef<Color | undefined>;
    /** Display-space values, one per entry in `channels`, in the same order. */
    displayValues: Ref<number[]>;
    /** Per-channel display configs, one per entry in `channels`. */
    configs: ComputedRef<(ChannelConfig | undefined)[]>;
    /** Write new display values, rebuild the colour, and emit. */
    setDisplayValues: (values: number[], options?: { commit?: boolean }) => void;
    /** Emit `changeEnd` with the current colour. */
    commit: () => void;
  }

  export const ALPHA_CONFIG: ChannelConfig;

  export function useColorChannelModel(options: UseColorChannelModelOptions): UseColorChannelModelReturn;
  ```

- [ ] **Step 1: Write the failing test**

Create `packages/vue/test/useColorChannelModel.test.ts`:

```ts
import { describe, expect, it, mock } from "bun:test";
import { ref } from "vue";
import { Color } from "@urcolor/core";
import { useColorChannelModel } from "../src/shared/useColorChannelModel";

function setup(channels: string[] = ["h", "s"]) {
  const emit = mock(() => {});
  const model = useColorChannelModel({
    colorSpace: ref("hsl"),
    channels: ref(channels),
    modelValue: ref(null),
    defaultValue: ref("hsl(180, 50%, 50%)"),
    emit: emit as any,
  });
  return { model, emit };
}

describe("useColorChannelModel", () => {
  it("seeds display values from defaultValue", () => {
    const { model } = setup();
    expect(model.displayValues.value).toEqual([180, 50]);
  });

  it("emits all three change events on a write", () => {
    const { model, emit } = setup();
    model.setDisplayValues([200, 50]);
    const events = emit.mock.calls.map(c => c[0]);
    expect(events).toContain("update:modelValue");
    expect(events).toContain("update:color");
    expect(events).toContain("change");
    expect(events).not.toContain("changeEnd");
  });

  it("emits changeEnd only when committing", () => {
    const { model, emit } = setup();
    model.setDisplayValues([200, 50], { commit: true });
    expect(emit.mock.calls.map(c => c[0])).toContain("changeEnd");
  });

  it("round-trips a display value through the colour", () => {
    const { model } = setup();
    model.setDisplayValues([200, 60]);
    expect(model.displayValues.value).toEqual([200, 60]);
    expect(Math.round(model.colorRef.value!.to("hsl").get("h"))).toBe(200);
  });

  it("treats alpha as a 0-100 percentage channel", () => {
    const { model } = setup(["alpha"]);
    model.setDisplayValues([50]);
    expect(model.colorRef.value!.alpha).toBeCloseTo(0.5, 5);
  });

  it("does not thrash display values on sub-threshold colour changes", () => {
    const { model } = setup();
    model.setDisplayValues([200, 50]);
    const before = [...model.displayValues.value];
    model.colorRef.value = model.colorRef.value!.with({ space: "hsl", h: 200.0001 });
    expect(model.displayValues.value).toEqual(before);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `bun test packages/vue/test/useColorChannelModel.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write the composable**

Create `packages/vue/src/shared/useColorChannelModel.ts` by lifting the logic that currently lives in `ColorAreaRoot.vue` lines 116–192 and generalising it from two fixed axes to an N-length `channels` array. Concretely it must:

1. Export `ALPHA_CONFIG` — the exact literal currently duplicated in five roots (`{ key: "alpha", label: "Alpha", min: 0, max: 100, step: 1, format: "percentage", nativeMin: 0, nativeMax: 1 }`).
2. `configs` — for each channel key, `ALPHA_CONFIG` when the key is `"alpha"`, otherwise `getChannelConfig(colorSpace.value, key)`.
3. `colorRef` — a `shallowRef` seeded with `parseColor(modelValue.value ?? defaultValue.value)`, plus a watch on `modelValue` that reassigns when the parse succeeds.
4. `displayValues` — a `ref<number[]>` synced from `colorRef` and `channels` through `nativeToDisplay`, skipping the write when every element differs by less than `0.001` (the existing feedback-loop guard).
5. `setDisplayValues(values, { commit })` — convert each entry with `displayToNative`, build one `with({ space, ...updates })` call for the non-alpha channels and one `withAlpha` for an alpha channel, assign `colorRef`, then emit `update:modelValue`, `update:color` and `change`, plus `changeEnd` when `commit` is true.
6. `commit()` — emit `changeEnd` with `colorRef.value` when it is defined.

- [ ] **Step 4: Run the composable test**

Run: `bun test packages/vue/test/useColorChannelModel.test.ts`
Expected: PASS.

- [ ] **Step 5: Adopt it in the five roots, one at a time**

For each of `ColorAreaRoot.vue`, `ColorTriangleRoot.vue`, `ColorWheelRoot.vue`, `ColorRingRoot.vue`, `ColorSliderRoot.vue`: delete the local `parseColor`, `ALPHA_CONFIG`, `colorToDisplayValues`, `displayValuesToColor`, the `modelValue` watch and the colour→values watch, and call `useColorChannelModel` instead. Keep each root's own geometry and keyboard code untouched — only the colour plumbing moves.

While in each root, also delete its inline form detection. `ColorTriangleRoot`, `ColorWheelRoot` and `ColorRingRoot` each hand-roll `currentElement.value.closest("form")` instead of importing `useFormControl`, and the two variants disagree on what to return before mount. Import `useFormControl` from `../../shared/utils` in all three, and change its body in `shared/utils.ts` so the pre-mount branch returns `false` rather than `true`:

```ts
export function useFormControl(el: MaybeElementRef) {
  return computed(() => toValue(el) ? Boolean(unrefElement(el)?.closest("form")) : false);
}
```

Returning `true` before the element exists makes a root render its hidden input on the server even when it is not inside a form.

After each single root, run `bun test` before moving to the next. A regression is far cheaper to locate one root at a time.

- [ ] **Step 6: Full suite and typecheck**

Run: `bun test && bun run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/vue/src/shared/useColorChannelModel.ts packages/vue/src/components packages/vue/test/useColorChannelModel.test.ts
git commit -m "refactor(vue): extract the colour channel model shared by five roots

Each root carried its own parseColor, ALPHA_CONFIG literal, display and
native conversion pair, modelValue watch and feedback-loop guard. With
Phase B leaving every root on the same four emits, they collapse into
one composable."
```

---

## Task 15: Extract `usePointerDrag`

**Files:**
- Create: `packages/vue/src/shared/usePointerDrag.ts`
- Modify: `ColorTriangleRoot.vue`, `ColorWheelRoot.vue`, `ColorRingRoot.vue`, `ColorArea/ColorAreaArea.vue`
- Test: `packages/vue/test/usePointerDrag.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export interface UsePointerDragOptions {
    disabled: Ref<boolean>;
    /** Element the pointer coordinates are measured against. */
    target: Ref<HTMLElement | undefined>;
    /** Called on pointerdown and on every throttled move, with client coordinates. */
    onMove: (event: PointerEvent, phase: "start" | "move") => void;
    /** Called once on release. */
    onEnd: () => void;
    /** Return false from pointerdown to reject the gesture (used for the ring annulus hit test). */
    canStart?: (event: PointerEvent) => boolean;
  }

  export interface UsePointerDragReturn {
    isDragging: Ref<boolean>;
    /** Cached bounding rect for the current gesture; cleared on release. */
    rect: Ref<DOMRect | undefined>;
    onPointerDown: (event: PointerEvent) => void;
    onPointerMove: (event: PointerEvent) => void;
    onPointerUp: (event: PointerEvent) => void;
  }

  export function usePointerDrag(options: UsePointerDragOptions): UsePointerDragReturn;
  ```
  Moves are throttled through `requestAnimationFrame`, matching what Triangle, Wheel and Ring already do individually. `ColorAreaArea` currently has no throttle — adopting this gives it one.

- [ ] **Step 1: Write the failing test**

Create `packages/vue/test/usePointerDrag.test.ts`:

```ts
import { describe, expect, it, mock } from "bun:test";
import { ref } from "vue";
import { usePointerDrag } from "../src/shared/usePointerDrag";

function makeEvent(overrides: Partial<PointerEvent> = {}) {
  const el = document.createElement("div");
  el.setPointerCapture = mock(() => {});
  el.releasePointerCapture = mock(() => {});
  el.hasPointerCapture = mock(() => true);
  return {
    pointerId: 1,
    clientX: 10,
    clientY: 10,
    target: el,
    preventDefault: mock(() => {}),
    ...overrides,
  } as unknown as PointerEvent;
}

describe("usePointerDrag", () => {
  it("marks dragging between down and up", () => {
    const drag = usePointerDrag({
      disabled: ref(false),
      target: ref(document.createElement("div")),
      onMove: () => {},
      onEnd: () => {},
    });
    expect(drag.isDragging.value).toBe(false);
    drag.onPointerDown(makeEvent());
    expect(drag.isDragging.value).toBe(true);
    drag.onPointerUp(makeEvent());
    expect(drag.isDragging.value).toBe(false);
  });

  it("ignores pointerdown when disabled", () => {
    const onMove = mock(() => {});
    const drag = usePointerDrag({
      disabled: ref(true),
      target: ref(document.createElement("div")),
      onMove,
      onEnd: () => {},
    });
    drag.onPointerDown(makeEvent());
    expect(drag.isDragging.value).toBe(false);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("rejects the gesture when canStart returns false", () => {
    const onMove = mock(() => {});
    const drag = usePointerDrag({
      disabled: ref(false),
      target: ref(document.createElement("div")),
      onMove,
      onEnd: () => {},
      canStart: () => false,
    });
    drag.onPointerDown(makeEvent());
    expect(drag.isDragging.value).toBe(false);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("calls onEnd once on release", () => {
    const onEnd = mock(() => {});
    const drag = usePointerDrag({
      disabled: ref(false),
      target: ref(document.createElement("div")),
      onMove: () => {},
      onEnd,
    });
    drag.onPointerDown(makeEvent());
    drag.onPointerUp(makeEvent());
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `bun test packages/vue/test/usePointerDrag.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Write the composable**

Create `packages/vue/src/shared/usePointerDrag.ts` implementing the interface above:

- `onPointerDown` returns early when `disabled` or when `canStart` returns false; otherwise captures the pointer on `event.target`, calls `event.preventDefault()`, caches `target.value.getBoundingClientRect()` into `rect`, sets `isDragging = true`, and calls `onMove(event, "start")`.
- `onPointerMove` returns unless `isDragging` and the event target has pointer capture; then schedules `onMove(event, "move")` on the next animation frame, coalescing multiple moves within a frame into one call.
- `onPointerUp` releases capture, cancels any pending frame, clears `rect`, sets `isDragging = false`, and calls `onEnd()`.

- [ ] **Step 4: Adopt it, one component at a time**

Replace the hand-rolled drag lifecycle in `ColorTriangleRoot.vue`, `ColorWheelRoot.vue`, `ColorRingRoot.vue` and `ColorAreaArea.vue`. The ring passes its annulus hit test as `canStart`. Each root's coordinate maths stays in its own `onMove` callback — only the lifecycle moves.

Run `bun test` after each component.

- [ ] **Step 5: Full suite**

Run: `bun test && bun run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/vue/src/shared/usePointerDrag.ts packages/vue/src/components packages/vue/test/usePointerDrag.test.ts
git commit -m "refactor(vue): extract the shared pointer drag lifecycle

Triangle, wheel and ring each carried the same rect caching, pointer
capture, rAF throttle and capture guards. ColorArea had the same shape
inline in its template with no throttle at all, which this also fixes."
```

---

## Task 16: Extract `useGradientCanvas`

**Files:**
- Create: `packages/vue/src/shared/useGradientCanvas.ts`
- Modify: `ColorAreaGradient.vue`, `ColorTriangleGradient.vue`, `ColorRingGradient.vue`, `ColorWheelGradient.vue`, `ColorSliderGradient.vue`
- Test: `packages/vue/test/ColorAreaGradient.test.ts` (existing — must keep passing)

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export interface UseGradientCanvasOptions {
    canvas: Ref<HTMLCanvasElement | undefined>;
    /** Reactive sources that should trigger a repaint. */
    sources: () => unknown;
    /** Paints one frame. Receives the backing store size in device pixels. */
    paint: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
    /** Repaints are suppressed while this is true, then run once on the falling edge. */
    isDragging?: Ref<boolean>;
    /** Set when `paint` acquires a WebGL context, so teardown only runs where it applies. */
    usesWebGL?: boolean;
  }

  export function useGradientCanvas(options: UseGradientCanvasOptions): { render: () => void };

  export function applyChannelOverrides(
    color: Color,
    colorSpace: SpaceId,
    overrides: Record<string, number> | false,
  ): Color;
  ```

- [ ] **Step 1: Confirm the existing gradient test passes**

Run: `bun test packages/vue/test/ColorAreaGradient.test.ts`
Expected: PASS. This is the regression net for the whole task — the extraction must not change what any gradient paints.

- [ ] **Step 2: Write the composable**

Create `packages/vue/src/shared/useGradientCanvas.ts` containing:

- `renderToCanvas` — the device-pixel-ratio sizing, `OffscreenCanvas`, `putImageData` and `drawImage` sequence currently copy-pasted verbatim into all four canvas gradients.
- `applyChannelOverrides` — the `channelOverrides` application currently duplicated four times (`ColorAreaGradient`'s copy casts through `any`; drop the cast, the other three are already typed).
- `useGradientCanvas` — `useResizeObserver(canvas, render)`, a `watch(sources, () => { if (!isDragging?.value) render() }, { immediate: true })`, a falling-edge `watch` on `isDragging` that repaints once, and an `onBeforeUnmount` that calls `getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext()` **only when `usesWebGL` is true**.

The `immediate: true` on the sources watch matters: `ColorTriangleGradient` currently omits it and relies on the resize observer for its first paint.

- [ ] **Step 3: Adopt it, one gradient at a time**

Rewrite each of the five gradients to call `useGradientCanvas`, keeping its own `paint` callback (`sampleBilinearGrid` / `sampleChannelGrid` / `sampleTriangleGrid` / `sampleConicRing` / `samplePolarGrid` / `drawLinearGradient` and the ring's `ctx.clip("evenodd")`) exactly as it is today. Only `ColorAreaGradient`'s WebGL path passes `usesWebGL: true`.

`ColorSliderGradient` also drops the two inline reimplementations of the override logic inside `autoColors` in favour of `applyChannelOverrides`.

Run `bun test` after each gradient.

- [ ] **Step 4: Full suite and typecheck**

Run: `bun test && bun run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/vue/src/shared/useGradientCanvas.ts packages/vue/src/components packages/vue/test
git commit -m "refactor(vue): extract the gradient canvas lifecycle

renderToCanvas was copy-pasted into four gradients verbatim and the
override helper into four more, alongside identical resize-observer and
teardown boilerplate. The teardown also acquired a WebGL context on
2D-only canvases purely to destroy it; that now runs only where WebGL
was actually used. ColorTriangleGradient additionally gains the
immediate first paint the other four already had."
```

---

# Phase D — docs

## Task 17: Update demos and stories

**Files:**
- Modify: `docs/components/vue/demo/*.vue` (21 files), `docs/guide/vue/demo/*.vue` (11 files), `packages/vue/src/components/*/*.stories.ts`
- Test: `bun run docs:build`

- [ ] **Step 1: Find every stale reference**

```bash
cd /Users/grandmagus/Documents/Projects/urcolor
grep -rln "channelX\|channelY\|channelZ\|channelAngle\|channelRadius\|valueCommit\|readOnly\|ColorSwatchGroup\|ThumbX\|ThumbY\|ThumbZ" docs packages/vue/src --include=*.vue --include=*.ts --include=*.md
```

- [ ] **Step 2: Apply the renames**

Across every hit:

| Old | New |
|---|---|
| `channel-x` / `channelX` | `x-channel` / `xChannel` |
| `channel-y` / `channelY` | `y-channel` / `yChannel` |
| `channel-z` / `channelZ` | `z-channel` / `zChannel` |
| `channel-angle` / `channelAngle` | `angle-channel` / `angleChannel` |
| `channel-radius` / `channelRadius` | `radius-channel` / `radiusChannel` |
| `@value-commit` | `@change-end` |
| `read-only` (ColorField) | `readonly` |
| `ColorSwatchGroupRoot` / `ColorSwatchGroupItem` | `ColorSwatchPickerRoot` / `ColorSwatchPickerItem` + `ColorSwatchPickerItemSwatch` |
| `<ColorWheelThumbX />` / `<ColorWheelThumbY />` | delete — `ColorWheelThumb` is the slider |
| `<ColorTriangleThumbX/Y/Z />` | delete — `ColorTriangleThumb` is the slider |

Every ColorArea demo additionally needs its children wrapped:

```vue
<ColorAreaRoot v-model="color" as="div" color-space="hsl" x-channel="h" y-channel="s">
  <ColorAreaArea as="div">
    <ColorAreaCheckerboard as="div" />
    <ColorAreaGradient as="div" />
    <ColorAreaThumb as="div" class="..." />
  </ColorAreaArea>
</ColorAreaRoot>
```

Import `ColorAreaArea` alongside the other components in each affected demo.

- [ ] **Step 3: Rename the swatch-group demos**

```bash
git mv docs/components/vue/demo/ColorSwatchGroupBasic.vue docs/components/vue/demo/ColorSwatchPickerBasic.vue
git mv docs/components/vue/demo/ColorSwatchGroupMultiple.vue docs/components/vue/demo/ColorSwatchPickerMultiple.vue
git mv docs/guide/vue/demo/ColorSwatchGroupGuide.vue docs/guide/vue/demo/ColorSwatchPickerGuide.vue
```

Update their internals to the Listbox-based API and fix every importer of the old paths (the `.md` pages in Task 18).

- [ ] **Step 4: Build the docs**

Run: `bun run docs:build`
Expected: PASS. Any remaining stale prop shows up here as a Vue compile warning or a missing-import error.

- [ ] **Step 5: Commit**

```bash
git add -A docs packages/vue/src
git commit -m "docs(vue): update demos and stories for the reka-parity API"
```

---

## Task 18: Update reference pages and the sidebar

**Files:**
- Modify: `docs/components/vue/*.md`, `docs/guide/vue/*.md`, `docs/.vitepress/config.ts`
- Test: `bun run docs:build`

Follow the page structures documented in `CLAUDE.md` — guide pages keep their step-by-step shape, component pages keep the Examples / Usage / API Reference / Keyboard Navigation ordering.

- [ ] **Step 1: Rewrite the prop and event tables**

For each component page, update the API Reference tables to the renamed props and the four-event set, and add rows for everything Phase B introduced: `xName` / `yName` (ColorArea), `defaultValue` / `step` / `name` / `required` / `as` / `asChild` (ColorSlider), `placeholder` / `disableWheelChange` / `locale` / `defaultValue` (ColorField), `label` (ColorSwatch).

- [ ] **Step 2: Update the Keyboard Navigation tables**

The ColorTriangle page's table must reflect the corrected map from Task 7 — arrows on X/Y matching ColorArea, PageUp/PageDown on Z in three-channel mode, Home/End on X, ×10 shift.

- [ ] **Step 3: Document `ColorAreaArea`**

Add it to `docs/components/vue/ColorArea.md` as a component in its own right — `role="application"`, owns keyboard and pointer handling, must wrap the gradient, checkerboard and thumb. Update the ColorArea guide page's step ordering so the area is introduced before the gradient.

- [ ] **Step 4: Replace the swatch-group pages**

```bash
git mv docs/components/vue/ColorSwatchGroup.md docs/components/vue/ColorSwatchPicker.md
git mv docs/guide/vue/color-swatch-group.md docs/guide/vue/color-swatch-picker.md
```

(Adjust the guide filename to whatever it actually is — check with `ls docs/guide/vue`.) Rewrite both around the Listbox-based API: `role="listbox"` / `role="option"`, `multiple`, `loop`, `orientation`, typeahead in the keyboard table.

- [ ] **Step 5: Update the sidebar**

In `docs/.vitepress/config.ts`, rename the ColorSwatchGroup entries under both the `/guide/` and `/components/` sections to point at the new paths.

- [ ] **Step 6: Build**

Run: `bun run docs:build`
Expected: PASS with no dead-link warnings.

- [ ] **Step 7: Commit**

```bash
git add -A docs
git commit -m "docs(vue): document the reka-parity API and ColorSwatchPicker"
```

---

## Task 19: Final verification

- [ ] **Step 1: Full test suite**

Run: `bun test`
Expected: PASS, zero failures. Paste the summary line into the task notes.

- [ ] **Step 2: Lint and typecheck**

Run: `bun run lint`
Expected: `vue-tsc` reports exactly the 2 baseline `packages/core/test/geometry.test.ts(218)` errors and nothing else. eslint error count at or below the ~182 baseline; list any new ones in the report rather than treating them as a hard failure.

- [ ] **Step 3: Docs build**

Run: `bun run docs:build`
Expected: completes, including the Storybook copy step.

- [ ] **Step 4: Confirm nothing stale survives**

```bash
grep -rn "channelX\|channelY\|channelZ\|channelAngle\|channelRadius\|valueCommit\|ColorSwatchGroup\|ThumbX\|ThumbY\|ThumbZ" packages/vue/src docs
```

Expected: no output. Any hit is a missed rename.

- [ ] **Step 5: Confirm React was not touched**

```bash
git diff --stat main -- packages/react
```

Expected: no output.

- [ ] **Step 6: Report**

State plainly which of the three commands passed and paste their summary lines. If any failed, say so with the output rather than describing the work as complete.
