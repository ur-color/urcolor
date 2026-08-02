# Hero Orbit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat, stacked VitePress home page hero with an orbit instrument cluster — a `ColorRing` wrapping a morphing Triangle/Wheel/Area core, ringed by five docked satellite controls joined by connector lines, all driven by one shared color.

**Architecture:** A `useHeroColor()` provide/inject composable owns a single `shallowRef<Color>`. `HeroOrbit.vue` is a stage that positions docks on an ellipse using native CSS `cos()`/`sin()`, draws SVG connectors from JS-computed rects, and drives pointer parallax through CSS custom properties. All pure logic (mode sequencing, breakpoint selection, path geometry, hue ramp) lives in `heroOrbit.ts` and is unit-tested; components consume it. Every animation is gated behind `useReducedMotion()`, which also means gsap is never imported in reduced-motion mode — making components testable without gsap.

**Tech Stack:** Vue 3.5 `<script setup>`, VitePress 1.x, gsap 3.12 (dynamic import, browser only), Tailwind 4 utility classes in templates, `bun test` + happy-dom + `@vue/test-utils`, urcolor primitives imported by relative source path.

**Spec:** `docs/superpowers/specs/2026-08-02-hero-orbit-design.md`

## Global Constraints

- Docs-only. Nothing under `packages/*` may be modified. If a hero requirement cannot be met with the current public component API, adapt the hero.
- Import urcolor primitives by **relative source path** (`../../../packages/vue/src/components/ColorArea`), matching the existing `HeroDemo.vue` convention — never from `@urcolor/vue`. From files inside `docs/.vitepress/components/hero/` the prefix is `../../../../packages/vue/src/components/...` (one extra level).
- `gsap` is imported **only** via `await import("gsap")` inside `onMounted`. Never at module scope — VitePress server-renders these components.
- Never touch the DOM at module scope or in `setup()`. SSR has no `window`.
- Every animation, without exception, is skipped when `useReducedMotion()` returns `true`.
- Docks position via the CSS `translate` property. GSAP animates `transform`. The two must never be mixed on the same element — they compose, and mixing them makes docking fight the entrance tween.
- Test files live in `docs/test/`, run with `bun test docs/test/`.
- `bun run lint` (eslint + vue-tsc) must be clean after every task.
- ESLint style in this repo: double quotes, semicolons, trailing commas in multiline. Match surrounding files.

## Dependency Graph

Tasks in the same group are independent and may be executed in parallel.

```
Group A (parallel):  Task 1   Task 2   Task 3
Group B (parallel):  Task 4   Task 5   Task 6   Task 7   Task 8
Group C:             Task 9
Group D:             Task 10
```

Group B tasks all depend on Group A. Task 9 depends on all of B. Task 10 depends on 9.

---

### Task 1: `useHeroColor` composable

**Files:**
- Create: `docs/.vitepress/composables/useHeroColor.ts`
- Test: `docs/test/useHeroColor.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `provideHeroColor(): ShallowRef<Color>`, `useHeroColor(): ShallowRef<Color>`. Every satellite and instrument in Tasks 5–9 calls `useHeroColor()`.

- [ ] **Step 1: Write the failing test**

Create `docs/test/useHeroColor.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { provideHeroColor, useHeroColor } from "../.vitepress/composables/useHeroColor";

const Child = defineComponent({
  setup() {
    const color = useHeroColor();
    return () => h("span", { class: "hex" }, color.value.toString("hex"));
  },
});

const Parent = defineComponent({
  setup() {
    const color = provideHeroColor();
    return { color };
  },
  render() {
    return h("div", [h(Child)]);
  },
});

