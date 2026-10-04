# Three approved engagement changes

These are product hypotheses, not proven retention gains. Their rationale is clear mastery feedback, fresh challenges, and playing again with friends. [Ryan, Rigby and Przybylski (2006)](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf) links competence and social connection with motivation to play; these specific features are our design inferences and need playtesting. The user approved all three changes. The existing scoring, difficulty ranges, and mandatory backstory remain in place.

1. **Make every solved lock feel rewarding.** Add a short lock-opening animation, distinct answer feedback, a visible correct-answer streak, and a mobile answer area that stays within reach. Streaks grant a cosmetic badge only; scoring and time penalties stay the same. Respect mute/reduced motion. Check whether players notice correct feedback immediately and submit fewer accidental taps.
2. **Give rematches fresh mathematics.** Add seeded variations to selected arithmetic/algebra puzzle templates while retaining the authored bank as a fallback. Everyone in the same match gets identical numbers; solutions and explanations are generated together and validated. Keep Junior/Senior ranges and time pressure separate. Test exact answers, negative/fraction cases, and whether repeat players enjoy rematches without memorizing answer keys.
3. **Add an optional best-of-three rivalry.** Track round wins in the current room, show a clear podium and personal accuracy/time recap, and offer rematch votes that retain profiles/settings. Require two ready humans for each round. No accounts needed; series records expire with the room. Check whether groups voluntarily play another round and can understand the series score.

Implementation is delivered on dependent feature branches after the Vercel compatibility fix:

- Solve feedback: `codex/solve-feedback` (PR #5).
- Fresh mathematics: `codex/fresh-puzzles` (PR #6).
- Rivalries/rematches: `codex/rivalry-series` (final combined preview).

Streaks are cosmetic. Fresh numbers are enabled for new rooms and optional in the lobby. Rivalries are opt-in Race series, ending at two wins or three rounds; tied leaders share a draw. The acceptance checks cover correctness, privacy, reconnection, replay protection, and accessibility. No retention gain has been measured yet.
