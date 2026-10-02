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
import { usePreferences } from "@/lib/use-preferences";
import { ProfileEditor, AliasButton } from "@/components/profile-editor";
import { RoomSettings } from "@/components/room-settings";
import { NEW_ROOM_SETTINGS, type GameSettings } from "@/lib/game-settings";
import type { Difficulty } from "@/lib/game-types";
import { Settings2 } from "lucide-react";
import { Professor } from "@/components/professor";
import { Prologue } from "@/components/prologue";
export default function Home() {
  const [mode, setMode] = useState("create"),
    [difficulty, setDifficulty] = useState("junior"),
    [rules, setRules] = useState(false);
  const [storyOpen, setStoryOpen] = useState(true);
  const [roomSettings, setRoomSettings] =
    useState<GameSettings>(NEW_ROOM_SETTINGS);
  const api = useGame();
  const { preferences, update } = usePreferences();
  const [settings, setSettings] = useState(false);
  const name = preferences.alias;
  const setName = (alias: string) => update({ alias });
  useGameTools(api.game);
  const [code, setCode] = useState("");
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
            <button
              className="icon-button"
              aria-label="Player settings"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={18} />
            </button>
            <span className="edition">MULTIPLAYER MATH ESCAPE</span>
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
          <Game
            {...api}
            game={api.game}
            session={api.session}
            preferences={preferences}
            updatePreferences={update}
          />
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
                <ProfileEditor
                  avatar={preferences.avatar}
                  onChange={(avatar) => update({ avatar })}
                />
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
                        void api.action("create", {
                          name,
                          difficulty,
                          avatar: preferences.avatar,
                          ...roomSettings,
                        });
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
                      <AliasButton onChange={setName} />
                      <RoomSettings
                        settings={roomSettings}
                        difficulty={difficulty as Difficulty}
                        onChange={(s, d) => {
                          setRoomSettings(s);
                          setDifficulty(d);
                        }}
                        disabled={!!api.busy}
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
                          avatar: preferences.avatar,
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
                      <AliasButton onChange={setName} />
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
              <Professor reducedMotion={preferences.reducedMotion} />
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
          <span>THINK FAST. OUTSMART VOSS.</span>
          <span>No downloads. Just brains.</span>
        </footer>
        <Dialog open={settings} onOpenChange={setSettings}>
          <DialogContent className="rules-modal profile-modal">
            <DialogTitle>Your player settings</DialogTitle>
            <DialogDescription>
              Saved on this browser. Character changes apply only in the lobby.
            </DialogDescription>
            <label className="preference-toggle">
              <input
                type="checkbox"
                checked={preferences.sound}
                onChange={(e) => update({ sound: e.target.checked })}
              />
              Game sounds
            </label>
            <label className="preference-toggle">
              <input
                type="checkbox"
                checked={preferences.reducedMotion}
                onChange={(e) => update({ reducedMotion: e.target.checked })}
              />
              Reduce motion
            </label>
            {(!api.game || api.game.phase === "lobby") && (
              <>
                <label className="settings-field">
                  Anonymous alias
                  <input
                    value={name}
                    maxLength={20}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <AliasButton onChange={setName} />
                <ProfileEditor
                  avatar={preferences.avatar}
                  onChange={(avatar) => update({ avatar })}
                />
                {api.game && (
                  <button
                    className="primary-button"
                    disabled={!!api.busy || !name.trim()}
                    onClick={async () => {
                      if (
                        await api.action("profile", {
                          name,
                          avatar: preferences.avatar,
                        })
                      )
                        setSettings(false);
                    }}
                  >
                    Save character to room
                  </button>
                )}
              </>
            )}
            {api.error && (
              <p className="error-message" role="alert">
                {api.error}
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {storyOpen && (
        <p className="opening-placeholder">
          Preparing the professor’s origin story…
        </p>
      )}
      <Prologue
        open={storyOpen}
        onClose={closeStory}
        motionPreference={preferences.reducedMotion}
        soundPreference={preferences.sound}
        onSoundChange={(sound) => update({ sound })}
      />
      <Dialog open={rules} onOpenChange={setRules}>
        <DialogContent className="rules-modal">
          <DialogTitle>The rules of the experiment</DialogTitle>
          <DialogDescription>
            Race to escape first, or work together in Co-op. Every second
            counts.
          </DialogDescription>
          <ol className="rules-list">
            <li>
              Two to eight humans join by code. Two connected, ready humans are
              required to start. Race can fill the remaining seats with clearly
              labelled bots.
            </li>
            <li>
              Five rooms, three locks each. Race gives each player independent
              progress and advances cleared rooms after three seconds. First
              escape wins; everyone else can finish. Co-op shares progress and
              lets the host open each next room.
            </li>
            <li>
              Junior is classes 5–8; Senior is classes 9–12. Time pressure is
              separate: Easy / Medium / Hard start at 5 / 4 / 3 minutes.
            </li>
            <li>
              Correct answers add 20 seconds and 100 main-room points. Wrong
              answers cost 5 / 10 / 15 seconds. Hints cost 10 / 15 / 20 seconds.
              Clear a room for one point per remaining second.
            </li>
            <li>
              Timeouts cost 100 points and add detention. Easy detention: 90 /
              120 / 150 seconds. Medium: 60 / 90 / 120. Hard: 45 / 60 / 90.
              Recover with 150 / 120 / 90 seconds; solved main locks stay
              solved.
            </li>
            <li>
              Fail detention or miss four main deadlines and your attempt ends.
              Bot skill controls simulated speed and accuracy, independently of
              time pressure. Character choices are cosmetic.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  );
}
