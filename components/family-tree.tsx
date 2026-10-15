"use client";
import { useState } from "react";
import { GitBranch } from "lucide-react";
import type { FamilyTreeDiagram } from "@/lib/aptitude-types";

export function FamilyTree({ diagram }: { diagram: FamilyTreeDiagram }) {
  const [selected, setSelected] = useState<string | null>(null);
  const person = diagram.people.find((p) => p.id === selected);
  const connected = diagram.links.filter(
    (l) => l.from === selected || l.to === selected,
  );
  const highlighted = new Set([
    selected,
    ...connected.flatMap((l) => [l.from, l.to]),
  ]);
  const relationText = connected
    .map((l) => {
      const from = diagram.people.find((p) => p.id === l.from)!,
        to = diagram.people.find((p) => p.id === l.to)!;
      return l.relation === "sibling"
        ? `${from.name} and ${to.name} are siblings.`
        : `${from.name} is a parent of ${to.name}.`;
    })
    .join(" ");
  return (
    <figure
      className="family-tree"
      aria-label="Interactive family relationship diagram"
    >
      <figcaption>
        <GitBranch size={18} aria-hidden="true" />
        <strong>Trace the family connections</strong>
        <span>Tap a person · no time penalty</span>
      </figcaption>
      <div className="family-canvas">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {diagram.links.map((l) => {
            const from = diagram.people.find((p) => p.id === l.from)!,
              to = diagram.people.find((p) => p.id === l.to)!;
            return (
              <line
                key={`${l.from}-${l.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={`${l.relation} ${connected.includes(l) ? "traced" : ""}`}
              />
            );
          })}
        </svg>
        {diagram.people.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`family-person ${selected === p.id ? "selected" : ""} ${selected && highlighted.has(p.id) ? "connected" : ""}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onClick={() => setSelected(selected === p.id ? null : p.id)}
            aria-label={`Trace ${p.name}, ${p.detail.toLowerCase()}`}
            aria-pressed={selected === p.id}
          >
            <strong>{p.name}</strong>
            <small>{p.detail}</small>
          </button>
        ))}
      </div>
      <p className="family-legend">
        Solid line: parent → child. Dashed line: siblings.
      </p>
      <p className="family-trace" role="status">
        {person
          ? `${person.name}: ${relationText}`
          : "Select a person to highlight their direct connections. All relationship facts are also written in the question."}
      </p>
    </figure>
  );
}
