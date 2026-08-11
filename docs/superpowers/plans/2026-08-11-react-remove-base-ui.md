# React: Remove base-ui Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `@base-ui-components/react` in `@urcolor/react` with internal primitives built on `@urcolor/shared`, so the React source compiles under `preact/compat`.

**Architecture:** Add `packages/react/src/primitives/` holding a `Slider` family (Root, Control, Track, Indicator, Thumb) and `Toggle` / `ToggleGroup`. Each is a direct React translation of the equivalent Svelte component in `packages/svelte/src/lib/components/`, which already implements this behaviour with no UI dependency. Swap the 7 import sites, then drop the dependency. Public API, prop names and data-attributes do not change.

**Tech Stack:** React 19, TypeScript, `@urcolor/shared`, `bun test` with happy-dom.

## Global Constraints

- The public API of `@urcolor/react` does not change. Same component names, same prop names, same exports from `index.ts` and every `index.parts.ts`.
- Emitted DOM attributes must remain the ones `@urcolor/shared` defines: `DATA_DISABLED`, `DATA_ORIENTATION`, `DATA_PRESSED`, `DATA_DRAGGING`. Never hardcode the strings.
- Behaviour logic lives in `@urcolor/shared`, never in the React package. If a primitive needs logic that is not there, add it to `shared` in its own commit.
- The React source may import only from `react` (core hooks, `forwardRef`, `createContext`, `useContext`), `@urcolor/core` and `@urcolor/shared`. No `react-dom`, no `useSyncExternalStore`, no `useId` in the primitives. This is what makes the Preact build viable.
- Reference implementations, to be translated rather than reinvented:
  - `packages/svelte/src/lib/components/color-slider/root/ColorSliderRoot.svelte`
  - `packages/svelte/src/lib/components/color-slider/{control,track,range,thumb}/*.svelte`
  - `packages/svelte/src/lib/components/color-swatch-group/root/ColorSwatchGroupRoot.svelte`
- Tests run with `bun test` from the repo root. happy-dom has no layout engine: `getBoundingClientRect()` returns zeros, so any pointer test must stub it explicitly.
- Existing tests must keep passing. Note that 25 of the 33 test files only assert `expect(X).toBeDefined()`; they will not catch a regression. The behaviour tests in this plan are the real safety net and are written before the code they guard.

---

## File Structure

**Created:**

| File | Responsibility |
| --- | --- |
| `packages/react/src/primitives/slider/SliderContext.ts` | Context value shape + `useSliderContext()` |
| `packages/react/src/primitives/slider/SliderRoot.tsx` | Owns value state, drag controller, keyboard; provides context |
| `packages/react/src/primitives/slider/SliderControl.tsx` | Measured, interactive element; attaches pointer/keyboard listeners |
| `packages/react/src/primitives/slider/SliderTrack.tsx` | Rail element, data-attributes only |
| `packages/react/src/primitives/slider/SliderIndicator.tsx` | Filled range, sized from value |
| `packages/react/src/primitives/slider/SliderThumb.tsx` | `role="slider"`, aria, absolute position from value |
| `packages/react/src/primitives/slider/index.ts` | `Slider` namespace barrel |
| `packages/react/src/primitives/toggle/Toggle.tsx` | Standalone pressed-state button |
| `packages/react/src/primitives/toggle/ToggleGroup.tsx` | Selection state + roving focus |
| `packages/react/src/primitives/toggle/ToggleGroupContext.ts` | Group context and item registration handle |
| `packages/react/src/primitives/toggle/index.ts` | `Toggle` / `ToggleGroup` barrel |

**Modified:** the 7 base-ui import sites listed in the spec, plus `packages/react/package.json`.

**Not exported from the package.** `primitives/` is internal; nothing in `src/index.ts` references it.

---

### Task 1: Slider context and root

**Files:**
- Create: `packages/react/src/primitives/slider/SliderContext.ts`
- Create: `packages/react/src/primitives/slider/SliderRoot.tsx`
- Test: `packages/react/src/primitives/slider/SliderRoot.test.tsx`

**Interfaces:**
- Consumes: `SliderState`, `valueFromKey`, `valueFromPosition`, `positionFromValue`, `createDragController`, `DATA_ORIENTATION`, `DATA_DISABLED`, `DATA_DRAGGING` from `@urcolor/shared`.
- Produces:
  - `interface SliderContextValue { state: SliderState; position: number; dragging: boolean; setValue(next: number): void; commit(): void; registerControl(el: HTMLElement | null): void; controlRef: React.RefObject<HTMLElement | null>; }`
  - `const SliderContext: React.Context<SliderContextValue | null>`
  - `function useSliderContext(): SliderContextValue`
  - `interface SliderRootProps` with `value: number`, `onValueChange?: (value: number) => void`, `onValueCommitted?: (value: number) => void`, `min?: number`, `max?: number`, `step?: number`, `disabled?: boolean`, `orientation?: "horizontal" | "vertical"`, `dir?: "ltr" | "rtl"`, `inverted?: boolean`, plus `ComponentPropsWithoutRef<"div">`.
  - `const SliderRoot: React.ForwardRefExoticComponent<...>`

- [ ] **Step 1: Write the failing test**

Create `packages/react/src/primitives/slider/SliderRoot.test.tsx`:

```tsx
import { describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SliderRoot } from "./SliderRoot";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function renderInto(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(node); });
  return {
    container,
    cleanup: () => { act(() => root.unmount()); container.remove(); },
  };
}

describe("SliderRoot", () => {
  it("reflects orientation and disabled as data attributes", () => {
    const { container, cleanup } = renderInto(
      <SliderRoot value={50} orientation="vertical" disabled />,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute("data-orientation")).toBe("vertical");
    expect(el.getAttribute("data-disabled")).toBe("");
    cleanup();
  });

  it("omits data-disabled when enabled", () => {
    const { container, cleanup } = renderInto(<SliderRoot value={50} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.hasAttribute("data-disabled")).toBe(false);
    expect(el.getAttribute("data-orientation")).toBe("horizontal");
    cleanup();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/react/src/primitives/slider/SliderRoot.test.tsx`
