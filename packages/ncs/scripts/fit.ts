/**
 * Fits the knot table in `src/model.ts` against published NCS values.
 *
 * The model's *form* is argued in the docblock on `src/model.ts`; this script
 * only chooses the numbers. It is checked in so the constants are reproducible
 * rather than folklore, and so a future change to the form can be re-fitted
 * instead of hand-tuned.
 *
 * Run: `bun run --cwd packages/ncs fit`
 *
 * `scripts/reference-full.json` is 2,050 published notation/sRGB pairs from
 * Atte-Oksanen/colorcordia, cross-checked against paintcolourchart.com on five
 * spot values and agreeing within 2/255 on each. Fitting input only, never
 * shipped: `files: ["dist"]` excludes it.
 */

import { convert, deltaE, tryParse, type ColorObject } from "@urcolor/core";
import { parseNotation } from "../src/notation";
import { KNOTS, KNOT_COUNT, hueParameter, toOklch, type Knot } from "../src/model";

interface Row {
  ncs: string;
  hex: string;
}

interface Sample {
  /** Circle position, 0–400. */
  t: number;
  blackness: number;
  chromaticness: number;
  target: ColorObject;
}

const REFERENCE = new URL("./reference-full.json", import.meta.url);

const FIELDS: (keyof Knot)[] = ["L0", "kb", "kc", "Cc", "Ccb", "Ccc", "H", "hb", "hc"];

/** Per-field search step, scaled together as the fit converges. */
const STEP: Record<keyof Knot, number> = {
  L0: 0.05, kb: 0.05, kc: 0.05,
  Cc: 0.02, Ccb: 0.02, Ccc: 0.02,
  H: 4, hb: 4, hc: 4,
};

function errorsFor(table: Knot[], samples: readonly Sample[]): number[] {
  const saved = KNOTS.map(k => ({ ...k }));
  // `toOklch` reads the module-level KNOTS, so the candidate is swapped in
  // around the measurement. Mutating a module export is ugly, but it keeps the
  // conversion free of a parameter that exists only for this script.
  (KNOTS as Knot[]).length = 0;
  (KNOTS as Knot[]).push(...table.map(k => ({ ...k })));

  const out = samples.map(s => deltaE(
    toOklch({ blackness: s.blackness, chromaticness: s.chromaticness, hue: hueOf(s.t) }),
    s.target,
    "2000",
  ));

  (KNOTS as Knot[]).length = 0;
  (KNOTS as Knot[]).push(...saved);
  return out;
}

/** A circle position back into the hue shape `toOklch` expects. */
function hueOf(t: number) {
  const index = Math.floor(t / 100) % 4;
  const percent = Math.round(t - index * 100);
  const ELEM = ["Y", "R", "B", "G"] as const;
  if (percent === 0) return { from: ELEM[index]!, to: null, percent: 0 };
  return { from: ELEM[index]!, to: ELEM[(index + 1) % 4]!, percent };
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export async function main(): Promise<void> {
  const raw = (await Bun.file(REFERENCE).json()) as Row[];

  const samples: Sample[] = [];
  for (const row of raw) {
    const parsed = parseNotation(row.ncs);
    const target = tryParse(row.hex);
    // Neutrals bypass the hue machinery entirely, so they carry no signal
    // about the knots and would only dilute the objective.
    if (parsed === null || parsed.hue === null || target === null) continue;
    samples.push({
      t: hueParameter(parsed.hue),
      blackness: parsed.blackness,
      chromaticness: parsed.chromaticness,
      target,
    });
  }

  console.log(`Fitting ${KNOT_COUNT} knots against ${samples.length} chromatic samples of ${raw.length}.`);

  // Seed each knot from the most chromatic reference sample nearest its
  // position, which starts the search inside the right region of the space.
  const span = 400 / KNOT_COUNT;
  const table: Knot[] = [];
  for (let i = 0; i < KNOT_COUNT; i++) {
    const t = i * span;
    let near = samples[0]!;
    let best = Infinity;
    for (const s of samples) {
      const dt = Math.min(Math.abs(s.t - t), 400 - Math.abs(s.t - t));
      const score = dt * 10 + (100 - s.chromaticness);
      if (score < best) {
        best = score;
        near = s;
      }
    }
    const [, C, H] = convert(near.target, "oklch").coords as [number, number, number];
    table.push({ L0: 1, kb: 0.75, kc: 0.25, Cc: C * 1.6, Ccb: 0, Ccc: 0, H, hb: 0, hc: 0 });
  }

  let best = mean(errorsFor(table, samples));
  console.log(`Seed: mean ΔE00 ${best.toFixed(4)}`);

  for (let scale = 1; scale >= 0.02; scale /= 2) {
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < KNOT_COUNT; i++) {
        for (const field of FIELDS) {
          for (const sign of [1, -1]) {
            const delta = sign * STEP[field] * scale;
            table[i]![field] += delta;
            const score = mean(errorsFor(table, samples));
            if (score < best - 1e-6) {
              best = score;
              improved = true;
            } else {
              table[i]![field] -= delta;
            }
          }
        }
      }
    }
    console.log(`  scale ${scale.toFixed(3)}  mean ΔE00 ${best.toFixed(4)}`);
  }

  const errors = errorsFor(table, samples).sort((a, b) => a - b);
  console.log(`\nmean   ${mean(errors).toFixed(3)}`);
  console.log(`median ${errors[Math.floor(errors.length / 2)]!.toFixed(3)}`);
  console.log(`p95    ${errors[Math.floor(errors.length * 0.95)]!.toFixed(3)}`);
  console.log(`max    ${errors.at(-1)!.toFixed(3)}`);
  console.log(`over 5 ${errors.filter(e => e > 5).length} of ${errors.length}`);

  const body = table.map(k => `  { L0: ${k.L0.toFixed(4)}, kb: ${k.kb.toFixed(4)}, kc: ${k.kc.toFixed(4)}, `
    + `Cc: ${k.Cc.toFixed(4)}, Ccb: ${k.Ccb.toFixed(4)}, Ccc: ${k.Ccc.toFixed(4)}, `
    + `H: ${k.H.toFixed(3)}, hb: ${k.hb.toFixed(3)}, hc: ${k.hc.toFixed(3)} },`).join("\n");
  await Bun.write(new URL("./fitted.txt", import.meta.url), `export const KNOTS: readonly Knot[] = [\n${body}\n];\n`);
  console.log("\nWrote scripts/fitted.txt — paste into src/model.ts.");
}

if (import.meta.main) {
  await main();
}
