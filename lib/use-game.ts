"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Session, Snapshot } from "./game-types";
const STORAGE_KEY = "last-exam-player";
// LAN previews use plain HTTP. getRandomValues also works outside HTTPS,
// while crypto.randomUUID is unavailable in some non-secure browser contexts.
const actionId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
interface ApiResponse {
  game?: Snapshot;
  session?: Session;
  error?: string;
}
export function useGame() {
  const [session, setSession] = useState<Session | null>(null),
    [game, setGame] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [connected, setConnected] = useState(true);
  const [clock, setClock] = useState(Date.now()),
    [offset, setOffset] = useState(0);
  const latest = useRef<Snapshot | null>(null);
  const pending = useRef(false);
  const accept = useCallback((next: Snapshot, sent: number) => {
    if (
      latest.current?.code === next.code &&
      latest.current.version > next.version
    )
      return;
    latest.current = next;
    setGame(next);
    setOffset(next.serverNow - (sent + Date.now()) / 2);
  }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (
        saved &&
        typeof saved.token === "string" &&
        typeof saved.playerId === "string" &&
        /^[A-Z]{6}$/.test(saved.code)
      )
        setSession(saved);
    } catch {}
    const timer = setInterval(() => setClock(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!session) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
      const sent = Date.now();
      let delay = 1200;
      try {
        const response = await fetch("/api/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ op: "state", ...session }),
          signal: controller.signal,
        });
        const data = (await response.json()) as ApiResponse;
        if (stopped) return;
        if (response.status === 401 || response.status === 404) {
          setError(data.error ?? "Your room is no longer available.");
          setSession(null);
          setGame(null);
          latest.current = null;
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
          return;
        }
        if (!response.ok || !data.game) throw new Error(data.error);
        accept(data.game, sent);
        setConnected(true);
      } catch (e) {
        if (stopped) return;
        setConnected(false);
        delay = 2500;
      }
      if (!stopped) timer = setTimeout(poll, delay);
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [session, accept]);
  const action = useCallback(
    async (op: string, args: Record<string, unknown> = {}) => {
      if (pending.current) return null;
      pending.current = true;
      setBusy(op);
      setError("");
      const sent = Date.now();
      try {
        const key = game
          ? `${game.run}:${game.phase}:${game.roomIndex}:${game.punishment}`
          : undefined;
        const response = await fetch("/api/game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            op,
            ...session,
            id: actionId(),
            phaseKey: key,
            ...args,
          }),
        });
        const data = (await response.json()) as ApiResponse;
        if (data.game) accept(data.game, sent);
        if (!response.ok)
          throw new Error(data.error ?? "The laboratory is unavailable.");
        setConnected(true);
        if (data.session) {
          setSession(data.session);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.session));
          } catch {}
        }
        if (op === "leave") {
          setSession(null);
          setGame(null);
          latest.current = null;
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
        }
        return data.game as Snapshot;
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Connection failed. Try again.",
        );
        return null;
      } finally {
        pending.current = false;
        setBusy("");
      }
    },
    [session, busy, game, accept],
  );
  return { session, game, busy, error, connected, action, now: clock + offset };
}
