<div align="center">
  <img src="icons/icon-192.png" width="80" alt="FieldSync" />
  <h1>FieldSync</h1>
  <p><strong>Production scheduling platform for Cherry Creek Little League</strong></p>
  <p>
    <a href="https://fieldsyncschedule.netlify.app">
      <img src="https://img.shields.io/badge/Live%20Demo-fieldsyncschedule.netlify.app-brightgreen?style=flat-square" />
    </a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Workers-30%2B-blue?style=flat-square" />
    <img src="https://img.shields.io/badge/Locations-2-blue?style=flat-square" />
    <img src="https://img.shields.io/badge/Built%20with-Claude%20Code-blueviolet?style=flat-square" />
    <img src="https://img.shields.io/badge/Stack-Vanilla%20React%20%7C%20Supabase%20%7C%20Netlify-orange?style=flat-square" />
  </p>
</div>

---

FieldSync is a mobile-first workforce scheduling platform I built and deployed for Cherry Creek Little League, replacing a manual workflow of spreadsheets and group texts across **30+ workers, 3 roles, and 2 field locations**. It runs every game day of the season.

Built end-to-end using **Claude Code** — from schema design and scheduling engine to UI, push notification pipeline, and payroll reports.

---

## What It Does

**For admins**
- **Auto-scheduler** — assigns umpires, field crew, and concessions staff in seconds based on seniority, availability, and load balancing. Detects and flags double-bookings in real time.
- **Schedule management** — import a full season via CSV, publish weeks to workers, lock finalized weeks, manage rainouts.
- **Payroll reports** — one-click PDF showing hours, shifts, and gross pay per worker, per role. Exported directly from the browser.
- **Request queue** — approve/deny time-off requests and shift claims in one place. Approved time-off automatically blocks scheduling.
- **Today dashboard** — real-time view of today's games, crew status, conflicts, and quick actions.

**For workers**
- **Mobile-first home screen** — see your next shift, weekly schedule, and RSVP status at a glance.
- **Push notifications** — lock-screen alerts when the schedule is published, reminders before game days, and alerts when a shift is available to claim.
- **Shift offers** — offer up a shift you can't make; eligible teammates get a push notification to claim it.
- **Availability by role** — umpires, field crew, and concessions workers set independent availability schedules.
- **Calendar export** — download a personal ICS file that syncs to Apple Calendar or Google Calendar.
- **PWA** — installable on iOS and Android from the browser. No App Store required.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla React 18 (CDN UMD), no build step — `React.createElement` throughout |
| Database | Supabase (Postgres + Realtime) |
| Auth | Custom email/password against Supabase `workers` table |
| Hosting | Netlify (static site + serverless functions) |
| Push | Web Push API + VAPID keys via `web-push` npm package in a Netlify function |
| PWA | Service worker + `manifest.json` |
| Calendar | ICS generation → Supabase Storage → stable public URL |
| Dev | Built entirely with Claude Code in VS Code |

**No bundler. No build step.** All JS files are loaded via `<script>` tags in `index.html` and served directly — by Netlify in production, or `npx serve` locally.

---

## Architecture

```
js/
  constants.js       — shared constants, utility functions, seed data
  supabaseClient.js  — initializes global Supabase client
  engines.js         — autoSched() and detConf() — scheduling engine + conflict detection
  components.js      — shared UI components (CrewPanel, RsvpBtns, UmpSlots, etc.)
  modals.js          — all modal dialogs
  app.js             — App() root: all state, Supabase I/O, routing
  admin/             — admin views: today, schedule, staff, umpires, requests, reports...
  worker/            — worker views: home, shifts, availability, requests

netlify/
  functions/
    send-push.js     — serverless function: receives worker IDs, fetches subscriptions,
                       delivers push via web-push + VAPID
```

**Key patterns:**
- `sp` prop bundle — `App()` builds a single object with all state and actions, spread onto every view
- `swrite(promise)` — fire-and-forget Supabase write; logs failures without blocking the UI
- `autoSched()` — picks workers by seniority then fewest existing shifts; skips time-off dates and unavailable roles
- `detConf()` — scans all game/crew assignments for double-bookings across locations and roles

---

## Running Locally

```bash
# 1. Clone the repo
git clone https://github.com/garv-acg/fieldsync.git
cd fieldsync

# 2. Add a .env file (not committed) with your Supabase credentials
# See netlify.toml for required env vars

# 3. Apply the database schema
# Run supabase_migration.sql in your Supabase SQL editor

# 4. Serve
npm start   # → http://localhost:3000
```

**[→ Try the live demo](https://fieldsyncschedule.netlify.app)**

Demo credentials:
| Role | Email | Password |
|---|---|---|
| Admin | `manager@field.com` | `admin` |
| Worker (multi-role) | `jordan@crew.com` | `ump` |
| Worker (field) | `alex@crew.com` | `field` |

---

## Highlights

- **Scheduling engine** handles 3 worker roles across 2 locations simultaneously, respecting per-role availability, approved time-off, and snack shack status (only scheduled at locations that have one)
- **Conflict detection** runs on every state change — flags the exact game, worker, and conflict type in real time
- **Push pipeline** goes browser → Netlify function → web-push → APNs/FCM → worker's lock screen, with per-worker subscription management in Supabase
- **Payroll PDF** filters zero-shift workers, groups by role, and forces print-accurate dark styling using inline CSS with `-webkit-print-color-adjust`
- **CSV import** uses a state-machine quoted-field parser to handle commas inside fields; normalizes M/D/YY and YYYY-MM-DD date formats

---

<div align="center">
  <sub>Built with Claude Code · Cherry Creek Little League · Aurora, CO</sub>
</div>
