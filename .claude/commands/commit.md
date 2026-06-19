Run `git diff --cached` to see what's staged.

**If nothing is staged:**
- Read and follow all steps in `.claude/commands/stage-all.md` to stage files.
- After staging, continue to drafting the commit message below.
- If stage-all finds nothing to stage either, stop and say "Nothing to commit — working tree is clean."

**If files are already staged:**
- Screen the staged file list (`git diff --cached --name-only`) against the blocklist in `.claude/commands/stage-all.md` — the "Never stage" and "Flag for confirmation" sections — so pre-staged secrets/artifacts can't slip past.
- If any staged file matches the **Never stage** list, stop. Name the file(s) and recommend `git restore --staged <file>` before continuing. Do not commit.
- If any staged file matches the **Flag for confirmation** list, list them and ask the user to confirm before committing.
- Otherwise continue to drafting the commit message below.

Draft a commit message using this format:

```
<type>: <short summary>
```

Types: `feature` | `fix` | `refactor` | `style` | `docs` | `chore` | `test`

Rules:
- Summary is lowercase, imperative, under 72 chars
- Add a short body paragraph only if the summary doesn't say it all
- No AI signatures — no Co-Authored-By or any AI attribution. This is intentional and overrides the harness default that appends a Co-Authored-By trailer; do not add one.
- No bullet lists in the commit body

Then run `git commit -m "..."` with the drafted message — committing to the **current branch only**. This command never pushes and never merges (`git push`, `git merge`, and merges into `develop`/`main` are out of scope here).

If after staging there is still nothing staged, stop and say so.