Expected: FAIL, cannot resolve `./SliderRoot`.

- [ ] **Step 3: Write the context**

Create `packages/react/src/primitives/slider/SliderContext.ts`:

```ts
import { createContext, useContext, type RefObject } from "react";
import type { SliderState } from "@urcolor/shared";

export interface SliderContextValue {
  /** The value in display units, plus its bounds and axis flags. */
  state: SliderState;
  /** 0-1 offset of the thumb from the track's CSS start edge. */
  position: number;
  /** True while a pointer drag is in flight. */
  dragging: boolean;
  /** Writes a new display value, ignoring no-op repeats. */
  setValue(next: number): void;
  /** Reports the end of an interaction. */
  commit(): void;
  /** The element position-to-value is measured against. */
  controlRef: RefObject<HTMLElement | null>;
}

export const SliderContext = createContext<SliderContextValue | null>(null);

export function useSliderContext(): SliderContextValue {
  const ctx = useContext(SliderContext);
  if (!ctx) throw new Error("Slider parts must be used within Slider.Root");
  return ctx;
}
```

- [ ] **Step 4: Write the root**

Create `packages/react/src/primitives/slider/SliderRoot.tsx`. The drag controller and the epsilon guard are translated from the Svelte root; keyboard lives on the control, not here, because `keydown` from the focused thumb bubbles to it.

```tsx
import { forwardRef, useMemo, useRef, useState, type ComponentPropsWithoutRef } from "react";
import {
  DATA_DISABLED,
  DATA_DRAGGING,
  DATA_ORIENTATION,
  FEEDBACK_EPSILON,
  positionFromValue,
  type SliderState,
} from "@urcolor/shared";
import { SliderContext, type SliderContextValue } from "./SliderContext";

export interface SliderRootProps
  extends Omit<ComponentPropsWithoutRef<"div">, "onChange" | "defaultValue"> {
  /** The value in display units. Always controlled: the colour components own the state. */
  value: number;
  /** Called on every change, including mid-drag. */
  onValueChange?: (value: number) => void;
  /** Called once at the end of an interaction. */
  onValueCommitted?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  /** The reading direction, which mirrors horizontal tracks. */
  dir?: "ltr" | "rtl";
  /** Whether the track runs opposite to its natural direction. */
  inverted?: boolean;
}

export const SliderRoot = forwardRef<HTMLDivElement, SliderRootProps>(
  function SliderRoot(props, ref) {
    const {
      value,
      onValueChange,
      onValueCommitted,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      orientation = "horizontal",
      dir,
      inverted = false,
      children,
      ...rest
    } = props;

    const [dragging, setDragging] = useState(false);
    const controlRef = useRef<HTMLElement | null>(null);

    const state = useMemo<SliderState>(
      () => ({ value, min, max, step, orientation, dir: dir ?? "ltr", inverted, disabled }),
      [value, min, max, step, orientation, dir, inverted, disabled],
    );

    // Handlers read live state through a ref so the control's DOM listeners,
    // attached once, never see a stale closure.
    const stateRef = useRef(state);
    stateRef.current = state;
    const changeRef = useRef(onValueChange);
    changeRef.current = onValueChange;
    const commitRef = useRef(onValueCommitted);
    commitRef.current = onValueCommitted;

    const ctx = useMemo<SliderContextValue>(() => ({
      state,
      position: positionFromValue(state),
      dragging,
      setValue(next: number) {
        const current = stateRef.current;
        if (Math.abs(next - current.value) < FEEDBACK_EPSILON) return;
        changeRef.current?.(next);
      },
      commit() {
        commitRef.current?.(stateRef.current.value);
      },
      controlRef,
    }), [state, dragging]);

    // The setter is handed to the control so a gesture can flag the family.
    (ctx as SliderContextValue & { setDragging(v: boolean): void }).setDragging = setDragging;

    return (
      <SliderContext.Provider value={ctx}>
        <div
          ref={ref}
          dir={dir}
          {...{ [DATA_ORIENTATION]: orientation }}
          {...(disabled ? { [DATA_DISABLED]: "" } : {})}
          {...(dragging ? { [DATA_DRAGGING]: "" } : {})}
          {...rest}
        >
          {children}
        </div>
      </SliderContext.Provider>
    );
  },
);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test packages/react/src/primitives/slider/SliderRoot.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Replace the setDragging cast with a typed field**

The cast in step 4 is a placeholder that must not survive. Add `setDragging(value: boolean): void;` to `SliderContextValue` in `SliderContext.ts`, then in `SliderRoot.tsx` move it inside the `useMemo` object literal as `setDragging,` and delete the assignment line beneath it.

- [ ] **Step 7: Run test again**

Run: `bun test packages/react/src/primitives/slider/SliderRoot.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 8: Commit**

```bash
git add packages/react/src/primitives/slider/
git commit -m "feat(react): add internal slider root primitive"
```

---

### Task 2: Slider control, track, indicator, thumb

**Files:**
- Create: `packages/react/src/primitives/slider/SliderControl.tsx`
- Create: `packages/react/src/primitives/slider/SliderTrack.tsx`
- Create: `packages/react/src/primitives/slider/SliderIndicator.tsx`
- Create: `packages/react/src/primitives/slider/SliderThumb.tsx`
- Create: `packages/react/src/primitives/slider/index.ts`
- Test: `packages/react/src/primitives/slider/SliderParts.test.tsx`

**Interfaces:**
- Consumes: `useSliderContext`, `SliderContextValue` from Task 1.
- Produces: `SliderControl`, `SliderTrack`, `SliderIndicator`, `SliderThumb`, each `forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>`, and `export const Slider = { Root, Control, Track, Indicator, Thumb }`.

- [ ] **Step 1: Write the failing test**

Create `packages/react/src/primitives/slider/SliderParts.test.tsx`:

