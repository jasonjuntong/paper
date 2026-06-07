Evaluate whether the current staged and unpushed changes are safe to push to remote.

Run these in order:
1. `git diff --cached` — staged but uncommitted changes
2. `git log origin/HEAD..HEAD --oneline` — committed but unpushed commits
3. `git diff origin/HEAD..HEAD` — full diff of everything not yet on remote

Then scan for the following red flags and report findings under each:

**Debug leftovers**
- `console.log`, `console.warn`, `console.error` that aren't intentional error handlers
- `debugger` statements
- Temporary `alert()` or `console.table()`

**Incomplete work**
- `TODO`, `FIXME`, `HACK`, `XXX` comments
- Placeholder text like "lorem ipsum", "test", "asdf", or dummy values in non-test files
- Commented-out code blocks

**Secrets / sensitive data**
- Hardcoded API keys, tokens, passwords, or secrets
- `.env` values inlined into source files

**Code quality**
- `any` type used in TypeScript without justification
- Unused imports or variables that would cause lint errors
- `@ts-ignore` or `@ts-expect-error` without a comment explaining why

**Structural issues**
- Files that shouldn't be committed (`.env`, build artifacts, `node_modules`)
- Merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)

---

After the scan, give a clear verdict:

✅ **Ready to push** — no blocking issues found  
⚠️ **Push with caution** — minor issues noted, list them  
🚫 **Do not push** — blocking issues found, list them with file:line references

Be direct. If it's clean, say so in one line. If there are issues, list exactly what needs fixing before pushing.
