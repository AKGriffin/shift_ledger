# Shift Ledger

A lightweight, browser-based shift tracker for recording work hours, sales, tips, and notes. The app is built with plain HTML, CSS, and JavaScript and does not require a build step or external dependencies.

## Run locally

Open `index.html` in a modern browser, or serve the project directory with any static web server. Browser storage is scoped to the origin, so use the same browser and URL to see the same saved data.

## Features

- Record, edit, and delete shifts
- Track clock-in/out times, breaks, sales, tips, and notes
- Review all-time, current-week, and current-month totals
- Filter shift history by date range and job; sort by date, sales, or tips
- Export the currently filtered shifts as a CSV file

## Tests

Serve the project directory with a static web server, then open `/tests/` in the browser. The browser test page runs the shared shift calculation functions against the assertion helpers in `assert.js`; it reports the pass/fail summary on the page and in the console.

## Data and privacy

Shift data is saved in the browser's `localStorage` under the `shift-ledger-shifts-v1` key. It is not uploaded to a server. Clearing browser storage or switching browsers/devices can remove or make the data unavailable, so export a CSV backup when needed.

CSV exports include the values currently shown by the filters. Keep exported files somewhere private because they can contain work and earnings information.

## Project layout

```text
.
├── index.html
├── assert.js
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── script.js
│       └── shift-math.js
├── tests/
│   ├── index.html
│   └── shift-math.test.js
└── README.md
```
