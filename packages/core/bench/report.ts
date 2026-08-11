/**
 * Runs every suite and writes the results out as the VitePress benchmarks page.
 *
 *   bun run bench:report              # → docs/guide/benchmarks.md
 *   bun run bench:report --json       # also → docs/public/benchmarks.json
 *   bun run bench:report --from-json  # re-render the page from that JSON
 *
 * The docs page is generated rather than hand-written so the published numbers
 * can never drift from what the suites actually measure. Re-run it on a quiet
 * machine; background load shows up as inflated averages. `--from-json` exists
 * for the other kind of change: editing the page's prose or its charts without
 * re-measuring anything.
 */

import { run } from "mitata";
import { register as convertSuite } from "./convert.bench";
import { register as differenceSuite } from "./difference.bench";
import { register as gradientSuite } from "./gradient.bench";
import { register as manipulateSuite } from "./manipulate.bench";
import { register as mixSuite } from "./mix.bench";
import { type Group, type Meta, type PageData, renderPage } from "./page";
import { register as parseSuite } from "./parse.bench";
import { register as pipelineSuite } from "./pipeline.bench";
import { register as serializeSuite } from "./serialize.bench";

const SUITES = [
  parseSuite,
  convertSuite,
  mixSuite,
  manipulateSuite,
  differenceSuite,
  serializeSuite,
  gradientSuite,
  pipelineSuite,
];

const LIB_ROWS = ["culori", "chroma-js", "colorjs.io", "colord", "tinycolor2", "@ctrl/tinycolor"];

const pagePath = new URL("../../../docs/guide/benchmarks.md", import.meta.url);
const jsonPath = new URL("../../../docs/public/benchmarks.json", import.meta.url);

if (process.argv.includes("--from-json")) {
  const stored = JSON.parse(await Bun.file(jsonPath).text()) as PageData;
  await Bun.write(pagePath, renderPage(stored));
  console.error(`re-rendered ${stored.groups.length} stored groups → docs/guide/benchmarks.md`);
  process.exit(0);
}

async function versionOf(specifier: string): Promise<string> {
  const pkg = JSON.parse(await Bun.file(new URL(specifier, import.meta.url)).text()) as {
    version: string;
  };
  return pkg.version;
}

for (const register of SUITES) register();

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

const libs: Record<string, string> = {};
for (const name of LIB_ROWS) libs[name] = await versionOf(`../node_modules/${name}/package.json`);

const meta: Meta = {
  cpu: context.cpu.name,
  freq: context.cpu.freq,
  runtime: context.runtime,
  runtimeVersion: context.version,
  arch: context.arch,
  core: await versionOf("../package.json"),
  shared: await versionOf("../../shared/package.json"),
  libs,
};

await Bun.write(pagePath, renderPage({ meta, groups }));
console.error(`wrote ${groups.length} groups → docs/guide/benchmarks.md`);

if (process.argv.includes("--json")) {
  await Bun.write(jsonPath, `${JSON.stringify({ meta, groups }, null, 2)}\n`);
  console.error("wrote docs/public/benchmarks.json");
}
