# Design Language

Reference for visual decisions in Scolar. Read this before introducing new colors, surfaces, or typography. When in doubt, reuse an existing token.

## Tokens

All design tokens live in `src/app/globals.css`. Use Tailwind utilities (`bg-card`, `bg-pill`, `font-serif`, etc.) — never reach for raw oklch values in components.

### Color (light)

| Token | Value | Purpose |
|-------|-------|---------|
| `--background` | `oklch(0.9786 0.0026 107.198)` | Warm off-white page background. |
| `--card` | `oklch(0.9912 0.0017 106)` | Card surface — slightly warm near-white (≈ rgb 252,252,251). One step lighter than `--background` so cards lift off the page. |
| `--sidebar` | `oklch(0.9756 0.0026 107.195)` | Sidebar surface — between background and pill. |
| `--sidebar-accent` | `oklch(0.9491 0.0041 91.616)` | Sidebar hover + active row. |
| `--pill` | `oklch(0.9491 0.0041 91.616)` | All badges, count pills, keyword chips, pending-activity labels. Intentionally the same value as `--sidebar-accent` so pills feel consistent with the nav surface. |
| `--foreground` | `oklch(0.145 0 0)` | Body text. |
| `--muted-foreground` | `oklch(0.556 0 0)` | Subdued labels, captions, timestamps. |

### Color (intentional exceptions)

- **Nav Plus-icon circle** uses inline `oklch(0.918 0.004 106.937)` — one shade darker than `--pill`. This keeps the circle readable when its row is hovered (because hover bg is `--sidebar-accent` = `--pill`). Do not refactor this to `bg-pill`.
- **Danger actions** (e.g. Delete paper button) use two inline reds that are warmer and darker than the shadcn `--destructive` token:
  - Default text: `oklch(0.434 0.140 25deg)` (≈ rgb 142 38 38) — dark crimson, legible on white.
  - Hover bg + border: `oklch(0.576 0.186 25deg)` (≈ rgb 208 59 60) — brighter red fill; pair with `text-white`.
  - Pattern: `text-[oklch(0.434_0.140_25deg)] hover:bg-[oklch(0.576_0.186_25deg)] hover:border-[oklch(0.576_0.186_25deg)] hover:text-white`.

### Radius

Tokens declared in `@theme` as **literal values** (not `var()` refs — Tailwind v4 cannot resolve var refs at build time):

| Token | Value |
|-------|-------|
| `--radius-sm` | `0.15rem` |
| `--radius-md` | `0.25rem` |
| `--radius-lg` | `0.35rem` |
| `--radius-xl` | `0.45rem` |
| `--radius-2xl` | `0.55rem` |
| `--radius-3xl` | `0.65rem` |
| `--radius-4xl` | `0.75rem` |

Default `--radius` is `0.35rem` (= `--radius-lg`). Uniform `0.10rem` step between each size. Scolar is squared off, not pill-shaped.

### Typography

| Family | Token | Use |
|--------|-------|-----|
| IBM Plex Sans | `--font-sans` | Body, UI controls. |
| IBM Plex Mono | `--font-mono` | Counts, timestamps, keyword chips, footers under stat values, uppercase metadata labels. |
| IBM Plex Serif | `--font-serif` | Page headers, greeting (`Good morning, Jason`). |

`--font-heading` aliases `--font-sans` today; the serif is reserved for marquee moments, not every heading.

## Patterns

### Pills and badges
- Use `bg-pill rounded-[3px] px-1.5 py-px font-mono text-xs`.
- Text color is `text-muted-foreground` for inactive/secondary, `text-foreground/80` for emphasis.
- Never use `bg-muted` or `bg-secondary` for a chip-shaped element — those reference different conceptual tokens.

### Filter tabs (e.g. library `All / Shared / Private`)
- Container is `border-b`; row inside is `flex items-end justify-between`.
- Each tab button is `relative pb-2.5` (do **not** add `-mb-px` — it pushes the active underline 1px past the border line).
- Active underline is a child span: `absolute inset-x-0 -bottom-px h-px bg-foreground`.
- Trailing controls (e.g. view toggle) sit in a `pb-2.5` div so their baseline aligns with tab text.

### View toggle (list/grid)
- Client-side state persisted in `localStorage` under `library-view`. **Do not** drive view from URL `searchParams` — it causes a server roundtrip on every toggle (2s on a populated library).

### Empty values
- Numeric stats with no data render as em-dash (`—`).
- Footers under em-dash values use short prose ("Nothing shared yet", "No org joined yet", "Premium feature") — not another em-dash.

### Stats card
- Single `Card` with 4 sections in a flex row, separated by `divide-y` / `divide-x`.
- Layout: section label (`text-xs uppercase`), then large value (`text-2xl font-normal tabular-nums`), then `font-mono text-xs` footer.

### Card surfaces
- All raised surfaces use `<Card>`. Background = `--card`. No drop shadows.
- Divided multi-section cards: use `gap-0 divide-y` (or `divide-x`) and override default `gap-(--card-spacing)`.

## Layout

- Content area capped at `max-w-[1240px]` and centered.
- Top padding `pt-[80px]` on the app layout.
- Home page row gaps: `gap-6` throughout.
- Home row: `ContinueReading` is `flex-[3]`, `PendingActivity` is `flex-[2]`. Child width is controlled by `flex-1 min-w-0` inside, not `w-2/3`-style widths.

## Component rules

- **Never edit files under `src/components/ui/`.** Those are shadcn primitives. Customize via `className`, wrapper components, or `cva` variants in your own files.
- Extend, don't fork. If `Dialog` needs to be wider site-wide, create `WideDialog` that composes `DialogContent` — leave `dialog.tsx` untouched.

## Data fetching

- Batch related Firestore reads with `adminFirestore.getAll(...refs)` — never `Promise.all` a list of individual `.get()` calls. The library page list went from O(N) round trips to one.
- Use `.count().get()` aggregations for stat counters — no document reads needed.

## TODO

- **Dark mode**: tokens are stubbed (`--pill`, `--card`, etc. all have `.dark` overrides) but the palette has not been tuned. Audit contrast and warmth before shipping.
