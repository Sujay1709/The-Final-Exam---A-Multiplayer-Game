"use client";
import { useState } from "react";
import { Gem } from "lucide-react";

export function ScoreOrbit({ score, run, team, reducedMotion }: {
  score:number; run:number; team:boolean; reducedMotion:boolean;
}) {
  const [previous,setPrevious]=useState({score,run,delta:0,revision:0});
  const [reveals,setReveals]=useState(0);
  // A confirmed server score change creates one animation, not one per poll.
  if (previous.score !== score || previous.run !== run) {
    setPrevious({score,run,delta:previous.run === run ? score-previous.score : 0,revision:previous.revision+1});
    setReveals(0);
  }
  const visible = previous.revision > 0 || reveals > 0;
  return <div className={`score-orbit ${reducedMotion ? "score-still" : ""}`}>
    <button className="score-reveal" onClick={()=>setReveals(n=>n+1)}
      aria-label={`Reveal ${team ? "team" : "your"} treasure score: ${score.toLocaleString()} points`}>
      <Gem size={20} aria-hidden="true"/><span>Treasure score</span>
    </button>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {team ? "Team" : "Your"} treasure score: {score.toLocaleString()} points.
    </span>
    {visible && <div key={`${run}:${previous.revision}:${reveals}`} className="score-flight" aria-hidden="true">
      <div className="score-gem"><Gem size={32}/></div>
      <span className="micro">{team ? "TEAM TREASURE" : "YOUR TREASURE"}</span>
      <strong>{score.toLocaleString()}<small>POINTS</small></strong>
      <span className={`score-gain ${previous.delta < 0 ? "score-loss" : ""}`}>
        {reveals > 0 || previous.delta === 0 ? "Treasury revealed" : `${previous.delta > 0 ? "+" : "−"}${Math.abs(previous.delta)} ${previous.delta > 0 ? "earned" : "points"}`}
      </span>
    </div>}
  </div>;
}
