Read our current conversation context and write a concise session summary.

Save it to `.claude/session/summaries/` using the current date and time as the filename (format: YYYY-MM-DD_HH-MM.md). Create the directory if it doesn't exist.

Include these sections:
- ## Goal
- ## What Was Done
- ## Key Decisions
- ## Files Changed
- ## Next Steps

Be brief and technical.

If the directory can't be created or written to, say: "Cannot write to `.claude/session/summaries/` — the path may have changed. Update `save-session-summary.md` with the correct path."