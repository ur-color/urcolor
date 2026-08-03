/**
 * Benchmark runner.
 *
 *   bun run bench                 # every suite
 *   bun run bench parse convert   # only the named suites
 *   bun run bench --list          # show the suite names
 *
 * Suites live one-per-file next to this one and export a `register()` that
 * declares its mitata groups. Nothing runs until `run()` is called, so
 * filtering is just "don't register that file".
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

const SUITES: Record<string, () => void> = {
  parse: parseSuite,
  convert: convertSuite,
  mix: mixSuite,
  manipulate: manipulateSuite,
  difference: differenceSuite,
  serialize: serializeSuite,
  pipeline: pipelineSuite,
  gradient: gradientSuite,
};

const args = process.argv.slice(2);

if (args.includes("--list") || args.includes("-l")) {
  console.log(Object.keys(SUITES).join("\n"));
  process.exit(0);
}

const requested = args.filter(a => !a.startsWith("-"));
const unknown = requested.filter(name => !(name in SUITES));
if (unknown.length > 0) {
  console.error(`Unknown suite(s): ${unknown.join(", ")}`);
  console.error(`Available: ${Object.keys(SUITES).join(", ")}`);
  process.exit(1);
}

const selected = requested.length > 0 ? requested : Object.keys(SUITES);
for (const name of selected) SUITES[name]!();

await run();
