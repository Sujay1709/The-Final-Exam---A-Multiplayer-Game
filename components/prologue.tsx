"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  KeyRound,
  Film,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const SCENES = [
  {
    chapter: "The missing credit",
    when: "THIRTY YEARS AGO · THE COLLEGE SCIENCE FAIR",
    title: "One name was missing.",
    image: "/story/manga-credit.png",
    alt: "Young Elias Voss holds his research notebook while his college teammates accept a trophy at their science fair.",
    narration:
      "Elias had spent months on the team's research. A printing error left his name off the award. He walked away before his friends could explain.",
    dialogue: [
      {
        speaker: "ELIAS VOSS",
        text: "That’s my research… why isn’t my name there?",
      },
      { speaker: "HIS TEAMMATE", text: "Elias, wait! There’s been a mistake!" },
    ],
  },
  {
    chapter: "The grudge",
    when: "YEARS LATER · A LAB THAT NEVER SLEEPS",
    title: "He remembered it differently.",
    image: "/story/manga-grudge.png",
    alt: "An older silver-haired Voss studies his old research and team photograph alone in a green-lit laboratory, with unopened letters beside him.",
    narration:
      "The letters stayed unopened. The photograph stayed on his desk. In Voss's mind, a mistake became a betrayal—and an old reunion invitation became a plan.",
    dialogue: [
      {
        speaker: "PROFESSOR VOSS",
        text: "They took the credit. Let them earn their way out.",
      },
      { speaker: "PROFESSOR VOSS", text: "A reunion… and one final exam." },
    ],
  },
  {
    chapter: "The experiment",
    when: "TONIGHT · THE DEPARTMENT OF UNFINISHED BUSINESS",
    title: "The laboratory became the test.",
    image: "/story/manga-lab.png",
    alt: "Professor Voss wires a keypad and puzzle locks into his science laboratory, surrounded by green-lit equipment and reunion invitations.",
    narration:
      "He wired the doors to number locks, set the countdowns, and built a detention room for missed deadlines. Then he invited his old teammates inside. You are the team that must escape.",
    dialogue: [
      {
        speaker: "PROFESSOR VOSS",
        text: "Every door needs a question. Every mistake needs a consequence.",
      },
      {
        speaker: "PROFESSOR VOSS",
        text: "Welcome back, old friends. The exam starts now.",
      },
    ],
  },
] as const;

export function Prologue({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(true);
  const current = SCENES[scene];

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    const visibility = () => setVisible(!document.hidden);
    update();
    visibility();
    preference.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      preference.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setScene(0);
    setPlaying(!matchMedia("(prefers-reduced-motion: reduce)").matches);
    // Preload the next panels so a scene change never waits on an image download.
    SCENES.forEach((s) => {
      const image = new Image();
      image.src = s.image;
    });
  }, [open]);

  useEffect(() => {
    if (
      !open ||
      !playing ||
      !visible ||
      scene === SCENES.length - 1 ||
      reducedMotion
    )
      return;
    const timer = setTimeout(
      () => setScene((index) => Math.min(index + 1, SCENES.length - 1)),
      11000,
    );
    return () => clearTimeout(timer);
  }, [open, playing, visible, scene, reducedMotion]);

  function jump(index: number) {
    setPlaying(false);
    setScene(Math.max(0, Math.min(index, SCENES.length - 1)));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="story-modal" showCloseButton={false}>
        <div className="story-header">
          <div>
            <span className="eyebrow">
              <Film size={15} />
              THE PROFESSOR’S ORIGIN STORY
            </span>
            <DialogTitle className="story-dialog-title">
              Before the doors locked.
            </DialogTitle>
          </div>
          <button className="text-button story-skip" onClick={onClose}>
            Skip story
          </button>
        </div>
        <DialogDescription className="sr-only">
          A three-scene animated manga prologue. Read how Professor Voss's
          grudge led him to build an escape room. Pause, navigate scenes, or
          skip to the game.
        </DialogDescription>
        <Tabs
          value={String(scene)}
          onValueChange={(value) => jump(Number(value))}
          className="story-tabs"
        >
          <TabsList className="story-chapters">
            {SCENES.map((s, index) => (
              <TabsTrigger key={s.chapter} value={String(index)}>
                <span>0{index + 1}</span>
                {s.chapter}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent
            value={String(scene)}
            key={scene}
            className="story-scene"
          >
            <div
              className={`story-stage scene-${scene} ${playing && visible && !reducedMotion ? "story-animating" : ""}`}
            >
              <img
                className="manga-image"
                src={current.image}
                alt={current.alt}
                width={1672}
                height={941}
                fetchPriority="high"
              />
              <div className="scene-stamp">CHAPTER 0{scene + 1}</div>
              <div className="speech-clouds">
                {current.dialogue.map((line, index) => (
                  <blockquote
                    className={`speech-cloud cloud-${index}`}
                    key={line.text}
                  >
                    <cite>{line.speaker}</cite>
                    <p>{line.text}</p>
                  </blockquote>
                ))}
              </div>
              {playing &&
                visible &&
                !reducedMotion &&
                scene < SCENES.length - 1 && (
                  <div className="story-time-bar" aria-hidden="true">
                    <span />
                  </div>
                )}
            </div>
            <div
              className="story-caption"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="micro">{current.when}</span>
              <h2>{current.title}</h2>
              <p>{current.narration}</p>
            </div>
          </TabsContent>
        </Tabs>
        <div className="story-controls">
          <button
            className="secondary-button"
            onClick={() => jump(scene - 1)}
            disabled={scene === 0}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="story-play-control">
            {!reducedMotion && scene < SCENES.length - 1 ? (
              <button
                className="text-button"
                onClick={() => setPlaying(!playing)}
                aria-label={playing ? "Pause story" : "Play story"}
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
                <span>{playing ? "Pause" : "Play"}</span>
              </button>
            ) : (
              <span className="micro">
                {reducedMotion ? "READ AT YOUR PACE" : "THE STAGE IS SET"}
              </span>
            )}
            <span className="story-page-count">0{scene + 1} / 03</span>
          </div>
          <button
            className="primary-button"
            onClick={() =>
              scene === SCENES.length - 1 ? onClose() : jump(scene + 1)
            }
          >
            {scene === SCENES.length - 1 ? (
              <>
                <KeyRound size={16} />
                Enter the lab
              </>
            ) : (
              <>
                Next scene
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
