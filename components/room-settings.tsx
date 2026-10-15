"use client";
import type { Difficulty } from "@/lib/game-types";
import type { GameSettings } from "@/lib/game-settings";
export function RoomSettings({
  settings,
  difficulty,
  onChange,
  disabled = false,
}: {
  settings: GameSettings;
  difficulty: Difficulty;
  onChange: (s: GameSettings, d: Difficulty) => void;
  disabled?: boolean;
}) {
  const change = (patch: Partial<GameSettings>) =>
    onChange({ ...settings, ...patch }, difficulty);
  return (
    <fieldset className="room-settings" disabled={disabled}>
      <legend>Room settings</legend>
      <div className="settings-grid">
        <label>
          Game mode
          <select
            value={settings.mode}
            onChange={(e) =>
              change({
                mode: e.target.value as GameSettings["mode"],
                bestOfThree:
                  e.target.value === "race" ? settings.bestOfThree : false,
              })
            }
          >
            <option value="race">Race · first escape wins</option>
            <option value="coop">Co-op · escape together</option>
          </select>
        </label>
        <label>
          Riddle wording
          <select
            value={difficulty}
            onChange={(e) => onChange(settings, e.target.value as Difficulty)}
          >
            <option value="junior">Cryptic · contextual clues</option>
            <option value="senior">Expert · indirect clues</option>
          </select>
        </label>
        <label>
          Time pressure
          <select
            value={settings.gameDifficulty}
            onChange={(e) =>
              change({
                gameDifficulty: e.target
                  .value as GameSettings["gameDifficulty"],
              })
            }
          >
            <option value="easy">Easy · 5 min</option>
            <option value="medium">Medium · 4 min</option>
            <option value="hard">Hard · 3 min</option>
          </select>
        </label>
        {settings.mode === "race" && (
          <label>
            Bot skill
            <select
              value={settings.botSkill}
              onChange={(e) =>
                change({ botSkill: e.target.value as GameSettings["botSkill"] })
              }
            >
              <option value="easy">Easy · relaxed opponents</option>
              <option value="medium">Medium · steady opponents</option>
              <option value="hard">Hard · fast opponents</option>
            </select>
          </label>
        )}
      </div>
      {settings.mode === "race" && (
        <label className="preference-toggle">
          <input
            type="checkbox"
            checked={settings.fillBots}
            onChange={(e) => change({ fillBots: e.target.checked })}
          />
          Fill empty seats with bots
        </label>
      )}
      {settings.mode === "race" && (
        <label className="preference-toggle">
          <input
            type="checkbox"
            checked={settings.bestOfThree}
            onChange={(e) => change({ bestOfThree: e.target.checked })}
          />
          Best-of-three rivalry · first to two wins
        </label>
      )}
      <p className="help-text">
        {settings.mode === "race"
          ? settings.fillBots
            ? "Same questions. Your own timer, locks, hints, and detention. One ready human can race against bots."
            : "Same questions. Your own timer, locks, hints, and detention. At least two ready humans are required without bots."
          : "Human teammates share locks, time, hints, score, and detention."}{" "}
        Follow fifteen “What am I?” riddles in order. Each correct answer
        unlocks a harder clue and a larger reward: 100–450 points. Wording
        changes how indirect the clues are; time pressure controls the clock.
      </p>
    </fieldset>
  );
}
