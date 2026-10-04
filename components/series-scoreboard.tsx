import type { SeriesView } from "@/lib/game-types";
import { Trophy } from "lucide-react";
export function SeriesScoreboard({
  series,
  expanded,
}: {
  series: SeriesView;
  expanded: boolean;
}) {
  const champion = series.standings.find(
    (p) => p.playerId === series.championId,
  );
  const result = champion
    ? `${champion.name} wins the rivalry!`
    : series.standings.some((p) => p.wins > 0)
      ? "The rivalry ends in a draw."
      : "No racer won this rivalry.";
  return (
    <details className="series-scoreboard" open={expanded}>
      <summary>
        <Trophy size={18} aria-hidden="true" />
        <span>Best of three · Round {series.round}/3</span>
        <small>
          {series.complete ? "Series complete" : "First to two wins"}
        </small>
      </summary>
      {series.complete && (
        <p className="series-result" role="status">
          {result}
        </p>
      )}
      <ol className="series-standings" aria-label="Rivalry round wins">
        {series.standings.map((p) => (
          <li key={p.playerId}>
            <span>
              {p.name}{" "}
              {p.kind === "bot" && <small className="bot-badge">BOT</small>}
            </span>
            <strong>
              {p.wins}
              <small> {p.wins === 1 ? "win" : "wins"}</small>
            </strong>
          </li>
        ))}
      </ol>
      {!!series.rounds.length && (
        <p className="series-history">
          {series.rounds
            .map((r) => `Round ${r.round}: ${r.winnerName ?? "no escape"}`)
            .join(" · ")}
        </p>
      )}
    </details>
  );
}
