/**
 * Runs every suite and writes the results out as the VitePress benchmarks page.
 *
 *   bun run bench:report            # → docs/guide/benchmarks.md
 *   bun run bench:report --json     # also → docs/public/benchmarks.json
 *
 * The docs page is generated rather than hand-written so the published numbers
 * can never drift from what the suites actually measure. Re-run it on a quiet
 * machine; background load shows up as inflated averages.
 */

import { run } from "mitata";
import { register as convertSuite } from "./convert.bench";
import { register as differenceSuite } from "./difference.bench";
import { register as gradientSuite } from "./gradient.bench";
import { register as manipulateSuite } from "./manipulate.bench";
import { register as mixSuite } from "./mix.bench";
import { register as parseSuite } from "./parse.bench";
import { register as pipelineSuite } from "./pipeline.bench";
import { register as serializeSuite } from "./serialize.bench";

/** Prose that introduces each suite on the docs page, keyed by suite name. */
const SUITES: { name: string; heading: string; blurb: string; register: () => void }[] = [
  {
    name: "parse",
    heading: "Parsing",
    register: parseSuite,
    blurb:
      "CSS string in, the library's own representation out. Hex and the legacy "
      + "functional notations are the common denominator; `oklch()`, `lab()` and "
      + "`color(display-p3 …)` are CSS Color 4, which only urcolor, culori and "
      + "colorjs.io parse at all.",
  },
  {
    name: "convert",
    heading: "Conversion",
    register: convertSuite,
    blurb:
      "An already-parsed color moved into another space, so these numbers are "
      + "transfer functions and matrices with no parsing mixed in. Where a group "
      + "converts *out* of a perceptual space, every library's operand is "
      + "pre-converted too, so each pays for exactly one leg.",
  },
  {
    name: "mix",
    heading: "Mixing and interpolation",
    register: mixSuite,
    blurb:
      "One-shot blends, then the gradient shape: build an interpolator once and "
      + "sample it repeatedly. colord and the tinycolors only mix in sRGB, which "
      + "is a cheaper and perceptually worse computation than an Oklab blend — "
      + "they appear in the sRGB group only.",
  },
  {
    name: "manipulate",
    heading: "Manipulation",
    register: manipulateSuite,
    blurb:
      "Read these with care: the libraries disagree about *where* an adjustment "
      + "happens. urcolor and chroma-js lighten in a perceptual space, so they "
      + "pay for two conversions on top of the arithmetic; colord and the "
      + "tinycolors nudge HSL lightness directly. Same verb, different job.",
  },
  {
    name: "difference",
    heading: "Difference and contrast",
    register: differenceSuite,
    blurb:
      "ΔE2000 is the expensive one — trigonometry plus a rotation term. ΔE76 is "
      + "here so the cost of the 2000 formula is visible rather than implied. "
      + "WCAG contrast is a handful of multiplications, so that group mostly "
      + "measures each library's object-model overhead.",
  },
  {
    name: "serialize",
    heading: "Serialization",
    register: serializeSuite,
    blurb:
      "Color object to CSS string — the last step of every render path, so it "
      + "runs as often as parsing does.",
  },
  {
    name: "gradient",
    heading: "Canvas gradient rendering",
    register: gradientSuite,
    blurb:
      "The CPU path behind every picker surface: a slider track, an SV plane, a "
      + "hue wheel. Each call returns an `Uint8ClampedArray` of RGBA bytes ready "
      + "for `putImageData`, so these are literally milliseconds-per-frame. No "
      + "other library ships a grid sampler, so the comparison rows hand-roll "
      + "the same loop with that library's interpolator — exactly what you would "
      + "write yourself. urcolor's WebGL entry points are not benchmarked here: "
      + "they need a live canvas and a GPU context, and their cost is one "
      + "uniform upload and one draw call regardless of surface size.",
  },
  {
    name: "pipeline",
    heading: "End-to-end pipelines",
    register: pipelineSuite,
    blurb:
      "String in, string out. The groups above isolate one cost each; these "
      + "measure the whole round trip, which is what an application actually "
      + "pays — and what exposes the cost of a library's object model.",
  },
];

interface Row { label: string; avg: number }
interface Group { title: string; rows: Row[] }

/** Nanoseconds → the largest unit that keeps the number readable. */
function fmt(ns: number): string {
  if (ns >= 1e6) return `${(ns / 1e6).toFixed(2)} ms`;
  if (ns >= 1e3) return `${(ns / 1e3).toFixed(2)} µs`;
  return `${ns.toFixed(1)} ns`;
}

/** Escape the pipe characters that would otherwise break a markdown table. */
const cell = (s: string): string => s.replace(/\|/g, "\\|");

function table(group: Group): string {
  const fastest = Math.min(...group.rows.map(r => r.avg));
  const lines = [
    "| Library | Time | Relative |",
    "| --- | --- | --- |",
  ];
  for (const row of [...group.rows].sort((a, b) => a.avg - b.avg)) {
    const rel = row.avg === fastest ? "**fastest**" : `${(row.avg / fastest).toFixed(2)}× slower`;
    const label = row.label.startsWith("urcolor") ? `**${cell(row.label.trim())}**` : cell(row.label.trim());
    lines.push(`| ${label} | ${fmt(row.avg)} | ${rel} |`);
  }
  return lines.join("\n");
}

for (const suite of SUITES) suite.register();

const { benchmarks, layout, context } = (await run({ format: "quiet" })) as unknown as {
  benchmarks: { alias: string; group: number; runs: { stats?: { avg: number } }[] }[];
  layout: { name: string | null }[];
  context: { cpu: { name: string; freq: number }; runtime: string; version: string; arch: string };
};

