import type { Puzzle } from "./puzzles.ts";
import type { Difficulty } from "./game-types.ts";

// A separate textual shape keeps already-running numeric JSON rooms readable.
export interface Riddle extends Omit<Puzzle, "answer" | "choices" | "diagram"> {
  choices?: never;
  diagram?: never;
  answer: string;
  aliases: string[];
  rank: number;
  points: number;
}
export type GamePuzzle = Puzzle | Riddle;
type Clue = [string, string, string, string, string, string[]?];
// Answer, title, cryptic clue, expert clue, explanation. These never go to clients unsolved.
const CLUES: Clue[] = [
  ["key", "The brass witness", "I have teeth but never eat. Turn me in the right mouth and a prisoner walks free. What am I?", "I bite without a jaw. My cuts remember one particular mouth; a half-turn can change a prison into a passage. What am I?", "A key has teeth cut for a lock, and turning it releases the door.", ["door key", "brass key"]],
  ["candle", "The vanishing guard", "I stand tall when my watch begins and shrink as I keep the darkness away. A breath can end my watch. What am I?", "My work consumes my body. I weep without grief, wear a living crown, and die at the smallest storm from your lips. What am I?", "A candle burns shorter, drips wax, carries a flame, and can be blown out."],
  ["echo", "The borrowed voice", "I answer from the corridor in your own voice. I have no lungs, and I say nothing until you speak. What am I?", "I am always second to speak and never choose my words. Stone gives me a voice that distance takes away. What am I?", "An echo is a reflected sound: it repeats a speaker after a delay."],
  ["compass", "The faithful needle", "Inside a little glass prison, my needle seeks the same distant pole. Turn the prison; I refuse to follow. What am I?", "My captive points toward a place it cannot visit. The world beneath us gives its orders, and turning my cage cannot change its loyalty. What am I?", "A magnetic compass needle aligns with Earth's magnetic field.", ["magnetic compass"]],
  ["hourglass", "The falling river", "My river is dry. It falls through a narrow throat, buries the empty chamber below, and runs again only when I turn upside down. What am I?", "Two chambers share a throat. A dry migration drains one and fills the other; invert the world and the journey begins again. What am I?", "An hourglass measures time as sand falls between two chambers.", ["sand timer", "sandglass", "sand clock"]],
  ["thermometer", "The silent fever", "A thin glass body holds my rising witness. Give me warmth and it climbs, though no one pulls a rope. The marks beside it tell you how hot. What am I?", "I imprison a thread that lengthens in a fever and retreats in the cold. Its height testifies against the air around it. What am I?", "A liquid-in-glass thermometer uses expansion of its liquid to indicate temperature.", ["glass thermometer", "liquid thermometer"]],
  ["circuit", "The broken journey", "I give electric travelers a complete road home. Break my road anywhere and the lamp goes dark, even though the battery still holds its promise. What am I?", "My purpose is a journey that must return to where it started. One missing bridge silences every traveler, though their source remains awake. What am I?", "A closed electrical circuit provides a continuous return path for current.", ["electrical circuit", "electric circuit", "closed circuit"]],
  ["magnet", "The divided alliance", "I have a north and a south. Like ends quarrel; unlike ends embrace. Cut me in half and neither half loses its pair. What am I?", "My opposite ends attract their strangers and repel their twins. Division never produces a lonely pole: every broken alliance becomes two complete ones. What am I?", "A magnet has two poles; splitting it creates smaller magnets with both poles.", ["bar magnet"]],
  ["battery", "The stored storm", "I keep chemical energy under a quiet shell. Join my positive and negative ends through the right road, and I can wake a dead machine. What am I?", "A chemical disagreement waits inside me. Give my marked ends an outside path and the disagreement becomes useful work, until I am spent. What am I?", "A battery converts stored chemical energy to electrical energy in a circuit.", ["electric battery"]],
  ["mirror", "The obedient stranger", "A stranger behind my silver skin copies every gesture. Reach for their right hand with yours and discover why you can never shake. What am I?", "My prisoner is perfectly obedient, yet meeting their gaze reverses the path of light. They vanish when you leave; no life is kept behind my silver. What am I?", "A mirror reflects light, producing an image that follows the viewer.", ["looking glass"]],
  ["prism", "The divided daylight", "I am a clear solid with triangular ends. A pale beam enters me; its hidden colors leave along different paths. What am I?", "My clear triangular body gives a single beam several exits. Each color bends by its own amount, and white confesses what it contained. What am I?", "A triangular glass prism disperses white light into its component colors.", ["glass prism", "triangular prism"]],
  ["kaleidoscope", "The broken cathedral", "Turn my tube and broken colored pieces rebuild a cathedral. Mirrors multiply the fragments; no turn promises the same window. What am I?", "I build perfect repetitions from a disorder of fragments. My mirrors enforce symmetry, while a twist destroys one cathedral to raise another. Look down my tube. What am I?", "A kaleidoscope makes changing symmetrical patterns using mirrors and colored fragments.", ["a kaleidoscope"]],
  ["watermark", "The invisible signature", "Voss holds the old certificate toward the light. I emerge inside the paper itself, a pale mark that ordinary ink did not draw. What am I?", "My signature lives in the substance of the sheet. Looking through it reveals what looking at it conceals; a copy of its surface cannot keep my secret. What am I?", "A paper watermark is formed by variations in paper thickness and becomes visible with transmitted light.", ["paper watermark"]],
  ["palimpsest", "The overwritten truth", "An old parchment was scraped and written on again. Beneath the new words, traces of the erased ones remain. I am the name for that reused manuscript. What am I?", "My skin was cleared for another voice, but the first never completely left. Read beneath my present and a scraped-away past returns. Name this reused manuscript. What am I?", "A palimpsest is a reused writing surface whose earlier, erased writing can still be traced.", ["a palimpsest"]],
  ["forgiveness", "The last unopened letter", "I do not call the hurt imaginary, erase the past, or require you to trust again. I am the choice to release your resentment toward the person who hurt you. What am I?", "I leave the facts of an injury intact but surrender the debt of resentment. I need neither forgetting nor renewed trust. Voss must offer me, not prove himself innocent. What am I?", "Forgiveness releases resentment without denying harm, forgetting it, or requiring reconciliation.", ["forgiving"]],
];

