"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, Film, Volume2, VolumeX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

// Each 12-second chapter has its own harmony and eight-beat mystery motif.
// Frequencies are in hertz; a null leaves space for the story dialogue.
const STORY_SCORE = [
  {
    chord: [146.83, 174.61, 220], // D minor: the missing credit
    melody: [293.66, null, 349.23, null, 329.63, null, 261.63, null],
  },
  {
    chord: [116.54, 146.83, 174.61], // B-flat: the grudge
    melody: [233.08, null, 293.66, null, 349.23, 329.63, 293.66, null],
  },
  {
    chord: [110, 130.81, 164.81], // A minor: the experiment
    melody: [220, null, 261.63, 329.63, 415.3, null, 392, 329.63],
  },
] as const;

// Each chapter receives twelve visible, unpaused seconds. No forward/skip path.
export function Prologue({
  open,
  onClose,
  motionPreference = false,
  soundPreference = false,
  onSoundChange,
}: {
  open: boolean;
  onClose: () => void;
  motionPreference?: boolean;
  soundPreference?: boolean;
  onSoundChange?: (sound: boolean) => void;
}) {
  const [scene, setScene] = useState(0),
    [started, setStarted] = useState(false),
    [playing, setPlaying] = useState(false),
    [sound, setSound] = useState(soundPreference),
    [reduced, setReduced] = useState(false),
    [visible, setVisible] = useState(true),
    [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0),
    audio = useRef<AudioContext | null>(null),
    complete = useRef(onClose);
  complete.current = onClose;
  const current = SCENES[scene];
  useEffect(() => setSound(soundPreference), [soundPreference]);
  useEffect(() => {
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches || motionPreference);
    const show = () => setVisible(!document.hidden);
    update();
    show();
    m.addEventListener("change", update);
    document.addEventListener("visibilitychange", show);
    return () => {
      m.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", show);
    };
  }, [motionPreference]);
  useEffect(() => {
    if (!open) return;
    setScene(0);
    setStarted(false);
    setPlaying(false);
    elapsedRef.current = 0;
    setElapsed(0);
    SCENES.forEach((s) => {
      const i = new Image();
      i.src = s.image;
    });
  }, [open]);
  useEffect(() => {
    if (!open || !started || !playing || !visible) return;
    let last = performance.now();
    const tick = setInterval(() => {
      const now = performance.now();
      elapsedRef.current += now - last;
      last = now;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= 12000) {
        elapsedRef.current = 0;
        setElapsed(0);
        if (scene === 2) {
          setPlaying(false);
          complete.current();
        } else setScene((i) => i + 1);
      }
    }, 100);
    return () => clearInterval(tick);
  }, [open, started, playing, visible, scene]);
  // Web Audio keeps the score local and lets pause, mute, and tab visibility stop it.
  useEffect(() => {
    const ctx = audio.current;
    if (!ctx || !sound || !playing || !visible || !open) return;
    const score = STORY_SCORE[scene];
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.055 + scene * 0.008, ctx.currentTime + 0.35);
    master.connect(ctx.destination);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 650 + scene * 180;
    filter.connect(master);

    const pad = score.chord.map((frequency, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = i === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.value = i === 0 ? 0.28 : 0.12;
      oscillator.connect(gain);
      gain.connect(filter);
      oscillator.start();
      return oscillator;
    });

    function playNote(frequency: number, length: number, volume: number) {
      if (!ctx) return;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + length);
      oscillator.connect(gain);
      gain.connect(filter);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(now);
      oscillator.stop(now + length);
    }

    let lastBeat = -1;
    const playBeat = () => {
      const beat = Math.floor(elapsedRef.current / 500);
      if (beat === lastBeat) return;
      lastBeat = beat;
      // A low heartbeat and sparse notes build tension without covering captions.
      playNote(score.chord[0] / 2, 0.18, beat % 4 === 0 ? 0.22 : 0.1);
      const note = score.melody[beat % score.melody.length];
      if (note !== null) playNote(note, 0.65, 0.18);
    };
    playBeat();
    const pulse = window.setInterval(playBeat, 100);
    return () => {
      window.clearInterval(pulse);
      pad.forEach((oscillator) => {
        oscillator.stop();
        oscillator.disconnect();
      });
      filter.disconnect();
      master.disconnect();
    };
  }, [scene, sound, playing, visible, open]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  async function enableAudio() {
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
    } catch {
      setSound(false);
    }
  }
  function toggleSound() {
    const next = !sound;
    setSound(next);
    onSoundChange?.(next);
    if (next) void enableAudio();
  }
  function begin() {
    void enableAudio();
    setStarted(true);
    setPlaying(true);
  }
  return (
    <Dialog open={open}>
      <DialogContent
        className="story-modal cinematic-modal"
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
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
          <span className="micro">36 SECOND OPENING</span>
        </div>
        <DialogDescription className="sr-only">
          A mandatory cinematic with three automatically advancing manga
          chapters. Start playback, pause, or control sound. The homepage opens
          after all chapters. Reduced motion removes camera movement without
          skipping the story.
        </DialogDescription>
        <div
          className="story-chapters cinematic-chapters"
          aria-label="Story progress"
        >
          {SCENES.map((s, i) => (
            <span
              key={s.chapter}
              className={scene === i ? "current" : ""}
              aria-current={scene === i ? "step" : undefined}
            >
              0{i + 1} {s.chapter}
            </span>
          ))}
        </div>
        <div className="story-scene" key={scene}>
          <div
            className={`story-stage scene-${scene} ${started && !reduced ? "story-animating" : ""}`}
          >
            <img
              className="manga-image"
              style={{
                animationPlayState: playing && visible ? "running" : "paused",
              }}
              src={current.image}
              alt={current.alt}
              width={1672}
              height={941}
              fetchPriority="high"
            />
            <div className="scene-stamp">CHAPTER 0{scene + 1}</div>
            <div className="speech-clouds">
              {current.dialogue.map((line, i) => (
                <blockquote
                  className={`speech-cloud cloud-${i}`}
                  key={line.text}
                >
                  <cite>{line.speaker}</cite>
                  <p>{line.text}</p>
                </blockquote>
              ))}
            </div>
            <div
              className="cinematic-progress"
              role="progressbar"
              aria-label="Chapter playback"
              aria-valuenow={Math.min(100, Math.round(elapsed / 120))}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${Math.min(100, elapsed / 120)}%` }} />
            </div>
          </div>
          <div className="story-caption" aria-live="polite" aria-atomic="true">
            <span className="micro">{current.when}</span>
            <h2>{current.title}</h2>
            <p>{current.narration}</p>
          </div>
        </div>
        <div className="story-controls">
          <button
            className="text-button cinematic-sound"
            onClick={toggleSound}
            aria-label={
              sound ? "Mute story soundtrack" : "Enable story soundtrack"
            }
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}Sound{" "}
            {sound ? "on" : "off"}
          </button>
          {started ? (
            <button
              className="secondary-button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause story" : "Resume story"}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}{" "}
              {playing ? "Pause" : "Resume"}
            </button>
          ) : (
            <button className="primary-button" onClick={begin}>
              <Play size={18} />
              Start story
            </button>
          )}
          <span className="micro">
            {started
              ? `CHAPTER ${scene + 1} / 3 · ${playing ? "PLAYING" : "PAUSED"}`
              : "ORIGINAL LAB SOUNDSCAPE"}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