```tsx
import { describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Slider } from "./index";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function renderInto(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(node); });
  return {
    container,
    cleanup: () => { act(() => root.unmount()); container.remove(); },
  };
}

function tree(value: number, onValueChange?: (v: number) => void, onCommit?: (v: number) => void) {
  return (
    <Slider.Root value={value} min={0} max={100} step={1}
      onValueChange={onValueChange} onValueCommitted={onCommit}>
      <Slider.Control>
        <Slider.Track>
          <Slider.Indicator />
          <Slider.Thumb />
        </Slider.Track>
      </Slider.Control>
    </Slider.Root>
  );
}

describe("Slider parts", () => {
  it("gives the thumb slider semantics", () => {
    const { container, cleanup } = renderInto(tree(30));
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    expect(thumb).not.toBeNull();
    expect(thumb.getAttribute("aria-valuenow")).toBe("30");
    expect(thumb.getAttribute("aria-valuemin")).toBe("0");
    expect(thumb.getAttribute("aria-valuemax")).toBe("100");
    expect(thumb.getAttribute("tabindex")).toBe("0");
    cleanup();
  });

  it("positions the thumb from the value", () => {
    const { container, cleanup } = renderInto(tree(25));
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    expect(thumb.style.left).toBe("25%");
    cleanup();
  });

  it("sizes the indicator from the value", () => {
    const { container, cleanup } = renderInto(tree(40));
    const indicator = container.querySelector("[data-orientation]:not([role])") as HTMLElement;
    const fill = container.querySelectorAll("div");
    expect(Array.from(fill).some(el => el.style.width === "40%")).toBe(true);
    expect(indicator).not.toBeNull();
    cleanup();
  });

  it("steps the value on ArrowRight", () => {
    let seen: number | undefined;
    const { container, cleanup } = renderInto(tree(30, (v) => { seen = v; }));
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    act(() => {
      thumb.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    });
    expect(seen).toBe(31);
    cleanup();
  });

  it("commits once on keyup after a keyboard change", () => {
    let commits = 0;
    const { container, cleanup } = renderInto(tree(30, () => {}, () => { commits += 1; }));
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    act(() => {
      thumb.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
      thumb.dispatchEvent(new window.KeyboardEvent("keyup", { key: "ArrowRight", bubbles: true }));
    });
    expect(commits).toBe(1);
    cleanup();
  });

  it("ignores keys on a disabled slider", () => {
    let seen: number | undefined;
    const { container, cleanup } = renderInto(
      <Slider.Root value={30} disabled onValueChange={(v) => { seen = v; }}>
        <Slider.Control><Slider.Track><Slider.Thumb /></Slider.Track></Slider.Control>
      </Slider.Root>,
    );
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    act(() => {
      thumb.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    });
    expect(seen).toBeUndefined();
    cleanup();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/react/src/primitives/slider/SliderParts.test.tsx`
Expected: FAIL, cannot resolve `./index`.

- [ ] **Step 3: Write the control**

Create `packages/react/src/primitives/slider/SliderControl.tsx`. It is the measured element and the single listener host, mirroring the Svelte root's `interaction` attachment.

```tsx
import { forwardRef, useCallback, useEffect, useMemo, useRef, type ComponentPropsWithoutRef } from "react";
import {
  createDragController,
  DATA_DISABLED,
  DATA_ORIENTATION,
  valueFromKey,
  valueFromPosition,
} from "@urcolor/shared";
import { useSliderContext } from "./SliderContext";

export interface SliderControlProps extends ComponentPropsWithoutRef<"div"> {}

export const SliderControl = forwardRef<HTMLDivElement, SliderControlProps>(
  function SliderControl({ children, ...rest }, forwardedRef) {
    const ctx = useSliderContext();
    const nodeRef = useRef<HTMLDivElement | null>(null);

    // Live view of the context for listeners attached once on mount.
    const ctxRef = useRef(ctx);
    ctxRef.current = ctx;

    const setRefs = useCallback((node: HTMLDivElement | null) => {
      nodeRef.current = node;
      ctxRef.current.controlRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }, [forwardedRef]);

    const drag = useMemo(() => createDragController({
      getElement: () => nodeRef.current,
      isDisabled: () => ctxRef.current.state.disabled,
      onStart: () => ctxRef.current.setDragging(true),
      onMove: (point) => {
        const current = ctxRef.current;
        const position = current.state.orientation === "vertical" ? point.normalizedY : point.normalizedX;
        current.setValue(valueFromPosition(current.state, position));
      },
      onEnd: () => {
        ctxRef.current.setDragging(false);
        ctxRef.current.commit();
      },
    }), []);

    useEffect(() => {
      const node = nodeRef.current;
      if (!node) return;
      let keyboardActive = false;

      const onPointerDown = (event: PointerEvent) => {
        drag.pointerDown(event);
        // `pointerDown` calls `preventDefault`, which suppresses the focus the
        // browser would have moved to the thumb; do it explicitly instead.
        if (drag.isDragging) node.querySelector<HTMLElement>("[role='slider']")?.focus();
      };
      const onPointerMove = (event: PointerEvent) => drag.pointerMove(event);
      const onPointerUp = (event: PointerEvent) => drag.pointerUp(event);
      const onPointerCancel = () => {
        drag.pointerCancel();
        ctxRef.current.setDragging(false);
      };
      const onKeyDown = (event: KeyboardEvent) => {
        const next = valueFromKey(ctxRef.current.state, event);
        if (next === undefined) return;
        event.preventDefault();
        keyboardActive = true;
        ctxRef.current.setValue(next);
      };
      const onKeyUp = () => {
        if (!keyboardActive) return;
        keyboardActive = false;
        ctxRef.current.commit();
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
      };
    }, [drag]);

    return (
      <div
        ref={setRefs}
        {...{ [DATA_ORIENTATION]: ctx.state.orientation }}
        {...(ctx.state.disabled ? { [DATA_DISABLED]: "" } : {})}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
```

- [ ] **Step 4: Write the track**

Create `packages/react/src/primitives/slider/SliderTrack.tsx`:

