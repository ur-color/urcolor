# Documentation for Five New Frameworks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document Preact, Solid, Lit, Alpine and Ember: 40 code-only component pages, five sidebar groups, and the site-wide copy that still says four frameworks.

**Architecture:** Each framework gets a directory under `docs/components/` holding 8 pages, mirroring the Svelte and Angular pattern: title, description, preview, anatomy, examples, API tables, keyboard table. No live demos, no demo components, no bundler changes. The sidebar generator in `.vitepress/i18n/nav.ts` already filters against what exists on disk, so pages appear as they land.

**Tech Stack:** VitePress, Markdown.

## Global Constraints

- **Prerequisites:** all five package plans complete. Documentation runs last, once every API is settled, because a page written against a guessed API is worse than no page.
- **Code-only.** No `.vue` demo components, no `ReactMount`-style wrappers, no additions to `docs/.vitepress/config.ts`'s `resolve.alias` or `optimizeDeps`. Svelte and Angular are the pattern; Vue and React are not.
- **Every code block must be real.** Copy the API from the package source, not from another framework's page. A prop that does not exist is a bug report waiting to happen.
- Page structure follows `docs/components/svelte/*.md`: `# ComponentName`, one-sentence description, `## Preview`, `## Anatomy`, `## Examples`, `## API Reference` tables with Prop / Type / Default / Description, `## Keyboard Navigation`.
- Prose follows `CLAUDE.md`: laconic and formal, no em dashes in English, describe the thing rather than the act of documenting it.
- The installation guide is **not** in scope. Each package plan adds its own install block as part of wiring, so by the time this plan runs, `docs/guide/installation.md` and its three translations already list all nine packages. Task 5 verifies that rather than repeating it.
- Translations are not in scope. The `de`, `es` and `fr` locales carry 9 pages between them, none of them component pages, and the sidebar generator filters per locale against disk.

---

## File Structure

**Created:** 40 files.

| Directory | Pages |
| --- | --- |
| `docs/components/preact/` | `color-area.md`, `color-slider.md`, `color-field.md`, `color-swatch.md`, `color-swatch-group.md`, `color-wheel.md`, `color-triangle.md`, `color-ring.md` |
| `docs/components/solid/` | same 8 |
| `docs/components/lit/` | same 8 |
| `docs/components/alpine/` | same 8 |
| `docs/components/ember/` | same 8 |

**Modified:** `docs/.vitepress/i18n/nav.ts`, `docs/.vitepress/i18n/strings.ts`, `docs/components/index.md`.

---

### Task 1: Sidebar groups

Do this first. With the groups in place and the generator's disk filter doing its job, every page written afterwards appears the moment it lands, which makes each later task verifiable in the dev server.

**Files:**
- Modify: `docs/.vitepress/i18n/nav.ts:325-346` (the component arrays), `:415-450` (the sidebar assembly)

**Interfaces:**
- Consumes: the existing `keep`, `exists` and `prefixFor` helpers.
- Produces: five new sidebar groups, empty until pages exist.

- [ ] **Step 1: Add the component arrays**

In `docs/.vitepress/i18n/nav.ts`, after `const ANGULAR_COMPONENTS = SVELTE_COMPONENTS;`, add:

```ts
/**
 * Preact, Solid, Lit, Alpine and Ember follow React's naming too, so the whole
 * set is one list. The sidebar generator filters each against disk, so a
 * framework missing a page simply does not link to it.
 */
const PREACT_COMPONENTS = SVELTE_COMPONENTS;
const SOLID_COMPONENTS = SVELTE_COMPONENTS;
const LIT_COMPONENTS = SVELTE_COMPONENTS;
const ALPINE_COMPONENTS = SVELTE_COMPONENTS;
const EMBER_COMPONENTS = SVELTE_COMPONENTS;
```

- [ ] **Step 2: Build the five item lists**

After the `angular` list in `sidebarFor`, add:

