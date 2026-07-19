/**
 * A colour-agnostic evaluator for the CSS math subset used by relative colour
 * syntax: `calc()`, `clamp()`, `min()`, `max()`, arithmetic, angle dimensions
 * and the `none` keyword.
 *
 * Values carry a `percent` flag rather than being pre-divided, because a
 * percentage only acquires meaning once resolved against a channel's reference
 * range — which is the caller's job, not this module's.
 */

export interface MathValue { value: number; percent: boolean }
export type MathScope = Record<string, MathValue>;

type Token
  = | { kind: "num"; value: number; percent: boolean }
    | { kind: "ident"; name: string }
    | { kind: "op"; op: "+" | "-" | "*" | "/" }
    | { kind: "punct"; ch: "(" | ")" | "," };

/** Multipliers converting each supported angle unit to degrees. */
const ANGLE_TO_DEG: Record<string, number> = {
  deg: 1,
  grad: 0.9,
  rad: 180 / Math.PI,
  turn: 360,
};

const NUMBER_RE = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const IDENT_RE = /^[a-zA-Z][a-zA-Z0-9-]*/;

/**
 * Scans `input` into a flat token list. Signs are left to the parser as unary
 * operators; angle dimensions are normalised to degrees here so that no later
 * stage has to care about units.
 *
 * @returns the tokens, or `null` if any character is unrecognised.
 */
function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let rest = input;

  while (rest.length > 0) {
    const ch = rest[0]!;

    if (/\s/.test(ch)) {
      rest = rest.slice(1);
      continue;
    }

    if (ch === "(" || ch === ")" || ch === ",") {
      tokens.push({ kind: "punct", ch });
      rest = rest.slice(1);
      continue;
    }

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ kind: "op", op: ch });
      rest = rest.slice(1);
      continue;
    }

    const num = NUMBER_RE.exec(rest);
    if (num) {
      let value = Number(num[0]);
      if (!Number.isFinite(value)) return null;
      rest = rest.slice(num[0].length);

      if (rest.startsWith("%")) {
        tokens.push({ kind: "num", value, percent: true });
        rest = rest.slice(1);
        continue;
      }

      const unit = IDENT_RE.exec(rest);
      if (unit) {
        const factor = ANGLE_TO_DEG[unit[0].toLowerCase()];
        if (factor === undefined) return null;
        value *= factor;
        rest = rest.slice(unit[0].length);
      }

      tokens.push({ kind: "num", value, percent: false });
      continue;
    }

    const ident = IDENT_RE.exec(rest);
    if (ident) {
      tokens.push({ kind: "ident", name: ident[0] });
      rest = rest.slice(ident[0].length);
      continue;
    }

    return null;
  }

  return tokens;
}

/* -- type algebra ------------------------------------------------------- */
/* `+`/`-` need matching types; `*` tolerates at most one percent and         */
/* propagates it; `/` forbids a percent divisor and keeps the dividend's flag. */

function applyOp(op: "+" | "-" | "*" | "/", a: MathValue, b: MathValue): MathValue | null {
  switch (op) {
    case "+":
    case "-":
      if (a.percent !== b.percent) return null;
      return { value: op === "+" ? a.value + b.value : a.value - b.value, percent: a.percent };
    case "*":
      if (a.percent && b.percent) return null;
      return { value: a.value * b.value, percent: a.percent || b.percent };
    case "/":
      if (b.percent || b.value === 0) return null;
      return { value: a.value / b.value, percent: a.percent };
  }
}

/**
 * Recursive-descent parser over:
 *   expr   := term (("+"|"-") term)*
 *   term   := factor (("*"|"/") factor)*
 *   factor := "(" expr ")" | fn | number | ident | ("+"|"-") factor
 *
 * Every production returns `null` on failure, which propagates to the caller.
 */
