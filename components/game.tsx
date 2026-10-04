"use client";
import { useState, useEffect, useRef } from "react";
import {
  Check,
  KeyRound,
  LockKeyhole,
  Lightbulb,
  Clock3,
  Copy,
  Users,
  Send,
  ShieldAlert,
  ChevronRight,
  Trophy,
  RotateCcw,
  LogOut,
  Radio,
  Volume2,
  VolumeX,
  Loader2,
  MessageSquare,
  TriangleAlert,
  CheckCheck,
  LockOpen,
  Flame,
} from "lucide-react";
import { RoomSettings } from "./room-settings";
import { SeriesScoreboard } from "./series-scoreboard";
import { GAME_RULES } from "@/lib/game-settings";
import { Avatar } from "./avatar";
import type { Preferences } from "@/lib/use-preferences";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ROOM_INFO,
  PUNISHMENT_NAMES,
  type Snapshot,
  type Session,
} from "@/lib/game-types";
type Props = {
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => void;
  game: Snapshot;
  session: Session;
  busy: string;
  connected: boolean;
  now: number;
  error: string;
  action: (
    op: string,
    args?: Record<string, unknown>,
  ) => Promise<Snapshot | null>;
};
const formatTime = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;
export function Game({
  preferences,
  updatePreferences,
  game: g,
  session,
  busy,
  connected,
  now,
  error,
  action,
}: Props) {
  const race = g.mode === "race",
    rules = GAME_RULES[g.gameDifficulty];
  const humanPlayers = g.players.filter((p) => p.kind !== "bot" && !p.left);
  const host = g.hostId === session.playerId,
    me = g.players.find((p) => p.id === session.playerId);
  const [selected, setSelected] = useState(""),
    [drafts, setDrafts] = useState<Record<string, string>>({}),
    [chat, setChat] = useState("");
  const [openingLock, setOpeningLock] = useState("");
  const lastFeedback = useRef(g.lastAnswer?.id);
  const sound = preferences.sound;
  const setSound = (sound: boolean) => updatePreferences({ sound });
  const audio = useRef<AudioContext | null>(null);
  const log = useRef<HTMLDivElement>(null),
    seen = useRef<Set<string>>(new Set());
  const seconds = g.deadline
    ? Math.max(0, Math.ceil((g.deadline - now) / 1000))
    : 0;
  const inPlay = g.phase === "main" || g.phase === "detention",
    ended = g.phase === "won" || g.phase === "lost";
  const room = ROOM_INFO[g.roomIndex],
    detention = g.phase === "detention";
  const puzzle =
    g.puzzles.find((p) => p.id === selected) ??
    g.puzzles.find((p) => !p.solved && !p.locked) ??
    g.puzzles[0];
  const stateKey = `${g.run}:${g.phase}:${g.roomIndex}:${g.punishment}`;
  const inputKey = `${stateKey}:${puzzle?.id}`;
  useEffect(() => {
    setSelected("");
  }, [stateKey]);
  useEffect(() => {
    if (!g.lastAnswer || lastFeedback.current === g.lastAnswer.id) return;
    lastFeedback.current = g.lastAnswer.id;
    if (!g.lastAnswer.correct) return;
    setOpeningLock(g.lastAnswer.puzzleId);
    const timer = setTimeout(() => setOpeningLock(""), 900);
    return () => clearTimeout(timer);
  }, [g.lastAnswer?.id]);
  useEffect(() => {
    const newEvents = g.events.filter((e) => !seen.current.has(e.id));
    if (seen.current.size && newEvents.length) {
      const event = newEvents.at(-1)!;
      if (event.kind === "success") toast.success(event.text);
      else if (event.kind === "warning") toast.warning(event.text);
      if (
        sound &&
        audio.current &&
        (event.kind === "success" || event.kind === "warning")
      ) {
        const ctx = audio.current,
          osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = event.kind === "success" ? 660 : 180;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    }
    g.events.forEach((e) => seen.current.add(e.id));
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [g.events, sound]);
  useEffect(() => {
    const unlock = () => {
      if (!sound) return;
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume();
      } catch {}
    };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, [sound]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied. Send it to your teammates.");
    } catch {
      toast.info(`Room code: ${g.code}`);
    }
  }
  async function toggleSound() {
    if (!audio.current) audio.current = new AudioContext();
    await audio.current.resume();
    setSound(!sound);
  }
  function choose(id: string) {
    setSelected(id);
    if (inPlay) void action("claim", { puzzleId: id });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!puzzle) return;
    const next = await action("answer", {
      puzzleId: puzzle.id,
      answer: drafts[inputKey] ?? "",
    });
    if (next?.puzzles.find((p) => p.id === puzzle.id)?.solved)
      setDrafts((d) => ({ ...d, [inputKey]: "" }));
  }
  const readyCount = humanPlayers.filter(
    (p) => p.ready && now - p.lastSeen < 30000,
  ).length;
  return (
    <main className="game-main">
      <div className="session-strip">
        <div className="session-code">
          <span className="micro">ROOM CODE</span>
          <button
            onClick={() => copy(g.code)}
            aria-label={`Copy room code ${g.code}`}
          >
            {g.code}
            <Copy size={14} />
          </button>
        </div>
        <span className="session-difficulty">
          {g.difficulty === "junior"
            ? "JUNIOR · CLASSES 5–8"
            : "SENIOR · CLASSES 9–12"}
        </span>
        <div className={`connection ${connected ? "" : "offline"}`}>
          <Radio size={14} />
          {connected ? "Team connected" : "Reconnecting…"}
        </div>
        <button
          className="icon-button"
          aria-label={sound ? "Mute game sounds" : "Enable game sounds"}
          onClick={toggleSound}
        >
          {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="icon-button" aria-label="Leave room">
              <LogOut size={17} />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rules-modal">
            <AlertDialogTitle>Leave the laboratory?</AlertDialogTitle>
            <AlertDialogDescription>
              Your teammates can continue. Leaving removes your player session
              from this room.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay</AlertDialogCancel>
              <AlertDialogAction onClick={() => void action("leave")}>
                Leave room
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {!connected && (
        <div className="network-banner" role="status">
          <TriangleAlert size={16} />
          Connection interrupted. The server timer continues. Your typed answer
          stays here.
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {g.series && (
        <SeriesScoreboard
          series={g.series}
          expanded={ended || g.phase === "lobby"}
        />
      )}
      <div className="play-layout">
        <section className="main-board">
          {g.phase !== "lobby" && (
            <div className="solve-feedback-area">
              <span
                className={`streak-badge ${g.streak >= 3 ? "on-fire" : ""}`}
              >
                <Flame size={18} aria-hidden="true" />
                {race ? "Your" : "Team"} streak: {g.streak}
                <small>
                  {g.bestStreak >= 5
                    ? "Lab legend"
                    : g.bestStreak >= 3
                      ? "Sharp mind"
                      : `Best ${g.bestStreak}`}
                </small>
              </span>
              {g.lastAnswer && now - g.lastAnswer.at < 8000 && (
                <p
                  key={g.lastAnswer.id}
                  className={`answer-feedback ${g.lastAnswer.correct ? "correct" : "incorrect"}`}
                  role="status"
                >
                  {g.lastAnswer.correct ? (
                    <LockOpen size={20} aria-hidden="true" />
                  ) : (
                    <TriangleAlert size={20} aria-hidden="true" />
                  )}
                  <span>
                    {g.lastAnswer.correct
                      ? `Lock opened! +20 seconds${g.lastAnswer.main ? " · +100 points" : ""}`
                      : `Incorrect · −${rules.wrong} seconds. Try again.`}
                  </span>
                </p>
              )}
            </div>
          )}
          {g.phase === "lobby" ? (
            <>
              <div className="eyebrow">
                {g.series
                  ? `RIVALRY ROUND ${g.series.round} OF 3`
                  : "EXPERIMENT 001"}{" "}
                / WAITING ROOM
              </div>
              <h1 className="screen-title">
                Gather your
                <br />
                <span>co-conspirators.</span>
              </h1>
              <p className="board-intro">
                The invitation said “college reunion.” The doors say otherwise.
                <br />
                Get your team inside before Professor Voss begins.
              </p>
              <div className="invite-panel">
                <span className="field-label">YOUR SIX-LETTER ACCESS CODE</span>
                <div className="large-code">
                  {g.code}
                  <button
                    className="icon-button"
                    aria-label="Copy room code"
                    onClick={() => copy(g.code)}
                  >
                    <Copy size={20} />
                  </button>
                </div>
                <button
                  className="text-button"
                  onClick={() => copy(`${location.origin}/?room=${g.code}`)}
                >
                  Copy invitation link
                </button>
              </div>
              <div className="lobby-info">
                <span>
                  <Users size={17} />
                  {g.players.length}/8 players joined
                </span>
                <span>
                  <CheckCheck size={17} />
                  {readyCount}/{humanPlayers.length} humans ready
                </span>
              </div>
              <div className="lobby-actions">
                <button
                  className={me?.ready ? "secondary-button" : "primary-button"}
                  disabled={!!busy || !connected}
                  onClick={() => void action("ready", { ready: !me?.ready })}
                >
                  {busy === "ready" ? (
                    <Loader2 size={17} className="loading-spin" />
                  ) : (
                    <Check size={17} />
                  )}{" "}
                  {me?.ready ? "Ready · click to undo" : "I'm ready"}
                </button>
                {host ? (
                  <button
                    className="primary-button"
                    disabled={
                      !!busy ||
                      !connected ||
                      readyCount !== humanPlayers.length ||
                      humanPlayers.length < 2
                    }
                    onClick={() => void action("start")}
                  >
                    <KeyRound size={17} />
                    Start the experiment
                  </button>
                ) : (
                  <span className="muted">Waiting for the host to start.</span>
                )}
              </div>
              <p className="help-text">
                {humanPlayers.length < 2
                  ? "At least two players are needed. Share the code with a friend."
                  : "Everyone must be connected and ready. The host plays too."}
              </p>
              <p className="help-text">
                Change your alias and character in Player settings before the
                experiment starts.
              </p>
              <RoomSettings
                settings={g}
                difficulty={g.difficulty}
                disabled={!host || !!busy || !!g.series?.rounds.length}
                onChange={(s, d) =>
                  void action("settings", { ...s, difficulty: d })
                }
              />
              {g.series && (
                <p className="help-text">
                  Your profiles, series wins, and room settings are retained.
                  Every human must ready up again; settings stay fixed until
                  this rivalry ends.
                </p>
              )}
              <div className="briefing">
                <ShieldAlert size={21} />
                <div>
                  <strong>Your briefing</strong>
                  <p>
                    Five rooms. Three locks each. {rules.main / 60} minutes on
                    the clock.
                    <br />
                    Miss a deadline and Voss sends you to detention.
                  </p>
                </div>
              </div>
            </>
          ) : ended ? (
            <>
              <div className="eyebrow">
                EXPERIMENT / {g.phase === "won" ? "COMPLETE" : "TERMINATED"}
              </div>
              <div
                className={`result-icon ${g.phase === "lost" ? "failed" : ""}`}
              >
                {g.phase === "won" ? (
                  <Trophy size={38} />
                ) : (
                  <LockKeyhole size={38} />
                )}
              </div>
              <h1 className="screen-title">
                {g.phase === "won" ? (
                  <>
                    You made
                    <br />
                    <span>the grade.</span>
                  </>
                ) : (
                  <>
                    Class
                    <br />
                    <span>dismissed.</span>
                  </>
                )}
              </h1>
              <p className="board-intro">{g.result}</p>
              {race && (
                <p className="race-status" role="status">
                  {g.winnerId
                    ? `${g.players.find((p) => p.id === g.winnerId)?.name ?? "The winner"} escaped first.`
                    : "No escape yet."}{" "}
                  {g.matchComplete
                    ? "Final results are ready."
                    : "Other racers are still playing. The room can restart when everyone finishes or leaves."}
                </p>
              )}
              <div className="result-stats">
                <div>
                  <span className="micro">
                    {race ? "YOUR SCORE" : "TEAM SCORE"}
                  </span>
                  <strong>{g.score.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="micro">LOCKS SOLVED</span>
                  <strong>
                    {g.solvedCount}
                    <small>/15</small>
                  </strong>
                </div>
                <div>
                  <span className="micro">PUNISHMENT</span>
                  <strong>
                    {g.punishment}
                    <small>/4</small>
                  </strong>
                </div>
              </div>
              <p className="help-text">
                {g.wrongCount} incorrect submissions · {g.hintCount} hints used
              </p>
              <div
                className="personal-recap"
                aria-label={race ? "Your round recap" : "Team round recap"}
              >
                <div>
                  <span className="micro">ANSWER ACCURACY</span>
                  <strong>
                    {g.accuracy === null
                      ? "—"
                      : `${Math.round(g.accuracy * 100)}%`}
                  </strong>
                  <small>
                    {g.correctCount} correct · {g.wrongCount} incorrect
                  </small>
                </div>
                <div>
                  <span className="micro">TIME IN LAB</span>
                  <strong>
                    {g.elapsedSeconds === null
                      ? "—"
                      : formatTime(g.elapsedSeconds)}
                  </strong>
                  <small>Includes summaries and detention</small>
                </div>
                <div>
                  <span className="micro">BEST STREAK</span>
                  <strong>{g.bestStreak}</strong>
                  <small>Consecutive correct answers</small>
                </div>
              </div>
              {race && g.matchComplete && (
                <div className="round-podium" aria-label="Round escape podium">
                  <h3>Round podium</h3>
                  {g.leaderboard.some((p) => p.place !== null) ? (
                    <ol>
                      {g.leaderboard
                        .filter((p) => p.place !== null)
                        .slice(0, 3)
                        .map((p) => {
                          const racer = g.players.find(
                            (x) => x.id === p.playerId,
                          );
                          return (
                            <li key={p.playerId}>
                              <strong>#{p.place}</strong>
                              <span>
                                {racer?.name}{" "}
                                {racer?.kind === "bot" && (
                                  <small className="bot-badge">BOT</small>
                                )}
                              </span>
                              <small>{p.score.toLocaleString()} pts</small>
                            </li>
                          );
                        })}
                    </ol>
                  ) : (
                    <p className="muted">
                      No racer escaped this round. Try a lower time pressure for
                      the rematch.
                    </p>
                  )}
                </div>
              )}
              {!g.series?.complete && (
                <div className="rematch-panel">
                  <h3>
                    {g.series
                      ? `Continue to round ${Math.min(3, g.series.round + 1)}`
                      : "Another experiment?"}
                  </h3>
                  <p>
                    {g.rematchVotes.length}/{humanPlayers.length} humans voted.
                    All remaining humans must vote, with at least two connected
                    players. You will return to the lobby and ready up again.
                  </p>
                  <button
                    className={
                      g.rematchVotes.includes(session.playerId)
                        ? "secondary-button"
                        : "primary-button"
                    }
                    aria-pressed={g.rematchVotes.includes(session.playerId)}
                    disabled={
                      !!busy ||
                      !connected ||
                      !g.matchComplete ||
                      humanPlayers.length < 2
                    }
                    onClick={() =>
                      void action("rematch", {
                        ready: !g.rematchVotes.includes(session.playerId),
                      })
                    }
                  >
                    <RotateCcw size={17} />
                    {g.rematchVotes.includes(session.playerId)
                      ? "Withdraw rematch vote"
                      : g.series
                        ? "Vote for next round"
                        : "Vote for rematch"}
                  </button>
                  {!g.matchComplete && (
                    <p className="help-text">
                      Other racers are still playing. Voting opens when this
                      match is complete.
                    </p>
                  )}
                </div>
              )}
              <div className="result-actions">
                {host && g.series && !g.series.complete ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="secondary-button"
                        disabled={!!busy || !g.matchComplete}
                      >
                        End rivalry
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rules-modal">
                      <AlertDialogTitle>End this rivalry?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Return everyone to the lobby without declaring a series
                        winner. Profiles remain, and you can change room
                        settings.
                      </AlertDialogDescription>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep rivalry</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void action("endSeries")}
                        >
                          End rivalry
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : host ? (
                  <button
                    className="primary-button"
                    disabled={!!busy || !g.matchComplete}
                    onClick={() => void action("restart")}
                  >
                    <RotateCcw size={17} />
                    {g.series?.complete
                      ? "Set up a new rivalry"
                      : "Return room to lobby"}
                  </button>
                ) : (
                  <p className="muted">
                    {g.series && !g.series.complete
                      ? "Vote together to continue this rivalry."
                      : "Your host can return everyone to the lobby."}
                  </p>
                )}
                <button
                  className="secondary-button"
                  disabled={!!busy}
                  onClick={() => void action("leave")}
                >
                  Back to home
                </button>
              </div>
              <h3 className="review-heading">Review the final room</h3>
              <div className="solution-review">
                {g.puzzles.map((p) => (
                  <article key={p.id}>
                    <span className="micro">
                      {p.solved ? "SOLVED" : "UNFINISHED"}
                    </span>
                    <h4>{p.title}</h4>
                    <p>{p.prompt}</p>
                    <strong>{p.solution}</strong>
                  </article>
                ))}
              </div>
            </>
          ) : g.phase === "cleared" ? (
            <>
              <div className="eyebrow">
                ROOM {String(g.roomIndex + 1).padStart(2, "0")} / CLEARED
              </div>
              <div className="result-icon">
                <Check size={38} />
              </div>
              <h1 className="screen-title">
                One door
                <br />
                <span>closer.</span>
              </h1>
              <p className="board-intro">
                All three locks are open. Your remaining seconds have been added
                to {race ? "your score." : "the team score."}
              </p>
              <div className="story-panel">
                <span className="micro">THE STORY SO FAR</span>
                <p>{room.story}</p>
              </div>
              <div className="solution-review compact">
                {g.puzzles.map((p) => (
                  <article key={p.id}>
                    <h4>
                      <Check size={16} />
                      {p.title}
                    </h4>
                    <p>{p.solution}</p>
                  </article>
                ))}
              </div>
              {race ? (
                <p className="race-status" role="status">
                  Next room opens automatically in{" "}
                  {Math.max(0, Math.ceil(((g.nextRoomAt ?? now) - now) / 1000))}{" "}
                  seconds. Explanations remain in Your solved questions.
                </p>
              ) : host ? (
                <button
                  className="primary-button"
                  disabled={!!busy || !connected}
                  onClick={() => void action("next")}
                >
                  <KeyRound size={17} />
                  Enter {ROOM_INFO[g.roomIndex + 1]?.title}
                </button>
              ) : (
                <p className="muted">
                  Waiting for the host to open the next room.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="puzzle-top">
                <div>
                  <div className={`eyebrow ${detention ? "warning-text" : ""}`}>
                    {detention
                      ? `DETENTION ${g.punishment} / ${PUNISHMENT_NAMES[g.punishment].toUpperCase()}`
                      : `ROOM ${String(g.roomIndex + 1).padStart(2, "0")} OF 05`}
                  </div>
                  <h2 className="room-title">
                    {detention ? "Voss’s extra credit." : room.title}
                  </h2>
                  <p className="muted">
                    {detention
                      ? "Clear these locks to recover your unfinished room."
                      : room.topic}
                  </p>
                </div>
                <div className={`timer ${seconds <= 30 ? "urgent" : ""}`}>
                  <span className="micro">
                    <Clock3 size={12} />
                    TIME REMAINING
                  </span>
                  <strong
                    role="timer"
                    aria-label={`${seconds} seconds remaining`}
                  >
                    {formatTime(seconds)}
                  </strong>
                </div>
              </div>
              <Progress
                aria-label="Remaining room time"
                value={Math.min(
                  100,
                  (seconds /
                    (detention
                      ? rules.detention[g.punishment - 1]
                      : rules.main)) *
                    100,
                )}
                className={`time-progress ${seconds <= 30 ? "urgent" : ""}`}
              />
              <div
                className={`professor-message ${detention ? "detention-message" : ""}`}
              >
                <img src="/professor.png" alt="" />
                <div>
                  <span className="micro">
                    PROFESSOR VOSS, OVER THE INTERCOM
                  </span>
                  <p>
                    “
                    {detention
                      ? "Your answer requires further peer review. Welcome to detention."
                      : room.quote}
                    ”
                  </p>
                </div>
              </div>
              <div className="lock-grid">
                {g.puzzles.map((p, i) => {
                  const workers = g.players.filter(
                    (x) => x.working === p.id && now - x.lastSeen < 30000,
                  );
                  return (
                    <button
                      key={p.id}
                      className={`lock-card ${p.solved ? "solved" : ""} ${p.id === puzzle?.id ? "active" : ""} ${p.id === openingLock ? "lock-opening" : ""}`}
                      onClick={() => choose(p.id)}
                      disabled={p.locked || !!busy}
                    >
                      <span className="lock-number">
                        LOCK {String(i + 1).padStart(2, "0")}
                        {p.solved ? (
                          <LockOpen size={16} className="lock-symbol" />
                        ) : (
                          <LockKeyhole size={16} />
                        )}
                      </span>
                      <strong>{p.title}</strong>
                      <small>
                        {p.solved
                          ? `Solved by ${g.players.find((x) => x.id === p.solvedBy)?.name ?? "a teammate"}`
                          : p.locked
                            ? "Solve both fragments first"
                            : workers.length
                              ? `${workers.map((x) => x.name).join(", ")} working`
                              : p.topic}
                      </small>
                    </button>
                  );
                })}
              </div>
              {puzzle && (
                <article className="puzzle-panel">
                  <div className="puzzle-label">
                    <span className="micro">{puzzle.topic.toUpperCase()}</span>
                    <span>
                      {g.puzzles.filter((p) => p.solved).length}/
                      {g.puzzles.length} locks open
                    </span>
                  </div>
                  <h3>{puzzle.title}</h3>
                  <p className="question">{puzzle.prompt}</p>
                  {puzzle.solved ? (
                    <div className="solved-answer">
                      <Check size={20} />
                      <div>
                        <strong>Lock opened.</strong>
                        <p>{puzzle.solution}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <form className="answer-form" onSubmit={submit}>
                        <label className="answer-label" htmlFor="answer">
                          Your answer
                        </label>
                        <input
                          id="answer"
                          value={drafts[inputKey] ?? ""}
                          onChange={(e) =>
                            setDrafts((d) => ({
                              ...d,
                              [inputKey]: e.target.value,
                            }))
                          }
                          placeholder="Enter your answer"
                          autoComplete="off"
                          enterKeyHint="go"
                          maxLength={40}
                          required
                          disabled={
                            !!busy ||
                            !connected ||
                            seconds === 0 ||
                            puzzle.locked
                          }
                        />
                        <button
                          className="primary-button"
                          disabled={
                            !!busy ||
                            !connected ||
                            seconds === 0 ||
                            puzzle.locked
                          }
                        >
                          {busy === "answer" ? (
                            <Loader2 size={17} className="loading-spin" />
                          ) : (
                            <KeyRound size={17} />
                          )}
                          Unlock
                        </button>
                      </form>
                      <div className="answer-guidance">
                        <span>Numbers, decimals, or fractions. No units.</span>
                        <span>
                          Correct +20s{!detention ? " / +100 pts" : ""} · Wrong
                          −{rules.wrong}s
                        </span>
                      </div>
                      {seconds === 0 && (
                        <p className="warning-text" role="status">
                          The professor is checking the clock…
                        </p>
                      )}
                      {puzzle.hint ? (
                        <div className="hint-box">
                          <Lightbulb size={18} />
                          <p>{puzzle.hint}</p>
                        </div>
                      ) : (
                        <button
                          className="hint-button"
                          disabled={!!busy || !connected || seconds === 0}
                          onClick={() =>
                            void action("hint", { puzzleId: puzzle.id })
                          }
                        >
                          <Lightbulb size={16} />
                          Reveal a hint<span>−{rules.hint} seconds</span>
                        </button>
                      )}
                    </>
                  )}
                </article>
              )}
              <p className="help-text">
                <Users size={14} />
                {race
                  ? "Only your answers, hints, and penalties affect your escape."
                  : "Choose a lock to show your teammates where you are working. Anyone can help or submit."}
              </p>
            </>
          )}
        </section>
        <aside className="team-sidebar">
          {race && g.phase !== "lobby" && (
            <div className="leaderboard">
              <h3>
                {g.matchComplete ? "Final race results" : "Live race standings"}
              </h3>
              <p className="help-text">First successful escape wins.</p>
              <ol>
                {g.leaderboard.map((p, i) => {
                  const player = g.players.find((x) => x.id === p.playerId);
                  return (
                    <li
                      key={p.playerId}
                      className={p.playerId === session.playerId ? "you" : ""}
                    >
                      <span>
                        {p.place ??
                          (p.phase === "lost" || p.phase === "left"
                            ? "—"
                            : i + 1)}
                      </span>
                      <div>
                        <strong>
                          {player?.name}
                          {player?.kind === "bot" && (
                            <small className="bot-badge">BOT</small>
                          )}
                        </strong>
                        <small>
                          {p.phase === "won"
                            ? "Escaped"
                            : p.phase === "lost"
                              ? "Did not escape"
                              : p.phase === "left"
                                ? "Left race"
                                : p.phase === "detention"
                                  ? `Detention ${p.punishment}`
                                  : `Room ${p.roomIndex + 1}`}{" "}
                          · {p.solvedCount}/15 locks · {p.score} pts
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div className="score-panel">
            <span className="micro">{race ? "YOUR SCORE" : "TEAM SCORE"}</span>
            <strong>
              {g.score.toLocaleString()}
              <small>PTS</small>
            </strong>
          </div>
          <div className="punishment-panel">
            <div className="sidebar-heading">
              <ShieldAlert size={17} />
              <h3>Punishment meter</h3>
              <span>{Math.min(g.punishment, 4)}/4</span>
            </div>
            <div
              className="punishment-bars"
              aria-label={`Punishment level ${g.punishment} of 4`}
            >
              {[1, 2, 3, 4].map((n) => (
                <span key={n} className={g.punishment >= n ? "filled" : ""} />
              ))}
            </div>
            <p>
              {g.punishment >= 4
                ? "Experiment terminated"
                : PUNISHMENT_NAMES[g.punishment]}
            </p>
            <small>
              {g.punishment === 0
                ? "A missed deadline adds a detention room."
                : g.punishment < 4
                  ? "Solved locks are safe. Detention is getting tougher."
                  : "Four deadlines missed."}
            </small>
          </div>
          <div className="team-panel">
            <div className="sidebar-heading">
              <Users size={17} />
              <h3>{race ? "Racers" : "Your team"}</h3>
              <span>{g.players.length}/8</span>
            </div>
            <div className="player-list">
              {g.players.map((p, i) => (
                <div className="player-row" key={p.id}>
                  <Avatar
                    profile={p.avatar}
                    label={p.name}
                    className="roster-avatar"
                  />
                  <div>
                    <strong>
                      {p.name}
                      {p.kind === "bot" && (
                        <small className="bot-badge">BOT</small>
                      )}
                      {p.id === session.playerId && <small> (you)</small>}
                    </strong>
                    <span>
                      {p.id === g.hostId ? "Host · " : ""}
                      {p.left
                        ? "Left race"
                        : now - p.lastSeen > 30000
                          ? "Disconnected"
                          : g.phase === "lobby"
                            ? p.ready
                              ? "Ready"
                              : "Not ready"
                            : p.working
                              ? "Solving a lock"
                              : "In the laboratory"}
                    </span>
                  </div>
                  {now - p.lastSeen < 30000 &&
                    (g.phase !== "lobby" || p.ready) && <Check size={15} />}
                </div>
              ))}
            </div>
          </div>
          {!!g.review.length && (
            <details className="race-review">
              <summary>Your solved questions</summary>
              {g.review.map((q) => (
                <article key={q.id}>
                  <span className="micro">{q.room}</span>
                  <h4>{q.title}</h4>
                  <p>{q.prompt}</p>
                  <strong>{q.solution}</strong>
                </article>
              ))}
            </details>
          )}
          <div className="room-track">
            <span className="micro">ESCAPE ROUTE</span>
            {ROOM_INFO.map((r, i) => (
              <div
                key={r.title}
                className={`route-stop ${i < g.roomIndex || g.phase === "won" || (i === g.roomIndex && g.phase === "cleared") ? "done" : i === g.roomIndex && g.phase !== "lobby" ? "current" : ""}`}
              >
                <span>
                  {i < g.roomIndex ||
                  g.phase === "won" ||
                  (i === g.roomIndex && g.phase === "cleared") ? (
                    <Check size={12} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <p>{r.title}</p>
              </div>
            ))}
          </div>
          <div className="team-channel">
            <div className="sidebar-heading">
              <MessageSquare size={16} />
              <h3>Team channel</h3>
            </div>
            <div
              className="event-log"
              ref={log}
              role="log"
              aria-label="Team activity and messages"
              aria-live="polite"
            >
              {g.events.length ? (
                g.events.slice(-20).map((e) => (
                  <p key={e.id} className={`event-${e.kind}`}>
                    {e.text}
                  </p>
                ))
              ) : (
                <p className="muted">
                  Room messages and your discoveries appear here.
                </p>
              )}
            </div>
            <form
              className="chat-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!chat.trim()) return;
                const result = await action("chat", { text: chat });
                if (result) setChat("");
              }}
            >
              <label className="sr-only" htmlFor="chat">
                Message your team
              </label>
              <input
                id="chat"
                placeholder="Share a thought…"
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                maxLength={240}
                disabled={!!busy || !connected}
              />
              <button
                className="icon-button"
                aria-label="Send message"
                disabled={!!busy || !connected || !chat.trim()}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
}
