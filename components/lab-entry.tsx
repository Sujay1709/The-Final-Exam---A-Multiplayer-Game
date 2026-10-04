"use client";
import { useEffect, useRef } from "react";
import {
  Check,
  DoorClosed,
  FlaskConical,
  LockKeyhole,
  Radio,
} from "lucide-react";
import { LAB_ENTRY_SECONDS } from "@/lib/game-settings";

const steps = [
  { label: "Sealing the reunion doors", icon: DoorClosed },
  { label: "Restoring emergency power", icon: Radio },
  { label: "Hiding the professor’s math clues", icon: FlaskConical },
  { label: "Arming the escape locks", icon: LockKeyhole },
];
export function LabEntry({
  entryAt,
  now,
  connected,
}: {
  entryAt: number | null;
  now: number;
  connected: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  const seconds = Math.min(
    LAB_ENTRY_SECONDS,
    Math.max(0, Math.ceil(((entryAt ?? now) - now) / 1000)),
  );
  const elapsed = LAB_ENTRY_SECONDS - seconds;
  const active = Math.min(3, Math.floor(elapsed / 2.5));
  return (
    <section className="lab-entry" aria-labelledby="lab-entry-title">
      <div className="entry-art" aria-hidden="true" />
      <div className="entry-content">
        <div className="eyebrow">VOSS LABORATORIES / ACCESS ACCEPTED</div>
        <h2 id="lab-entry-title" ref={heading} tabIndex={-1}>
          The reunion <span>was a trap.</span>
        </h2>
        <p>Behind this door, every answer is a way out.</p>
        <div className="entry-countdown">
          <svg viewBox="0 0 160 160" aria-hidden="true">
            <circle cx="80" cy="80" r="70" />
            <circle
              className="entry-ring"
              cx="80"
              cy="80"
              r="70"
              pathLength="100"
              strokeDasharray="100"
              strokeDashoffset={100 - elapsed * 10}
            />
          </svg>
          <strong
            role="timer"
            aria-label={`${seconds} seconds until the laboratory opens`}
          >
            {String(seconds).padStart(2, "0")}
          </strong>
          <span className="micro">SECONDS TO LOCKDOWN</span>
        </div>
        <p className="entry-status" role="status">
          {seconds > 0
            ? steps[active].label + "…"
            : connected
              ? "Opening the laboratory…"
              : "Reconnecting to the laboratory…"}
        </p>
        <ol className="entry-steps">
          {steps.map(({ label, icon: Icon }, i) => (
            <li
              key={label}
              className={i < active ? "done" : i === active ? "active" : ""}
            >
              {i < active ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                <Icon size={18} aria-hidden="true" />
              )}
              <span>{label}</span>
              <small>
                {i < active
                  ? "COMPLETE"
                  : i === active
                    ? "IN PROGRESS"
                    : "QUEUED"}
              </small>
            </li>
          ))}
        </ol>
        <p className="entry-note">
          Voss’s theatrical startup takes 10 seconds. Your puzzle clock starts
          when the doors open.
        </p>
      </div>
    </section>
  );
}