```ts
  const preact = keep(exists, lang, PREACT_COMPONENTS.map(([text, slug]) => ({
    text,
    link: `${p}/components/preact/${slug}`,
    file: `components/preact/${slug}.md`,
  })));

  const solid = keep(exists, lang, SOLID_COMPONENTS.map(([text, slug]) => ({
    text,
    link: `${p}/components/solid/${slug}`,
    file: `components/solid/${slug}.md`,
  })));

  const lit = keep(exists, lang, LIT_COMPONENTS.map(([text, slug]) => ({
    text,
    link: `${p}/components/lit/${slug}`,
    file: `components/lit/${slug}.md`,
  })));

  const alpine = keep(exists, lang, ALPINE_COMPONENTS.map(([text, slug]) => ({
    text,
    link: `${p}/components/alpine/${slug}`,
    file: `components/alpine/${slug}.md`,
  })));

  const ember = keep(exists, lang, EMBER_COMPONENTS.map(([text, slug]) => ({
    text,
    link: `${p}/components/ember/${slug}`,
    file: `components/ember/${slug}.md`,
  })));
```

- [ ] **Step 3: Add them to the sidebar**

Extend `componentsSidebar`:

```ts
  const componentsSidebar = [
    { text: t.components, items: componentsOverview },
    { text: "Vue", items: vue },
    { text: "React", items: react },
    { text: "Preact", items: preact },
    { text: "Svelte", items: svelte },
    { text: "Solid", items: solid },
    { text: "Angular", items: angular },
    { text: "Lit", items: lit },
    { text: "Alpine", items: alpine },
    { text: "Ember", items: ember },
  ].filter(group => group.items.length > 0);
```

Preact sits next to React and Solid next to Svelte because that is how a reader looks for them: by resemblance, not alphabetically.

- [ ] **Step 4: Verify nothing broke**

Run: `bun run docs:build`
Expected: no errors, and no new sidebar groups yet, because the `.filter` drops every empty one.

- [ ] **Step 5: Commit**

```bash
git add docs/.vitepress/i18n/nav.ts
git commit -m "docs: add sidebar groups for the five new frameworks"
```

---

### Tasks 2a-2e: The 40 component pages

One task per framework, 8 pages each. They are independent and can run in any order or in parallel.

Each task follows the same procedure:

1. Read the equivalent `docs/components/svelte/<page>.md` for structure and prose, and the framework's own package source for the API. The Svelte page supplies the shape and the wording; the package supplies the truth.
2. Write the 8 pages.
3. Run `bun run docs:build` and confirm no dead links and no errors.
4. Open `bun run docs:dev` and confirm the framework's sidebar group appears with all 8 entries.
5. Commit as `docs: add the <Framework> component pages`.

Per-page checklist, applied to all 40:

- **Title and description.** Copy the Svelte page's, adjusted only where the framework differs.
- **Preview.** A minimal working example in the framework's own syntax, using its state idiom.
- **Anatomy.** The part tree, with a sentence on which parts are optional. `Control` and `Range` are optional in every slider; state it.
- **Examples.** Match the Svelte page's set (hue, alpha, orientation, and so on), rewritten in the framework's syntax.
- **API Reference.** Prop, Type, Default, Description tables per part, read from the package's props interface, not copied from Svelte.
- **Keyboard Navigation.** Identical across all frameworks: the behaviour comes from `@urcolor/shared`. Copy the Svelte table verbatim.

The framework-specific notes below are what each set of 8 pages must say that the Svelte pages do not.

---

### Task 2a: Preact

**Directory:** `docs/components/preact/`
**API source:** `packages/react/src/` (Preact compiles that source), and `packages/preact/README.md`.

Every page's code is the React page's code with the import changed to `@urcolor/preact` and `useState` imported from `preact/hooks`. Say once, on each page's preview, that the API is identical to `@urcolor/react` because the package is that source compiled against `preact/compat`. Do not silently imply two independent implementations.

Read `docs/components/react/<page>.md` rather than the Svelte one for these eight; it is the closer source.

---

### Task 2b: Solid

**Directory:** `docs/components/solid/`
**API source:** `packages/solid/src/`.

Notes each page must carry:

- State uses `createSignal`, and `ColorSlider.Root` takes `value={color()}` with `onValueChange={setColor}`. It is not a signal tuple.
- The colour primitives are `createColor`, `createHSL` and so on, not `useColor`. Name the one the page uses.
- Props must not be destructured by the consumer either, when they wrap a part in their own component. One sentence on the swatch and field pages, where wrapping is most likely.

