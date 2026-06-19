Evaluate whether the current staged and unpushed changes are safe to push to remote. This command is **read-only** — it never stages, commits, pushes, or merges; it only inspects and reports.

**Determine the comparison base (`BASE`):**
- If a base branch is passed as an argument (the pull-request flow calls this with `develop`), run `git fetch origin <base>` and use `origin/<base>`.
- Otherwise use the current branch's upstream, `@{u}`.
- If neither resolves (no upstream and no argument), compare against `origin/develop` — the project's integration base. Never fall back to `main` or any other branch. Note in the report that the branch has no upstream.

Run these in order:
1. `git diff --cached` — staged but uncommitted changes
2. `git log BASE..HEAD --oneline` — commits not yet on the base
3. `git diff BASE..HEAD` — full diff of everything not yet on the base

If any of these commands error (e.g. `BASE` can't be resolved), stop and report it — do not fall through to a ✅ verdict on an empty or failed diff.

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