```tsx
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { DATA_DISABLED, DATA_ORIENTATION } from "@urcolor/shared";
import { useSliderContext } from "./SliderContext";

export interface SliderTrackProps extends ComponentPropsWithoutRef<"div"> {}

export const SliderTrack = forwardRef<HTMLDivElement, SliderTrackProps>(
  function SliderTrack({ children, ...rest }, ref) {
    const { state } = useSliderContext();
    return (
      <div
        ref={ref}
        {...{ [DATA_ORIENTATION]: state.orientation }}
        {...(state.disabled ? { [DATA_DISABLED]: "" } : {})}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
```

- [ ] **Step 5: Write the indicator**

Create `packages/react/src/primitives/slider/SliderIndicator.tsx`. The `fillsFromStart` trick is taken from the Svelte range: asking the primitive where `min` renders keeps `dir`, `inverted` and vertical flipping in one place.

```tsx
import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from "react";
import { clamp, DATA_DISABLED, DATA_ORIENTATION, positionFromValue } from "@urcolor/shared";
import { useSliderContext } from "./SliderContext";

export interface SliderIndicatorProps extends ComponentPropsWithoutRef<"div"> {}

export const SliderIndicator = forwardRef<HTMLDivElement, SliderIndicatorProps>(
  function SliderIndicator({ style, children, ...rest }, ref) {
    const { state } = useSliderContext();
    const fraction = state.max === state.min
      ? 0
      : clamp((state.value - state.min) / (state.max - state.min), 0, 1);
    const fillsFromStart = positionFromValue({ ...state, value: state.min }) === 0;

    const layout: CSSProperties = state.orientation === "vertical"
      ? { position: "absolute", left: 0, right: 0, height: `${fraction * 100}%`, ...(fillsFromStart ? { top: 0 } : { bottom: 0 }) }
      : { position: "absolute", top: 0, bottom: 0, width: `${fraction * 100}%`, ...(fillsFromStart ? { left: 0 } : { right: 0 }) };

    return (
      <div
        ref={ref}
        // The caller's declarations come last so they win the cascade.
        style={{ ...layout, ...style }}
        {...{ [DATA_ORIENTATION]: state.orientation }}
        {...(state.disabled ? { [DATA_DISABLED]: "" } : {})}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
```

- [ ] **Step 6: Write the thumb**

Create `packages/react/src/primitives/slider/SliderThumb.tsx`:

```tsx
import { forwardRef, type ComponentPropsWithoutRef, type CSSProperties } from "react";
import { DATA_DISABLED, DATA_DRAGGING, DATA_ORIENTATION, sliderAria } from "@urcolor/shared";
import { useSliderContext } from "./SliderContext";

export interface SliderThumbProps extends ComponentPropsWithoutRef<"div"> {}

export const SliderThumb = forwardRef<HTMLDivElement, SliderThumbProps>(
  function SliderThumb({ style, children, ...rest }, ref) {
    const { state, position, dragging } = useSliderContext();
    const aria = sliderAria(state);
    const offset = `${position * 100}%`;

    const layout: CSSProperties = state.orientation === "vertical"
      ? { position: "absolute", top: offset, left: "50%", translate: "-50% -50%" }
      : { position: "absolute", left: offset, top: "50%", translate: "-50% -50%" };

    // `tabindex` is the DOM attribute name; React spells the prop `tabIndex`.
    const { tabindex, ...ariaProps } = aria;

    return (
      <div
        ref={ref}
        {...ariaProps}
        tabIndex={tabindex}
        style={{ ...layout, ...style }}
        {...{ [DATA_ORIENTATION]: state.orientation }}
        {...(state.disabled ? { [DATA_DISABLED]: "" } : {})}
        {...(dragging ? { [DATA_DRAGGING]: "" } : {})}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
```

- [ ] **Step 7: Write the barrel**

Create `packages/react/src/primitives/slider/index.ts`:

```ts
import { SliderRoot } from "./SliderRoot";
import { SliderControl } from "./SliderControl";
import { SliderTrack } from "./SliderTrack";
import { SliderIndicator } from "./SliderIndicator";
import { SliderThumb } from "./SliderThumb";

export const Slider = {
  Root: SliderRoot,
  Control: SliderControl,
  Track: SliderTrack,
  Indicator: SliderIndicator,
  Thumb: SliderThumb,
};

export type { SliderRootProps } from "./SliderRoot";
export type { SliderControlProps } from "./SliderControl";
export type { SliderTrackProps } from "./SliderTrack";
export type { SliderIndicatorProps } from "./SliderIndicator";
export type { SliderThumbProps } from "./SliderThumb";
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `bun test packages/react/src/primitives/slider/`
Expected: PASS, 8 tests across both files.

- [ ] **Step 9: Commit**

```bash
git add packages/react/src/primitives/slider/
git commit -m "feat(react): add internal slider parts primitives"
```

---

### Task 3: Swap ColorSlider onto the primitive

**Files:**
- Modify: `packages/react/src/components/color-slider/root/ColorSliderRoot.tsx:2`, `:124-138`
- Modify: `packages/react/src/components/color-slider/control/ColorSliderControl.tsx:2`
- Modify: `packages/react/src/components/color-slider/track/ColorSliderTrack.tsx:2`
- Modify: `packages/react/src/components/color-slider/range/ColorSliderRange.tsx:2`
- Modify: `packages/react/src/components/color-slider/thumb/ColorSliderThumb.tsx:2`
- Test: `packages/react/src/components/color-slider/ColorSlider.behavior.test.tsx`

**Interfaces:**
- Consumes: `Slider` from `../../../primitives/slider`.
- Produces: no API change. `ColorSlider.Root` now honours `dir` and `inverted`, which base-ui never received.

- [ ] **Step 1: Write the failing test**

Create `packages/react/src/components/color-slider/ColorSlider.behavior.test.tsx`:

```tsx
import { describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Color } from "@urcolor/core";
import { ColorSlider } from "./index";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function renderInto(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(node); });
  return {
    container,
    cleanup: () => { act(() => root.unmount()); container.remove(); },
  };
}

function hueSlider(onValueChange?: (c: Color) => void, extra: Record<string, unknown> = {}) {
  return (
    <ColorSlider.Root value="hsl(210, 80%, 50%)" channel="h" onValueChange={onValueChange} {...extra}>
      <ColorSlider.Control>
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider.Control>
    </ColorSlider.Root>
  );
}

