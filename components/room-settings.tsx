"use client";
import { Flag, Users, Search, Fingerprint, Feather, Gauge, Flame, Bot } from "lucide-react";
import type { Difficulty } from "@/lib/game-types";
import type { GameSettings } from "@/lib/game-settings";
import { ChoiceCards, TouchToggle } from "./touch-controls";

export function RoomSettings({ settings, difficulty, onChange, disabled = false }: {
  settings: GameSettings;
  difficulty: Difficulty;
  onChange: (settings: GameSettings, difficulty: Difficulty) => void;
  disabled?: boolean;
}) {
  const change = (patch: Partial<GameSettings>) => onChange({ ...settings, ...patch }, difficulty);
  return (
    <fieldset className="room-settings touch-settings" disabled={disabled}>
      <legend>Room settings</legend>
      <p className="settings-invitation">Set the stakes.</p>
      <p className="settings-subtitle">Tap a card to shape your escape.</p>
      <ChoiceCards label="Game mode" value={settings.mode} onChange={mode => change({mode, bestOfThree: mode === "race" ? settings.bestOfThree : false})}
        options={[
          {value:"race",title:"Race",detail:"First escape wins",icon:<Flag size={22}/>},
          {value:"coop",title:"Co-op",detail:"Escape together",icon:<Users size={22}/>},
        ]}/>
      <ChoiceCards label="Riddle wording" value={difficulty} onChange={value => onChange(settings,value)}
        options={[
          {value:"junior",title:"Cryptic",detail:"Contextual clues",icon:<Search size={22}/>},
          {value:"senior",title:"Expert",detail:"Indirect clues",icon:<Fingerprint size={22}/>},
        ]}/>
      <ChoiceCards label="Time pressure" value={settings.gameDifficulty} onChange={gameDifficulty => change({gameDifficulty})}
        options={[
          {value:"easy",title:"Easy",detail:"5 minutes",icon:<Feather size={22}/>},
          {value:"medium",title:"Medium",detail:"4 minutes",icon:<Gauge size={22}/>},
          {value:"hard",title:"Hard",detail:"3 minutes",icon:<Flame size={22}/>},
        ]}/>
      {settings.mode === "race" && <>
        <ChoiceCards label="Bot skill" value={settings.botSkill} onChange={botSkill => change({botSkill})}
          options={[
            {value:"easy",title:"Easy bots",detail:"Relaxed",icon:<Bot size={22}/>},
            {value:"medium",title:"Medium bots",detail:"Steady",icon:<Bot size={22}/>},
            {value:"hard",title:"Hard bots",detail:"Fast",icon:<Bot size={22}/>},
          ]}/>
        <TouchToggle title="Fill empty seats with bots" detail="Friends take bot seats before the hunt starts."
          checked={settings.fillBots} onChange={fillBots => change({fillBots})}/>
        <TouchToggle title="Best-of-three rivalry" detail="First to two round wins takes the series."
          checked={settings.bestOfThree} onChange={bestOfThree => change({bestOfThree})}/>
      </>}
      <p className="help-text settings-summary" aria-live="polite" aria-atomic="true">
        {settings.mode === "race"
          ? settings.fillBots ? "Your own clues, clock, and score. One ready human can race against bots." : "Your own clues, clock, and score. At least two ready humans are needed."
          : "Human teammates share clues, clock, score, and detention."}
        {" "}Fifteen “What am I?” riddles. Rewards rise from 100 to 450 points.
      </p>
    </fieldset>
  );
}
