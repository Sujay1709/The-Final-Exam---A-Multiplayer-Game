export interface RoomScene {
  id: string;
  name: string;
  image: string;
  alt: string;
  atmosphere: string;
  objects: { name: string; note: string; x: number; y: number }[];
  exit: { x: number; y: number };
}
export const ROOM_SCENES: RoomScene[] = [
  {
    id: "abandoned-laboratory",
    name: "Abandoned science laboratory",
    image: "/lab/abandoned-laboratory.webp",
    alt: "A dusty university laboratory with a notebook on the left desk, reagent bottles at right, and a broken terminal beside a locked door.",
    atmosphere:
      "Dust hangs in the emergency light. Your first clue is closer than you think.",
    objects: [
      {
        name: "Dusty notebook",
        note: "Inspect the forgotten desk",
        x: 16,
        y: 56,
      },
      { name: "Chemical bottles", note: "Inspect the workbench", x: 89, y: 51 },
      {
        name: "Broken terminal",
        note: "Inspect the old computer",
        x: 76,
        y: 38,
      },
    ],
    exit: { x: 56, y: 29 },
  },
  {
    id: "fraction-factory",
    name: "The Alchemist’s Workshop",
    image: "/lab/fraction-factory.webp",
    alt: "A towering teal mixing vat at left, measuring cylinders on the right bench, and brass balance scales on a central table.",
    atmosphere:
      "The mixtures have settled. The pipes haven’t. Follow the lost instruments before the pressure rises.",
    objects: [
      {
        name: "Mixing vat",
        note: "Read the etched measuring scale",
        x: 20,
        y: 44,
      },
      {
        name: "Measuring cylinders",
        note: "Inspect the bottle rack",
        x: 85,
        y: 56,
      },
      {
        name: "Balance scales",
        note: "Check the delivery records",
        x: 49,
        y: 59,
      },
    ],
    exit: { x: 53, y: 26 },
  },
  {
    id: "algebra-alarm",
    name: "The Storm Engine",
    image: "/lab/algebra-alarm.webp",
    alt: "An orange-lit control room with a switchboard at left, a generator in front, and a cracked computer console at right.",
    atmosphere:
      "The generator is awake. Untangle the signals before the next alarm.",
    objects: [
      { name: "Switchboard", note: "Inspect the alarm switches", x: 20, y: 45 },
      {
        name: "Power generator",
        note: "Read the power regulator",
        x: 51,
        y: 68,
      },
      {
        name: "Control console",
        note: "Inspect the evacuation display",
        x: 83,
        y: 48,
      },
    ],
    exit: { x: 52, y: 16 },
  },
  {
    id: "geometry-trap",
    name: "The Hall of Reflections",
    image: "/lab/geometry-trap.webp",
    alt: "A violet geometry chamber with a glass prism at left, an angled mirror high on the right wall, and a raised floor tile.",
    atmosphere:
      "Light draws the route. Reflections, fragments, and a hidden message stand between you and the door.",
    objects: [
      { name: "Glass prism", note: "Inspect the prism pedestal", x: 16, y: 48 },
      {
        name: "Angled mirror",
        note: "Read the mirror’s calibration",
        x: 88,
        y: 28,
      },
      {
        name: "Loose floor tile",
        note: "Inspect the symbol strip",
        x: 66,
        y: 80,
      },
    ],
    exit: { x: 50, y: 31 },
  },
  {
    id: "final-study",
    name: "Voss’s private study",
    image: "/lab/final-study.webp",
    alt: "An amber-lit study with a college photograph at left, an unopened envelope on the desk, and a safe beside the right bookshelf.",
    atmosphere:
      "The unopened letter is still here. One final deduction can change the ending.",
    objects: [
      {
        name: "Team photograph",
        note: "Inspect the reunion photograph",
        x: 12,
        y: 24,
      },
      {
        name: "Unopened letter",
        note: "Read the overlooked evidence",
        x: 44,
        y: 69,
      },
      {
        name: "Research safe",
        note: "Inspect the final deduction lock",
        x: 79,
        y: 45,
      },
    ],
    exit: { x: 56, y: 23 },
  },
];
export const DETENTION_SCENES: RoomScene[] = [
  {
    id: "detention-warning",
    name: "The Warning Archive",
    image: "/lab/detention-warning.webp",
    alt: "A cramped archive of iron filing cabinets with a warning document under the left desk lamp.",
    atmosphere:
      "One warning slip. One chance to recover the room you left behind.",
    objects: [
      {
        name: "Warning slip",
        note: "Read the professor’s warning",
        x: 22,
        y: 70,
      },
    ],
    exit: { x: 61, y: 24 },
  },
  {
    id: "detention-isolation",
    name: "The Isolation Chamber",
    image: "/lab/detention-isolation.webp",
    alt: "A red-lit isolation chamber with a pressure gauge at left and a spring scale over the right workbench.",
    atmosphere:
      "The observation glass is silent. Two safety checks will release the door.",
    objects: [
      {
        name: "Pressure gauge",
        note: "Read the safety riddle",
        x: 16,
        y: 35,
      },
      {
        name: "Spring scale",
        note: "Inspect the second safety lock",
        x: 85,
        y: 46,
      },
    ],
    exit: { x: 51, y: 24 },
  },
  {
    id: "detention-probation",
    name: "The Probation Vault",
    image: "/lab/detention-probation.webp",
    alt: "A crimson vault with a torn code fragment on the left desk, a damaged terminal at right, and a keypad on the center pedestal.",
    atmosphere:
      "Follow the forgotten letter from its envelope to its final witness. This is Voss’s final warning.",
    objects: [
      { name: "Torn code fragment", note: "Find the letter’s guardian", x: 14, y: 53 },
      { name: "Damaged terminal", note: "Find the traveling passenger", x: 84, y: 40 },
      {
        name: "Vault keypad",
        note: "Read the final postal clue",
        x: 51,
        y: 66,
      },
    ],
    exit: { x: 51, y: 20 },
  },
];
export function roomScene(roomIndex: number, detentionLevel = 0): RoomScene {
  return detentionLevel > 0
    ? DETENTION_SCENES[Math.min(2, Math.max(0, detentionLevel - 1))]
    : (ROOM_SCENES[roomIndex] ?? ROOM_SCENES[0]);
}
