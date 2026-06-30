Create a pull request targeting `develop` using the current branch.

**Hard rules — never violate:**
- The PR base is **always `develop`**, never `main`. Never open a PR targeting `main`.
- This command may `git push` the **current feature branch** only. It **never merges** (`gh pr merge`, `git merge`) and **never pushes `develop` or `main`** (`git push origin develop`, `git push origin main`). Merging happens only through GitHub review, by a human.
- The PR describes **only the current branch's own changes**. Build the title/body from this branch's commits diffed against the `develop` base — never look up, read, or compare against `main` or any other feature branch.
- **Never put a ticket slug/ID in the PR title or name** (e.g. `USER-001`, `ORG-023`, `feature/...`). The title describes *what changed*, not which ticket it tracks. Ticket references, if any, belong only in the body's "Notes for reviewer".
- The title and body must reflect **what is actually implemented/changed in the diff** against the base (latest `develop`, or the branch's initial no-change state if `develop` is unavailable) — not the ticket's intent, scope, or anything not present in the diff.

**Step 0 — Guard against base branches**

Run `git rev-parse --abbrev-ref HEAD` to get the current branch. If it is `develop` or `main`, stop here. Tell the user: "You're on `<branch>`. Switch to a feature branch before creating a PR."

**Step 1 — Check what's unpushed**

Run `git status` and `git log @{u}..HEAD --oneline` to see what isn't on the remote yet.

- If the remote tracking branch doesn't exist yet (`@{u}` errors), the branch has no upstream — note it; Step 3 will push with `-u`.
- Otherwise note any unpushed commits.

Do not push yet — the pre-push check runs first. Proceed to Step 2.

**Step 2 — Pre-push check**
Read and follow all steps in `.claude/commands/push-check.md`, passing `develop` as the base branch (so the scan covers the full PR delta, not just unpushed commits). Then:
- If verdict is 🚫 **Do not push** — stop here, do not push or create the PR. List the blocking issues and wait for them to be fixed.
- If verdict is ⚠️ **Push with caution** — list the issues, then ask the user to confirm before continuing.
- If verdict is ✅ **Ready to push** — proceed to Step 3.

**Step 3 — Push the current branch**

Re-confirm the current branch is not `develop` or `main` (Step 0 already guarded this), then push the **current feature branch only**:
- No upstream yet → `git push -u origin <branch>`
- Otherwise → `git push`

Never push `develop` or `main`. If the push fails (e.g. non-fast-forward), stop and report it — do not force-push.

**Step 4 — Check for an existing PR**

Run `gh pr list --head <branch> --base develop --json url --jq '.[0].url'`. If it returns a URL, a PR already exists for this branch — the push above already updated it, so return that URL and stop. Do not try to create a duplicate.

**Step 5 — Create the PR**

Make sure the diff is based on the latest `develop`, not a stale local copy:

```
git fetch origin develop
git log origin/develop..HEAD --oneline
git diff origin/develop...HEAD --stat
```

If `origin/develop` doesn't exist, say: "No `develop` branch found on remote — confirm the target base branch and update `pull-request.md` if needed." and stop.

If `git log origin/develop..HEAD` is empty (HEAD has no commits ahead of `develop`), stop and say: "Nothing to open a PR for — this branch has no commits ahead of `develop`." Do not call `gh pr create`.

Draft the PR using this structure:

**Title**: `<Type> — <3-5 word concise name of the changes>`
Types: `Feature` | `Fix` | `Refactor` | `Style` | `Docs` | `Chore` | `Test`
Example: `Refactor — Typography Audits`
The name must describe the **changes themselves**, derived from the diff against `develop`. **Do not include any ticket slug/ID** (`USER-001`, `ORG-023`, etc.) or branch name in the title.

**Body**: Check the `- [x]` box that matches the chosen type (leave the rest as `- [ ]`).
```
## Type
- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Style
- [ ] Docs
- [ ] Chore
- [ ] Test

## Summary
- <bullet>
- <bullet>

## Changes
- <bullet>

## Notes for reviewer
```

Write the body to a temp file and create the PR with `--body-file` (avoids shell-escaping issues with the markdown):
```
gh pr create --base develop --title "..." --body-file <path>
```

Return the PR URL when done.
