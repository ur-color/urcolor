/**
 * Renders measured results as the VitePress benchmarks page.
 *
 * Kept apart from `report.ts` so the page can be rebuilt from a stored
 * `benchmarks.json` without re-running the suites: prose edits should not need
 * a quiet machine and twenty minutes of measurement.
 */

export interface Row { label: string; avg: number }
export interface Group { title: string; rows: Row[] }

export interface Meta {
  cpu: string;
  /** GHz, as mitata reports it. */
  freq: number;
  runtime: string;
  runtimeVersion: string;
  arch: string;
  core: string;
  shared: string;
  /** Comparison library versions, in table order. */
  libs: Record<string, string>;
}

export interface PageData { meta: Meta; groups: Group[] }

/** Section prose, in page order. `name` matches the suite that produces it. */
export const SUITE_PROSE: { name: string; heading: string; blurb: string }[] = [
  {
    name: "parse",
    heading: "Parsing",
    blurb:
      "CSS string in, the library's own representation out. Hex and the legacy "
      + "functional notations are the common denominator. `oklch()`, `lab()` and "
      + "`color(display-p3 …)` are CSS Color 4, which only urcolor, culori and "
      + "colorjs.io parse.",
  },
  {
    name: "convert",
    heading: "Conversion",
    blurb:
      "An already-parsed color moved into another space: transfer functions and "
      + "matrices, with no parsing mixed in. Where a group converts *out* of a "
      + "perceptual space, every operand is pre-converted, so each library pays "
      + "for exactly one leg.",
  },
  {
    name: "mix",
    heading: "Mixing and interpolation",
    blurb:
      "One-shot blends, then the gradient shape: build an interpolator once and "
      + "sample it repeatedly. colord and the tinycolors mix only in sRGB, which "
      + "is cheaper and perceptually worse than an Oklab blend, so they appear in "
      + "the sRGB group alone.",
  },
  {
    name: "manipulate",
    heading: "Manipulation",
    blurb:
      "The libraries disagree about *where* an adjustment happens. urcolor and "
      + "chroma-js lighten in a perceptual space and pay for two conversions on "
      + "top of the arithmetic. colord and the tinycolors nudge HSL lightness "
      + "directly. Same verb, different job.",
  },
  {
    name: "difference",
    heading: "Difference and contrast",
    blurb:
      "ΔE2000 is the expensive one: trigonometry plus a rotation term. ΔE76 is "
      + "here so the cost of the 2000 formula is visible rather than implied. "
      + "WCAG contrast is a handful of multiplications, so that group mostly "
      + "measures each library's object-model overhead.",
  },
  {
    name: "serialize",
    heading: "Serialization",
    blurb:
      "Color object to CSS string, the last step of every render path. It runs "
      + "as often as parsing does.",
  },
  {
    name: "gradient",
    heading: "Canvas gradient rendering",
    blurb:
      "The CPU path behind a picker surface: a slider track, an SV plane, a hue "
      + "wheel. Each call returns an `Uint8ClampedArray` of RGBA bytes ready for "
      + "`putImageData`, so these are milliseconds per frame. No other library "
      + "ships a grid sampler, so the comparison rows hand-roll the same loop "
      + "with that library's interpolator. urcolor's WebGL entry points are not "
      + "measured here: they need a live canvas and a GPU context, and their cost "
      + "is one uniform upload and one draw call whatever the surface size.",
  },
  {
    name: "pipeline",
    heading: "End-to-end pipelines",
    blurb:
      "String in, string out. The groups above isolate one cost each; these "
      + "measure the round trip an application actually pays, which is where a "
      + "library's object model shows up.",
  },
];

/**
 * Each suite's group titles carry the suite's own prefix (`parse · …`), so the
 * page sections fall out of the titles rather than out of a second list.
 */
export const PREFIX_TO_SUITE: Record<string, string> = {
  "parse": "parse",
  "convert": "convert",
  "gamut": "convert",
  "mix": "mix",
  "gradient": "mix",
  "palette": "mix",
  "manipulate": "manipulate",
  "channel": "manipulate",
  "alpha": "manipulate",
  "deltaE": "difference",
  "contrast": "difference",
  "relative luminance": "difference",
  "equality": "difference",
  "serialize": "serialize",
  "canvas": "gradient",
  "pipeline": "pipeline",
  "batch": "pipeline",
};

/**
 * One color per library, held stable across every chart on the page so a bar
 * can be recognised without reading its axis label. Rows are matched on the
 * first word of their label, which is always the library's package name.
 */
export const LIB_COLORS: Record<string, string> = {
  "urcolor": "#ff4081",
  "culori": "#2f9e44",
  "chroma-js": "#f59f00",
  "colorjs.io": "#7048e8",
  "colord": "#1c7ed6",
  "tinycolor2": "#0ca678",
  "@ctrl/tinycolor": "#e8590c",
};

/**
 * The color of the series that carries the value labels. It sits underneath a
 * colored bar of identical geometry on every row, so it is never actually seen.
 */
const BASE_COLOR = "#c9c9cf";