describe("useHeroColor", () => {
  it("defaults to the hero magenta", () => {
    const wrapper = mount(Parent);
    expect(wrapper.vm.color.to("hsv").get("h")).toBeCloseTo(328, 0);
  });

  it("shares one ref between provider and consumer", async () => {
    const wrapper = mount(Parent);
    wrapper.vm.color = new Color("hsv", [120, 1, 1]);
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".hex").text().toLowerCase()).toBe("#00ff00");
  });

  it("throws when used outside a provider", () => {
    expect(() => mount(Child)).toThrow(/provideHeroColor/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test docs/test/useHeroColor.test.ts`
Expected: FAIL — cannot resolve module `../.vitepress/composables/useHeroColor`.

- [ ] **Step 3: Write the implementation**

Create `docs/.vitepress/composables/useHeroColor.ts`:

```ts
import type { InjectionKey, ShallowRef } from "vue";
import { inject, provide, shallowRef } from "vue";
import { Color } from "@urcolor/core";

const HERO_COLOR_KEY: InjectionKey<ShallowRef<Color>> = Symbol("hero-color");

/** Hue 328 at full saturation and value — the magenta the hero has always opened on. */
export function provideHeroColor(): ShallowRef<Color> {
  const color = shallowRef<Color>(new Color("hsv", [328, 1, 1]));
  provide(HERO_COLOR_KEY, color);
  return color;
}

export function useHeroColor(): ShallowRef<Color> {
  const color = inject(HERO_COLOR_KEY);
  if (!color) {
    throw new Error("useHeroColor() called outside a provideHeroColor() tree");
  }
  return color;
}

/**
 * The urcolor primitives emit `Color | undefined`; `undefined` means "no
 * change". Every satellite funnels its update through here so that guard
 * lives in exactly one place.
 */
export function setHeroColor(target: ShallowRef<Color>, next: Color | undefined): void {
  if (next) target.value = next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test docs/test/useHeroColor.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/composables/useHeroColor.ts docs/test/useHeroColor.test.ts
git commit -m "feat(docs): add useHeroColor shared state composable"
```

---

### Task 2: Orbit geometry and sequencing helpers

**Files:**
- Create: `docs/.vitepress/composables/heroOrbit.ts`
- Test: `docs/test/heroOrbit.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type CoreMode`, `CORE_MODES`, `nextCoreMode(mode)`, `type OrbitMode`, `orbitModeForWidth(width)`, `type Dock`, `DOCKS`, `docksForMode(mode)`, `type Point`, `edgePoint(center, radius, angleDeg)`, `connectorPath(from, to, bow?)`, `hueRamp(hue)`. Used by Tasks 6, 7, 8, 9.

- [ ] **Step 1: Write the failing test**

Create `docs/test/heroOrbit.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import {
  CORE_MODES,
  DOCKS,
  connectorPath,
  docksForMode,
  edgePoint,
  hueRamp,
  nextCoreMode,
  orbitModeForWidth,
} from "../.vitepress/composables/heroOrbit";

describe("nextCoreMode", () => {
  it("cycles triangle -> wheel -> area -> triangle", () => {
    expect(nextCoreMode("triangle")).toBe("wheel");
    expect(nextCoreMode("wheel")).toBe("area");
    expect(nextCoreMode("area")).toBe("triangle");
  });

  it("visits every mode exactly once per lap", () => {
    const seen = new Set<string>();
    let mode = CORE_MODES[0]!;
    for (let i = 0; i < CORE_MODES.length; i++) {
      seen.add(mode);
      mode = nextCoreMode(mode);
    }
    expect(seen.size).toBe(CORE_MODES.length);
    expect(mode).toBe(CORE_MODES[0]!);
  });
});

describe("orbitModeForWidth", () => {
  it("picks stack below 700", () => {
    expect(orbitModeForWidth(375)).toBe("stack");
    expect(orbitModeForWidth(699)).toBe("stack");
  });

  it("picks compact from 700 up to 1100", () => {
    expect(orbitModeForWidth(700)).toBe("compact");
    expect(orbitModeForWidth(1099)).toBe("compact");
  });

  it("picks orbit at 1100 and above", () => {
    expect(orbitModeForWidth(1100)).toBe("orbit");
    expect(orbitModeForWidth(1920)).toBe("orbit");
  });
});

describe("docksForMode", () => {
  it("keeps all five docks in orbit mode", () => {
    expect(docksForMode("orbit").map(d => d.id)).toEqual(
      ["hex", "formats", "swatches", "sliders", "fields"],
    );
  });

  it("drops the formats dock in compact mode", () => {
    expect(docksForMode("compact").map(d => d.id)).not.toContain("formats");
    expect(docksForMode("compact")).toHaveLength(4);
  });

  it("keeps all five docks in stack mode, where they flow vertically", () => {
    expect(docksForMode("stack")).toHaveLength(5);
  });

  it("gives every dock a depth between 1 and 3", () => {
    for (const dock of DOCKS) {
      expect(dock.depth).toBeGreaterThanOrEqual(1);
      expect(dock.depth).toBeLessThanOrEqual(3);
    }
  });
});

describe("edgePoint", () => {
  it("walks right at 0 degrees", () => {
    const p = edgePoint({ x: 100, y: 100 }, 50, 0);
    expect(p.x).toBeCloseTo(150, 5);
    expect(p.y).toBeCloseTo(100, 5);
  });

  it("walks up at 90 degrees, in screen coordinates", () => {
    const p = edgePoint({ x: 100, y: 100 }, 50, 90);
    expect(p.x).toBeCloseTo(100, 5);
    expect(p.y).toBeCloseTo(50, 5);
  });
});

describe("connectorPath", () => {
  it("emits a quadratic path between the two points", () => {
    const d = connectorPath({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(d).toMatch(/^M 0 0 Q /);
    expect(d).toMatch(/100 0$/);
  });

  it("bows perpendicular to the segment", () => {
    const d = connectorPath({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.1);
    const control = d.match(/Q ([\d.-]+) ([\d.-]+)/)!;
    expect(Number(control[1])).toBeCloseTo(50, 5);
    expect(Number(control[2])).toBeCloseTo(10, 5);
  });

  it("degrades to a straight line for coincident points", () => {
    expect(connectorPath({ x: 7, y: 7 }, { x: 7, y: 7 })).toBe("M 7 7 L 7 7");
  });
});

describe("hueRamp", () => {
  it("returns eight css colors at the given hue", () => {
    const ramp = hueRamp(328);
    expect(ramp).toHaveLength(8);
    for (const c of ramp) expect(c).toMatch(/^hsl\(328, 85%, \d+%\)$/);
  });

  it("ascends in lightness", () => {
    const ls = hueRamp(0).map(c => Number(c.match(/(\d+)%\)$/)![1]));
    for (let i = 1; i < ls.length; i++) expect(ls[i]!).toBeGreaterThan(ls[i - 1]!);
  });

  it("rounds the hue so the css string stays short", () => {
    expect(hueRamp(327.6)[0]).toMatch(/^hsl\(328,/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test docs/test/heroOrbit.test.ts`
Expected: FAIL — cannot resolve module `../.vitepress/composables/heroOrbit`.

- [ ] **Step 3: Write the implementation**

Create `docs/.vitepress/composables/heroOrbit.ts`:

```ts
/**
 * Pure geometry and sequencing for the hero orbit. Nothing here touches the
 * DOM, so it is unit-testable and safe to import during SSR.
 */

/* ---------- core morph sequence ---------- */

export type CoreMode = "triangle" | "wheel" | "area";

export const CORE_MODES: readonly CoreMode[] = ["triangle", "wheel", "area"];

export function nextCoreMode(mode: CoreMode): CoreMode {
  const i = CORE_MODES.indexOf(mode);
  return CORE_MODES[(i + 1) % CORE_MODES.length]!;
}

/* ---------- responsive mode ---------- */

export type OrbitMode = "orbit" | "compact" | "stack";

export function orbitModeForWidth(width: number): OrbitMode {
  if (width < 700) return "stack";
  if (width < 1100) return "compact";
  return "orbit";
}

/* ---------- docks ---------- */

export interface Dock {
  id: "hex" | "formats" | "swatches" | "sliders" | "fields";
  /** Degrees counterclockwise from the positive x-axis. */
  angle: number;
  /** Parallax layer. 1 moves least, 3 moves most. */
  depth: 1 | 2 | 3;
}

export const DOCKS: readonly Dock[] = [
  { id: "hex", angle: 135, depth: 1 },
  { id: "formats", angle: 45, depth: 1 },
  { id: "swatches", angle: 180, depth: 3 },
  { id: "sliders", angle: 0, depth: 3 },
  { id: "fields", angle: 270, depth: 2 },
];

/**
 * Compact mode drops the standalone formats dock — its content is folded into
 * the hex satellite instead. Stack mode keeps everything, because vertical
 * flow has room for it.
 */
export function docksForMode(mode: OrbitMode): Dock[] {
  if (mode === "compact") return DOCKS.filter(d => d.id !== "formats");
  return [...DOCKS];
}

/* ---------- path geometry ---------- */

export interface Point { x: number; y: number }

/**
 * A point on a circle in screen coordinates: x grows right, y grows *down*,
 * so the sine term is subtracted.
 */
export function edgePoint(center: Point, radius: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: center.x + Math.cos(rad) * radius,
    y: center.y - Math.sin(rad) * radius,
  };
}

/** A quadratic bezier from `from` to `to`, bowed perpendicular by `bow` × length. */
export function connectorPath(from: Point, to: Point, bow = 0.08): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  const cx = (from.x + to.x) / 2 + (-dy / len) * len * bow;
  const cy = (from.y + to.y) / 2 + (dx / len) * len * bow;
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

/* ---------- swatch ramp ---------- */

const RAMP_LIGHTNESS = [12, 24, 36, 48, 60, 72, 84, 92] as const;

/** A tint-to-shade ramp at the given hue, for the swatch picker satellite. */
export function hueRamp(hue: number): string[] {
  const h = Math.round(hue) % 360;
  return RAMP_LIGHTNESS.map(l => `hsl(${h}, 85%, ${l}%)`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test docs/test/heroOrbit.test.ts`
Expected: PASS, 16 tests.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/composables/heroOrbit.ts docs/test/heroOrbit.test.ts
git commit -m "feat(docs): add hero orbit geometry and sequencing helpers"
```

---

### Task 3: `useReducedMotion` composable

**Files:**
- Create: `docs/.vitepress/composables/useReducedMotion.ts`
- Test: `docs/test/useReducedMotion.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `useReducedMotion(): Ref<boolean>`. Used by Tasks 4, 7, 8, 9 to gate every animation and to skip the gsap import entirely.

Hand-rolled rather than `@vueuse/core`'s `useMediaQuery` — `@vueuse/core` is a root devDependency and is not listed in `docs/package.json`, so relying on hoisting would be a build-time gamble.

- [ ] **Step 1: Write the failing test**

Create `docs/test/useReducedMotion.test.ts`:

```ts
import { afterEach, describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { useReducedMotion } from "../.vitepress/composables/useReducedMotion";

type Listener = () => void;

function stubMatchMedia(matches: boolean) {
  const listeners: Listener[] = [];
  (window as unknown as Record<string, unknown>).matchMedia = (query: string) => ({
    matches,
    media: query,
    addEventListener: (_: string, fn: Listener) => listeners.push(fn),
    removeEventListener: () => {},
  });
  return listeners;
}

const Probe = defineComponent({
  setup() {
    const reduced = useReducedMotion();
    return () => h("span", { class: "flag" }, String(reduced.value));
  },
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).matchMedia;
});

describe("useReducedMotion", () => {
  it("is false when the query does not match", () => {
    stubMatchMedia(false);
    expect(mount(Probe).find(".flag").text()).toBe("false");
  });

  it("is true when the query matches", () => {
    stubMatchMedia(true);
    expect(mount(Probe).find(".flag").text()).toBe("true");
  });

  it("defaults to false when matchMedia is unavailable, as during SSR", () => {
    expect(mount(Probe).find(".flag").text()).toBe("false");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test docs/test/useReducedMotion.test.ts`
Expected: FAIL — cannot resolve module `../.vitepress/composables/useReducedMotion`.

- [ ] **Step 3: Write the implementation**

Create `docs/.vitepress/composables/useReducedMotion.ts`:

```ts
import type { Ref } from "vue";
import { onMounted, onUnmounted, ref } from "vue";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Reads the OS reduced-motion preference and keeps tracking it. Starts `false`
 * so that server-rendered markup matches the common case; `onMounted` corrects
 * it before any animation is scheduled.
 */
export function useReducedMotion(): Ref<boolean> {
  const reduced = ref(false);
  let mq: MediaQueryList | undefined;
  const sync = () => { reduced.value = mq?.matches ?? false; };

  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    mq = window.matchMedia(QUERY);
    sync();
  }

  onMounted(() => {
    if (!mq && typeof window !== "undefined" && typeof window.matchMedia === "function") {
      mq = window.matchMedia(QUERY);
    }
    sync();
    mq?.addEventListener("change", sync);
  });

  onUnmounted(() => mq?.removeEventListener("change", sync));

  return reduced;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test docs/test/useReducedMotion.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/composables/useReducedMotion.ts docs/test/useReducedMotion.test.ts
git commit -m "feat(docs): add useReducedMotion composable"
```

---

### Task 4: `HeroSatellite` dock wrapper

**Files:**
- Create: `docs/.vitepress/components/HeroSatellite.vue`
- Test: `docs/test/HeroSatellite.test.ts`

**Interfaces:**
- Consumes: `useReducedMotion` (Task 3).
- Produces: a component with props `{ id: string; angle: number; depth: 1 | 2 | 3; docked: boolean; index: number }`, a default slot, and a `data-dock-id` attribute on its root. Task 8 finds docks by that attribute; Task 9 renders five of these.

Positioning uses the CSS `translate` property so the gsap entrance can own `transform` without conflict.

- [ ] **Step 1: Write the failing test**

Create `docs/test/HeroSatellite.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { h } from "vue";
import HeroSatellite from "../.vitepress/components/HeroSatellite.vue";

function mountDock(props: Record<string, unknown> = {}) {
  return mount(HeroSatellite, {
    props: { id: "sliders", angle: 45, depth: 2, docked: true, index: 0, ...props },
    slots: { default: () => h("p", { class: "payload" }, "hi") },
  });
}

describe("HeroSatellite", () => {
  it("exposes its id for the connector layer to find", () => {
    expect(mountDock().attributes("data-dock-id")).toBe("sliders");
  });

  it("publishes angle and depth as custom properties", () => {
    const style = mountDock().attributes("style") ?? "";
    expect(style).toContain("--angle: 45deg");
    expect(style).toContain("--depth: 2");
  });

  it("renders its slot content", () => {
    expect(mountDock().find(".payload").text()).toBe("hi");
  });

  it("carries the docked class when docked", () => {
    expect(mountDock().classes()).toContain("hero-dock-docked");
  });

  it("drops the docked class in stack mode", () => {
    expect(mountDock({ docked: false }).classes()).not.toContain("hero-dock-docked");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test docs/test/HeroSatellite.test.ts`
Expected: FAIL — cannot resolve `HeroSatellite.vue`.

- [ ] **Step 3: Write the implementation**

Create `docs/.vitepress/components/HeroSatellite.vue`:

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useReducedMotion } from "../composables/useReducedMotion";

const props = defineProps<{
  id: string;
  angle: number;
  depth: 1 | 2 | 3;
  docked: boolean;
  index: number;
}>();

const el = ref<HTMLElement>();
const reduced = useReducedMotion();

onMounted(async () => {
  if (reduced.value || !props.docked || !el.value) return;
  const gsap = (await import("gsap")).default;
  // `transform` only — the `translate` property owns docking and parallax.
  gsap.from(el.value, {
    x: 0,
    y: 0,
    scale: 0.8,
    opacity: 0,
    duration: 0.7,
    ease: "power3.out",
    delay: 0.15 + props.index * 0.06,
  });
});
</script>

<template>
  <div
    ref="el"
    class="hero-dock"
    :class="{ 'hero-dock-docked': docked }"
    :data-dock-id="id"
    :style="{ '--angle': `${angle}deg`, '--depth': depth }"
  >
    <slot />
  </div>
</template>

<style scoped>
.hero-dock {
  --px: 0px;
  --py: 0px;
}

.hero-dock-docked {
  position: absolute;
  left: calc(50% + cos(var(--angle)) * var(--orbit-rx));
  top: calc(50% - sin(var(--angle)) * var(--orbit-ry));
  translate:
    calc(-50% + var(--px) * var(--depth))
    calc(-50% + var(--py) * var(--depth));
  will-change: translate;
}
</style>
```

`--px`/`--py` are declared here as a local fallback and overridden by the stage
in Task 9, so a dock rendered outside a stage still positions correctly.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test docs/test/HeroSatellite.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/components/HeroSatellite.vue docs/test/HeroSatellite.test.ts
git commit -m "feat(docs): add HeroSatellite dock wrapper"
```

---

### Task 5: Slider and field satellites

**Files:**
- Create: `docs/.vitepress/components/hero/SatSliders.vue`
- Create: `docs/.vitepress/components/hero/SatFields.vue`
- Test: `docs/test/SatControls.test.ts`

**Interfaces:**
- Consumes: `useHeroColor`, `setHeroColor` (Task 1).
- Produces: two components, no props, no emits. They read and write the shared color directly. Task 9 renders them inside `HeroSatellite`.

Markup and Tailwind classes are lifted verbatim from the current `HeroDemo.vue` so the visual language does not change mid-redesign.

- [ ] **Step 1: Write the failing test**

Create `docs/test/SatControls.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { provideHeroColor } from "../.vitepress/composables/useHeroColor";
import SatFields from "../.vitepress/components/hero/SatFields.vue";
import SatSliders from "../.vitepress/components/hero/SatSliders.vue";

function harness(Inner: unknown) {
  return defineComponent({
    setup() {
      const color = provideHeroColor();
      return { color };
    },
    render() {
      return h("div", [h(Inner as never)]);
    },
  });
}

describe("SatSliders", () => {
  it("renders one slider per channel: h, s, v, alpha", () => {
    const wrapper = mount(harness(SatSliders));
    expect(wrapper.findAll("[role='slider']")).toHaveLength(4);
  });

  it("reflects the shared color", async () => {
    const wrapper = mount(harness(SatSliders));
    wrapper.vm.color = new Color("hsv", [120, 1, 1]);
    await wrapper.vm.$nextTick();
    const hue = wrapper.findAll("[role='slider']")[0]!;
    expect(Number(hue.attributes("aria-valuenow"))).toBeCloseTo(120, 0);
  });
});

describe("SatFields", () => {
  it("renders four labelled channel inputs", () => {
    const wrapper = mount(harness(SatFields));
    expect(wrapper.findAll("input")).toHaveLength(4);
    expect(wrapper.text()).toContain("H");
    expect(wrapper.text()).toContain("A");
  });

  it("writes a typed value back into the shared color", async () => {
    const wrapper = mount(harness(SatFields));
    const hue = wrapper.findAll("input")[0]!;
    await hue.setValue("200");
    await hue.trigger("blur");
    expect(wrapper.vm.color.to("hsv").get("h")).toBeCloseTo(200, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test docs/test/SatControls.test.ts`
Expected: FAIL — cannot resolve `hero/SatSliders.vue`.

- [ ] **Step 3: Write the implementations**

Create `docs/.vitepress/components/hero/SatSliders.vue`:

```vue
<script setup lang="ts">
import type { Color } from "@urcolor/core";
import { setHeroColor, useHeroColor } from "../../composables/useHeroColor";
import {
  ColorSliderGradient,
  ColorSliderRoot,
  ColorSliderThumb,
  ColorSliderTrack,
} from "../../../../packages/vue/src/components/ColorSlider";

const color = useHeroColor();

const CHANNELS = [
  { channel: "h", label: "Hue", overrides: { s: 1, v: 1, alpha: 1 }, alpha: false },
  { channel: "s", label: "Saturation", overrides: { alpha: 1 }, alpha: false },
  { channel: "v", label: "Value", overrides: { alpha: 1 }, alpha: false },
  { channel: "alpha", label: "Alpha", overrides: false, alpha: true },
] as const;

function onUpdate(next: Color | undefined) {
  setHeroColor(color, next);
}
</script>

<template>
  <div class="sat-sliders">
    <ColorSliderRoot
      v-for="c in CHANNELS"
      :key="c.channel"
      :model-value="color"
      color-space="hsv"
      :channel="c.channel"
      as="div"
      class="w-full"
      @update:model-value="onUpdate"
    >
      <ColorSliderTrack
        as="div"
        class="sat-slider-track"
        :class="{ 'sat-slider-alpha': c.alpha }"
      >
        <ColorSliderGradient
          as="div"
          class="absolute inset-0 rounded-lg"
          :channel-overrides="c.overrides"
        />
        <ColorSliderThumb
          class="
            block size-5 rounded-full border-[2.5px] border-white bg-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_6px_rgba(0,0,0,0.25)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_0_0_3px_var(--vp-c-brand-soft)]
          "
          :aria-label="c.label"
        />
      </ColorSliderTrack>
    </ColorSliderRoot>
  </div>
</template>

<style scoped>
.sat-sliders {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: clamp(140px, 18vw, 200px);
}

.sat-slider-track {
  position: relative;
  height: 1.25rem;
  border-radius: 0.75rem;
  overflow: hidden;
}

.sat-slider-alpha {
  background: repeating-conic-gradient(rgb(230, 230, 230) 0% 25%, white 0% 50%) 0% 50% / 16px 16px;
}
</style>
```

Create `docs/.vitepress/components/hero/SatFields.vue`:

```vue
<script setup lang="ts">
import type { Color } from "@urcolor/core";
import { setHeroColor, useHeroColor } from "../../composables/useHeroColor";
import {
  ColorFieldInput,
  ColorFieldRoot,
} from "../../../../packages/vue/src/components/ColorField";

const color = useHeroColor();

const CHANNELS = [
  { channel: "h", label: "H", aria: "Hue" },
  { channel: "s", label: "S", aria: "Saturation" },
  { channel: "v", label: "V", aria: "Value" },
  { channel: "alpha", label: "A", aria: "Alpha" },
] as const;

function onUpdate(next: Color | undefined) {
  setHeroColor(color, next);
}
</script>

<template>
  <div class="sat-fields">
    <ColorFieldRoot
      v-for="c in CHANNELS"
      :key="c.channel"
      :model-value="color"
      color-space="hsv"
      :channel="c.channel"
      as="div"
      class="sat-field"
      @update:model-value="onUpdate"
    >
      <label class="sat-field-label">{{ c.label }}</label>
      <ColorFieldInput
        as="input"
        class="sat-field-input"
        :aria-label="c.aria"
      />
    </ColorFieldRoot>
  </div>
</template>

<style scoped>
.sat-fields {
  display: flex;
  gap: 6px;
}

.sat-field {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 56px;
}

.sat-field-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sat-field-input {
  width: 100%;
  padding: 4px 6px;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-bg-soft) 70%, transparent);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  text-align: center;
  outline: none;
  transition: border-color 0.2s ease;
}

.sat-field-input:focus {
  border-color: var(--vp-c-brand-1);
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test docs/test/SatControls.test.ts`
Expected: PASS, 4 tests.

If the "writes a typed value back" test fails on the commit trigger, check
`packages/vue/test/ColorField.test.ts` for the event this build of
`ColorFieldInput` commits on, and match it — do not change the component.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/components/hero/SatSliders.vue docs/.vitepress/components/hero/SatFields.vue docs/test/SatControls.test.ts
git commit -m "feat(docs): add slider and channel-field hero satellites"
```

---

### Task 6: Hex, formats and swatch satellites

**Files:**
- Create: `docs/.vitepress/components/hero/SatHex.vue`
- Create: `docs/.vitepress/components/hero/SatFormats.vue`
- Create: `docs/.vitepress/components/hero/SatSwatches.vue`
- Test: `docs/test/SatReadouts.test.ts`

**Interfaces:**
- Consumes: `useHeroColor`, `setHeroColor` (Task 1); `hueRamp` (Task 2).
- Produces: three components. `SatHex` takes one prop, `withFormats?: boolean` — when true it renders the format lines beneath its input, which is how compact mode absorbs the formats dock. `SatFormats` and `SatSwatches` take no props.

- [ ] **Step 1: Write the failing test**

Create `docs/test/SatReadouts.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { provideHeroColor } from "../.vitepress/composables/useHeroColor";
import SatFormats from "../.vitepress/components/hero/SatFormats.vue";
import SatHex from "../.vitepress/components/hero/SatHex.vue";
import SatSwatches from "../.vitepress/components/hero/SatSwatches.vue";

function harness(Inner: unknown, props: Record<string, unknown> = {}) {
  return defineComponent({
    setup() {
      const color = provideHeroColor();
      return { color };
    },
    render() {
      return h("div", [h(Inner as never, props)]);
    },
  });
}

describe("SatHex", () => {
  it("renders a single hex input", () => {
    const wrapper = mount(harness(SatHex));
    expect(wrapper.findAll("input")).toHaveLength(1);
  });

  it("omits the format lines by default", () => {
    expect(mount(harness(SatHex)).findAll(".sat-format-line")).toHaveLength(0);
  });

  it("folds the format lines in when asked, for compact mode", () => {
    const wrapper = mount(harness(SatHex, { withFormats: true }));
    expect(wrapper.findAll(".sat-format-line").length).toBeGreaterThan(0);
  });
});

describe("SatFormats", () => {
  it("renders one line per format", () => {
    expect(mount(harness(SatFormats)).findAll(".sat-format-line")).toHaveLength(4);
  });

  it("serialises the shared color", () => {
    const text = mount(harness(SatFormats)).text();
    expect(text).toContain("oklch(");
    expect(text).toContain("lch(");
    expect(text).toContain("hsl(");
    expect(text).toContain("display-p3");
  });

  it("restates the color when it changes", async () => {
    const wrapper = mount(harness(SatFormats));
    const before = wrapper.text();
    wrapper.vm.color = new Color("hsv", [120, 1, 1]);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).not.toBe(before);
  });
});

describe("SatSwatches", () => {
  it("renders eight ramp swatches", () => {
    expect(mount(harness(SatSwatches)).findAll("[data-swatch-index]")).toHaveLength(8);
  });

  it("rebuilds the ramp at the current hue", async () => {
    const wrapper = mount(harness(SatSwatches));
    wrapper.vm.color = new Color("hsv", [120, 1, 1]);
    await wrapper.vm.$nextTick();
    expect(wrapper.html()).toContain("hsl(120, 85%");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test docs/test/SatReadouts.test.ts`
Expected: FAIL — cannot resolve `hero/SatHex.vue`.

- [ ] **Step 3: Write the implementations**

Create `docs/.vitepress/components/hero/SatFormats.vue`:

```vue
<script setup lang="ts">
import type { ColorFormat } from "@urcolor/core";
import { computed } from "vue";
import { useHeroColor } from "../../composables/useHeroColor";

const color = useHeroColor();

const FORMATS: ColorFormat[] = ["oklch", "lch", "hsl", "display-p3"];

const lines = computed(() => FORMATS.map(f => color.value.toString(f)));
</script>

<template>
  <div
    class="sat-formats"
    aria-hidden="true"
  >
    <code
      v-for="(line, i) in lines"
      :key="i"
      class="sat-format-line"
    >{{ line }}</code>
  </div>
</template>

<style scoped>
.sat-formats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: clamp(150px, 17vw, 210px);
}

.sat-format-line {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
  background: none;
  padding: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
```

The readout is `aria-hidden` on purpose: it duplicates values a screen reader
already gets from the labelled controls, and announcing four strings on every
drag frame would be hostile.

Create `docs/.vitepress/components/hero/SatHex.vue`:

```vue
<script setup lang="ts">
import type { Color } from "@urcolor/core";
import { setHeroColor, useHeroColor } from "../../composables/useHeroColor";
import SatFormats from "./SatFormats.vue";
import {
  ColorFieldInput,
  ColorFieldRoot,
} from "../../../../packages/vue/src/components/ColorField";

withDefaults(defineProps<{ withFormats?: boolean }>(), { withFormats: false });

const color = useHeroColor();

function onUpdate(next: Color | undefined) {
  setHeroColor(color, next);
}
</script>

<template>
  <div class="sat-hex">
    <ColorFieldRoot
      :model-value="color"
      color-space="hsv"
      format="hex"
      as="div"
      @update:model-value="onUpdate"
    >
      <ColorFieldInput
        as="input"
        class="sat-hex-input"
        aria-label="Hex color"
      />
    </ColorFieldRoot>
    <SatFormats v-if="withFormats" />
  </div>
</template>

<style scoped>
.sat-hex {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: clamp(120px, 13vw, 160px);
}

.sat-hex-input {
  width: 100%;
  padding: 8px 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  letter-spacing: 0.04em;
  text-align: center;
  text-transform: uppercase;
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-bg-soft) 70%, transparent);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s ease;
}

.sat-hex-input:focus {
  border-color: var(--vp-c-brand-1);
}
</style>
```

Create `docs/.vitepress/components/hero/SatSwatches.vue`:

```vue
<script setup lang="ts">
import { computed } from "vue";
import { Color } from "@urcolor/core";
import { hueRamp } from "../../composables/heroOrbit";
import { useHeroColor } from "../../composables/useHeroColor";
import {
  ColorSwatchPickerItem,
  ColorSwatchPickerItemIndicator,
  ColorSwatchPickerItemSwatch,
  ColorSwatchPickerRoot,
} from "../../../../packages/vue/src/components/ColorSwatchPicker";

const color = useHeroColor();

const ramp = computed(() => hueRamp(color.value.to("hsv").get("h") as number));

/**
 * The picker models its value as a CSS string, while the hero models a Color.
 * `selected` stays undefined unless the hero color happens to equal a ramp
 * entry, so the indicator only shows on a real match.
 */
const selected = computed(() => {
  const hex = color.value.toString("hex").toLowerCase();
  return ramp.value.find(c => Color.parse(c)?.toString("hex").toLowerCase() === hex);
});

function onSelect(value: string | string[] | undefined) {
  if (typeof value !== "string") return;
  const next = Color.parse(value);
  if (next) color.value = next;
}
</script>

<template>
  <ColorSwatchPickerRoot
    :model-value="selected"
    as="div"
    orientation="vertical"
    class="sat-swatches"
    @update:model-value="onSelect"
  >
    <ColorSwatchPickerItem
      v-for="(c, i) in ramp"
      :key="c"
      :value="c"
      :data-swatch-index="i"
      as="div"
      class="sat-swatch"
    >
      <ColorSwatchPickerItemSwatch
        as="div"
        class="size-full rounded-md"
      />
      <ColorSwatchPickerItemIndicator
        as="span"
        class="sat-swatch-dot"
      />
    </ColorSwatchPickerItem>
  </ColorSwatchPickerRoot>
</template>

<style scoped>
.sat-swatches {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  width: clamp(88px, 10vw, 116px);
}

.sat-swatch {
  position: relative;
  aspect-ratio: 1;
  cursor: pointer;
  border-radius: 6px;
  outline: none;
}

.sat-swatch[data-highlighted] {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.sat-swatch-dot {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  box-shadow: inset 0 0 0 2px white, inset 0 0 0 3px rgba(0, 0, 0, 0.25);
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test docs/test/SatReadouts.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/components/hero/SatHex.vue docs/.vitepress/components/hero/SatFormats.vue docs/.vitepress/components/hero/SatSwatches.vue docs/test/SatReadouts.test.ts
git commit -m "feat(docs): add hex, format and swatch hero satellites"
```

---

### Task 7: `HeroInstrument` — ring plus morphing core

**Files:**
- Create: `docs/.vitepress/components/HeroInstrument.vue`
- Test: `docs/test/HeroInstrument.test.ts`

**Interfaces:**
- Consumes: `useHeroColor`, `setHeroColor` (Task 1); `nextCoreMode`, `CoreMode` (Task 2); `useReducedMotion` (Task 3).
- Produces: a component with one prop, `paused: boolean`, and a `data-core-mode` attribute on its root reflecting the active mode. Task 9 passes `paused` and measures this element for connector anchors.

Under reduced motion the component never imports gsap and never leaves
`triangle`, which is exactly the condition the tests run under.

- [ ] **Step 1: Write the failing test**

Create `docs/test/HeroInstrument.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { provideHeroColor } from "../.vitepress/composables/useHeroColor";
import HeroInstrument from "../.vitepress/components/HeroInstrument.vue";

// Reduced motion keeps the core on `triangle` and keeps gsap out of the test.
beforeEach(() => {
  (window as unknown as Record<string, unknown>).matchMedia = () => ({
    matches: true,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).matchMedia;
});

const Harness = defineComponent({
  setup() {
    const color = provideHeroColor();
    return { color };
  },
  render() {
    return h("div", [h(HeroInstrument, { paused: false })]);
  },
});

describe("HeroInstrument", () => {
  it("renders the hue ring", () => {
    const wrapper = mount(Harness);
    expect(wrapper.find("[aria-label='Hue']").exists()).toBe(true);
  });

  it("opens on the triangle core", () => {
    expect(mount(Harness).find("[data-core-mode]").attributes("data-core-mode")).toBe("triangle");
  });

  it("stays on triangle under reduced motion", async () => {
    const wrapper = mount(Harness);
    await new Promise(r => setTimeout(r, 50));
    expect(wrapper.find("[data-core-mode]").attributes("data-core-mode")).toBe("triangle");
  });

  it("reflects the shared color on the ring", async () => {
    const wrapper = mount(Harness);
    wrapper.vm.color = new Color("hsv", [200, 1, 1]);
    await wrapper.vm.$nextTick();
    const ring = wrapper.find("[aria-label='Hue']");
    expect(Number(ring.attributes("aria-valuenow"))).toBeCloseTo(200, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test docs/test/HeroInstrument.test.ts`
Expected: FAIL — cannot resolve `HeroInstrument.vue`.

- [ ] **Step 3: Write the implementation**

Create `docs/.vitepress/components/HeroInstrument.vue`:

```vue
<script setup lang="ts">
import type { Color } from "@urcolor/core";
import { onMounted, onUnmounted, ref } from "vue";
import { type CoreMode, nextCoreMode } from "../composables/heroOrbit";
import { useReducedMotion } from "../composables/useReducedMotion";
import { setHeroColor, useHeroColor } from "../composables/useHeroColor";
import {
  ColorRingGradient,
  ColorRingRoot,
  ColorRingThumb,
  ColorRingTrack,
} from "../../../packages/vue/src/components/ColorRing";
import {
  ColorTriangleGradient,
  ColorTriangleRoot,
  ColorTriangleThumb,
} from "../../../packages/vue/src/components/ColorTriangle";
import {
  ColorWheelGradient,
  ColorWheelRoot,
  ColorWheelThumb,
} from "../../../packages/vue/src/components/ColorWheel";
import {
  ColorAreaArea,
  ColorAreaGradient,
  ColorAreaRoot,
  ColorAreaThumb,
} from "../../../packages/vue/src/components/ColorArea";

const props = defineProps<{ paused: boolean }>();

const color = useHeroColor();
const reduced = useReducedMotion();

const mode = ref<CoreMode>("triangle");
const incoming = ref<CoreMode | null>(null);
const coreEl = ref<HTMLElement>();
const activeEl = ref<HTMLElement>();
const incomingEl = ref<HTMLElement>();

const MORPH_INTERVAL = 6000;
const MORPH_DURATION = 0.7;

let timer: ReturnType<typeof setInterval> | undefined;
let gsapRef: typeof import("gsap").default | undefined;
let morphing = false;

function onUpdate(next: Color | undefined) {
  setHeroColor(color, next);
}

/** A control vanishing under the keyboard is worse than a late transition. */
function focusInsideCore() {
  const active = document.activeElement;
  return !!active && !!coreEl.value && coreEl.value.contains(active);
}

function canMorph() {
  return !reduced.value
    && !props.paused
    && !morphing
    && !focusInsideCore()
    && document.visibilityState === "visible";
}

async function morph() {
  if (!canMorph() || !gsapRef) return;
  morphing = true;
  incoming.value = nextCoreMode(mode.value);
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

  const gsap = gsapRef;
  const done = () => {
    mode.value = incoming.value!;
    incoming.value = null;
    morphing = false;
  };

  if (!activeEl.value || !incomingEl.value) {
    done();
    return;
  }

  gsap.to(activeEl.value, {
    opacity: 0,
    scale: 0.94,
    duration: MORPH_DURATION,
    ease: "power2.inOut",
  });
  gsap.fromTo(
    incomingEl.value,
    { opacity: 0, scale: 0.94 },
    { opacity: 1, scale: 1, duration: MORPH_DURATION, ease: "power2.inOut", onComplete: done },
  );
}

onMounted(async () => {
  if (reduced.value) return;
  gsapRef = (await import("gsap")).default;
  timer = setInterval(morph, MORPH_INTERVAL);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (gsapRef) {
    if (activeEl.value) gsapRef.killTweensOf(activeEl.value);
    if (incomingEl.value) gsapRef.killTweensOf(incomingEl.value);
  }
});
</script>

<template>
  <div class="hero-instrument">
    <ColorRingRoot
      :model-value="color"
      color-space="hsv"
      channel="h"
      :inner-radius="0.82"
      as="div"
      class="hero-ring"
      @update:model-value="onUpdate"
    >
      <ColorRingTrack
        as="div"
        class="relative block size-full"
      >
        <ColorRingGradient
          as="div"
          class="absolute inset-0 block"
        />
        <ColorRingThumb
          class="
            size-5 rounded-full border-[2.5px] border-white
            shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_2px_6px_rgba(0,0,0,0.3)]
            focus-visible:shadow-[0_0_0_1px_rgba(0,0,0,0.25),0_0_0_3px_var(--vp-c-brand-soft)]
          "
          aria-label="Hue"
        />
      </ColorRingTrack>
    </ColorRingRoot>

    <div
      ref="coreEl"
      class="hero-core"
      :data-core-mode="mode"
    >
      <div
        v-for="(m, slot) in [mode, incoming]"
        v-show="m"
        :key="slot"
        :ref="el => { if (slot === 0) activeEl = el as HTMLElement; else incomingEl = el as HTMLElement; }"
        class="hero-core-layer"
      >
        <ColorTriangleRoot
          v-if="m === 'triangle'"
          :model-value="color"
          color-space="hsv"
          x-channel="s"
          y-channel="v"
          as="div"
          class="relative block size-full"
          @update:model-value="onUpdate"
        >
          <ColorTriangleGradient
            as="div"
            class="absolute inset-0 block"
          />
          <ColorTriangleThumb
            class="
              size-4 rounded-full border-2 border-white
              shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            "
            aria-label="Saturation and value"
          />
        </ColorTriangleRoot>

        <ColorWheelRoot
          v-else-if="m === 'wheel'"
          :model-value="color"
          color-space="hsv"
          angle-channel="h"
          radius-channel="s"
          as="div"
          class="relative block size-full overflow-hidden rounded-full"
          @update:model-value="onUpdate"
        >
          <ColorWheelGradient
            as="div"
            class="absolute inset-0 block"
          />
          <ColorWheelThumb
            class="
              size-4 rounded-full border-2 border-white
              shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
            "
            aria-label="Hue and saturation"
          />
        </ColorWheelRoot>

        <ColorAreaRoot
          v-else-if="m === 'area'"
          :model-value="color"
          color-space="hsv"
          x-channel="s"
          y-channel="v"
          y-inverted
          as="div"
          class="hero-core-area"
          @update:model-value="onUpdate"
        >
          <ColorAreaArea
            as="div"
            class="absolute inset-0"
          >
            <ColorAreaGradient
              as="div"
              class="absolute inset-0"
            />
            <ColorAreaThumb
              as="div"
              class="
                absolute size-4 transform-(--reka-slider-area-thumb-transform)
                rounded-full border-2 border-white
                shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]
              "
            />
          </ColorAreaArea>
        </ColorAreaRoot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-instrument {
  position: relative;
  width: clamp(280px, 44vmin, 460px);
  aspect-ratio: 1;
}

.hero-ring {
  position: absolute;
  inset: 0;
  display: block;
  container-type: inline-size;
  touch-action: none;
}

/* Inscribed in the ring's inner circle (innerRadius 0.82). */
.hero-core {
  position: absolute;
  inset: 22%;
}

.hero-core-layer {
  position: absolute;
  inset: 0;
  touch-action: none;
}

/* The area core is square; clip it round so the silhouette never changes. */
.hero-core-area {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: clip;
  cursor: crosshair;
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test docs/test/HeroInstrument.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/components/HeroInstrument.vue docs/test/HeroInstrument.test.ts
git commit -m "feat(docs): add HeroInstrument ring with morphing core"
```

---

### Task 8: `HeroConnectors` SVG layer

**Files:**
- Create: `docs/.vitepress/components/HeroConnectors.vue`
- Test: `docs/test/HeroConnectors.test.ts`

**Interfaces:**
- Consumes: `connectorPath`, `edgePoint`, `Dock` (Task 2); `useReducedMotion` (Task 3).
- Produces: a component with props `{ stage: HTMLElement | null; instrument: HTMLElement | null; docks: Dock[]; pulseKey: number }`. Task 9 supplies all four.

Paths are computed from real rects, not CSS, because the endpoints depend on
each dock's rendered size.

- [ ] **Step 1: Write the failing test**

Create `docs/test/HeroConnectors.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import HeroConnectors from "../.vitepress/components/HeroConnectors.vue";
import { DOCKS } from "../.vitepress/composables/heroOrbit";

beforeEach(() => {
  (window as unknown as Record<string, unknown>).matchMedia = () => ({
    matches: true,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).matchMedia;
});

describe("HeroConnectors", () => {
  it("renders nothing until it has a stage", () => {
    const wrapper = mount(HeroConnectors, {
      props: { stage: null, instrument: null, docks: [...DOCKS], pulseKey: 0 },
    });
    expect(wrapper.findAll("path")).toHaveLength(0);
  });

  it("is hidden from assistive technology and from pointers", () => {
    const wrapper = mount(HeroConnectors, {
      props: { stage: null, instrument: null, docks: [...DOCKS], pulseKey: 0 },
    });
    const svg = wrapper.find("svg");
    expect(svg.attributes("aria-hidden")).toBe("true");
    expect(svg.classes()).toContain("hero-connectors");
  });

  it("draws one base path and one pulse path per dock once measured", async () => {
    const stage = document.createElement("div");
    const instrument = document.createElement("div");
    stage.appendChild(instrument);
    for (const dock of DOCKS) {
      const el = document.createElement("div");
      el.setAttribute("data-dock-id", dock.id);
      stage.appendChild(el);
    }
    document.body.appendChild(stage);

    const wrapper = mount(HeroConnectors, {
      props: { stage, instrument, docks: [...DOCKS], pulseKey: 0 },
      attachTo: document.body,
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll("path.hero-connector-base")).toHaveLength(DOCKS.length);
    expect(wrapper.findAll("path.hero-connector-pulse")).toHaveLength(DOCKS.length);
    stage.remove();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test docs/test/HeroConnectors.test.ts`
Expected: FAIL — cannot resolve `HeroConnectors.vue`.

- [ ] **Step 3: Write the implementation**

Create `docs/.vitepress/components/HeroConnectors.vue`:

```vue
<script setup lang="ts">
import type { Dock, Point } from "../composables/heroOrbit";
import { onUnmounted, ref, watch } from "vue";
import { connectorPath, edgePoint } from "../composables/heroOrbit";
import { useReducedMotion } from "../composables/useReducedMotion";

const props = defineProps<{
  stage: HTMLElement | null;
  instrument: HTMLElement | null;
  docks: Dock[];
  /** Bumped by the stage on every color change to trigger a pulse. */
  pulseKey: number;
}>();

const reduced = useReducedMotion();
const paths = ref<{ id: string; d: string }[]>([]);
const size = ref({ w: 0, h: 0 });
const pulseEls = ref<SVGPathElement[]>([]);

let ro: ResizeObserver | undefined;
let frame = 0;
let gsapRef: typeof import("gsap").default | undefined;

/** The dock edge nearest the instrument, in stage-local coordinates. */
function dockAnchor(dockRect: DOMRect, stageRect: DOMRect, center: Point): Point {
  const cx = dockRect.left - stageRect.left + dockRect.width / 2;
  const cy = dockRect.top - stageRect.top + dockRect.height / 2;
  const dx = center.x - cx;
  const dy = center.y - cy;
  if (Math.abs(dx) * dockRect.height > Math.abs(dy) * dockRect.width) {
    return { x: cx + Math.sign(dx) * dockRect.width / 2, y: cy };
  }
  return { x: cx, y: cy + Math.sign(dy) * dockRect.height / 2 };
}

function measure() {
  const stage = props.stage;
  const instrument = props.instrument;
  if (!stage || !instrument) {
    paths.value = [];
    return;
  }

  const stageRect = stage.getBoundingClientRect();
  const instRect = instrument.getBoundingClientRect();
  size.value = { w: stageRect.width, h: stageRect.height };

  const center: Point = {
    x: instRect.left - stageRect.left + instRect.width / 2,
    y: instRect.top - stageRect.top + instRect.height / 2,
  };
  const radius = Math.min(instRect.width, instRect.height) / 2;

  paths.value = props.docks.flatMap((dock) => {
    const el = stage.querySelector<HTMLElement>(`[data-dock-id="${dock.id}"]`);
    if (!el) return [];
    const to = dockAnchor(el.getBoundingClientRect(), stageRect, center);
    const from = edgePoint(center, radius, dock.angle);
    return [{ id: dock.id, d: connectorPath(from, to) }];
  });
}

/** Coalesce resize bursts into one measure per frame. */
function scheduleMeasure() {
  if (frame) cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    frame = 0;
    measure();
  });
}

watch(
  () => [props.stage, props.instrument, props.docks] as const,
  ([stage]) => {
    ro?.disconnect();
    ro = undefined;
    if (!stage) {
      paths.value = [];
      return;
    }
    measure();
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(scheduleMeasure);
      ro.observe(stage);
    }
  },
  { immediate: true, flush: "post" },
);

watch(() => props.pulseKey, async () => {
  if (reduced.value || !pulseEls.value.length) return;
  if (!gsapRef) gsapRef = (await import("gsap")).default;
  const gsap = gsapRef;
  pulseEls.value.forEach((el, i) => {
    if (!el) return;
    const len = el.getTotalLength?.() ?? 200;
    gsap.killTweensOf(el);
    gsap.set(el, { strokeDasharray: `24 ${len}`, strokeDashoffset: len, opacity: 1 });
    gsap.to(el, {
      strokeDashoffset: 0,
      duration: 0.6,
      ease: "power1.out",
      delay: i * 0.04,
      onComplete: () => gsap.set(el, { opacity: 0 }),
    });
  });
});

onUnmounted(() => {
  ro?.disconnect();
  if (frame) cancelAnimationFrame(frame);
  if (gsapRef) pulseEls.value.forEach(el => el && gsapRef!.killTweensOf(el));
});
</script>

<template>
  <svg
    class="hero-connectors"
    :viewBox="`0 0 ${size.w} ${size.h}`"
    :width="size.w"
    :height="size.h"
    aria-hidden="true"
    focusable="false"
  >
    <g
      v-for="(p, i) in paths"
      :key="p.id"
    >
      <path
        class="hero-connector-base"
        :d="p.d"
      />
      <path
        :ref="el => { if (el) pulseEls[i] = el as SVGPathElement; }"
        class="hero-connector-pulse"
        :d="p.d"
      />
    </g>
  </svg>
</template>

<style scoped>
.hero-connectors {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.hero-connector-base {
  fill: none;
  stroke: color-mix(in srgb, var(--vp-c-brand-1) 45%, transparent);
  stroke-width: 1;
}

.hero-connector-pulse {
  fill: none;
  stroke: var(--vp-c-brand-1);
  stroke-width: 2;
  opacity: 0;
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test docs/test/HeroConnectors.test.ts`
Expected: PASS, 3 tests.

happy-dom returns zero-size rects, so the measured paths collapse to a point.
That is fine — the test asserts path *count* and structure, not coordinates.
Coordinates are covered by the pure `connectorPath`/`edgePoint` tests in Task 2.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/components/HeroConnectors.vue docs/test/HeroConnectors.test.ts
git commit -m "feat(docs): add HeroConnectors svg layer"
```

---

### Task 9: `HeroOrbit` stage

**Files:**
- Create: `docs/.vitepress/components/HeroOrbit.vue`
- Test: `docs/test/HeroOrbit.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–8.
- Produces: a component with no props. Task 10 renders it inside `HeroSection`. It must be mounted inside a `provideHeroColor()` tree.

This task also relocates the brand-hue wiring that currently lives in
`HeroDemo.vue` — the same `--vp-c-brand-*` writes, unchanged, in a new home.

- [ ] **Step 1: Write the failing test**

Create `docs/test/HeroOrbit.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { Color } from "@urcolor/core";
import { provideHeroColor } from "../.vitepress/composables/useHeroColor";
import { useBrandHue } from "../.vitepress/composables/useBrandHue";
import HeroOrbit from "../.vitepress/components/HeroOrbit.vue";

beforeEach(() => {
  (window as unknown as Record<string, unknown>).matchMedia = () => ({
    matches: true,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).matchMedia;
});

const Harness = defineComponent({
  setup() {
    const color = provideHeroColor();
    return { color };
  },
  render() {
    return h("div", [h(HeroOrbit)]);
  },
});

describe("HeroOrbit", () => {
  it("renders every dock", () => {
    const wrapper = mount(Harness);
    for (const id of ["hex", "formats", "swatches", "sliders", "fields"]) {
      expect(wrapper.find(`[data-dock-id="${id}"]`).exists()).toBe(true);
    }
  });

  it("renders the instrument", () => {
    expect(mount(Harness).find("[data-core-mode]").exists()).toBe(true);
  });

  it("exposes the responsive mode on the stage", () => {
    const stage = mount(Harness).find(".hero-orbit");
    expect(["orbit", "compact", "stack"]).toContain(stage.attributes("data-mode"));
  });

  it("pushes the color hue into the shared brand hue", async () => {
    const wrapper = mount(Harness);
    wrapper.vm.color = new Color("hsv", [120, 1, 1]);
    await wrapper.vm.$nextTick();
    expect(useBrandHue().value).toBeCloseTo(120, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test docs/test/HeroOrbit.test.ts`
Expected: FAIL — cannot resolve `HeroOrbit.vue`.

- [ ] **Step 3: Write the implementation**

Create `docs/.vitepress/components/HeroOrbit.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { type OrbitMode, docksForMode, orbitModeForWidth } from "../composables/heroOrbit";
import { useBrandHue } from "../composables/useBrandHue";
import { useHeroColor } from "../composables/useHeroColor";
import { useReducedMotion } from "../composables/useReducedMotion";
import HeroConnectors from "./HeroConnectors.vue";
import HeroInstrument from "./HeroInstrument.vue";
import HeroSatellite from "./HeroSatellite.vue";
import SatFields from "./hero/SatFields.vue";
import SatFormats from "./hero/SatFormats.vue";
import SatHex from "./hero/SatHex.vue";
import SatSliders from "./hero/SatSliders.vue";
import SatSwatches from "./hero/SatSwatches.vue";

const color = useHeroColor();
const brandHue = useBrandHue();
const reduced = useReducedMotion();

const stageEl = ref<HTMLElement>();
const instrumentWrapEl = ref<HTMLElement>();
const mode = ref<OrbitMode>("orbit");
const paused = ref(false);
const pulseKey = ref(0);

const docks = computed(() => docksForMode(mode.value));
const docked = computed(() => mode.value !== "stack");

/* ---------- brand hue sync (relocated from HeroDemo.vue) ---------- */

function applyBrandHue(h: number) {
  const el = document.documentElement;
  el.style.setProperty("--vp-c-brand-1", `hsl(${h}, 100%, 69%)`);
  el.style.setProperty("--vp-c-brand-2", `hsl(${h}, 100%, 63%)`);
  el.style.setProperty("--vp-c-brand-3", `hsl(${h}, 82%, 52%)`);
  el.style.setProperty("--vp-c-brand-soft", `hsla(${h}, 100%, 63%, 0.14)`);
  el.style.setProperty(
    "--vp-home-hero-name-background",
    `linear-gradient(135deg, hsl(${h}, 100%, 63%), hsl(${h}, 82%, 52%))`,
  );
}

watch(color, (c) => {
  const h = c.to("hsv").get("h") as number;
  brandHue.value = h;
  if (typeof document !== "undefined") applyBrandHue(h);
  pulseKey.value++;
}, { immediate: true });

/* ---------- responsive mode ---------- */

let ro: ResizeObserver | undefined;

function syncMode() {
  const w = stageEl.value?.clientWidth ?? window.innerWidth;
  mode.value = orbitModeForWidth(w);
}

/* ---------- pointer parallax ---------- */

const MAX_SHIFT = 6;
const MAX_TILT = 3;
let target = { x: 0, y: 0 };
let current = { x: 0, y: 0 };
let raf = 0;

function onPointerMove(e: PointerEvent) {
  if (reduced.value || !stageEl.value) return;
  const r = stageEl.value.getBoundingClientRect();
  if (!r.width || !r.height) return;
  target = {
    x: ((e.clientX - r.left) / r.width - 0.5) * 2,
    y: ((e.clientY - r.top) / r.height - 0.5) * 2,
  };
}

function onPointerLeave() {
  target = { x: 0, y: 0 };
}

function tick() {
  current.x += (target.x - current.x) * 0.08;
  current.y += (target.y - current.y) * 0.08;
  const el = stageEl.value;
  if (el) {
    el.style.setProperty("--px", `${(-current.x * MAX_SHIFT).toFixed(2)}px`);
    el.style.setProperty("--py", `${(-current.y * MAX_SHIFT).toFixed(2)}px`);
    el.style.setProperty("--tilt-x", `${(-current.y * MAX_TILT).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(current.x * MAX_TILT).toFixed(2)}deg`);
  }
  raf = requestAnimationFrame(tick);
}

/* ---------- lifecycle ---------- */

function onPointerDown() { paused.value = true; }
function onPointerUp() { paused.value = false; }

onMounted(() => {
  syncMode();
  if (typeof ResizeObserver !== "undefined" && stageEl.value) {
    ro = new ResizeObserver(syncMode);
    ro.observe(stageEl.value);
  }
  if (!reduced.value) raf = requestAnimationFrame(tick);
});

onUnmounted(() => {
  ro?.disconnect();
  if (raf) cancelAnimationFrame(raf);
});
</script>

<template>
  <div
    ref="stageEl"
    class="hero-orbit"
    :data-mode="mode"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <HeroConnectors
      v-if="docked"
      :stage="stageEl ?? null"
      :instrument="instrumentWrapEl ?? null"
      :docks="docks"
      :pulse-key="pulseKey"
    />

    <div
      ref="instrumentWrapEl"
      class="hero-orbit-center"
    >
      <HeroInstrument :paused="paused" />
    </div>

    <HeroSatellite
      v-for="(dock, i) in docks"
      :key="dock.id"
      :id="dock.id"
      :angle="dock.angle"
      :depth="dock.depth"
      :docked="docked"
      :index="i"
    >
      <SatHex
        v-if="dock.id === 'hex'"
        :with-formats="mode === 'compact'"
      />
      <SatFormats v-else-if="dock.id === 'formats'" />
      <SatSwatches v-else-if="dock.id === 'swatches'" />
      <SatSliders v-else-if="dock.id === 'sliders'" />
      <SatFields v-else-if="dock.id === 'fields'" />
    </HeroSatellite>
  </div>
</template>

<style scoped>
.hero-orbit {
  --orbit-rx: clamp(240px, 34cqw, 430px);
  --orbit-ry: clamp(150px, 30cqh, 270px);
  --px: 0px;
  --py: 0px;
  --tilt-x: 0deg;
  --tilt-y: 0deg;
  position: relative;
  width: 100%;
  container-type: size;
}

.hero-orbit[data-mode="orbit"],
.hero-orbit[data-mode="compact"] {
  height: min(72vh, 620px);
  perspective: 1200px;
}

.hero-orbit[data-mode="compact"] {
  --orbit-rx: clamp(200px, 32cqw, 330px);
  --orbit-ry: clamp(140px, 28cqh, 220px);
}

.hero-orbit-center {
  position: absolute;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
  transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
  transform-style: preserve-3d;
}

/* Stack mode: the ellipse dissolves into ordinary vertical flow. */
.hero-orbit[data-mode="stack"] {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  height: auto;
  perspective: none;
}

.hero-orbit[data-mode="stack"] .hero-orbit-center {
  position: static;
  translate: none;
  transform: none;
  order: -1;
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test docs/test/HeroOrbit.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Verify the whole suite and the type check**

Run: `bun test docs/test/ && bun run lint`
Expected: all docs tests pass, eslint and vue-tsc clean.

- [ ] **Step 6: Commit**

```bash
git add docs/.vitepress/components/HeroOrbit.vue docs/test/HeroOrbit.test.ts
git commit -m "feat(docs): add HeroOrbit stage with parallax and responsive modes"
```

---

### Task 10: Wire into `HeroSection`, retire `HeroDemo`

**Files:**
- Modify: `docs/.vitepress/components/HeroSection.vue` (full rewrite)
- Modify: `docs/.vitepress/components/HeroTitle.vue` (one declaration)
- Delete: `docs/.vitepress/components/HeroDemo.vue`
- Test: `docs/test/HeroSection.test.ts`

**Interfaces:**
- Consumes: `provideHeroColor` (Task 1), `HeroOrbit` (Task 9).
- Produces: the finished home page. Nothing consumes it.

- [ ] **Step 1: Write the failing test**

Create `docs/test/HeroSection.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mount } from "@vue/test-utils";
import HeroSection from "../.vitepress/components/HeroSection.vue";

beforeEach(() => {
  (window as unknown as Record<string, unknown>).matchMedia = () => ({
    matches: true,
    media: "",
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).matchMedia;
});

describe("HeroSection", () => {
  it("provides the hero color to the orbit", () => {
    const wrapper = mount(HeroSection);
    expect(wrapper.find(".hero-orbit").exists()).toBe(true);
    expect(wrapper.find("[data-core-mode]").exists()).toBe(true);
  });

  it("keeps both calls to action", () => {
    const wrapper = mount(HeroSection);
    const hrefs = wrapper.findAll("a.hero-btn").map(a => a.attributes("href"));
    expect(hrefs).toContain("/guide/");
    expect(hrefs).toContain("/components/");
  });

  it("still renders the features grid", () => {
    expect(mount(HeroSection).find(".feature-grid").exists()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test docs/test/HeroSection.test.ts`
Expected: FAIL — `.hero-orbit` not found; `HeroSection` still renders `HeroDemo`.

- [ ] **Step 3: Rewrite `HeroSection.vue`**

Replace the entire contents of `docs/.vitepress/components/HeroSection.vue`:

```vue
<script setup lang="ts">
import { provideHeroColor } from "../composables/useHeroColor";
import FeaturesGrid from "./FeaturesGrid.vue";
import HeroBgCanvas from "./HeroBgCanvas.vue";
import HeroOrbit from "./HeroOrbit.vue";
import HeroTitle from "./HeroTitle.vue";

provideHeroColor();
</script>

<template>
  <div class="hero-section">
    <HeroBgCanvas />

    <div class="hero-stage">
      <div class="hero-content">
        <HeroTitle />
        <p class="hero-tagline">
          Universal color picker component library
        </p>
      </div>

      <HeroOrbit />

      <div class="hero-actions">
        <a
          href="/guide/"
          class="hero-btn hero-btn-brand"
        >Get Started</a>
        <a
          href="/components/"
          class="hero-btn hero-btn-alt"
        >Components</a>
      </div>
    </div>

    <div class="hero-features">
      <FeaturesGrid />
    </div>
  </div>
</template>

<style scoped>
.hero-section {
  position: relative;
  overflow-x: clip;
}

.hero-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: calc(100dvh - var(--vp-nav-height));
  padding: 24px 24px 40px;
  text-align: center;
}

.hero-content {
  max-width: 720px;
}

.hero-tagline {
  font-size: clamp(1rem, 3vw, 1.25rem);
  color: var(--vp-c-text-2);
}

.hero-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.hero-btn {
  display: inline-block;
  padding: 12px 28px;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
}

.hero-btn-brand {
  position: relative;
  overflow: hidden;
  background: color-mix(in srgb, var(--vp-c-brand-2) 80%, transparent);
  backdrop-filter: blur(12px);
  color: var(--vp-button-brand-text);
}

.hero-btn-brand::after {
  content: "";
  position: absolute;
  inset: 0;
  mix-blend-mode: soft-light;
  background: color-mix(in srgb, var(--vp-c-brand-1) 90%, transparent);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.hero-btn-brand:hover::after {
  opacity: 1;
}

.hero-btn-alt {
  border: 1px solid color-mix(in srgb, var(--vp-c-text-1) 15%, transparent);
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-bg-soft) 40%, transparent);
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
}

.hero-btn-alt:hover {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 40%, transparent);
  color: var(--vp-c-brand-1);
}

.hero-features {
  position: relative;
  z-index: 1;
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px 80px;
}

@media (max-width: 768px) {
  .hero-stage {
    min-height: 0;
    padding: 48px 16px 32px;
  }

  .hero-features {
    padding: 0 16px 48px;
  }
}
</style>
```

Note what left: the `gsap`/`ScrollTrigger` import, the `perspectiveEl` ref and
its `rotateX` scroll tween, the 960px cap on the hero, the 180px top padding,
and the whole `.hero-demo-skeleton*` CSS block, which was styling a skeleton
for a component that no longer exists.

- [ ] **Step 4: Shrink the title so the cluster clears the fold**

In `docs/.vitepress/components/HeroTitle.vue`, change exactly one declaration
in `.hero-title`:

```css
  font-size: clamp(2rem, 6vw, 3.5rem);
```

(was `clamp(2rem, 8vw, 5.5rem)`). Nothing else in that file changes — the
word-cycling logic and the measurement span are untouched.

- [ ] **Step 5: Delete `HeroDemo.vue`**

```bash
git rm docs/.vitepress/components/HeroDemo.vue
```

Its markup is not lost — it lives on in `hero/SatSliders.vue` and
`hero/SatFields.vue`.

- [ ] **Step 6: Run the tests**

Run: `bun test docs/test/`
Expected: PASS, all files.

- [ ] **Step 7: Verify lint and the docs build**

Run: `bun run lint`
Expected: clean.

Run: `bun run docs:build`
Expected: succeeds. This is the real gate — it exercises SSR, which is where a
stray `document` reference at module scope would surface.

- [ ] **Step 8: Manual verification**

Run: `bun run docs:dev`, open `http://localhost:4173`, and confirm each of:

- At 1280×800 the instrument is fully visible without scrolling.
- Dragging the hue ring updates the sliders, the channel fields, the hex
  input, the format lines, the swatch ramp, the background shader and the nav
  brand color together.
- The core cycles triangle → wheel → area every 6 seconds, and stops cycling
  while a pointer is held down on any control.
- Connector lines are drawn from the instrument to all five satellites, and a
  highlight travels outward when the color changes.
- Tab reaches every control; focus rings are visible; the core does not morph
  while focus is inside it.
- At 1440px five docks show; at 900px four show with the format lines folded
  into the hex satellite; at 375px the layout is a clean vertical stack with no
  connectors and no horizontal scrollbar.
- With reduced motion forced on in the OS or DevTools rendering pane, nothing
  animates and the core stays on triangle.

- [ ] **Step 9: Commit**

```bash
git add docs/.vitepress/components/HeroSection.vue docs/.vitepress/components/HeroTitle.vue docs/test/HeroSection.test.ts
git commit -m "feat(docs)!: replace stacked hero with orbit instrument cluster

The home page hero was a single centered column: title, tagline, buttons,
picker, features. Individually polished, collectively flat, and the picker
landed below the fold.

It is now an orbit cluster — a ColorRing wrapping a morphing
Triangle/Wheel/Area core, ringed by five docked satellites joined by
connector lines, all driven by one shared color via useHeroColor().

Drops the scroll-driven rotateX, which competed with the cluster's own
motion, and retires HeroDemo.vue, whose markup moved into the slider and
field satellites."
```

---

## Notes for the executor

- **Do not** import from `@urcolor/vue` in any hero file. Relative source paths
  only, matching the file the old `HeroDemo.vue` used.
- **Do not** move an animation out from behind `useReducedMotion()`. The tests
  depend on that gate to run without gsap.
- If a urcolor primitive's prop or emit name differs from what this plan
  assumes, read the corresponding `packages/vue/test/*.test.ts` for ground
  truth and adapt the hero. Never edit `packages/*`.
- Commit after every task. Ten commits is the expected shape of this branch.
