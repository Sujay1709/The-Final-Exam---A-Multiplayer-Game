"use client";
import { lazy, Suspense, useEffect, useState } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
const Scene = lazy(() => import("./professor-scene"));
export function Professor({
  reducedMotion = false,
}: {
  reducedMotion?: boolean;
}) {
  const [mounted, setMounted] = useState(false),
    [view, setView] = useState<"manga" | "3d">("manga"),
    [pose, setPose] = useState({ x: 0, y: 0 }),
    [osReduced, setOsReduced] = useState(false);
  useEffect(() => {
    setMounted(true);
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setOsReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  const reduced = reducedMotion || osReduced;
  const portrait = (
    <img
      className="voss-fallback"
      src="/professor.png"
      alt="The original HD manga Professor Voss in his laboratory"
    />
  );
  function point(e: React.PointerEvent) {
    if (reduced || (e.pointerType !== "mouse" && e.buttons !== 1)) return;
    const r = e.currentTarget.getBoundingClientRect();
    setPose({
      x: Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)),
      y:
        e.pointerType === "mouse"
          ? Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1))
          : 0,
    });
  }
  function rotate(n: number) {
    setPose((p) => ({ x: Math.max(-1, Math.min(1, p.x + n)), y: 0 }));
  }
  return (
    <div className="voss-stage">
      <div className="voss-view-choice">
        <button
          type="button"
          aria-pressed={view === "manga"}
          onClick={() => setView("manga")}
        >
          Manga portrait
        </button>
        <button
          type="button"
          aria-pressed={view === "3d"}
          onClick={() => setView("3d")}
        >
          3D sculpt
        </button>
      </div>
      {view === "3d" && mounted ? (
        <Suspense fallback={portrait}>
          <Scene reducedMotion={reduced} />
        </Suspense>
      ) : (
        <>
          <div
            className="manga-motion-panel"
            onPointerMove={point}
            onPointerDown={() => !reduced && rotate(pose.x > 0.2 ? -0.6 : 0.6)}
            style={{ perspective: 900 }}
          >
            <div
              className="manga-moving-art"
              style={{
                transform: `translate(${pose.x * 10}px,${pose.y * 5}px) rotateY(${pose.x * 6}deg) rotateX(${-pose.y * 3}deg) scale(1.07)`,
              }}
            >
              {portrait}
            </div>
          </div>
          <div className="voss-controls">
            <button
              type="button"
              onClick={() => rotate(-0.3)}
              aria-label="Move manga professor left"
            >
              <RotateCcw size={18} />
            </button>
            <span>Original manga · 2.5D motion</span>
            <button
              type="button"
              onClick={() => rotate(0.3)}
              aria-label="Move manga professor right"
            >
              <RotateCw size={18} />
            </button>
            <button type="button" onClick={() => setPose({ x: 0, y: 0 })}>
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