// mitata hands back a flat benchmark list plus a collection layout; re-join them
// so the page can be written group by group, in declaration order.
const groups: Group[] = [];
const byTitle = new Map<string, Group>();
for (const b of benchmarks) {
  const stats = b.runs[0]?.stats;
  if (!stats) continue;
  const title = layout[b.group]?.name;
  if (!title) continue;
  let g = byTitle.get(title);
  if (!g) {
    g = { title, rows: [] };
    byTitle.set(title, g);
    groups.push(g);
  }
  g.rows.push({ label: b.alias, avg: stats.avg });
}

// Each suite's groups are contiguous, and every group title carries its suite's
// prefix (`parse · …`), so the page sections fall out of the titles themselves.
const PREFIX_TO_SUITE: Record<string, string> = {
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

const pkg = JSON.parse(
  await Bun.file(new URL("../package.json", import.meta.url)).text(),
) as { version: string; devDependencies: Record<string, string> };

const LIB_ROWS = ["culori", "chroma-js", "colorjs.io", "colord", "tinycolor2", "@ctrl/tinycolor"];
const libVersions = await Promise.all(
  LIB_ROWS.map(async (name) => {
    const dep = JSON.parse(
      await Bun.file(new URL(`../node_modules/${name}/package.json`, import.meta.url)).text(),
    ) as { version: string };
    return `| [${name}](https://www.npmjs.com/package/${name}) | ${dep.version} |`;
  }),
);

const out: string[] = [
  "# Benchmarks",
  "",
  "How `@urcolor/core` compares to the color libraries people actually reach for.",
  "Every number on this page is generated by the suites in",
  "[`packages/core/bench`](https://github.com/ur-color/urcolor/tree/main/packages/core/bench)",
  "and regenerated with `bun run --cwd packages/core bench:report`, so nothing here",
  "is a hand-copied claim.",
  "",
  "::: warning Read the groups, not the totals",
  "There is no single \"fastest color library\". These libraries make different",
  "trade-offs — spec coverage, perceptual correctness, object model — and a group",
  "where urcolor loses usually says something specific about one of those choices,",
  "not about the library as a whole. Where a comparison is not apples-to-apples,",
  "the note above the table says so.",
  "",
  "A missing library in a group means it cannot express that operation at all,",
  "never that it was too slow to include.",
  ":::",
  "",
  "## Setup",
  "",
  `Measured on ${context.cpu.name} at ~${context.cpu.freq.toFixed(2)} GHz,`,
  `${context.runtime} ${context.version} (${context.arch}), with`,
  "[mitata](https://github.com/evanwashere/mitata). Reported times are the mean",
  "per operation.",
  "",
  "| Library | Version |",
  "| --- | --- |",
  `| **@urcolor/core** | **${pkg.version}** |`,
  ...libVersions,
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
  "Every row runs against a rotating pool of eight colors rather than one",
  "constant. Without that, the JIT inlines the smaller operations and hoists",
  "them clean out of the measurement loop — an earlier draft of this suite had",
  "`tinycolor2.toRgbString()` \"running\" in 0.17 picoseconds. The rotation costs",
  "about a nanosecond and every row pays it equally.",
  "",
  "::: tip Two APIs, two costs",
  "urcolor ships the same engine twice: a tree-shakeable functional API",
  "(`parse`, `convert`, `mix`, …) and the ergonomic [`Color`](./color-class) class",
  "on top of it. Groups that list both rows show what the object wrapper costs —",
  "usually one allocation. Reach for the functions in per-pixel loops and the",
  "class everywhere else.",
  ":::",
  "",
];

for (const suite of SUITES) {
  const suiteGroups = groups.filter((g) => {
    const prefix = g.title.split(" ·")[0]!.trim();
    return PREFIX_TO_SUITE[prefix] === suite.name;
  });
  if (suiteGroups.length === 0) continue;

  out.push(`## ${suite.heading}`, "", suite.blurb, "");
  for (const g of suiteGroups) {
    out.push(`### ${g.title.replace(" · ", ": ")}`, "", table(g), "");
  }
}

out.push(
  "## Reproducing",
  "",
  "Benchmarks are only worth what the machine running them is worth. To check",
  "these numbers yourself:",
  "",
  "```sh",
  "git clone https://github.com/ur-color/urcolor",
  "cd urcolor && bun install",
  "bun run --cwd packages/core bench",
  "```",
  "",
  "Close everything else first — background load lands squarely in the mean. If",
  "your ordering differs from the tables above in a way you can reproduce,",
  "[open an issue](https://github.com/ur-color/urcolor/issues); a benchmark that",
  "only holds on one laptop is not a benchmark.",
  "",
);

const page = `${out.join("\n")}`;
const pagePath = new URL("../../../docs/guide/benchmarks.md", import.meta.url);
await Bun.write(pagePath, page);
console.error(`wrote ${groups.length} groups → docs/guide/benchmarks.md`);

if (process.argv.includes("--json")) {
  const jsonPath = new URL("../../../docs/public/benchmarks.json", import.meta.url);
  await Bun.write(
    jsonPath,
    `${JSON.stringify(
      {
        context: { cpu: context.cpu.name, runtime: `${context.runtime} ${context.version}` },
        versions: { "@urcolor/core": pkg.version, ...pkg.devDependencies },
        groups: groups.map(g => ({ title: g.title, rows: g.rows })),
      },
      null,
      2,
    )}\n`,
  );
  console.error("wrote docs/public/benchmarks.json");
}
