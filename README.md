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
- Maps: zones follow the client's Figure 1 and are stored in the database. Seagrass habitat (gear restricted zone) is the north strip made of points 11, 12, 1, 10, 9, 8, 7. Reef habitat (no-take zone) is the south area made of points 7, 8, 9, 10, 1, 2, 3, 4, 5, 6. The LMMA outline is 11, 12, 1, 2, 3, 4, 5, 6, 7. Joining the points 1 to 12 in table order (the earlier build) left a wedge that belongs to no zone. Mapped areas are about 1.40 / 1.20 / 2.59 km2 against the stated 1.2 / 1.05 / 2.25, so the stated figures need confirming with Patte. Tap a zone, point, village, track, marker or any empty spot to get a details card (on wide screens it also fills the side panel). Villages are set in Iweni LMMA > Coordinates (only Pate is seeded; add Shanga Rubu and Shanga Ishakani with their coordinates). Import a surveyed KML/GeoJSON on the Zones tab to replace the shapes.
- Import paper logs (admin): load a CSV file, paste from Excel or type the Daily Patrol Log and Entry Log, check, import. Rows are marked Imported and grouped in a batch that can be removed. Sample files from the May-June 2025 pages are in docs/import-samples/.

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

## Importing paper logs with images
- Step 3 (Check) has an "Images for this row" column: add a photo or scan to one specific patrol or incident, or pick a page already uploaded in the batch.
- The "Scanned pages of the whole batch" card attaches its files to every imported row. Use it only for a sheet that covers all rows.
- Images can still be added or removed later on each record.
- Import has two ways to enter rows: **Type in a table** (one box per paper column, blanks allowed, so nothing shifts) and **Paste from Excel**. After pasting, "Move into the table to fix blanks" puts the rows in the table so you can correct them.

## Importing two years of paper logs
- Type the sheets into Excel or Google Sheets (one file per sheet, first row = the column names), save as CSV, and use "Load a CSV or text file". Columns are matched by their headings in any order, and the sheet is detected. "Download a blank template" gives the right headings.
- Entry Log: leave the date empty for a second vessel on the same day and it takes the date above. Entries are linked to the patrol of the same day when one exists, so import the Daily Patrol Log first.
- Overnight patrols (Time In earlier than Time Out) get their length worked out; very short or very long ones are flagged.
- Scanned pages: add each page and set the dates it covers (a date in the file name fills them in). It is attached to every row in that range. Rows without an image are fine.
- Each import is a batch (Imported batches card). An admin can remove a batch and import it again.
- "Outside LMMA" patrols no longer count as daily LMMA visits.
- Tests: `node --no-warnings test/map.js && node --no-warnings test/import-files.js`.

## Update 3 (Nov 2026)

- **SOS**: red SOS button on every ranger screen. It sends name, phone, patrol and GPS position (queued offline, plus an SMS fallback to the number set in Settings). The Super Admin, Board and officers get a red bar, beep and a Call / Show on map / "I have seen it" / Resolved action. Alerts are polled every 8 s.
- **Where am I**: Start patrol shows inside/outside the Iweni LMMA from GPS. The inside-LMMA count uses recorded coordinates (live position, then track); the typed area name is only used for records with no coordinates (paper imports). Crossing the edge is written to the patrol timeline.
- **Joint or single patrols** (Admin chooses): joint alerts after 30 min of silence, single after 2 h (up to 3 h). Per patrol and in Settings. Joint patrols pick other BMUs.
- **Boats**: "Work done and fuel" card is computed from patrols and the vessel log (hours, km, fuel, L/h, idle days, heavy use, projected service date). Calendar service only counts once the engine has run since the last service.
- **Tourism & Finance** is one module. Reconciling a visitor payment sends a finance entry to the Board Chairperson. Prices can be per person, per group or per boat (speedboat, dhow, power boat start at 0 until the admin sets them in Prices). Guest reports show guests, nationality, activity and boats.
- **BMUs & Governance**: profiles lose community, next meeting and patrols; several representatives; Structure and Management added; BMU certificate moved here from Iweni LMMA. Other BMUs (Lamu, Shela, Mokowe, Mtangawanda, Faza, Tchundwa, Kizingitini, Ndau, Mbwajumwali) can be edited, given map positions, or added.
- **Users** have phone (required), job title and emergency contact; the BMU representative role is no longer offered.
- **Notifications** panel is fixed and never clipped; every item opens what it is about. Dashboard cards and the "Live now" list open patrols.
- **Map**: rotation (buttons, Q/E, two-finger twist), compass (tap = north up, double-tap = follow phone), full screen, layers for staff, SOS and other BMUs. The south edge (point 11 to 12) can be traced along the shore in Iweni LMMA > Zones.
- **Guide** module with SOS, patrol, import and map instructions and downloadable CSV templates.
- Tests: `node --no-warnings test/turn3.js` added.

## Update 4 (Nov 2026)
- **Patrol creation**: single and joint patrols take any number of BMUs plus a typed "other BMU". Joint patrols list agencies (KWS, KFS, Fisheries, Police, Coast Guard, KMA and others) plus typed agencies. The ranger confirms or edits BMUs, agency counts and the leader before starting.
- **Other leader**: choose "Other" and type a name, phone and position. These fill Form 1A and the report and are written to the audit log. No account or role is created; the patrol runs on a chosen ranger's phone.
- **GPS accuracy**: fixes coarser than 50 m are ignored, drift while standing still is ignored, impossible jumps are ignored, and no line or distance is counted across a pause, a signal gap or an app reopen (shown as a dotted amber line). Inside/outside changes need two consecutive fixes.
- **Maps**: whole-earth button (and back), live list of patrols, staff and SOS with Lock on / Follow, share-location panel fixed for small screens.
- **Offline**: the outbox no longer loses records (one send at a time, IndexedDB fallback when storage is full, refused records are listed under "not accepted. Review" instead of blocking everything). The app opens with no signal from the last saved copy plus unsent records. Field staff sessions last 72 h.
- **Tourism and Finance**: typed vessel name and registration, From and To BMU (with "other"), BMU area with "other", receipt photo or PDF on visitor and finance entries, new "Boat movements between BMUs" report.
- **Documents**: logo sits clear of the header rule, tables page (10/25/50/100) with search, imported patrols fill Form 1A and the report from the matching entry-log rows and paper-log notes.
- Tests: `node --no-warnings test/turn4.js`.
