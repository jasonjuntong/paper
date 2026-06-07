Run `git status --short` to list all changed and untracked files.

Before staging anything, scan every filename and extension against this blocklist:

**Never stage — skip silently and warn:**
- `.env`, `.env.*`, `.env.local`, `.env.production`, `.env.staging` — environment secrets
- `*.pem`, `*.key`, `*.cert`, `*.p12`, `*.pfx`, `*.secret` — certificates and keys
- `*.log` — log files
- `.DS_Store`, `Thumbs.db` — OS metadata
- `*.tsbuildinfo`, `next-env.d.ts` — generated files
- `*.sqlite`, `*.db` — local databases
- Files inside `node_modules/`, `.next/`, `dist/`, `build/`, `coverage/` — build or dependency artifacts

**Flag for confirmation before staging:**
- Any file named with `secret`, `credential`, `password`, `token`, or `private` in the filename (case-insensitive)
- `*.json` files in the project root that aren't `package.json`, `tsconfig*.json`, or `components.json`

---

After the scan:

1. If blocked files are found — list them, skip them, and proceed to stage the rest.
2. If flagged files are found — list them and ask: "These files look unusual — stage them anyway?"
3. Stage all remaining clean files with `git add <file1> <file2> ...` (explicit paths, never `git add .` or `git add -A`).
4. Run `git status --short` after staging and show what's now staged.