describe("ColorSlider behaviour", () => {
  it("exposes the channel value through slider aria", () => {
    const { container, cleanup } = renderInto(hueSlider());
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    expect(thumb.getAttribute("aria-valuenow")).toBe("210");
    expect(thumb.getAttribute("aria-valuemax")).toBe("360");
    cleanup();
  });

  it("advances the hue on ArrowRight", () => {
    let next: Color | undefined;
    const { container, cleanup } = renderInto(hueSlider((c) => { next = c; }));
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    act(() => {
      thumb.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    });
    expect(next).toBeDefined();
    expect(Math.round(next!.to("hsl").get("h"))).toBe(211);
    cleanup();
  });

  it("reverses arrow direction when inverted", () => {
    let next: Color | undefined;
    const { container, cleanup } = renderInto(hueSlider((c) => { next = c; }, { inverted: true }));
    const thumb = container.querySelector("[role='slider']") as HTMLElement;
    act(() => {
      thumb.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    });
    expect(Math.round(next!.to("hsl").get("h"))).toBe(209);
    cleanup();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/react/src/components/color-slider/ColorSlider.behavior.test.tsx`
Expected: FAIL. The first two may pass through base-ui; the `inverted` test fails, because `ColorSliderRoot` never forwards `inverted`.

- [ ] **Step 3: Swap the four leaf parts**

In each of `control/ColorSliderControl.tsx`, `track/ColorSliderTrack.tsx`, `range/ColorSliderRange.tsx` and `thumb/ColorSliderThumb.tsx`, replace line 2:

```tsx
import { Slider } from "@base-ui-components/react/slider";
```

with:

```tsx
import { Slider } from "../../../primitives/slider";
```

No other line changes: `Slider.Control`, `Slider.Track`, `Slider.Indicator` and `Slider.Thumb` all keep their names.

- [ ] **Step 4: Swap the root and forward the axis props**

In `root/ColorSliderRoot.tsx`, replace the base-ui import with `import { Slider } from "../../../primitives/slider";`, then add `dir` and `inverted` to the rendered `Slider.Root`:

```tsx
        <Slider.Root
          ref={ref}
          value={sliderValue}
          onValueChange={handleValueChange}
          onValueCommitted={handleValueCommitted}
          min={channelConfig?.min ?? 0}
          max={channelConfig?.max ?? 100}
          step={channelConfig?.step ?? 1}
          disabled={disabled}
          orientation={orientation}
          dir={dir}
          inverted={inverted}
          className={className}
          style={style}
        >
          {children}
        </Slider.Root>
```

- [ ] **Step 5: Run the slider tests**

Run: `bun test packages/react/src/components/color-slider/`
Expected: PASS, including the three new behaviour tests and the existing `is defined` files.

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/components/color-slider/
git commit -m "feat(react): move ColorSlider onto the internal slider primitive"
```

---

### Task 4: Toggle primitive and ColorSwatch

**Files:**
- Create: `packages/react/src/primitives/toggle/ToggleGroupContext.ts`
- Create: `packages/react/src/primitives/toggle/Toggle.tsx`
- Modify: `packages/react/src/components/color-swatch/ColorSwatch.tsx:4`, `:41-66`
- Test: `packages/react/src/primitives/toggle/Toggle.test.tsx`

**Interfaces:**
- Consumes: `toggleAria`, `isToggleActivationKey`, `rovingTabIndex`, `ToggleGroupState` from `@urcolor/shared`.
- Produces:
  - `interface ToggleGroupContextValue { type: "single" | "multiple"; disabled: boolean; isSelected(value: string): boolean; toggle(value: string): void; register(): { index: number; tabIndex: 0 | -1; dispose(): void }; }`
  - `const ToggleGroupContext: React.Context<ToggleGroupContextValue | null>`
  - `interface ToggleProps extends Omit<ComponentPropsWithoutRef<"button">, "value"> { value?: string; pressed?: boolean; defaultPressed?: boolean; disabled?: boolean; onPressedChange?: (pressed: boolean) => void; }`
  - `const Toggle: React.ForwardRefExoticComponent<...>` rendering a `<button>`.

Note the API difference from base-ui: this `Toggle` renders a real `<button>` and takes children, replacing base-ui's `render` prop. Task 4 step 5 rewrites `ColorSwatch`'s group branch accordingly.

- [ ] **Step 1: Write the failing test**

Create `packages/react/src/primitives/toggle/Toggle.test.tsx`:

```tsx
import { describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Toggle } from "./Toggle";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function renderInto(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(node); });
  return {
    container,
    cleanup: () => { act(() => root.unmount()); container.remove(); },
  };
}

describe("Toggle", () => {
  it("reports its pressed state through aria and data attributes", () => {
    const { container, cleanup } = renderInto(<Toggle pressed />);
    const button = container.querySelector("button") as HTMLElement;
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("data-pressed")).toBe("");
    cleanup();
  });

  it("flips on click when uncontrolled", () => {
    let seen: boolean | undefined;
    const { container, cleanup } = renderInto(
      <Toggle defaultPressed={false} onPressedChange={(p) => { seen = p; }} />,
    );
    const button = container.querySelector("button") as HTMLElement;
    act(() => { button.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); });
    expect(seen).toBe(true);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    cleanup();
  });

  it("does not flip when disabled", () => {
    let seen: boolean | undefined;
    const { container, cleanup } = renderInto(
      <Toggle disabled onPressedChange={(p) => { seen = p; }} />,
    );
    const button = container.querySelector("button") as HTMLElement;
    act(() => { button.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); });
    expect(seen).toBeUndefined();
    expect(button.getAttribute("data-disabled")).toBe("");
    cleanup();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/react/src/primitives/toggle/Toggle.test.tsx`
Expected: FAIL, cannot resolve `./Toggle`.

- [ ] **Step 3: Write the group context**

Create `packages/react/src/primitives/toggle/ToggleGroupContext.ts`:

```ts
import { createContext, useContext } from "react";

export type SelectionType = "single" | "multiple";

export interface ToggleGroupContextValue {
  type: SelectionType;
  disabled: boolean;
  isSelected(value: string): boolean;
  toggle(value: string): void;
}

export const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null);

/** Null outside a group: a standalone Toggle owns its own state. */
export function useToggleGroupContext(): ToggleGroupContextValue | null {
  return useContext(ToggleGroupContext);
}
```

- [ ] **Step 4: Write the toggle**

Create `packages/react/src/primitives/toggle/Toggle.tsx`:

```tsx
import { forwardRef, useState, type ComponentPropsWithoutRef } from "react";
import { toggleAria } from "@urcolor/shared";
import { useToggleGroupContext } from "./ToggleGroupContext";

export interface ToggleProps extends Omit<ComponentPropsWithoutRef<"button">, "value" | "onChange"> {
  /** Selection key when inside a ToggleGroup. */
  value?: string;
  /** The controlled pressed state. */
  pressed?: boolean;
  /** The pressed state used until the first interaction when uncontrolled. */
  defaultPressed?: boolean;
  disabled?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  function Toggle(props, ref) {
    const {
      value,
      pressed: pressedProp,
      defaultPressed = false,
      disabled: disabledProp = false,
      onPressedChange,
      onClick,
      children,
      ...rest
    } = props;

    const group = useToggleGroupContext();
    const [internalPressed, setInternalPressed] = useState(defaultPressed);

    // A group owns the selection; outside one the toggle falls back to its own.
    const pressed = group && value !== undefined
      ? group.isSelected(value)
      : pressedProp ?? internalPressed;
    const disabled = disabledProp || (group?.disabled ?? false);

    const aria = toggleAria(pressed, disabled);
    // `tabindex` is the DOM attribute name; React spells the prop `tabIndex`.
    const { tabindex, ...ariaProps } = aria;

    function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
      onClick?.(event);
      if (disabled) return;
      if (group && value !== undefined) {
        group.toggle(value);
        return;
      }
      if (pressedProp === undefined) setInternalPressed(!pressed);
      onPressedChange?.(!pressed);
    }

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || undefined}
        {...ariaProps}
        tabIndex={tabindex}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
```

Space and Enter need no handler: a native `<button>` already turns both into a click, which is why `isToggleActivationKey` is not used here.

- [ ] **Step 5: Rewrite the ColorSwatch group branch**

In `packages/react/src/components/color-swatch/ColorSwatch.tsx`, replace the base-ui import on line 4 with `import { Toggle } from "../../primitives/toggle/Toggle";`, then replace the whole `if (groupCtx) { ... }` block with:

```tsx
    if (groupCtx) {
      const isDisabled = disabledProp || groupCtx.disabled;

      const isSelected = groupCtx.isSelected(value as string);

      return (
        <Toggle
          ref={ref as React.Ref<HTMLButtonElement>}
          value={value as string}
          disabled={isDisabled}
          role="img"
          // `data-state` is documented in docs/components/react/color-swatch.md
          // and must survive the move off base-ui.
          data-state={isSelected ? "on" : "off"}
          style={{ ...swatchStyle, ...style }}
          {...props}
        />
      );
    }
```

`data-pressed` and `data-disabled` now come from `toggleAria` inside `Toggle`. `data-state` is emitted here rather than by the primitive, because it is a `ColorSwatch` documented attribute, not a toggle concern.

This requires `isSelected` on the swatch-group context. `ColorSwatchGroupContext` currently carries only `type` and `disabled`, so extend `packages/react/src/components/color-swatch-group/root/ColorSwatchGroupRootContext.ts`:

```ts
export interface ColorSwatchGroupContextValue {
  type: SelectionType;
  disabled: boolean;
  /** Whether a swatch value is in the current selection. */
  isSelected(value: string): boolean;
}
```

and in Task 5 step 5 supply it from the same selection state the `ToggleGroup` holds. Because both contexts need the selection, `ColorSwatchGroupRoot` reads it back through `useToggleGroupContext()` from inside a child rather than duplicating the state: wrap the existing `ColorSwatchGroupContext.Provider` so it sits *inside* `ToggleGroup`, and have it build its value from the toggle-group context.

- [ ] **Step 6: Run the tests**

Run: `bun test packages/react/src/primitives/toggle/ packages/react/src/components/color-swatch/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/primitives/toggle/ packages/react/src/components/color-swatch/
git commit -m "feat(react): add internal toggle primitive and move ColorSwatch onto it"
```

---

### Task 5: ToggleGroup primitive and ColorSwatchGroup

**Files:**
- Create: `packages/react/src/primitives/toggle/ToggleGroup.tsx`
- Create: `packages/react/src/primitives/toggle/index.ts`
- Modify: `packages/react/src/components/color-swatch-group/root/ColorSwatchGroupRoot.tsx:2`, `:38-56`
- Test: `packages/react/src/primitives/toggle/ToggleGroup.test.tsx`

**Interfaces:**
- Consumes: `Toggle`, `ToggleGroupContext` from Task 4; `rovingIndexFromKey`, `ToggleGroupState`, `DATA_ORIENTATION`, `DATA_DISABLED` from `@urcolor/shared`.
- Produces: `interface ToggleGroupProps extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> { value?: string[]; defaultValue?: string[]; multiple?: boolean; disabled?: boolean; orientation?: "horizontal" | "vertical"; dir?: "ltr" | "rtl"; loopFocus?: boolean; onValueChange?: (value: string[]) => void; }` and `const ToggleGroup`.

Roving focus reads the items from the DOM rather than from a registry, matching the Svelte group: items are supplied by the caller, so they are found by shape.

- [ ] **Step 1: Write the failing test**

Create `packages/react/src/primitives/toggle/ToggleGroup.test.tsx`:

```tsx
import { describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Toggle } from "./Toggle";
import { ToggleGroup } from "./ToggleGroup";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function renderInto(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(node); });
  return {
    container,
    cleanup: () => { act(() => root.unmount()); container.remove(); },
  };
}

function group(props: Record<string, unknown> = {}) {
  return (
    <ToggleGroup {...props}>
      <Toggle value="red" />
      <Toggle value="green" />
      <Toggle value="blue" />
    </ToggleGroup>
  );
}

describe("ToggleGroup", () => {
  it("selects a single value by default", () => {
    let seen: string[] | undefined;
    const { container, cleanup } = renderInto(group({ onValueChange: (v: string[]) => { seen = v; } }));
    const buttons = container.querySelectorAll("button");
    act(() => { buttons[1]!.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); });
    expect(seen).toEqual(["green"]);
    cleanup();
  });

  it("replaces the selection in single mode", () => {
    let seen: string[] | undefined;
    const { container, cleanup } = renderInto(
      group({ defaultValue: ["red"], onValueChange: (v: string[]) => { seen = v; } }),
    );
    const buttons = container.querySelectorAll("button");
    act(() => { buttons[2]!.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); });
    expect(seen).toEqual(["blue"]);
    cleanup();
  });

  it("accumulates the selection when multiple", () => {
    let seen: string[] | undefined;
    const { container, cleanup } = renderInto(
      group({ multiple: true, defaultValue: ["red"], onValueChange: (v: string[]) => { seen = v; } }),
    );
    const buttons = container.querySelectorAll("button");
    act(() => { buttons[1]!.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); });
    expect(seen).toEqual(["red", "green"]);
    cleanup();
  });

  it("moves the tab stop with ArrowRight", () => {
    const { container, cleanup } = renderInto(group());
    const buttons = Array.from(container.querySelectorAll("button"));
    expect(buttons[0]!.getAttribute("tabindex")).toBe("0");
    act(() => {
      buttons[0]!.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    });
    expect(buttons[1]!.getAttribute("tabindex")).toBe("0");
    expect(buttons[0]!.getAttribute("tabindex")).toBe("-1");
    cleanup();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/react/src/primitives/toggle/ToggleGroup.test.tsx`
Expected: FAIL, cannot resolve `./ToggleGroup`.

- [ ] **Step 3: Write the group**

Create `packages/react/src/primitives/toggle/ToggleGroup.tsx`:

```tsx
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { DATA_DISABLED, DATA_ORIENTATION, rovingIndexFromKey } from "@urcolor/shared";
import { ToggleGroupContext, type ToggleGroupContextValue } from "./ToggleGroupContext";

/**
 * Roving focus needs the items as DOM nodes, and items are supplied by the
 * caller rather than rendered here, so they are found by shape: a native
 * button, an explicit button role, or anything carrying the tab stop.
 */
const ITEM_SELECTOR = "button, [role='button'], [tabindex]";

export interface ToggleGroupProps
  extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> {
  /** The controlled selection. */
  value?: string[];
  /** The selection used until the first interaction when uncontrolled. */
  defaultValue?: string[];
  /** Whether more than one item may be selected at a time. */
  multiple?: boolean;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  /** The reading direction, which mirrors horizontal arrow navigation. */
  dir?: "ltr" | "rtl";
  /** Whether keyboard focus wraps past the last item. */
  loopFocus?: boolean;
  onValueChange?: (value: string[]) => void;
}

export const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps>(
  function ToggleGroup(props, forwardedRef) {
    const {
      value,
      defaultValue,
      multiple = false,
      disabled = false,
      orientation = "horizontal",
      dir,
      loopFocus = true,
      onValueChange,
      children,
      ...rest
    } = props;

    const [internalValue, setInternalValue] = useState<string[]>(defaultValue ?? []);
    const [activeIndex, setActiveIndex] = useState(0);
    const nodeRef = useRef<HTMLDivElement | null>(null);

    const selection = value ?? internalValue;

    const setRefs = useCallback((node: HTMLDivElement | null) => {
      nodeRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }, [forwardedRef]);

    const commit = useCallback((next: string[]) => {
      if (value === undefined) setInternalValue(next);
      onValueChange?.(next);
    }, [value, onValueChange]);

    const ctx = useMemo<ToggleGroupContextValue>(() => ({
      type: multiple ? "multiple" : "single",
      disabled,
      isSelected: (itemValue: string) => selection.includes(itemValue),
      toggle: (itemValue: string) => {
        if (disabled) return;
        if (selection.includes(itemValue)) {
          commit(multiple ? selection.filter(entry => entry !== itemValue) : []);
          return;
        }
        commit(multiple ? [...selection, itemValue] : [itemValue]);
      },
    }), [multiple, disabled, selection, commit]);

    /** Items in DOM order, excluding anything nested inside another item. */
    const itemNodes = useCallback((root: HTMLElement): HTMLElement[] => {
      const found = Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
      return found.filter((node) => {
        const enclosing = node.parentElement?.closest<HTMLElement>(ITEM_SELECTOR);
        return !enclosing || enclosing === root || !root.contains(enclosing);
      });
    }, []);

    // The tab stop is written straight to the DOM: items come from the caller,
    // so the group cannot pass them a prop.
    useEffect(() => {
      const node = nodeRef.current;
      if (!node) return;
      const nodes = itemNodes(node);
      nodes.forEach((item, index) => {
        item.setAttribute("tabindex", index === activeIndex ? "0" : "-1");
      });
    });

    useEffect(() => {
      const node = nodeRef.current;
      if (!node) return;

      const onKeyDown = (event: KeyboardEvent) => {
        if (disabled) return;
        const nodes = itemNodes(node);
        if (nodes.length === 0) return;
        const next = rovingIndexFromKey(
          {
            activeIndex: Math.min(activeIndex, nodes.length - 1),
            count: nodes.length,
            orientation,
            dir: dir ?? "ltr",
            loop: loopFocus,
          },
          event.key,
        );
        if (next === undefined) return;
        event.preventDefault();
        setActiveIndex(next);
        nodes[next]?.focus();
      };
      /** Clicking or tabbing into an item moves the tab stop to it. */
      const onFocusIn = (event: FocusEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const index = itemNodes(node).findIndex(item => item === target || item.contains(target));
        if (index >= 0) setActiveIndex(index);
      };

      node.addEventListener("keydown", onKeyDown);
      node.addEventListener("focusin", onFocusIn);
      return () => {
        node.removeEventListener("keydown", onKeyDown);
        node.removeEventListener("focusin", onFocusIn);
      };
    }, [activeIndex, disabled, orientation, dir, loopFocus, itemNodes]);

    return (
      <ToggleGroupContext.Provider value={ctx}>
        <div
          ref={setRefs}
          role="group"
          dir={dir}
          {...{ [DATA_ORIENTATION]: orientation }}
          {...(disabled ? { [DATA_DISABLED]: "" } : {})}
          {...rest}
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    );
  },
);
```

- [ ] **Step 4: Write the barrel**

Create `packages/react/src/primitives/toggle/index.ts`:

```ts
export { Toggle, type ToggleProps } from "./Toggle";
export { ToggleGroup, type ToggleGroupProps } from "./ToggleGroup";
export { ToggleGroupContext, useToggleGroupContext, type SelectionType, type ToggleGroupContextValue } from "./ToggleGroupContext";
```

- [ ] **Step 5: Swap ColorSwatchGroupRoot**

Every prop the component passes today exists on `ToggleGroupProps` with the same meaning: `multiple={type === "multiple"}`, `loopFocus`, `orientation`, `disabled`, `value`, `defaultValue`, `onValueChange`.

The one structural change is the swatch-group context, which now needs `isSelected` (Task 4 step 5). Rather than duplicating the selection state, the provider moves *inside* `ToggleGroup` and reads it back out. Add this bridge component at the bottom of the file:

```tsx
function ColorSwatchGroupProvider(
  { type, disabled, children }: { type: SelectionType; disabled: boolean; children?: React.ReactNode },
) {
  const toggleCtx = useToggleGroupContext();
  const ctxValue = useMemo<ColorSwatchGroupContextValue>(() => ({
    type,
    disabled,
    isSelected: (value: string) => toggleCtx?.isSelected(value) ?? false,
  }), [type, disabled, toggleCtx]);

  return (
    <ColorSwatchGroupContext.Provider value={ctxValue}>
      {children}
    </ColorSwatchGroupContext.Provider>
  );
}
```

Replace line 2's base-ui import with:

```tsx
import { ToggleGroup, useToggleGroupContext } from "../../../primitives/toggle";
```

and replace the returned JSX with:

```tsx
      <ToggleGroup
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        orientation={orientation}
        loopFocus={loopFocus}
        multiple={type === "multiple"}
        {...rest}
      >
        <ColorSwatchGroupProvider type={type} disabled={disabled}>
          {children}
        </ColorSwatchGroupProvider>
      </ToggleGroup>
```

The old `onValueChange ? (val) => onValueChange(val as string[]) : undefined` wrapper goes: `ToggleGroupProps["onValueChange"]` is already `(value: string[]) => void`, so the cast has nothing left to do.

- [ ] **Step 6: Run the tests**

Run: `bun test packages/react/src/primitives/ packages/react/src/components/color-swatch-group/`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/primitives/toggle/ packages/react/src/components/color-swatch-group/
git commit -m "feat(react): add internal toggle-group primitive and move ColorSwatchGroup onto it"
```

---

### Task 6: Drop the dependency and verify

**Files:**
- Modify: `packages/react/package.json` (remove `@base-ui-components/react` from `dependencies`)
- Modify: `bun.lock` (regenerated)

**Interfaces:**
- Consumes: Tasks 1-5 complete.
- Produces: a `@urcolor/react` whose only runtime dependencies are `@urcolor/core` and `@urcolor/shared`.

- [ ] **Step 1: Confirm no import sites remain**

Run: `grep -rn "base-ui" packages/react/`
Expected: no output. If anything prints, swap it before continuing.

- [ ] **Step 2: Remove the dependency**

In `packages/react/package.json`, delete the `"@base-ui-components/react": "^1.0.0-rc.0"` line from `dependencies`.

- [ ] **Step 3: Reinstall**

Run: `bun install`
Expected: `bun.lock` updates, `@base-ui-components` disappears from it.

- [ ] **Step 4: Verify the whole suite**

Run: `bun test`
Expected: PASS. Every pre-existing test plus the 16 added here.

- [ ] **Step 5: Verify lint and types**

Run: `bun run lint`
Expected: clean.

- [ ] **Step 6: Verify the build**

Run: `bun run build`
Expected: every package builds, `packages/react/dist` emitted.

- [ ] **Step 7: Verify the import surface is preact-safe**

Run: `grep -rhno "from \"react[^\"]*\"" packages/react/src | sort -u`
Expected: only `from "react"`. Any `react-dom` or `react/jsx-runtime` import outside test files blocks the Preact build in the next plan.

- [ ] **Step 8: Commit**

```bash
git add packages/react/package.json bun.lock
git commit -m "refactor(react): drop the base-ui dependency"
```

---

## Self-Review

**Spec coverage.** The spec's "Step 0: remove base-ui from React" section lists 7 import sites; Tasks 3, 4 and 5 cover all 7 (5 slider, 1 swatch, 1 swatch-group). The `primitives/` directory and its contents match the spec's description. Task 6 covers dropping the dependency.

**Correction to the spec.** The spec claims "React's 33 existing tests are the safety net and must pass unchanged." Only 8 of the 33 test files render anything; the other 25 assert `expect(X).toBeDefined()`. This plan writes 16 behaviour tests before the code they guard instead. The spec is amended to match.

**Deliberate behaviour change.** `ColorSlider.Root` now forwards `dir` and `inverted` to the slider. base-ui never received them, so both props were accepted and silently ignored for interaction. This is a fix, and it needs a changelog line.

**Attributes held stable.** A grouped `ColorSwatch` keeps emitting `data-state="on" | "off"` alongside `data-pressed`. Both are documented: `docs/components/react/color-swatch.md:75` and `docs/components/react/color-swatch-group.md:182-183`. Dropping `data-state` would break every selector in a consumer's stylesheet, so Task 4 emits it from the component and Task 5 supplies the `isSelected` the component needs to compute it. `color-swatch-group.md:183` describes `data-pressed` as "Base UI's own attribute" and should be reworded once the dependency is gone.
