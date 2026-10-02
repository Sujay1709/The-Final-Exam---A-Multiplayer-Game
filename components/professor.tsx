"use client";
import { lazy, Suspense, useEffect, useState } from "react";
const Scene = lazy(() => import("./professor-scene"));
export function Professor({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const fallback = <img className="voss-fallback" src="/professor.png" alt="Professor Elias Voss in his laboratory" />;
  return <div className="voss-stage">{mounted ? <Suspense fallback={fallback}><Scene reducedMotion={reducedMotion} /></Suspense> : fallback}</div>;
}
