"use client";
import { useState, useEffect, useRef } from "react";
import { Search, ScanLine, Check, LockKeyhole, DoorClosed } from "lucide-react";
import type { PuzzleView } from "@/lib/game-types";
import { ROOM_SCENES, roomScene } from "@/lib/room-scenes";

export function EscapeLab({
  puzzles,
  discovered,
  activity,
  openingLock,
  selected,
  detention,
  punishment,
  roomIndex,
  disabled,
  choose,
}: {
  puzzles: PuzzleView[];
  discovered: string[];
  activity: Record<string, string>;
  openingLock: string;
  selected: string;
  detention: boolean;
  punishment: number;
  roomIndex: number;
  disabled: boolean;
  choose: (id: string) => void;
}) {
  const scene = roomScene(roomIndex, detention ? punishment : 0);
  const objects = scene.objects;
  const [highlight, setHighlight] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const next = detention
      ? ROOM_SCENES[roomIndex]
      : ROOM_SCENES[roomIndex + 1];
    if (next) {
      const image = new Image();
      image.src = next.image;
    }
    if (!detention && punishment < 3) {
      const image = new Image();
      image.src = roomScene(roomIndex, punishment + 1).image;
    }
  }, [scene.id, detention, punishment, roomIndex]);
  const found = puzzles.filter(
    (p) => discovered.includes(p.id) || p.solved,
  ).length;
  return (
    <section
      className={`escape-lab ${detention ? "lab-detention" : ""}`}
      aria-labelledby="lab-heading"
      data-room={scene.id}
    >
      <div className="lab-heading">
        <div>
          <span className="micro">
            {detention ? "DETENTION WING" : "SEARCH THE ROOM"}
          </span>
          <h3 id="lab-heading" tabIndex={-1} ref={heading}>
            {scene.name}
          </h3>
        </div>
        <button
          className="secondary-button scan-button"
          aria-pressed={highlight}
          onClick={() => setHighlight(!highlight)}
        >
          <ScanLine size={17} aria-hidden="true" />
          {highlight ? "Hide highlights" : "Highlight objects"}
        </button>
      </div>
      <p className="lab-instructions">
        {scene.atmosphere} Follow the trail: solve each riddle to reveal the next object. The later clues are tougher and worth more.
      </p>
      <div
        key={scene.id}
        className={`lab-scene room-arrival ${highlight ? "highlight-objects" : ""}`}
      >
        <img
          src={scene.image}
          hidden={imageFailed}
          onError={() => setImageFailed(true)}
          width="1672"
          height="941"
          alt={scene.alt}
        />
        <div className="lab-vignette" aria-hidden="true" />
        {imageFailed && (
          <p className="room-art-error" role="status">
            The room artwork couldn’t load. All clues are still available in the
            labelled controls below.
          </p>
        )}
        <span className="lab-location micro">
          {detention
            ? "RESTRICTED AREA"
            : `SECTOR ${String(roomIndex + 1).padStart(2, "0")}`}{" "}
          / VOSS LAB
        </span>
        <div
          className="lab-exit"
          style={{ left: `${scene.exit.x}%`, top: `${scene.exit.y}%` }}
          aria-hidden="true"
        >
          <DoorClosed size={18} />
          <span>
            {puzzles.filter((p) => p.solved).length}/{puzzles.length} LOCKS OPEN
          </span>
        </div>
        {puzzles.map((p, i) => {
          const object = objects[i % objects.length];
          const known = discovered.includes(p.id) || p.solved;
          return (
            <button
              key={p.id}
              id={`lab-object-${p.id}`}
              className={`lab-hotspot ${object.y > 60 ? "label-above" : ""} ${known ? "discovered" : ""} ${p.solved ? "solved" : ""} ${openingLock === p.id ? "lock-opening" : ""} ${selected === p.id ? "selected" : ""}`}
              style={{ left: `${object.x}%`, top: `${object.y}%` }}
              aria-label={`${p.solved ? "Review" : "Search"} ${object.name.toLowerCase()}, clue ${i + 1}${p.locked ? ", solve the previous clue first" : ""}`}
              aria-pressed={selected === p.id}
              disabled={disabled || p.locked}
              onClick={() => choose(p.id)}
            >
              <span className="hotspot-icon">
                {p.solved ? (
                  <Check size={22} aria-hidden="true" />
                ) : p.locked ? (
                  <LockKeyhole size={22} aria-hidden="true" />
                ) : (
                  <Search size={22} aria-hidden="true" />
                )}
              </span>
              <span className="hotspot-caption">
                {known ? p.title : object.name}
              </span>
            </button>
          );
        })}
      </div>
      <div className="lab-discoveries">
        <Search size={15} aria-hidden="true" />
        {found}/{puzzles.length} clues discovered
      </div>
      <details className="lab-object-list">
        <summary>Search objects with labelled controls</summary>
        <div>
          {puzzles.map((p, i) => (
            <button
              key={p.id}
              className={`lab-object-button ${p.solved ? "solved" : ""}`}
              disabled={disabled || p.locked}
              onClick={() => choose(p.id)}
            >
              {p.solved ? (
                <Check size={19} aria-hidden="true" />
              ) : (
                <Search size={19} aria-hidden="true" />
              )}
              <span>
                <strong>{objects[i % objects.length].name}</strong>
                <small>
                  {activity[p.id]
                    ? `${p.solved ? "" : "Working: "}${activity[p.id]}`
                    : p.solved
                      ? "Lock opened · review clue"
                      : p.locked
                        ? "Solve the previous clue first"
                        : discovered.includes(p.id)
                          ? p.title
                          : objects[i % objects.length].note}
                </small>
              </span>
            </button>
          ))}
        </div>
      </details>
      {!selected && (
        <p className="lab-search-prompt" role="status">
          There’s a clue hidden in plain sight. Tap an object or use the
          labelled controls to begin.
        </p>
      )}
    </section>
  );
}
