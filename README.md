# Shift Ledger

A lightweight, browser-based shift tracker for recording work hours, sales, tips, and notes. The app is built with plain HTML, CSS, and JavaScript and does not require a build step or external dependencies.

## Run locally

Open `index.html` in a modern browser, or serve the project directory with any static web server. Browser storage is scoped to the origin, so use the same browser and URL to see the same saved data.

## Install and offline use

The app is installable and can load its app shell offline after its first successful visit. To use PWA features, serve it from `localhost` during development or deploy it over HTTPS; opening the HTML file directly does not enable service workers. Use your browser's Install app / Add to Home Screen command when available.

The service worker caches the app shell and static assets. When deploying an update, increment `CACHE_NAME` in `sw.js` so installed copies replace their old cached assets. The app checks for updates when it returns online or to the foreground and offers a manual reload when one is ready. Unsaved shift-form changes trigger a confirmation before reloading or leaving the page.

## Features

- Record, edit, and delete shifts
- Track clock-in/out times, breaks, sales, tips, and multiple shift notes
- Record auto-gratuity separately from other tips; it is included in net tip totals and preserved in backups and CSV exports.
- For doubles, save lunch and dinner reports independently, a whole-double report, any combination, or no report. Totals avoid double-counting and history labels partial or combined figures; older doubles remain treated as combined reports.
- For single shifts, check "No sales or tip report" when you don't have the numbers. History, recent activity, and CSV then show "No report" instead of $0.00, and totals simply leave the shift out of sales and tips. Hours still count.
- Log overnight shifts by recording the date the shift starts; an earlier clock-out (or break end) is treated as the next day. The full shift is grouped under its start date in summaries and history filters.
- Review all-time, current-week, and current-month totals
- Use consistent headings and responsive spacing across the dashboard, shift entry, history, and settings views
- Switch between the main views with a thumb-friendly bottom navigation on mobile
- Filter shift history by date range and job; sort by date, sales, or tips
- Keep sorting in reach and manage date/job filters in an accessible dialog; active filters appear as removable chips under the controls
- Navigate with the keyboard and screen readers: a skip link, focus moves to the page heading and the tab title updates when you switch pages, and animations are reduced when your system asks for it
- Export all saved shifts as a CSV file
- Choose among seven visual styles—Minimalist, Material, Neo-brutalist, Cyberpunk/Synthwave, Glassmorphism, Modern Skeuomorphism, and High-Contrast—independently from system, light, or dark mode; set the week start day, currency, and whether zero-value shift details are shown
- Review appearance, format, dashboard, and data preferences in focused settings cards with short hints for each option
- Set up workplaces and the roles you work at each one. The first launch offers a skippable setup dialog, and Settings uses the same form to add workplaces and roles. Choose a pay-period frequency and start weekday during creation (every-two-weeks periods also keep a reference date to align the cycle), and optionally record workplace start and end dates. Dates are descriptive only and don't restrict shifts or filter history. These details can be changed later in Settings. First-run setup links existing shifts to roles by job name and keeps a copy of your original shifts. In Settings you can rename, archive, and unarchive workplaces and roles, set meal-period defaults, turn default clock-in/out times and breaks on or off, add optional hourly wages, and set independent capabilities for sales reports, tips received, tips paid out, and tip-outs received. Delete roles and workplaces no shift uses. Archived items disappear from future choices, but past shifts keep their job name
- The Shifts page lists saved shifts (filter by workplace and job; cards show the role and workplace; the CSV export has a Workplace column) and has a New shift button. Entering a shift opens a full-page form without the app navigation, and a Paystubs tab is a placeholder for a future feature.
- New shifts start by asking for guided or manual entry each time, with a Close option before entry begins. Guided entry asks conversational questions in grouped steps, with each prompt in its active card and the step count outside it. It automatically advances after valid required answers and clear Yes/No choices; when Next is disabled, an inline hint explains what is needed to continue. The sales and tips steps each ask whether you have the report; Yes swaps the question for a card of amount fields and focuses the first one (Back returns to the question), while No leaves that report out of totals. Tips and tip-out are grouped in the tips-report step; a missing tips report hides both sets of fields. Report Yes/No choices remain available in the final review as labeled fieldsets so answers can be changed alongside the break choice. On phones, the heading remains at the top while the step count and navigation stay near the bottom; answer cards stay in the normal page flow and entry sizing follows the dynamic viewport. Minimalist themes shade input fields and entry-mode choices to make them easier to distinguish. Guided and manual entry each offer a confirming Cancel that discards the draft and returns to the mode chooser. The full editable review follows guided entry, and saved shifts always use the manual layout. In both modes the form builds in order: date, required workplace, then the remaining fields after a role is chosen (when that workplace has active roles). The role selector appears only after choosing a workplace that has active roles. The last-used workplace is preselected and a single active role is selected automatically. Choosing a role can prefill empty fields from its template without overwriting values you've already entered. Role capabilities hide unused sales and tip inputs; new hidden fields save empty, while editing preserves historical amounts and report coverage
- Add a workplace or role directly from the shift form; creation returns to the unfinished shift with the new item selected and preserves the values you've already entered
- Import or download a complete JSON data backup, including your workplaces, roles, and optional hourly wages (older backups still restore and leave your workplaces alone)

## Project direction

See [ROADMAP.md](./ROADMAP.md) for planned improvements and the longer-term direction for workplaces, roles, and shift templates. Use GitHub Issues to track detailed bug reports and implementation work.

## Tests

Serve the project directory with a static web server, then open `/tests/` in the browser. The browser test page checks shared shift calculations and runs focused app workflows for validation, saving, editing, doubles reporting, filtering, settings, and deleting shifts. It reports the pass/fail summary on the page and in the console. App workflow tests use a hidden iframe and restore the browser's existing shift data and settings afterward.

## Data and privacy

Shift data and preferences are saved in this browser's `localStorage`; they are not uploaded to a server. Stored and imported shifts are validated the same way. If saved data can't be read, the app keeps a copy under `shift-ledger-shifts-v1-recovery` and shows a notice instead of silently overwriting it. Clearing browser storage or switching browsers/devices can remove or make the data unavailable, so download a JSON backup before clearing data or moving devices. browser storage or switching browsers/devices can remove or make the data unavailable, so download a JSON backup before clearing data or moving devices.

CSV exports include all saved shifts. Keep exported files somewhere private because they can contain work and earnings information.

## Project layout

```text
.
├── index.html
├── manifest.webmanifest
├── ROADMAP.md
├── sw.js
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── icons/
│   │   ├── icon.svg
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── js/
│       ├── script.js
│       ├── shift-math.js
│       └── workplaces.js
├── tests/
│   ├── app-harness.js
│   ├── assert.js
│   ├── double-shifts.test.js
│   ├── history.test.js
│   ├── index.html
│   ├── layout.test.js
│   ├── run-tests.js
│   ├── settings.test.js
│   ├── shift-form.test.js
│   ├── shift-math.test.js
│   └── workplaces.test.js
└── README.md
```
