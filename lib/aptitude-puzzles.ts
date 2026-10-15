import type { Difficulty } from "./game-types.ts";
import type { Puzzle } from "./puzzles.ts";
import type { FamilyTreeDiagram } from "./aptitude-types.ts";

// Every player receives the same seeded order. Correct options stay on the server.
export function withAptitude(
  rooms: Puzzle[][],
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
  const junior = difficulty === "junior";
  const choice = (
    original: Puzzle,
    title: string,
    topic: string,
    prompt: string,
    correct: string,
    distractors: string[],
    hint: string,
    explanation: string,
    diagram?: FamilyTreeDiagram,
  ): Puzzle => {
    const choices = [correct, ...distractors];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = integer(0, i);
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return {
      id: original.id,
      title,
      topic,
      prompt,
      choices,
      answer: choices.indexOf(correct) + 1,
      hint,
      solution: `${correct}. ${explanation}`,
      ...(diagram ? { diagram } : {}),
    };
  };
  return rooms.map((questions, room) =>
    questions.map((q, index) => {
      if (index !== 2) return { ...q };
      if (room === 0) {
        const variant = integer(0, 2);
        if (junior) {
          const diagram: FamilyTreeDiagram = {
            kind: "family-tree",
            people: [
              { id: "arun", name: "Arun", detail: "Father", x: 50, y: 14 },
              { id: "mira", name: "Mira", detail: "Daughter", x: 23, y: 48 },
              { id: "neel", name: "Neel", detail: "Son", x: 77, y: 48 },
              { id: "riya", name: "Riya", detail: "Daughter", x: 77, y: 84 },
            ],
            links: [
              { from: "arun", to: "mira", relation: "parent" },
              { from: "arun", to: "neel", relation: "parent" },
              { from: "neel", to: "riya", relation: "parent" },
            ],
          };
          const cases = [
            [
              "How is Mira related to Riya?",
              "Aunt",
              ["Sister", "Mother", "Grandmother"],
              "Mira is the sister of Riya’s father, Neel.",
            ],
            [
              "How is Arun related to Riya?",
              "Grandfather",
              ["Father", "Uncle", "Brother"],
              "Arun is the father of Neel, who is Riya’s father.",
            ],
            [
              "How is Riya related to Mira?",
              "Niece",
              ["Daughter", "Sister", "Aunt"],
              "Riya is the daughter of Mira’s brother, Neel.",
            ],
          ] as const;
          const c = cases[variant];
          return choice(
            q,
            "The reunion family tree",
            "Family relationships",
            `Arun is the father of Mira (his daughter) and Neel (his son). Mira and Neel are siblings. Neel is the father of Riya (his daughter). ${c[0]}`,
            c[1],
            [...c[2]],
            "Trace one parent-child connection at a time. The question asks from the first person’s point of view.",
            c[3],
            diagram,
          );
        }
        const diagram: FamilyTreeDiagram = {
          kind: "family-tree",
          people: [
            { id: "tara", name: "Tara", detail: "Woman", x: 25, y: 22 },
            { id: "ishan", name: "Ishan", detail: "Man", x: 75, y: 22 },
            { id: "maya", name: "Maya", detail: "Daughter", x: 25, y: 78 },
            { id: "dev", name: "Dev", detail: "Son", x: 75, y: 78 },
          ],
          links: [
            { from: "tara", to: "ishan", relation: "sibling" },
            { from: "tara", to: "maya", relation: "parent" },
            { from: "ishan", to: "dev", relation: "parent" },
          ],
        };
        const cases = [
          [
            "How is Dev related to Maya?",
            "Cousin",
            ["Brother", "Uncle", "Nephew"],
            "Their parents, Ishan and Tara, are siblings, so their children are first cousins.",
          ],
          [
            "How is Ishan related to Maya?",
            "Uncle",
            ["Father", "Cousin", "Grandfather"],
            "Ishan is the brother of Maya’s mother, Tara.",
          ],
          [
            "How is Maya related to Ishan?",
            "Niece",
            ["Daughter", "Sister", "Aunt"],
            "Maya is the daughter of Ishan’s sister, Tara.",
          ],
        ] as const;
        const c = cases[variant];
        return choice(
          q,
          "The reunion family tree",
          "Family relationships",
          `Tara (a woman) and Ishan (a man) are siblings. Tara is Maya’s mother; Maya is her daughter. Ishan is Dev’s father; Dev is his son. ${c[0]}`,
          c[1],
          [...c[2]],
          "Separate sibling links from parent-child links before tracing the relationship.",
          c[3],
          diagram,
        );
      }
      if (room === 1) {
        const directions = ["North", "East", "South", "West"];
        const initial = integer(0, 3);
        const turns = Array.from({ length: junior ? 2 : 4 }, () =>
          integer(0, 1) === 0 ? -1 : 1,
        );
        const facing = (initial + turns.reduce((a, b) => a + b, 0) + 8) % 4;
        const words = turns
          .map((t) => `90° ${t === 1 ? "right" : "left"}`)
          .join(", then ");
        return choice(
          q,
          "The delivery route",
          "Direction sense",
          `You face ${directions[initial].toLowerCase()} beside the mixing vat. Turn ${words}. Which direction are you facing now?`,
          directions[facing],
          directions.filter((_, i) => i !== facing),
          "A right turn moves clockwise on a compass; a left turn moves anticlockwise.",
          `Start ${directions[initial].toLowerCase()}. After each turn: ${turns.map((_, i) => directions[(initial + turns.slice(0, i + 1).reduce((a, b) => a + b, 0) + 8) % 4]).join(" → ")}.`,
        );
      }
      if (room === 2) {
        const front = integer(2, junior ? 6 : 12),
          back = integer(3, junior ? 8 : 15),
          total = front + back - 1;
        return choice(
          q,
          "The evacuation line",
          "Ranking & order",
          `Neel is ${front}${ordinal(front)} from the front and ${back}${ordinal(back)} from the back of one line. How many people are in the line?`,
          String(total),
          [String(total - 1), String(total + 1), String(total + 2)],
          "Both counts include Neel. Count him only once.",
          `${front} + ${back} − 1 = ${total} people.`,
        );
      }
      if (room === 3) {
        const start = integer(0, 3),
          step = integer(1, junior ? 3 : 2);
        const offsets = junior
          ? [0, step, 2 * step, 3 * step, 4 * step]
          : [0, step, 2 * step + 1, 3 * step + 3, 4 * step + 6];
        const letters = offsets.map((x) => String.fromCharCode(65 + start + x));
        const answerIndex = start + offsets[4];
        return choice(
          q,
          "The symbol strip",
          "Letter patterns",
          `A light strip shows ${letters.slice(0, 4).join(", ")}, __. Which letter comes next?`,
          letters[4],
          [1, 2, 3].map((n) => String.fromCharCode(65 + answerIndex + n)),
          junior
            ? "Count the same number of alphabet positions between neighbours."
            : "Compare successive alphabet jumps; each jump grows by one.",
          junior
            ? `Each letter advances ${step} alphabet position${step > 1 ? "s" : ""}. The next letter is ${letters[4]}.`
            : `The jumps are ${step}, ${step + 1}, ${step + 2}, then ${step + 3} alphabet positions. ${letters[3]} plus ${step + 3} gives ${letters[4]}.`,
        );
      }
      return choice(
        q,
        "The professor’s deduction",
        "Logical deduction",
        junior
          ? "Every research assistant wears an ID badge. Mira is a research assistant. Which statement must be true?"
          : "All prism cards are blue. No blue card opens the red vault. Which statement must be true?",
        junior ? "Mira wears an ID badge" : "No prism card opens the red vault",
        junior
          ? [
              "Everyone with a badge is a research assistant",
              "Mira never wears a badge",
              "Only Mira wears a badge",
            ]
          : [
              "Every blue card is a prism card",
              "Some blue cards open the red vault",
              "Every vault key is a prism card",
            ],
        "Use only the stated facts. Do not reverse an ‘all’ statement or assume extra information.",
        junior
          ? "Mira belongs to the group whose members all wear badges."
          : "Prism cards belong to the blue-card group, and that entire group is excluded from opening the red vault.",
      );
    }),
  );
}
function ordinal(n: number) {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return (
    ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"
  );
}