class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[], private readonly scope: MathScope) {}

  atEnd(): boolean {
    return this.pos >= this.tokens.length;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  /** Consumes the next token if it is the given punctuation. */
  private eat(ch: "(" | ")" | ","): boolean {
    const t = this.peek();
    if (t?.kind === "punct" && t.ch === ch) {
      this.pos++;
      return true;
    }
    return false;
  }

  expr(): MathValue | null {
    let left = this.term();
    if (!left) return null;

    for (;;) {
      const t = this.peek();
      if (t?.kind !== "op" || (t.op !== "+" && t.op !== "-")) return left;
      this.pos++;
      const right = this.term();
      if (!right) return null;
      const next = applyOp(t.op, left, right);
      if (!next) return null;
      left = next;
    }
  }

  private term(): MathValue | null {
    let left = this.factor();
    if (!left) return null;

    for (;;) {
      const t = this.peek();
      if (t?.kind !== "op" || (t.op !== "*" && t.op !== "/")) return left;
      this.pos++;
      const right = this.factor();
      if (!right) return null;
      const next = applyOp(t.op, left, right);
      if (!next) return null;
      left = next;
    }
  }

  private factor(): MathValue | null {
    const t = this.peek();
    if (!t) return null;

    if (t.kind === "op" && (t.op === "+" || t.op === "-")) {
      this.pos++;
      const inner = this.factor();
      if (!inner) return null;
      return t.op === "-" ? { value: -inner.value, percent: inner.percent } : inner;
    }

    if (t.kind === "punct" && t.ch === "(") {
      this.pos++;
      const inner = this.expr();
      if (!inner || !this.eat(")")) return null;
      return inner;
    }

    if (t.kind === "num") {
      this.pos++;
      return { value: t.value, percent: t.percent };
    }

    if (t.kind === "ident") {
      const next = this.tokens[this.pos + 1];
      if (next?.kind === "punct" && next.ch === "(") {
        this.pos += 2;
        return this.call(t.name.toLowerCase());
      }
      this.pos++;
      if (t.name.toLowerCase() === "none") return { value: 0, percent: false };
      const bound = this.scope[t.name];
      // Copied so that arithmetic can never alias into the caller's scope.
      return bound ? { value: bound.value, percent: bound.percent } : null;
    }

    return null;
  }

  /** Parses a comma-separated argument list (the `(` is already consumed). */
  private call(name: string): MathValue | null {
    const args: MathValue[] = [];
    do {
      const arg = this.expr();
      if (!arg) return null;
      args.push(arg);
    } while (this.eat(","));

    if (!this.eat(")")) return null;

    switch (name) {
      case "calc":
        return args.length === 1 ? args[0]! : null;
      case "clamp":
        if (args.length !== 3) return null;
        break;
      case "min":
      case "max":
        if (args.length < 1) return null;
        break;
      default:
        return null;
    }

    // clamp/min/max require every argument to agree on number-vs-percentage.
    const percent = args[0]!.percent;
    if (args.some(a => a.percent !== percent)) return null;
    const nums = args.map(a => a.value);

    const value = name === "clamp"
      ? Math.min(Math.max(nums[1]!, nums[0]!), nums[2]!)
      : name === "min" ? Math.min(...nums) : Math.max(...nums);

    return { value, percent };
  }
}

/**
 * Evaluates a CSS math expression against a scope of named values.
 *
 * Accepts both wrapped input (`calc(l * 2)`) and a bare factor (`50%`, `l`,
 * `none`, `180deg`). The entire input must be consumed — trailing junk is an
 * error, as is any malformed or non-finite result.
 *
 * @returns the resulting value, or `null` on any syntax error, unknown
 * identifier, division by zero, or non-finite result. Pathologically deep
 * nesting (tens of thousands of levels) can still overflow the call stack —
 * ordinary input comes nowhere near that depth.
 */
export function evaluateMath(input: string, scope: MathScope): MathValue | null {
  const tokens = tokenize(input);
  if (!tokens || tokens.length === 0) return null;

  const parser = new Parser(tokens, scope);
  const result = parser.expr();
  if (!result || !parser.atEnd()) return null;
  if (!Number.isFinite(result.value)) return null;

  return result;
}
