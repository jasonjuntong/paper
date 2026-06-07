Draft a pull request for the current branch without pushing or creating it on GitHub. The draft is saved locally so the user can create the PR manually via the GitHub web UI.

**Step 1 — Pre-push check**
Read and follow all steps in `.claude/commands/push-check.md`. Then:
- If verdict is 🚫 **Do not push** — stop here. List the blocking issues and wait for them to be fixed.
- If verdict is ⚠️ **Push with caution** — list the issues, then ask the user to confirm before continuing.
- If verdict is ✅ **Ready to push** — proceed to Step 2.

**Step 2 — Gather branch info**

Run the following to understand what's on this branch:
- `git branch --show-current` — current branch name
- `git log develop..HEAD --oneline` — commits on this branch (fall back to `main..HEAD` if develop doesn't exist locally)
- `git diff develop...HEAD --stat` — files changed (fall back to `main...HEAD`)

**Step 3 — Draft the PR**

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

**Step 4 — Save the draft**

Save the draft to `.claude/session/pull-request-drafts/<branch-name>-YYYY-MM-DD_HH-MM-SS.md` using the current date and time.

The file must contain:
1. The PR title on the first line, prefixed with `# `
2. A blank line
3. The full PR body

Show the user the file path where the draft was saved, and remind them to create the PR at github.com using the saved draft.
