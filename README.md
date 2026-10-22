# Shift Ledger

A lightweight, browser-based shift tracker for recording work hours, sales, tips, and notes. The app is built with plain HTML, CSS, and JavaScript and does not require a build step or external dependencies.

## Run locally

Open `index.html` in a modern browser, or serve the project directory with any static web server. Browser storage is scoped to the origin, so use the same browser and URL to see the same saved data.

## Install and offline use

The app is installable and can load its app shell offline after its first successful visit. To use PWA features, serve it from `localhost` during development or deploy it over HTTPS; opening the HTML file directly does not enable service workers. Use your browser's Install app / Add to Home Screen command when available.

The service worker caches the app shell and static assets. When deploying an update, increment `CACHE_NAME` in `sw.js` so installed copies replace their old cached assets.

## Features

- Record, edit, and delete shifts
- Track clock-in/out times, breaks, sales, tips, and notes
- Review all-time, current-week, and current-month totals
- Filter shift history by date range and job; sort by date, sales, or tips
- Export the currently filtered shifts as a CSV file
- Choose among seven visual styles—Minimalist, Material, Neo-brutalist, Cyberpunk/Synthwave, Glassmorphism, Modern Skeuomorphism, and High-Contrast—independently from system, light, or dark mode; set the week start day and currency
- Review appearance and data preferences in responsive settings cards, with a work-setup roadmap for future restaurant, role, and shift-template management
- Import or download a complete JSON data backup

## Project direction

See [ROADMAP.md](./ROADMAP.md) for planned improvements and the longer-term direction for workplaces, roles, and shift templates. Use GitHub Issues to track detailed bug reports and implementation work.

## Tests

Serve the project directory with a static web server, then open `/tests/` in the browser. The browser test page checks shared shift calculations and runs an end-to-end app workflow for validation, saving, editing, filtering, settings, and deleting shifts. It reports the pass/fail summary on the page and in the console. App workflow tests use a hidden iframe and restore the browser's existing shift data and settings afterward.

## Data and privacy

Shift data and preferences are saved in this browser's `localStorage`; they are not uploaded to a server. Clearing browser storage or switching browsers/devices can remove or make the data unavailable, so download a JSON backup before clearing data or moving devices.

CSV exports include the values currently shown by the filters. Keep exported files somewhere private because they can contain work and earnings information.

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
│   ├── assert.js
│   ├── index.html
│   ├── run-tests.js
│   ├── script.test.js
│   └── shift-math.test.js
└── README.md
```
