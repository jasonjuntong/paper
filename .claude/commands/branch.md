Create a new git branch off an up-to-date parent, following this repo's `<type>/<task-focused>` convention. Handles two situations automatically: cutting a fresh branch for a picked ticket, or carrying work you've already started on `develop` onto a new branch and cleaning `develop` back up. Evaluates the name you give it and pushes back only when it's off.

**Usage:** `/branch <type> <task focus words…> [--from <parent-branch>]`  — or pass a full name: `/branch <type>/<kebab-focus>`
- `/branch feature dedup borderline confirm` → `feature/dedup-borderline-confirm`
- `/branch fix/add-paper-race`
- `/branch feature experiment new reader --from feature/pdf-viewer` → branches off that parent instead of `develop`

**Hard rules — never violate:**
- **Always branch from an up-to-date parent.** Bring the parent in sync with its remote first. Never branch from a stale local copy.
- **Local `develop` is kept current by reading from the remote only — never by pushing.** Sync is `git fetch` + fast-forward / reset to `origin/develop`. **Never `git push` `develop` or `main`**, and never push the new branch. All remote changes land through a PR (see `/pull-request`).
- **Default parent is `develop`.** Only branch from something else when the user passes `--from <parent-branch>` (rare — experimental work off a specific feature branch).
- **Never put a ticket slug/ID in the branch name** (e.g. `USER-001`, `ORG-023`, `PAPER-006`, `INFRA-002`). The name says *what the work is about*, not which ticket it tracks.
- **Name format is always `<type>/<task-focused>`** — a valid type, a slash, then a short kebab-case focus.
- **Create locally only.** Never set an upstream or push here.
- **Never force or discard.** No force-push, no `reset --hard` of anything except restoring `develop` to `origin/develop` in carry mode (and only after the work is safely on the new branch). If a fast-forward, rebase, or stash-pop can't apply cleanly, stop and report.

**Step 0 — Parse the arguments into a candidate name**

- **type** — if the first token contains a `/`, split it into `type` and the (already-kebab) `focus` on that first slash; otherwise the first token is `type` and the remaining tokens are the focus words. `type` must be one of: `feature`, `fix`, `refactor`, `style`, `docs`, `chore`, `test`, `perf`. Accept `feat` as an alias and **normalize it to `feature`**. If missing/invalid, stop and ask.
- **parent** — `--from <branch>` / `--from=<branch>` if present (anywhere in the args), else `develop`. Strip the `--from …` part before building the focus.
- **focus → slug** — lowercase, spaces/underscores → `-`, strip anything not `[a-z0-9-]`, collapse repeated/leading/trailing hyphens. If empty, stop and ask what the branch is for.
- Assemble the **candidate** `branch = <type>/<slug>`.

**Step 1 — Fetch**

`git fetch origin`.

**Step 2 — Detect the mode and gather the local work**

- `current = git rev-parse --abbrev-ref HEAD`
- `dirty` = `git status --porcelain` is non-empty
- `aheadOfDevelop` = `git rev-list --count origin/develop..develop`

Choose:
- **Carry mode** — no `--from`, `current` is `develop`, and there is local work (`dirty` or `aheadOfDevelop > 0`) → **Step 4A**.
- **Fresh mode** — everything else → **Step 4B**.

**Step 3 — Evaluate the candidate name**

Judge the candidate on two axes; **if it's good, use it as-is with no friction** — only interrupt when it's genuinely off.

1. **Convention.** Valid `type`; shape is `<type>/<focus>`; no ticket slug; focus is a meaningful 2–5-word description, not vague filler (`wip`, `stuff`, `misc`, `updates`, `changes`, `temp`, `final`, `new`, `test123`) and not absurdly long.
2. **Fit to the actual work** — only when there is work to inspect (carry mode, or any uncommitted / local-ahead commits). Read the change surface: `git status --short`, `git diff` and `git diff --staged`, plus `git log --oneline origin/develop..develop` and `git diff origin/develop..develop` for local commits. Then check:
   - does the **focus** reflect what actually changed (the files, area, and intent)?
   - does the **type** match the diff? (e.g. named `feature` but the diff is only test files → likely `test`; named `fix` but it adds a new capability → likely `feature`.)

Decision:
- **Good** (follows convention, and — where work exists — matches it): use it. Don't second-guess a name that's already right.
- **Minor/fixable** (right idea, wrong casing, focus repeats the type word, slightly vague): normalize it, note the one-line change, and proceed.
- **Way off** (breaks convention with no obvious fix, or clearly mismatches the changes — wrong type or wrong topic): **argue.** State what's off and *why*, citing the diff (the areas/files actually touched). Propose a concrete better `<type>/<focus>`. Ask the user to choose yours vs. theirs before creating anything. If they stand by their name, use it — it's their call; you've made the case.

Settle on the final `branch` before continuing.

**Step 4 — Check the final name is free**

- `git rev-parse --verify --quiet refs/heads/<branch>` → exists locally: stop, report the collision.
- `git ls-remote --exit-code --heads origin <branch>` → exists on the remote: stop, report it. Don't silently rename.

**Step 4A — Carry mode (move your develop work onto the new branch, restore develop)**

End state: new branch = `origin/develop` + your local commits + your uncommitted changes; `develop` = `origin/develop`, clean.

First **print the plan and wait for an explicit yes** — do nothing destructive before that. Show:
- final branch name, based on `origin/develop`,
- uncommitted changes that will move: `git status --short`,
- local commits that will move: `git log --oneline origin/develop..develop`,
- that `develop` will be reset (`git reset --hard origin/develop`) to the last merged commit **after** the work is safe on the new branch.

Only after confirmation, run in order:
1. `git branch <branch>` — point the new branch at the current develop tip (captures any local commits). Doesn't touch the working tree.
2. If `dirty`: `git stash push -u -m "branch-carry <branch>"`.
3. `git reset --hard origin/develop` — restore local `develop` to the last remote merge commit (we're on `develop`; the work is now safe on `<branch>` and/or the stash).
4. `git checkout <branch>`
5. `git rebase origin/develop` — replay the carried commits on top of the up-to-date base (no-op if none). On conflict: stop, tell the user to resolve on `<branch>`; `develop` is already clean and safe.
6. If stashed: `git stash pop`. On conflict: stop and report; the changes are on `<branch>`, resolve there.

**Step 4B — Fresh mode (clean branch off an up-to-date parent)**

1. If `dirty`, stop: "Working tree isn't clean — commit or stash before branching off `<parent>`." Don't stash or discard. (Carry mode only triggers while on `develop` with no `--from`.)
2. Bring the parent up to date:
   - `git ls-remote --exit-code --heads origin <parent>`.
     - No remote branch (a local-only experimental `--from` parent) → use it as-is; note it wasn't synced.
     - Otherwise: `git checkout <parent>` then `git pull --ff-only origin <parent>`. If the ff fails (diverged), stop and report — don't merge/rebase/reset/force.
3. `git checkout -b <branch> <parent>`

**Step 5 — Report**

Confirm:
- final branch name and the base it was cut from (`origin/develop` in carry mode, or `<parent>`),
- if the name was changed from what the user typed, say so and why,
- in carry mode: what moved (commits + files), and that `develop` is now clean at `origin/develop`,
- current status: `git status -sb`,
- that it's local-only — use `/pull-request` when ready to push and open a PR against `develop`.
