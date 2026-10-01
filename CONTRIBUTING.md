# Working on a feature safely

The feature branches listed in the README are starting points for future updates. Each has the full working game. Changes on one branch do not update `main` until they are merged. Branches do not enforce file ownership, and they do not freeze the code forever.

## Before switching

```sh
git status
git fetch origin
```

Start with a clean working tree. Uncommitted edits can follow you across branches or block a switch. Commit useful work on its current branch, or temporarily save it with `git stash push -u -m "Work before switching features"`. Restore a stash with `git stash pop` on the intended branch and review the result. Avoid switching branches while the development server is serving an active game, since switching changes the files it reads.

## Update an existing feature branch

Example: changing the mathematics questions.

```sh
git switch codex/math-puzzles
git pull --ff-only origin codex/math-puzzles
git merge origin/main
```

If the branch is not available locally yet, use `git switch --track origin/codex/math-puzzles` for the first switch. Keeping up with `main` brings in fixes made by other features. If Git reports a conflict, follow the conflict steps below before editing further.

Change the questions in `lib/puzzles.ts`, including their answer keys, hints, and worked solutions. Adjust meaningful rules tests if the behavior changes. For other features, consult the file map in the README. Keep answer keys in server code.

```sh
npm test
npm run typecheck
npm run build
git diff
git add lib/puzzles.ts tests/game.test.ts
git commit -m "Update fraction puzzles and explanations"
git push origin codex/math-puzzles
```

Stage only the files relevant to your actual change. The sample paths above are for a puzzle update.

On GitHub, open a pull request from `codex/math-puzzles` into `main`. Describe the player-visible change and checks you ran. Review the diff and automated checks, then merge when ready. Creating a pull request does not merge it automatically. After merging, update your local `main` with `git switch main` and `git pull --ff-only origin main`.

## Create a branch for one particular update

Long-lived feature branches can fall behind `main`. Often the clearer approach is a fresh branch for each small update:

```sh
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c codex/math-puzzles-fractions
```

Make the change, run the relevant checks, commit, and push with `git push -u origin codex/math-puzzles-fractions`. Open a pull request into `main`. This gives each update its own review and history. Do not force-push a shared branch.

## Verify behavior

- **Rules or puzzles:** run `npm test` and check the affected difficulty mode locally.
- **Multiplayer/API/storage:** run the tests, type check, build, and `node tests/integration.mjs` with the local server running. Use a separate browser/private window or another device for a second identity.
- **UI/backstory/audio:** type check and build, then inspect desktop and phone-size layouts, keyboard controls, reduced motion, and muted/unmuted sound as applicable.
- **Deployment:** build and verify a clean local setup. Publishing the game is a separate action from pushing source to GitHub.
- **Documentation:** check rules against `lib/game.ts`, verify local links and referenced files, and keep setup commands reproducible.

The GitHub Actions workflow runs rules tests, a TypeScript check, and a build on pull requests to `main`, and on pushes to `main`. It does not perform the multi-session HTTP test or UI inspection. Passing checks alone does not prevent direct pushes: branch protection is a separate GitHub repository setting and is not configured by this guide.

## Resolve a merge conflict

Run `git status` to see the affected files. Open each file, find the `<<<<<<<`, `=======`, and `>>>>>>>` markers, and combine the intended changes. Remove the markers, rerun relevant checks, stage the resolved files, and run `git commit` to finish the merge. If you want to return to the state before the merge, use `git merge --abort` while the merge is still in progress. Do not resolve a conflict by discarding an entire side without reading it.

## Keep the game reproducible

Commit dependency changes together with `package-lock.json`. Preserve attribution and license files for bundled third-party assets. Keep generated build output, local player/database state, credentials, and `.env*` files out of Git. The `.gitignore` already excludes the local runtime and common secret files.
