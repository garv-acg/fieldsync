# FieldSync — CLAUDE.md

FieldSync is a vanilla-React workforce and game scheduling web app for a youth baseball/softball field manager. No build step — files are served directly via `npx serve`.

## Running the app

```bash
npm start        # serves on http://localhost:3000
```

## Architecture

**No build toolchain.** All JS files are loaded via `<script>` tags in `index.html`. React 18 is loaded from CDN (UMD bundle). Every component uses `React.createElement` aliased as `R` — never JSX.

```
js/
  constants.js       — shared constants, utility fns, seed data (LOCS, WORKERS, INIT_DA)
  supabaseClient.js  — initializes global `sb` (Supabase client)
  engines.js         — autoSched() and detConf() — scheduling engine + conflict detection
  components.js      — Login, CrewPanel, RsvpBtns, UmpSlots, and other shared components
  modals.js          — all modal dialogs (add game, edit game, rainout, CSV import, etc.)
  app.js             — App() root: all state, Supabase I/O, sp prop bundle, routing
  admin/             — admin views: today, schedule, staff, umpires, timeoff, reports, etc.
  worker/            — worker views: home, shifts, availability, requests
```

## Key conventions

**`R` = `React.createElement`** — used everywhere, no JSX.

**`sp` prop bundle** — `App()` builds a single `sp` object containing all state and action functions, then spreads it onto every view component. When adding a new action, add it to `sp` in `app.js`.

**`swrite(promise)`** — fire-and-forget Supabase write. Always use this for writes; logs failures to console without blocking the UI.

**`effectiveUser`** — for worker logins, merges the live Supabase `workers` record onto the login snapshot, applying only non-null fields. This lets seed `roles` survive when the DB column doesn't exist yet. Admin logins use `user` directly (role `"overseer"`).

**`hasRole(w, role)`** — checks `w.roles` array (multi-role), falls back to `[w.role]` (single role). Always use this instead of `w.role === "umpire"`.

**`wa(w, date, requests, role)`** — checks worker availability for a date+role. Reads `w.availByRole[role]` first, falls back to `w.avail`. Also blocks dates with approved time-off requests.

**`wkKey(date)`** — returns the Sunday of the week containing `date` (YYYY-MM-DD). Returns `null` on bad/missing input — always null-check the result.

**`dk(date, locId)`** — returns the `da` map key: `"2026-06-19|sc"`.

**`da` map** — day assignments keyed by `dk(date, locId)`. Each value: `{ fieldCrew: [id,...], concessions: [id,...], concessionsHours: {id: hours}, snackShackOpen: bool }`.

## Locations

```js
LOCS = [
  { id: "sc", name: "Spring Creek", fields: [...], hasSnackShack: false },
  { id: "mv", name: "Mission Viejo", fields: [...], hasSnackShack: true },
]
```

**`loc.hasSnackShack`** is the single source of truth for whether concessions exist at a location. Gate ALL concessions UI, scheduling, conflict detection, and worker views on this flag. Spring Creek has no snack shack — never show concessions UI there.

## Roles

Three worker roles: `"umpire"`, `"field"`, `"concessions"`. Workers can hold multiple roles via `w.roles: string[]`. The `roles` column doesn't exist in Supabase yet — `rowToWorker` returns `roles: r.roles || null`, and `effectiveUser` preserves seed roles via non-null merge.

**Badge colors:** umpire → `b-purple`, field → `b-green`, concessions → `b-amber`.

## Supabase tables

| Table | Key columns |
|---|---|
| `workers` | `id, name, email, password, role, avail, avail_by_role, years_exp, phone, pay_rates` |
| `locations` | `id, name, fields` |
| `games` | `id, loc_id, field, division, date, time, home, away, status, ump1, ump2` |
| `day_assignments` | `date, loc_id, field_crew, concessions, concessions_hours, snack_shack_open` |
| `published_weeks` | `week_key` (Sunday of week) |
| `rsvps` | `worker_id, date, loc_id, status` |
| `requests` | `id, type, worker_id, date, date_start, date_end, loc_id, role, label, reason, claimed_by, status` |
| `notifications` | `id, worker_id, msg, time, read, type` |
| `dragger_overrides` | `date, loc_id, worker_id` |

Row → app shape conversion happens in `rowToWorker`, `rowToLoc`, `rowToGame`, `rowToReq`, `rowToNotif` at the top of `app.js`.

## Scheduling engine (`js/engines.js`)

**`autoSched(games, workers, da, requests, locs)`** — assigns umpires and field/concessions crew. Picks by seniority (`yearsExp`) then fewest existing shifts for load balancing. Skips workers with approved time-off or no availability. Skips concessions at locations where `!loc.hasSnackShack` or `da[key].snackShackOpen === false`.

**`detConf(games, workers, da, locs)`** — detects double-bookings. Returns `{ type: "umpire"|"crew", ... }` objects. Only includes concessions in multi-location crew check when `loc.hasSnackShack`.

## Seed data

`constants.js` holds `WORKERS`, `LOCS`, and `INIT_DA` as fallback/demo seeds. The app loads live data from Supabase on startup; seeds are for local-only development when Supabase is unavailable.

Demo credentials:
- **Admin:** `manager@field.com` / `admin`
- **Worker (Jordan, multi-role):** `jordan@crew.com` / `ump`
- **Worker (Alex, field):** `alex@crew.com` / `field`
- **Worker (Casey, concessions):** `casey@crew.com` / `conc`

## CSV game import

Import modal parses CSV with a state-machine quoted-field parser (handles commas in fields). Required column order: `location, field, division, date (YYYY-MM-DD), time, away, home`. Rows with missing or invalid dates are skipped; the success toast reports the skip count.
