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
- Log overnight shifts by recording the date the shift starts; an earlier clock-out (or break end) is treated as the next day. The full shift is grouped under its start date in summaries and history filters.
- Review all-time, current-week, and current-month totals
- Use consistent headings and responsive spacing across the dashboard, shift entry, history, and settings views
- Switch between the main views with a thumb-friendly bottom navigation on mobile
- Filter shift history by date range and job; sort by date, sales, or tips
- Keep sorting in reach and manage date/job filters in an accessible dialog
- Export all saved shifts as a CSV file
- Choose among seven visual styles—Minimalist, Material, Neo-brutalist, Cyberpunk/Synthwave, Glassmorphism, Modern Skeuomorphism, and High-Contrast—independently from system, light, or dark mode; set the week start day, currency, and whether zero-value shift details are shown
- Review appearance and data preferences in responsive settings cards, with a work-setup roadmap for future restaurant, role, and shift-template management
- Import or download a complete JSON data backup

## Project direction

See [ROADMAP.md](./ROADMAP.md) for planned improvements and the longer-term direction for workplaces, roles, and shift templates. Use GitHub Issues to track detailed bug reports and implementation work.

## Tests

Serve the project directory with a static web server, then open `/tests/` in the browser. The browser test page checks shared shift calculations and runs focused app workflows for validation, saving, editing, doubles reporting, filtering, settings, and deleting shifts. It reports the pass/fail summary on the page and in the console. App workflow tests use a hidden iframe and restore the browser's existing shift data and settings afterward.

## Data and privacy

Shift data and preferences are saved in this browser's `localStorage`; they are not uploaded to a server. Clearing browser storage or switching browsers/devices can remove or make the data unavailable, so download a JSON backup before clearing data or moving devices.

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
│       └── shift-math.js
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
│   └── shift-math.test.js
└── README.md
```
