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
- Set up workplaces and the roles you work at each one. The first launch offers a skippable setup dialog, and Settings uses the same form to add workplaces and roles. Choose a pay-period frequency and start weekday during creation (every-two-weeks periods also keep a reference date to align the cycle), and optionally record workplace start and end dates. Dates are descriptive only and don't restrict shifts or filter history. These details can be changed later in Settings. First-run setup links existing shifts to roles by job name and keeps a copy of your original shifts. In Settings you can rename, archive, and unarchive workplaces and roles, set a role template, and delete ones no shift uses. Archived items disappear from future choices, but past shifts keep their job name
- Previous Shifts can be filtered by workplace and job; cards show the role and workplace, and the CSV export has a Workplace column.
- In the shift form, select a workplace and role (when workplaces exist). Choosing a role can prefill empty fields from its template without overwriting values you've already entered. A role marked as not tracking reports hides the sales and tip-report fields and saves the shift as "No report"
- Add a workplace or role directly from the shift form; creation returns to the unfinished shift with the new item selected and preserves the values you've already entered
- Import or download a complete JSON data backup, including your workplaces and roles (older backups still restore and leave your workplaces alone)

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
