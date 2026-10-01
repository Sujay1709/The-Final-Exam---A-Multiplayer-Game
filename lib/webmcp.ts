"use client";
import { useEffect, useRef } from "react";
import type { Snapshot } from "./game-types";
interface ModelContext {
  registerTool(
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    },
    { signal }: { signal: AbortSignal },
  ): void | Promise<void>;
}
export function useGameTools(game: Snapshot | null) {
  const current = useRef(game);
  current.current = game;
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const tool = {
      name: "read_escape_room_status",
      description:
        "Read the current shared escape room, player names, puzzle descriptions, score and timer. Does not submit answers or reveal hidden solutions.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: (input: unknown) => {
        if (
          input === null ||
          typeof input !== "object" ||
          Array.isArray(input) ||
          Object.keys(input).length
        )
          throw new Error("This tool expects an empty object.");
        const g = current.current;
        if (!g)
          return {
            phase: "home",
            message: "Create or join a room using the visible controls.",
          };
        return {
          code: g.code,
          phase: g.phase,
          room: g.roomIndex + 1,
          score: g.score,
          punishment: g.punishment,
          deadline: g.deadline,
          players: g.players.map((p) => ({ name: p.name, ready: p.ready })),
          puzzles: g.puzzles,
        };
      },
    };
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: controller.signal }),
      ).catch(() => {});
    } catch {}
    return () => controller.abort();
  }, []);
}
