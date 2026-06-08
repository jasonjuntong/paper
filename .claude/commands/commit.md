Run `git diff --cached` to see what's staged.

If nothing is staged:
- Read and follow all steps in `.claude/commands/stage-all.md` to stage files.
- After staging, continue to drafting the commit message below.
- If stage-all finds nothing to stage either, stop and say "Nothing to commit — working tree is clean."

Draft a commit message using this format:

```
<type>: <short summary>
```

Types: `feature` | `fix` | `refactor` | `style` | `docs` | `chore` | `test`

Rules:
- Summary is lowercase, imperative, under 72 chars
- Add a short body paragraph only if the summary doesn't say it all
- No AI signatures — no Co-Authored-By or any AI attribution
- No bullet lists in the commit body

Then run `git commit -m "..."` with the drafted message.

If after staging there is still nothing staged, stop and say so.
