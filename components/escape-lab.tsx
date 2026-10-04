"use client";
import { useState, useEffect, useRef } from "react";
import { Search, ScanLine, Check, LockKeyhole, DoorClosed } from "lucide-react";
import type { PuzzleView } from "@/lib/game-types";

const objects = [
  { name: "Dusty notebook", note: "Inspect the forgotten desk", x: 16, y: 56 },
  { name: "Chemical bottles", note: "Inspect the workbench", x: 89, y: 51 },
  { name: "Broken terminal", note: "Inspect the old computer", x: 76, y: 38 },
];
export function EscapeLab({
  puzzles,
  discovered,
  activity,
  openingLock,
  selected,
  detention,
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
  roomIndex: number;
  disabled: boolean;
  choose: (id: string) => void;
}) {
  const [highlight, setHighlight] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [roomIndex, detention]);
  const found = puzzles.filter(
    (p) => discovered.includes(p.id) || p.solved,
  ).length;
  return (
    <section
      className={`escape-lab ${detention ? "lab-detention" : ""}`}
      aria-labelledby="lab-heading"
    >
      <div className="lab-heading">
        <div>
          <span className="micro">
            {detention ? "DETENTION WING" : "SEARCH THE ROOM"}
          </span>
          <h3 id="lab-heading" tabIndex={-1} ref={heading}>
            Abandoned science laboratory
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
        Tap suspicious objects to uncover hidden math clues. Open every lock to
        escape this section.
      </p>
      <div className={`lab-scene ${highlight ? "highlight-objects" : ""}`}>
        <img
          src="/lab/abandoned-laboratory.webp"
          width="1672"
          height="941"
          alt="An abandoned laboratory: a notebook on the desk at left, reagent bottles on the right workbench, and a broken computer beside the bolted exit."
        />
        <div className="lab-vignette" aria-hidden="true" />
        <span className="lab-location micro">
          {detention
            ? "RESTRICTED AREA"
            : `SECTOR ${String(roomIndex + 1).padStart(2, "0")}`}{" "}
          / VOSS LAB
        </span>
        <div
          className="lab-exit"
          style={{ left: "56%", top: "29%" }}
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
              className={`lab-hotspot ${known ? "discovered" : ""} ${p.solved ? "solved" : ""} ${openingLock === p.id ? "lock-opening" : ""} ${selected === p.id ? "selected" : ""}`}
              style={{ left: `${object.x}%`, top: `${object.y}%` }}
              aria-label={`${p.solved ? "Review" : "Search"} ${object.name.toLowerCase()}, clue ${i + 1}${p.locked ? ", solve both fragments first" : ""}`}
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
        <div className="lab-discoveries">
          <Search size={15} aria-hidden="true" />
          {found}/{puzzles.length} clues discovered
        </div>
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
                        ? "Solve both fragments first"
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
          There’s a clue hidden in plain sight. Search an object to begin.
        </p>
      )}
    </section>
  );
}
