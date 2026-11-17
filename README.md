# POps – Patte Operations Platform

The approved POps demo screens (all modules, installable Ranger PWA, paper-style forms and documents, vessel log, real maps) running on a real backend. No demo or sample content: every list starts empty and is filled by real users.

## Run locally
    export POPS_ADMIN_EMAIL=you@patteconservation.com POPS_ADMIN_PASSWORD='choose-a-long-one'
    bash web/build.sh            # builds web/dist (bash + node only)
    node --no-warnings server/index.js   # http://localhost:8080  (Node 22+)

First login creates the admin from those variables. Admin then creates users (name, email, role, county, sub-county, temporary password; they must change it at first login) and projects.

## Deploy on the VPS (Docker + Caddy)
1. Point `portal.patteconservation.com` to the VPS. The API shares this domain (`/api`).
2. Edit `Caddyfile` if the domain differs; copy `.env.example` to `.env` and set the admin email/password.
3. `docker compose up -d --build`. Data lives in the `pops-data` volume (SQLite). Back it up regularly.
The public site patteconservation.com is separate and stays where it is.

## Roles
Super Admin, Board Chairperson, Marine Ranger, Coxswain, Conservation Officer, Fisheries Officer, BMU Representative, Tourism and Finance Officer (one role; entry type tourist or finance chosen per entry).

## Key behaviour
- Rangers: phone-style PWA, GPS patrol with continuous saving, drafts, observations and incidents with time and several persons, fisher checks with many fishers.
- Daily LMMA compliance: a day counts as visited if a submitted patrol is in the LMMA (flag, area name or GPS track). Settings: start date, cutoff, daily on/off. Computed in the browser.
- Boats: per-boat setting for hour meters; Engine 1/2 hours required at arrival only where meters work; service alerts.
- Maps: BMU certificate point (-2.142838333, 40.99678167); zones are stored in the database. Import the client's Figure 1 / KML (Iweni LMMA > Zones). Until then the drawn shapes are placeholders and their areas will not match the stated 2.25 / 1.2 / 1.05 km².
- Import paper logs (admin): type or paste the Daily Patrol Log and Entry Log, check, import. Rows are marked Imported.

## Tests
    node --no-warnings test/api.test.js && node --no-warnings test/modules.js && node --no-warnings test/e2e.js
(e2e needs Playwright with Chromium.)

## Still to confirm with the client
Figure 1 / KML of the zones, the remaining log pages, the default ranger, and the infringement codes with Fisheries.

## Uploaded files and scans
- Photos and scanned log pages are saved on the server in `/data/files` (next to the database), and records keep only a short signed address (`/api/files/<id>?k=...`). Photos captured in a patrol or incident are moved there automatically on sync.
- **Back up `/data` as a whole** (database and `files`). The Docker volume already covers both.
- Only images and PDFs are accepted.

## Patrol progress alerts
- Admin > Field rules has three thresholds: silent too long, paused too long, patrol too long. Office users (admin, fisheries) see alerts in the bell, dashboard and Patrols page; the ranger sees a banner in the app.
- A ranger with an open patrol is returned to it on opening the app, and cannot start a second one.
# pops-app