---

### Task 2c: Lit

**Directory:** `docs/components/lit/`
**API source:** `packages/lit/src/`.

Notes each page must carry:

- Elements are `urcolor-<family>-<part>`, registered by importing `@urcolor/lit`. Show the import in every preview.
- **Light DOM, no shadow root.** Ordinary CSS and Tailwind classes apply to the elements and their children. State this on every page; it is the single most surprising thing about a web-component package and a reader may land on any page first.
- State is set as a property, not an attribute: `root.value = "hsl(210, 80%, 50%)"`. Attributes carry the configuration (`channel`, `color-space`, `orientation`, `disabled`).
- Changes arrive as the `colorchange` and `colorcommit` events, with the colour on `event.detail.color`. The API table needs an **Events** section the other frameworks' pages do not have.
- The 14 colour helpers are reactive controllers, not hooks. Show `new ColorController(this, "…")` on the pages where a helper is used.

---

### Task 2d: Alpine

**Directory:** `docs/components/alpine/`
**API source:** `packages/alpine/src/` and `packages/lit/src/`.

Notes each page must carry:

- Setup is `Alpine.plugin(urcolor)` before `Alpine.start()`. Show it once per page, in the preview.
- The elements are the ones from `@urcolor/lit`; this package is the binding, not a second implementation. Link to the Lit page for the element's own API rather than duplicating the tables, and keep only the Alpine-specific surface here: `x-color` and `$color`.
- `x-color="expression"` is two-way: it writes the expression's value onto the element and writes `colorchange` back.
- `$color(value)`, `$color.channel(value, space, channel)` and `$color.format(value, space, channel)` are the template helpers.

Because the element API lives on the Lit pages, these eight are the shortest of the forty. That is correct, not a gap: duplicating 26 elements' tables in a second place guarantees the two drift.

---

### Task 2e: Ember

**Directory:** `docs/components/ember/`
**API source:** `packages/ember/src/`.

Notes each page must carry:

- **Composition is yielded**, not dot-notation. Every example uses `<ColorSliderRoot … as |slider|>` with `<slider.Track>` inside. This is the largest API divergence in the library and every page must show it, because a reader arriving from the React page will otherwise write code that cannot work.
- **Args are `@color` and `@onColorChange`**, where the other packages use `value` and `onValueChange`. Put the mapping in a `::: tip` on each page.
- Components import directly from `@urcolor/ember`; there is no resolver-based lookup.
- The colour helpers are `@tracked` classes: `ColorStore`, `HslStore` and so on, constructed in a component class rather than called during render.
- The API tables' column head is **Arg**, not **Prop**, and each entry keeps its `@` sigil.

---

### Task 3: The components overview page

**Files:**
- Modify: `docs/components/index.md`

- [ ] **Step 1: Read what is there**

Run: `cat docs/components/index.md`
The page lists the frameworks and links into their sections. Match its existing structure exactly rather than restructuring it.

- [ ] **Step 2: Add the five frameworks**

Add Preact, Solid, Lit, Alpine and Ember in the same order the sidebar uses: Vue, React, Preact, Svelte, Solid, Angular, Lit, Alpine, Ember. Each entry gets the one-line package description from `docs/guide/installation.md`'s package table, so the two agree.

- [ ] **Step 3: Verify**

Run: `bun run docs:build`
Expected: no errors, no dead links.

- [ ] **Step 4: Commit**

```bash
git add docs/components/index.md
git commit -m "docs: list the five new frameworks on the components overview"
```

---

### Task 4: The home page feature string

**Files:**
- Modify: `docs/.vitepress/i18n/strings.ts:149,157,165,173,181,189,197`

The `multi-framework` home feature currently reads "Four frameworks" in all seven locales and names Vue, React, Svelte and Angular. It must name nine.

- [ ] **Step 1: Rewrite all seven**

Each locale's entry keeps its `anchor: "multi-framework"` and its structure; only `title` and `details` change. The framework list is the same nine names in every language, in sidebar order.