export function normalizeRiddleAnswer(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 80) return null;
  const word = value.normalize("NFKC").toLowerCase().trim()
    .replace(/[’']/g, "").replace(/[-‐‑–—]/g, " ")
    .replace(/[.,!?;:]+$/g, "").replace(/\s+/g, " ")
    .replace(/^(?:a|an|the) /, "");
  return /^[a-z][a-z ]{0,79}$/.test(word) ? word : null;
}
export const isRiddle = (q: GamePuzzle): q is Riddle => typeof q.answer === "string";
export function matchesRiddle(q: Riddle, value: string): boolean {
  const normalized = normalizeRiddleAnswer(value);
  return normalized !== null && [q.answer, ...q.aliases].some(a => normalizeRiddleAnswer(a) === normalized);
}
export function treasureRooms(difficulty: Difficulty): Riddle[][] {
  return Array.from({length:5}, (_, room) => Array.from({length:3}, (_, slot) => {
    const index=room*3+slot, [answer,title,cryptic,expert,solution,aliases=[]]=CLUES[index];
    const id=`h${room}${String.fromCharCode(97+slot)}`;
    return { id, answer, aliases, title, topic: "What am I?", prompt: difficulty === "senior" ? expert : cryptic,
      hint: HINTS[index], solution, rank:index+1, points:100+index*25,
      ...(slot ? {requires:[`h${room}${String.fromCharCode(96+slot)}`]} : {}) };
  }));
}
const HINTS = [
  "Think of the small object you turn inside a lock.", "Wax and a wick are its body and crown.",
  "Sound can return to you after bouncing off a distant wall.", "Its needle responds to Earth's magnetic field.",
  "Sand passes from one glass bulb to another.", "Think of the instrument used to read a fever, in its older glass form.",
  "Electric current needs a complete loop.", "It attracts iron and always has two magnetic poles.",
  "It is the replaceable power source in a flashlight.", "A silver-backed glass surface returns your image.",
  "Think of the triangular glass used to split sunlight.", "A tube, several mirrors, and colored fragments create rotating patterns.",
  "This security feature is part of the paper, not printed ink. Its name begins with water.",
  "The word is palimpsest: an erased manuscript used again. Enter that word to free the earlier story.",
  "It is releasing resentment, not forgetting. Its name begins with forgive.",
];
const detentionClues: [string,string,string,string][] = [
  ["shadow", "The captive outline", "Light creates me, but total darkness takes me away. I follow your shape without borrowing your face. What am I?", "A shadow forms where an object blocks light."],
  ["fingerprint", "The accidental signature", "I sign the glass when your bare fingertip rests on it. My ridges can identify you although you never learned to write me. What am I?", "A fingerprint is the distinctive ridge pattern left by a fingertip."],
  ["rust", "The patient thief", "Air and water help me eat the iron lock. I am a red-brown change, not a creature, and I make strong metal crumble. What am I?", "Rust forms when iron reacts with oxygen and moisture."],
  ["envelope", "The paper guardian", "I carry a letter but have no words of my own. Tear my sealed mouth and its hidden voice is yours to read. What am I?", "An envelope holds a letter behind a sealed flap."],
  ["stamp", "The paid passenger", "I cross a country while staying in the corner of a letter. My small printed face proves the journey has been paid for. What am I?", "A postage stamp stays on an envelope and pays for its delivery."],
  ["postmark", "The dated witness", "I am struck over the little paid passenger so it cannot travel twice. My ink can tell when and where a letter began its journey. What am I?", "A postmark cancels a postage stamp and records mailing information."],
];
export function treasureDetention(level: number): Riddle[] {
  const start=level*(level-1)/2;
  return detentionClues.slice(start,start+level).map(([answer,title,prompt,solution],i)=>({
    id:`dh${level}${String.fromCharCode(97+i)}`, answer, aliases:answer==="stamp"?["postage stamp"]:[],
    title,prompt,solution,topic:"Recovery riddle",hint:solution,rank:level*3+i,points:50*level,
    ...(i?{requires:[`dh${level}${String.fromCharCode(96+i)}`]}:{})
  }));
}