function libOf(label: string): string {
  return label.trim().split(/\s+/)[0]!;
}

/** Nanoseconds to the largest unit that keeps the number readable. */
export function fmt(ns: number): string {
  if (ns >= 1e6) return `${(ns / 1e6).toFixed(2)} ms`;
  if (ns >= 1e3) return `${(ns / 1e3).toFixed(2)} µs`;
  return `${ns.toFixed(1)} ns`;
}

/** The unit a whole chart is drawn in, chosen from its slowest plotted bar. */
function unitFor(ns: number): { div: number; label: string } {
  if (ns >= 1e6) return { div: 1e6, label: "milliseconds" };
  if (ns >= 1e3) return { div: 1e3, label: "microseconds" };
  return { div: 1, label: "nanoseconds" };
}

/** Escape the pipes that would otherwise open a new markdown table column. */
const cell = (s: string): string => s.replace(/\|/g, "\\|");

/** mermaid takes axis labels as quoted strings, so quotes cannot survive. */
const axisLabel = (s: string): string => s.replace(/\s+/g, " ").replace(/"/g, "").trim();

/**
 * Bars beyond this multiple of the fastest row are left off the chart. A group
 * can span two orders of magnitude, and one 70× bar squashes every other bar in
 * it to a pixel. The omitted rows are named under the chart and printed in full
 * in the table.
 */
const PLOT_CUTOFF = 10;

/** Slack past the longest bar, so the label printed at its tip still fits. */
const AXIS_HEADROOM = 1.18;

/** Never plot fewer than this, even when the second row is already far out. */
const MIN_PLOTTED = 2;

/**
 * A bar must reach this share of the axis to be worth drawing. mermaid sizes a
 * data label by shrinking the font until the text fits inside its bar, and that
 * loop does not terminate for a bar only a few pixels wide, so a chart whose
 * fastest row is dwarfed by the rest drops its slowest rows until it is legible.
 */
const MIN_BAR_SHARE = 0.05;

/** A round axis maximum at or above `value`, so ticks land on whole numbers. */
function axisMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / (magnitude / 2)) * (magnitude / 2);
}

function sorted(group: Group): Row[] {
  return [...group.rows].sort((a, b) => a.avg - b.avg);
}

/**
 * mermaid paints a whole bar series in one color, so a per-library color cannot
 * come out of the diagram itself. The chart is wrapped in a `.bench-chart`
 * element instead, carrying one `--bench-N` custom property per row, which
 * `theme/custom.css` applies as the `fill` of the matching bar.
 *
 * Declaring one series per row was the obvious alternative and does not work.
 * mermaid reads the value labels of every series out of the first one, it pads
 * the value axis around whatever the data contains, so a `0` or `-1` filler
 * still paints a stub at the head of every row, and 59 charts of eight series
 * each takes long enough to render that the page stops responding.
 */
function chart(rows: Row[]): string {
  const fastest = rows[0]!.avg;
  const plotted = rows.filter((r, i) => i < MIN_PLOTTED || r.avg <= fastest * PLOT_CUTOFF);
  while (
    plotted.length > MIN_PLOTTED
    && fastest / (plotted[plotted.length - 1]!.avg * AXIS_HEADROOM) < MIN_BAR_SHARE
  ) plotted.pop();
  const unit = unitFor(Math.max(...plotted.map(r => r.avg)));
  // The bar value is also its printed label, so it is rounded before plotting
  // rather than after: three significant figures stay readable at any unit.
  const values = plotted.map(r => Number((r.avg / unit.div).toPrecision(3)));
  const labels = plotted.map(r => `"${axisLabel(r.label)}"`).join(", ");
  const fills = plotted
    .map((r, i) => `--bench-${i + 1}:${LIB_COLORS[libOf(r.label)] ?? BASE_COLOR}`)
    .join(";");

  const lines = [
    `<div class="bench-chart" style="${fills}">`,
    "",
    "```mermaid",
    "---",
    "config:",
    "  xyChart:",
    `    height: ${70 + plotted.length * 46}`,
    "---",
    "xychart-beta horizontal",
    `  x-axis [${labels}]`,
    `  y-axis "${unit.label}" 0 --> ${axisMax(Math.max(...values) * AXIS_HEADROOM)}`,
    `  bar [${values.join(", ")}]`,
    "```",
    "",
    "</div>",
  ];

  const omitted = rows.slice(plotted.length);
  if (omitted.length > 0) {
    const named = omitted
      .map(r => `${r.label.trim()} at ${fmt(r.avg)}`)
      .join(", ");
    lines.push(
      "",
      `Off the chart: ${named}. The table below carries every row.`,
    );
  }
  return lines.join("\n");
}

function table(rows: Row[]): string {
  const fastest = rows[0]!.avg;
  const lines = ["| Library | Time | Relative |", "| --- | --- | --- |"];
  for (const row of rows) {
    const rel = row.avg === fastest ? "**fastest**" : `${(row.avg / fastest).toFixed(2)}× slower`;
    const label = row.label.startsWith("urcolor")
      ? `**${cell(row.label.trim())}**`
      : cell(row.label.trim());
    lines.push(`| ${label} | ${fmt(row.avg)} | ${rel} |`);
  }
  return lines.join("\n");
}

