Create a pull request targeting `develop` using the current branch.

**Step 1 — Check for unpushed commits**

Run `git status` and `git log @{u}..HEAD --oneline` to check if there are any commits not yet pushed to the remote branch.

- If the remote tracking branch doesn't exist yet (`@{u}` errors), treat all local commits as unpushed.
- If there are **unpushed commits** — stop here. Do not proceed. Tell the user: "You have unpushed commits. Push your branch first (`git push` or `git push -u origin <branch>`), then re-run this command."
- If everything is pushed — proceed to Step 2.

**Step 2 — Pre-push check**
Read and follow all steps in `.claude/commands/push-check.md`. Then:
- If verdict is 🚫 **Do not push** — stop here, do not create the PR. List the blocking issues and wait for them to be fixed.
- If verdict is ⚠️ **Push with caution** — list the issues, then ask the user to confirm before continuing.
- If verdict is ✅ **Ready to push** — proceed to Step 3.

**Step 3 — Create the PR**

First run `git log develop..HEAD --oneline` to see all commits on this branch. Then run `git diff develop...HEAD --stat` to see what changed.

Draft the PR using this structure:

**Title**: `<Type> — <3-5 word concise name of the changes>`
Types: `Feature` | `Fix` | `Refactor` | `Style` | `Docs` | `Chore` | `Test`
Example: `Refactor — Typography Audits`

**Body**:
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

Then push the branch if not already pushed (`git push -u origin <branch>`), and create the PR with:
```
gh pr create --base develop --title "..." --body "..."
```

If `develop` branch doesn't exist on remote, say: "No `develop` branch found on remote — confirm the target base branch and update `pull-request.md` if needed."

Return the PR URL when done.