```ts
// en
{ anchor: "multi-framework", title: "Nine frameworks", details: "The same primitives in Vue, React, Preact, Svelte, Solid, Angular, Lit, Alpine and Ember, over one shared core." },
// zh
{ anchor: "multi-framework", title: "九个框架", details: "Vue、React、Preact、Svelte、Solid、Angular、Lit、Alpine 与 Ember 共享同一内核，提供同一套基础组件。" },
// ja
{ anchor: "multi-framework", title: "9 つのフレームワーク", details: "共通のコアの上に、Vue、React、Preact、Svelte、Solid、Angular、Lit、Alpine、Ember へ同じプリミティブを提供します。" },
// es
{ anchor: "multi-framework", title: "Nueve frameworks", details: "Las mismas primitivas en Vue, React, Preact, Svelte, Solid, Angular, Lit, Alpine y Ember, sobre un núcleo compartido." },
// fr
{ anchor: "multi-framework", title: "Neuf frameworks", details: "Les mêmes primitives dans Vue, React, Preact, Svelte, Solid, Angular, Lit, Alpine et Ember, sur un cœur commun." },
// de
{ anchor: "multi-framework", title: "Neun Frameworks", details: "Dieselben Primitive in Vue, React, Preact, Svelte, Solid, Angular, Lit, Alpine und Ember, auf einem gemeinsamen Kern." },
// ru
{ anchor: "multi-framework", title: "Девять фреймворков", details: "Одни и те же примитивы в Vue, React, Preact, Svelte, Solid, Angular, Lit, Alpine и Ember поверх общего ядра." },
```

- [ ] **Step 2: Check for other stale counts**

Run: `grep -rniE "four frameworks|vier frameworks|cuatro frameworks|quatre frameworks|四个框架|4 つの|Четыре фреймворка" docs/ README.md packages/*/README.md`
Expected: no output after the edit. Fix anything that turns up, including the root `README.md`.

- [ ] **Step 3: Verify**

Run: `bun run docs:build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add docs/.vitepress/i18n/strings.ts README.md
git commit -m "docs: the library now covers nine frameworks, not four"
```

---

### Task 5: Final verification

**Files:** none modified.

- [ ] **Step 1: Confirm every page exists**

Run:

```bash
for fw in preact solid lit alpine ember; do
  echo "$fw: $(ls docs/components/$fw/*.md 2>/dev/null | wc -l)"
done
```

Expected: `8` for each.

- [ ] **Step 2: Confirm the installation guide is complete**

Run: `grep -c "@urcolor/" docs/guide/installation.md`
Then confirm by eye that all nine framework packages appear in the prerequisites line, the package table and the install blocks, and that `docs/de/guide/installation.md`, `docs/es/guide/installation.md` and `docs/fr/guide/installation.md` match. Each package plan added its own, so this is a check, not new work. Anything missing is a gap in that package's wiring task.

- [ ] **Step 3: Full build**

Run: `bun run docs:build`
Expected: no errors, no dead links.

- [ ] **Step 4: Confirm the sidebar**

Run: `bun run docs:dev`, open `/components/`, and confirm nine framework groups appear, each with 8 entries.

- [ ] **Step 5: Commit if anything was fixed**

```bash
git add docs
git commit -m "docs: complete the five-framework documentation sweep"
```

---

## Self-Review

**Spec coverage.** The spec's documentation section asks for 40 code-only pages (Tasks 2a-2e), five component arrays and five sidebar groups in `nav.ts` (Task 1), `components/index.md` (Task 3), and the `multi-framework` string changed from four to nine across seven locales (Task 4). The installation guide and its three translations are the one item this plan does not write, because each package plan already adds its own block during wiring; Task 5 step 2 verifies it instead of duplicating it.

**No placeholder pages.** Tasks 2a-2e give a per-page checklist and the framework-specific notes each set must carry, rather than 40 page templates. The Svelte and React pages are the structural specification and are on disk; reproducing 2,200 lines of them here would add no information and would go stale the moment those pages change. The procedural steps, the API source to read, and the framework-specific content are all named.

**One deliberate asymmetry.** The Alpine pages are the shortest, because the element API lives on the Lit pages and they link to it. Duplicating 26 elements' tables in two places guarantees they drift.