/** The chart color key, rendered as inline HTML because a swatch has no markdown. */
function legend(): string {
  const swatches = Object.entries(LIB_COLORS).map(
    ([name, color]) =>
      "<span class=\"bench-key-item\">"
      + `<span class="bench-key-dot" style="background:${color}"></span>${name}`
      + "</span>",
  );
  return `<p class="bench-key">${swatches.join("")}</p>`;
}

/** One benchmark group: a chart of the fast end, then the numbers in full. */
function section(group: Group): string {
  const rows = sorted(group);
  return [
    `### ${group.title.replace(" · ", ": ")}`,
    "",
    chart(rows),
    "",
    "<details>",
    "<summary>Exact timings</summary>",
    "",
    table(rows),
    "",
    "</details>",
  ].join("\n");
}

export function renderPage({ meta, groups }: PageData): string {
  const libRows = Object.entries(meta.libs).map(
    ([name, version]) => `| [${name}](https://www.npmjs.com/package/${name}) | ${version} |`,
  );

  const out: string[] = [
    "# Benchmarks",
    "",
    "`@urcolor/core` against the color libraries people actually reach for, plus",
    "the canvas grid samplers `@urcolor/shared` layers on top. Every number comes",
    "from the suites in",
    "[`packages/core/bench`](https://github.com/ur-color/urcolor/tree/main/packages/core/bench),",
    "regenerated with `bun run --cwd packages/core bench:report`.",
    "",
    "::: warning Read the groups, not the totals",
    "No library wins everywhere. These libraries trade spec coverage, perceptual",
    "accuracy and object model against each other, so a group urcolor loses says",
    "something about one of those choices rather than about the library. Where a",
    "comparison is not like for like, the note above the group says so.",
    "",
    "A library missing from a group cannot express that operation at all. Nothing",
    "was dropped for being slow.",
    ":::",
    "",
    `Each chart plots the fast end of its group. Bars past ${PLOT_CUTOFF}× the leader`,
    "are named underneath and printed in the table, because one very slow bar",
    "flattens every other one to a pixel. Bar labels are in the unit named on the",
    "axis, rounded to three figures; the table under each chart has the rest.",
    "",
    "Every library keeps the same color on every chart:",
    "",
    legend(),
    "",
    "## Setup",
    "",
    `Measured on ${meta.cpu} at ~${meta.freq.toFixed(2)} GHz,`,
    `${meta.runtime} ${meta.runtimeVersion} (${meta.arch}), with`,
    "[mitata](https://github.com/evanwashere/mitata). Times are the mean per",
    "operation.",
    "",
    "| Library | Version |",
    "| --- | --- |",
    `| **@urcolor/core** | **${meta.core}** |`,
    `| **@urcolor/shared** | **${meta.shared}** |`,
    ...libRows,
    "",
    "```sh",
    "# every suite",
    "bun run --cwd packages/core bench",
    "",
    "# one suite at a time",
    "bun run --cwd packages/core bench parse convert",
    "",
    "# regenerate this page",
    "bun run --cwd packages/core bench:report",
    "```",
    "",
    "Each row runs against a rotating pool of eight colors. Against a single",
    "constant the JIT inlines the smaller operations and hoists them out of the",
    "measurement loop: an early draft of this suite had",
    "`tinycolor2.toRgbString()` \"running\" in 0.17 picoseconds. The rotation costs",
    "about a nanosecond, and every row pays it.",
    "",
    "::: tip Two APIs, two costs",
    "The same engine ships twice: a tree-shakeable functional API (`parse`,",
    "`convert`, `mix`) and the [`Color`](./color-class) class on top of it. Groups",
    "listing both rows show what the wrapper costs, usually one allocation. Reach",
    "for the functions in per-pixel loops and the class everywhere else.",
    ":::",
    "",
  ];

  for (const suite of SUITE_PROSE) {
    const suiteGroups = groups.filter((g) => {
      const prefix = g.title.split(" ·")[0]!.trim();
      return PREFIX_TO_SUITE[prefix] === suite.name;
    });
    if (suiteGroups.length === 0) continue;

    out.push(`## ${suite.heading}`, "", suite.blurb, "");
    for (const g of suiteGroups) out.push(section(g), "");
  }

  out.push(
    "## Reproducing",
    "",
    "A benchmark is worth what the machine running it is worth. To check these",
    "numbers yourself:",
    "",
    "```sh",
    "git clone https://github.com/ur-color/urcolor",
    "cd urcolor && bun install",
    "bun run --cwd packages/core bench",
    "```",
    "",
    "Close everything else first, because background load lands squarely in the",
    "mean. If your ordering differs from these tables and you can reproduce it,",
    "[open an issue](https://github.com/ur-color/urcolor/issues). A benchmark that",
    "holds on one laptop only is not a benchmark.",
    "",
  );

  return out.join("\n");
}
