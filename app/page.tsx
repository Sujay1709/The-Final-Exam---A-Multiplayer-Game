"use client";
import { useState, useEffect } from "react";
import {
  Loader2,
  KeyRound,
  Users,
  Clock3,
  LockKeyhole,
  GraduationCap,
  FlaskConical,
  BookOpen,
  ShieldAlert,
  Film,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Game } from "@/components/game";
import { useGame } from "@/lib/use-game";
import { Toaster } from "@/components/ui/sonner";
import { useGameTools } from "@/lib/webmcp";
import { Professor } from "@/components/professor";
import { Prologue } from "@/components/prologue";
export default function Home() {
  const [mode, setMode] = useState("create"),
    [difficulty, setDifficulty] = useState("junior"),
    [rules, setRules] = useState(false);
  const [storyOpen, setStoryOpen] = useState(true);
  const api = useGame();
  useGameTools(api.game);
  const [name, setName] = useState(""),
    [code, setCode] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("room");
    if (q) {
      setCode(q.toUpperCase().slice(0, 6));
      setMode("join");
    }
  }, []);
  function closeStory() {
    setStoryOpen(false);

  }
  return (
    <div className="app-shell">
      <Toaster theme="dark" position="bottom-right" />
      <div hidden={storyOpen}>
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">
            <FlaskConical size={22} />
          </span>
          <span>
            THE LAST EXAM
            <span className="brand-sub">A PROFESSOR VOSS EXPERIMENT</span>
          </span>
        </a>
        <div className="top-actions">
          <span className="edition">CO-OP ESCAPE ROOM</span>
          {(!api.game || !["main", "detention"].includes(api.game.phase)) && (
            <button
              className="text-button backstory-link"
              onClick={() => setStoryOpen(true)}
            >
              <Film size={16} />
              The backstory
            </button>
          )}
          <button className="text-button" onClick={() => setRules(true)}>
            <BookOpen size={16} />
            How to play
          </button>
        </div>
      </header>
      {api.game && api.session ? (
        <Game {...api} game={api.game} session={api.session} />
      ) : (
        <main className="entry-grid">
          <section className="entry-content">
            <div className="eyebrow">
              <span className="tiny-line" />
              THE REUNION WAS A TRAP.
            </div>
            <h1>
              The professor’s
              <br />
              last <span>exam.</span>
            </h1>
            <p className="intro">
              An old grudge. Five locked rooms.
              <br />
              Your only way out? <strong>Do the math.</strong>
            </p>
            <div className="game-facts">
              <span>
                <Users size={17} />
                2–8 players
              </span>
              <span>
                <Clock3 size={17} />
                Against the clock
              </span>
              <span>
                <LockKeyhole size={17} />5 rooms
              </span>
            </div>
            <div className="entry-form">
              <Tabs value={mode} onValueChange={setMode}>
                <TabsList className="entry-tabs">
                  <TabsTrigger value="create">
                    <KeyRound size={16} />
                    Create a room
                  </TabsTrigger>
                  <TabsTrigger value="join">
                    <Users size={16} />
                    Join a room
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="create">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void api.action("create", { name, difficulty });
                    }}
                  >
                    {" "}
                    <label className="field-label" htmlFor="host-name">
                      YOUR NAME
                    </label>
                    <input
                      id="host-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="What should we call you?"
                      maxLength={20}
                      required
                    />
                    <div className="field-label difficulty-label">
                      CHOOSE YOUR CHALLENGE
                    </div>
                    <RadioGroup
                      value={difficulty}
                      onValueChange={setDifficulty}
                      className="difficulty-grid"
                    >
                      <label
                        className={`difficulty-choice ${difficulty === "junior" ? "selected" : ""}`}
                      >
                        <RadioGroupItem value="junior" />
                        <span>
                          <strong>Junior</strong>
                          <small>Classes 5–8</small>
                        </span>
                        <GraduationCap size={22} />
                      </label>
                      <label
                        className={`difficulty-choice ${difficulty === "senior" ? "selected" : ""}`}
                      >
                        <RadioGroupItem value="senior" />
                        <span>
                          <strong>Senior</strong>
                          <small>Classes 9–12</small>
                        </span>
                        <FlaskConical size={22} />
                      </label>
                    </RadioGroup>
                    <button
                      className="primary-button full"
                      type="submit"
                      disabled={!!api.busy}
                    >
                      {api.busy ? (
                        <Loader2 size={17} className="loading-spin" />
                      ) : (
                        <KeyRound size={17} />
                      )}
                      Create escape room
                    </button>
                    <p className="form-note">
                      Get a room code. Gather your team. Outsmart Voss.
                    </p>
                  </form>
                </TabsContent>
                <TabsContent value="join">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void api.action("join", {
                        name,
                        code: code.toUpperCase(),
                      });
                    }}
                  >
                    {" "}
                    <label className="field-label" htmlFor="join-name">
                      YOUR NAME
                    </label>
                    <input
                      id="join-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="What should we call you?"
                      maxLength={20}
                      required
                    />
                    <label className="field-label" htmlFor="room-code">
                      ROOM CODE
                    </label>
                    <input
                      id="room-code"
                      value={code}
                      onChange={(e) =>
                        setCode(
                          e.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
                        )
                      }
                      className="code-input"
                      placeholder="ABCDEF"
                      maxLength={6}
                      required
                    />
                    <button
                      className="primary-button full"
                      type="submit"
                      disabled={!!api.busy}
                    >
                      {api.busy ? (
                        <Loader2 size={17} className="loading-spin" />
                      ) : (
                        <KeyRound size={17} />
                      )}
                      Enter the laboratory
                    </button>
                    <p className="form-note">
                      Ask your host for the six-letter room code.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
              {api.error && (
                <p className="error-message" role="alert">
                  {api.error}
                </p>
              )}
            </div>
            <div className="warning-note">
              <ShieldAlert size={16} />
              <span>Miss the deadline. Meet the detention room.</span>
            </div>
          </section>
          <aside className="professor-panel">
            <Professor />
            <div className="case-number">
              CASE FILE 001<span>CLASSIFIED</span>
            </div>

            <div className="portrait-copy">
              <span className="eyebrow">MEET YOUR EXAMINER</span>
              <h2>
                Professor
                <br />
                Elias Voss.
              </h2>
              <p>Brilliant mind. Terrible reunion host.</p>
              <blockquote>
                “You copied my work once.
                <br />
                This time, show your working.”
              </blockquote>
              <div className="professor-signature">
                E. Voss <span>DEPARTMENT OF UNFINISHED BUSINESS</span>
              </div>
            </div>
            <span className="art-caption">
              FIG. 01 — THE MAN BEHIND THE LOCKS
            </span>
          </aside>
        </main>
      )}
      <footer className="footer">
        <span>THINK TOGETHER. ESCAPE TOGETHER.</span>
        <span>No downloads. Just brains.</span>
      </footer>
      </div>
      {storyOpen&&<p className="opening-placeholder">Preparing the professor’s origin story…</p>}
      <Prologue open={storyOpen} onClose={closeStory} />
      <Dialog open={rules} onOpenChange={setRules}>
        <DialogContent className="rules-modal">
          <DialogTitle>The rules of the experiment</DialogTitle>
          <DialogDescription>
            Work together. Keep your cool. Every second counts.
          </DialogDescription>
          <ol className="rules-list">
            <li>
              Join with a room code. All 2–8 players ready up before the host
              starts.
            </li>
            <li>
              Escape five rooms with three puzzles each. Each room starts with
              four minutes.
            </li>
            <li>
              Correct answers add 20 seconds. Main-room puzzles earn 100 points.
              Wrong answers cost 10 seconds. A hint costs 15 seconds.
            </li>
            <li>
              Room timeouts cost 100 points and send you to detention: one
              puzzle in 60s, two in 90s, then three steps in 120s.
            </li>
            <li>
              Clear detention to resume your unfinished room with two minutes.
              Solved puzzles stay solved.
            </li>
            <li>
              Fail detention or reach a fourth room timeout and the experiment
              ends. Earn one point per remaining second when clearing a main
              room.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  );
}
