Draft a pull request for the current branch without pushing or creating it on GitHub. The draft is saved locally so the user can create the PR manually via the GitHub web UI.

**Step 1 — Identify the current branch**

Run `git branch --show-current` to get the exact branch name. All subsequent steps must use this branch — never infer the branch from prior conversation context.

**Step 2 — Push any unpushed commits**

Run `git log @{u}..HEAD --oneline` to check for commits not yet on the remote.

- If the remote tracking branch doesn't exist yet (`@{u}` errors), run `git push -u origin <current-branch>` to create it.
- If there are unpushed commits, run `git push` to push them now. Tell the user: "Pushing unpushed commits before drafting…"
- If everything is already pushed, continue.

After pushing (or confirming nothing to push), proceed to Step 3.

**Step 3 — Pre-push check**
Read and follow all steps in `.claude/commands/push-check.md`. Then:
- If verdict is 🚫 **Do not push** — stop here. List the blocking issues and wait for them to be fixed.
- If verdict is ⚠️ **Push with caution** — list the issues, then ask the user to confirm before continuing.
- If verdict is ✅ **Ready to push** — proceed to Step 4.

**Step 4 — Gather branch info**

Use `develop` as the base branch. If `develop` does not exist locally, fall back to `main`.

Run the following, substituting `<current-branch>` with the branch name from Step 1:
- `git log develop..<current-branch> --oneline` — commits on this branch not yet in develop
- `git diff develop...<current-branch> --stat` — files changed relative to develop

These commands must reference the current branch explicitly — do not use `HEAD` as a substitute, as HEAD may point to a different branch if the context window is stale.

**Step 5 — Draft the PR**

Use the exact template below. Fill in every section based on the commit log and diff stat.

**Title format**: `<Type> — <3-5 word concise name>`
Types: `Feature` | `Fix` | `Refactor` | `Style` | `Docs` | `Chore` | `Test`

**Body template**:
```
## Type
- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Chore

## Summary
- <bullet>
- <bullet>

## Changes
- <bullet>

## Notes for reviewer
```

**Step 6 — Save the draft**

Save the draft to `.claude/session/pull-request-drafts/<branch-name>-YYYY-MM-DD_HH-MM.md` using the current date and time.

The file must contain:
1. The PR title on the first line, prefixed with `# `
2. A blank line
3. The full PR body

Show the user the file path where the draft was saved, and remind them to create the PR at github.com using the saved draft.
