import { PUZZLES, type Puzzle } from "./puzzles.ts";
import type { Difficulty } from "./game-types.ts";

// A private seeded generator makes every seat receive the same concrete bank.
// Numbers, answers, and explanations are constructed together; no model guesses.
export function generatePuzzleRooms(
  difficulty: Difficulty,
  seed: number,
): Puzzle[][] {
  let state = seed >>> 0 || 1;
  const integer = (min: number, max: number) => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return min + Math.floor((state / 4294967296) * (max - min + 1));
  };
  const replace = (q: Puzzle): Puzzle => {
    const make = (
      prompt: string,
      answer: number,
      solution: string,
      hint = q.hint,
    ) => ({ ...q, prompt, answer, solution, hint });
    switch (q.id) {
      case "j0a": {
        const a = integer(3, 15),
          b = integer(2, 9),
          c = integer(2, 6);
        return make(
          `The keypad reads ${a} + ${b} × ${c}. Enter its value.`,
          a + b * c,
          `${b} × ${c} = ${b * c}; ${a} + ${b * c} = ${a + b * c}.`,
        );
      }
      case "j0b": {
        const a = integer(1, 10),
          step = integer(2, 8),
          terms = [0, 1, 2, 3].map((i) => a + i * step);
        return make(
          `A torn notebook reads ${terms.join(", ")}, __. What number comes next?`,
          a + 4 * step,
          `Each number increases by ${step}, so ${a + 3 * step} + ${step} = ${a + 4 * step}.`,
        );
      }
      case "j0c": {
        const boxes = integer(4, 9),
          pencils = integer(5, 9),
          total = boxes * pencils,
          away = integer(1, Math.floor(total * 0.6));
        return make(
          `Voss has ${boxes} boxes of ${pencils} pencils. He gives away ${away} pencils. How many remain?`,
          total - away,
          `${boxes} × ${pencils} = ${total}; ${total} − ${away} = ${total - away}.`,
        );
      }
      case "j1a": {
        const denominator = [4, 5, 8][integer(0, 2)],
          numerator = integer(1, denominator - 1),
          volume = denominator * integer(10, 30),
          answer = (volume / denominator) * numerator;
        return make(
          `A bottle contains ${volume} mL. You need ${numerator}/${denominator} of it. How many mL should you pour?`,
          answer,
          `${volume} ÷ ${denominator} × ${numerator} = ${answer} mL.`,
          `Divide by ${denominator}, then multiply by ${numerator}.`,
        );
      }
      case "j1b": {
        const price = 20 * integer(3, 10),
          discount = [10, 20, 25, 50][integer(0, 3)],
          saving = (price * discount) / 100;
        return make(
          `A lab coat costs ${price} credits with a ${discount}% discount. What is the final price?`,
          price - saving,
          `${discount}% of ${price} is ${saving}; ${price} − ${saving} = ${price - saving} credits.`,
          `Find ${discount}% of the original price and subtract it.`,
        );
      }
      case "j2a": {
        const x = integer(2, 30),
          add = integer(5, 25),
          total = x + add;
        return make(
          `The alarm will stop when x + ${add} = ${total}. Find x.`,
          x,
          `x = ${total} − ${add} = ${x}.`,
          `Subtract ${add} from both sides.`,
        );
      }
      case "j2c": {
        const x = integer(3, 12),
          coefficient = integer(2, 6),
          subtract = integer(1, Math.min(12, coefficient * x - 1)),
          total = coefficient * x - subtract;
        return make(
          `A locked cabinet reads ${coefficient}x − ${subtract} = ${total}. Find x.`,
          x,
          `${coefficient}x = ${total + subtract}, so x = ${x}.`,
          `Add ${subtract} first, then divide by ${coefficient}.`,
        );
      }
      case "s0a": {
        const a = integer(20, 50),
          b = integer(2, 5),
          c = integer(3, 9),
          d = integer(1, 8),
          sum = c + d;
        return make(
          `Enter the value of ${a} − ${b} × (${c} + ${d}).`,
          a - b * sum,
          `${c} + ${d} = ${sum}; ${a} − ${b} × ${sum} = ${a - b * sum}.`,
        );
      }
      case "s0c": {
        const initial = -integer(5, 20),
          warms = integer(5, 30),
          cools = integer(1, 10);
        return make(
          `The freezer is at ${initial}°C. It warms by ${warms}°C, then cools by ${cools}°C. What is its final temperature?`,
          initial + warms - cools,
          `${initial} + ${warms} − ${cools} = ${initial + warms - cools}°C.`,
        );
      }
      case "s1a": {
        const denominator = [8, 12][integer(0, 1)],
          a = integer(1, denominator / 2 - 1),
          b = integer(1, denominator - 1),
          numerator = 2 * a + b;
        return make(
          `Enter the value of ${a}/${denominator / 2} + ${b}/${denominator} as a fraction or decimal.`,
          numerator / denominator,
          `${2 * a}/${denominator} + ${b}/${denominator} = ${numerator}/${denominator} = ${numerator / denominator}.`,
          `Convert both fractions to denominator ${denominator}.`,
        );
      }
      case "s2a": {
        const a = integer(5, 9),
          c = integer(2, a - 1),
          x = integer(3, 15),
          b = integer(2, 8),
          constant = (a - c) * x - a * b;
        const sign = constant < 0 ? `− ${-constant}` : `+ ${constant}`;
        return make(
          `Solve ${a}(x − ${b}) = ${c}x ${sign}. Enter x.`,
          x,
          `${a}x − ${a * b} = ${c}x ${sign}; ${a - c}x = ${(a - c) * x}; x = ${x}.`,
        );
      }
      case "s2b": {
        const base = integer(2, 3),
          a = integer(5, 7),
          b = integer(1, 3),
          c = integer(4, a + b),
          exponent = a + b - c;
        return make(
          `Enter the value of ${base}^${a} × ${base}^${b} ÷ ${base}^${c}.`,
          base ** exponent,
          `${base}^(${a} + ${b} − ${c}) = ${base}^${exponent} = ${base ** exponent}.`,
        );
      }
      case "s2c": {
        const x = integer(8, 20);
        return make(
          `Find the positive value of x when x² = ${x * x}.`,
          x,
          `${x} × ${x} = ${x * x}, so the positive root is ${x}.`,
          `Find the positive square root of ${x * x}.`,
        );
      }
      case "s4c": {
        const a = integer(2, 8),
          b = integer(9, 15);
        return make(
          `The final lock reads x² − ${a + b}x + ${a * b} = 0. Enter the larger solution.`,
          b,
          `(x − ${a})(x − ${b}) = 0. The roots are ${a} and ${b}; the larger is ${b}.`,
          `Find two numbers whose sum is ${a + b} and product is ${a * b}.`,
        );
      }
      default:
        return { ...q };
    }
  };
  return PUZZLES[difficulty].map((room) =>
    room.map((q) => validatedVariation(q, () => replace(q))),
  );
}

export function validatedVariation(
  original: Puzzle,
  generate: () => Puzzle,
): Puzzle {
  try {
    const q = generate();
    if (
      q.id !== original.id ||
      !Number.isFinite(q.answer) ||
      ![q.title, q.topic, q.prompt, q.hint, q.solution].every(
        (s) => typeof s === "string" && s.trim().length > 0,
      )
    )
      return { ...original };
    return q;
  } catch {
    return { ...original };
  }
}
