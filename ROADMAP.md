# Shift Ledger Roadmap

This roadmap describes the direction of Shift Ledger, not a release schedule. Priorities may change as user needs become clearer. Use GitHub Issues for detailed bugs and implementation tasks; keep this file focused on product direction.

## How this board works

This file is a kanban board. Each section is a column, and an item moves by being cut and pasted into another column. No checkboxes: where an item sits is its status.

| Column | Meaning |
| --- | --- |
| **In progress** | Being built now. Keep it to 1-3 items. |
| **Ready** | Designed enough to start. Listed in build order; the top item is next. |
| **Backlog** | Wanted, but needs design or depends on Ready items. |
| **Ideas** | Long-term or uncertain; evaluate before committing. |
| **Done** | Shipped. Newest first. |

Each card reads `**Title** · tags` followed by a short description. Tags: `bug`, `pwa`, `shift-form`, `reports`, `workplaces`, `settings`, `dashboard`, `history`, `a11y`, `design`, `data`, `tests`. `needs: X` marks a dependency, and `?` marks an open question.

---

## In progress

_Nothing is in progress. Move the top Ready item here when work starts._

---

## Ready

Listed in build order.

_Nothing is ready. Move the next Backlog item here once it is designed enough to start._

---

## Backlog

### Shift form

- Save partially filled shifts: only the date is required. Show an "Incomplete" badge on the shift card (history and detail) plus an Incomplete filter in Sort & filter. Review lists what is missing, for example "Missing: clock out, meal period". Hours are left out of totals and shown as a dash when a clock time is missing, sorting puts blanks last, and a missing workplace shows as "No workplace" in filters. Keep validating real values (identical clock times, a break outside the shift, a break with only one end).
- Shift draft: keep an unfinished new shift so it can be resumed later (deferred).
- Replace `window.confirm` in the cancel and discard prompts with a styled dialog.

### Workplaces and settings

- **Redesign the Settings workplace section** · `settings` `workplaces` `design`
  A list of workplaces, each with a short summary (active roles, hiding archived; pay period; dates) and an Edit button that opens a dialog with the workplace form and its roles. Larger touch targets; verify on phones. `?` Edit roles inside the workplace dialog or open a separate role dialog. Prefer one dialog with an inline role section; prototype both first.
- **Add an option to show or hide icons** · `settings` `design`
  Settings toggle, on by default. `needs:` icons beside labels.
- **Add an option to show or hide descriptive text** · `settings` `a11y`
  Shown by default. When hidden, move it behind an accessible "i" control that works by tap and keyboard, not hover. Applies app-wide.
- **Add configurable time display preferences** · `settings` `data`
  12-hour and 24-hour clocks, keeping stored times and historical records safe.
- **Improve mobile text size and readability** · `settings` `a11y`
  Try modest default increases first, then configurable Default, Large, and Larger sizes that respect browser font settings. Verify key phone views and dialogs at each size.
- **Improve transient notification feedback** · `design` `settings`
  Dismissible notices with a visible countdown, sensible timeout, reduced-motion support, and Settings controls to adjust or disable them.

### History and reports

- **Filter history by sales and tips ranges** · `history`
  Minimum and maximum filters with removable chips like the existing ones. Shifts with no report must not match a sales range. Account for the separate sales and tip coverage once split.
- **Use icons beside labels** · `design` `a11y`
  Consistent decorative icons in forms, dashboard, and history; text labels stay the accessible name.
- **Extend zero-value hiding to totals** · `dashboard` `settings`
  Same show/hide choice for zero total hours, sales, and tips in the dashboard and summaries, keeping "No report" distinct from a received zero report.
- **Add swipe navigation to shift details** · `history` `design`
  Swipe between shifts on touch devices without conflicting with scrolling; buttons and arrow keys stay.
- **Show neighbouring dates on Previous/Next** · `history` `design`
  Label the buttons with the adjacent shift's date so the destination is clear.
- **Show the active sort in the toolbar** · `history`
  Make the current sort visible without opening Sort & filter.
- **Improve reporting** · `reports`
  Useful date-range summaries that read well on small screens.

### Dashboard

Plan these together; they share dashboard code. Start with the stat layout.

- **Rework dashboard stat layout** · `dashboard` `design`
  Values and labels leave too much white space and stretch wide. Avoid full-width rows and rigid 2x2 grids; consider compact flowing tiles and moving shift count into the period line.
- **Expand dashboard customization** · `dashboard`
  Section ordering, workplace and role filters (including a dashboard workplace scope), density options, and optional tips per hour, average sales per shift, and tip percentage.
- **Add flexible dashboard period summaries** · `dashboard`
  Week, month, pay-period, year, all-time, and custom-range cards; migrate current week and month cards as defaults.
- **Design an accessible dashboard edit mode** · `dashboard` `a11y`
  Add, remove, and reorder preset cards with keyboard and touch support; explore guided custom cards after presets.
- **Expand dashboard insights** · `dashboard`
  Trends and visualizations where they clarify hours, sales, tips, or comparisons.

### Quality

- **Unify palettes and improve Material Dark** · `design` `a11y`
  Curated palettes per visual style, consistent semantic colors, and a dark palette that feels cohesive with the paper-inspired light theme. Verify contrast in light and dark modes.
- **Strengthen and clarify the test suite** · `tests`
  Better assertion readability, focused behavior coverage, and failure output without new dependencies. Document a command-line way to run the suite; contributors currently need a browser.
- **Unify dialog styling and scroll lock** · `design` `a11y`
  Share one dialog pattern (backdrop, scroll lock, sizing, animation) across the app and check it in all seven visual styles.
- **Guard against encoding and stale-cache regressions** · `tests` `pwa`
  Add a check for mangled icon characters and a way to run the suite without the service worker serving stale files.
- **Make the PWA update test pass on a plain static server** · `tests` `pwa`
  "Explains manual update checks when no app worker is registered" fails when the suite is served without a worker.
- **Run a manual accessibility review** · `a11y`
  Screen readers (VoiceOver, TalkBack, NVDA), keyboard-only use, zoom and reflow, and every theme in light and dark modes.

### Onboarding and money

- **Add an optional onboarding wizard** · `design`
  Builds on first-run workplace setup to cover appearance, formats, workplaces, and a first shift. Every step skippable.
- **Add paystub tracking** · `data`
  Paystub dates, pay-period details, gross/net pay, deductions, and notes; related to shifts or workplaces without an account.
- **Add thoughtful feedback and bug reporting** · `design`
  Report problems or request features without sharing shift or personal data unless the user chooses to.

---

## Ideas

- **Evaluate IndexedDB for local storage** · `data`
  Measure data needs after workplaces and paystubs exist. If justified, define schema versioning, localStorage migration, backup compatibility, failure handling, and rollback.
- **Offer a non-destructive demo mode** · `design`
  Sample data kept separate from real shifts, with clear entry and exit.
- **Make the Shifts toolbar sticky** · `history` `design`
  Keep Sort & filter reachable while scrolling a long list, if it doesn't crowd small screens.
- **Group shifts by week or month** · `history`
  Section headers with subtotals in the Shifts list.
- **Evaluate pull-to-refresh on mobile** · `pwa`
  Only if normal refresh is insufficient and the gesture does not conflict with scrolling or accessibility.
- **Explore optional accounts and synchronization** · `data`
  Local-only use stays account-free; sync only if needed, with clear privacy and data controls.
- **Rethink the lunch/dinner/double shift type** · `shift-form`
  May be too restrictive for non-restaurant work and could be derived from start and end times. Brainstorm first; keep it optional and preserve how double-shift reports work today.
- **Broaden Shift Ledger beyond restaurants** · `design`
  A ledger for anyone tracking work: neutral wording, with restaurant-specific fields as role capabilities rather than defaults.
- **Broaden shift workflows** · `shift-form`
  Multiple named templates per role, recurring shifts, faster entry, and more export formats.

---

## Done

Newest first.

- Shift entry flow: every new shift ends in an Edit phase (all fields, Review and Cancel, no Back) and then a Review phase that shows the shift as an opened shift card with Edit, Save and Cancel. Guided entry is only reachable from the start. Cancel always confirms. Back gestures and the browser Back button step back one stage (question, Review → Edit, then a discard prompt) instead of closing the entry. Leaving with Cancel or Save no longer leaves a stale New Shift screen in history. The Edit phase has Undo and Redo buttons plus Ctrl/Cmd+Z and Ctrl+Y (Ctrl/Cmd+Shift+Z); shortcuts leave text fields to the browser's own undo, and snapshots are taken when a change is committed. The undo and redo buttons sit in a sticky bar that appears after the first change and announces what was undone or redone. Guided, manual and editing a saved shift share one Edit screen with the same Yes/No questions (break, sales report, tips report, notes), where a "No" hides that question's inputs. Manual entry shows the whole form from the start, before a date is picked.

- Shifts redesign: summary cards open a fixed-size detail dialog (full screen on phones) with Net tips first, notes, visible Edit and Delete, and Previous/Next navigation with arrow keys. A compact Sort & filter toolbar replaces the old controls, with a count badge and filter chips. Scroll is locked behind dialogs.
- Guided or manual shift entry: each new shift asks for a mode, with Close before entry. Guided puts each question in its active card, keeps the step count outside, uses Yes/No choices for break and sales-report questions, and focuses the first sales amount after Yes. It automatically advances after valid answers and keeps Next disabled until the current question is valid. Phones keep the step count and navigation near the bottom without moving answer cards. Manual shows the applicable fields together. Cancel confirms and returns to the mode chooser; editing uses the manual form. Workplace and role still decide which fields apply.
- Role settings keep meal-period templates and optional clock-time and break defaults separate from four capability switches: sales reports, tips received, tips paid out, and tip-outs received. Legacy roles with `tracksReports: false` migrate with all four capabilities off.
- Shift entry responds to role capabilities for single and double reports. Unsupported new-shift fields save as empty; editing existing shifts preserves their stored amounts and report coverage.
- The guided new shift form unfolds from date to required workplace, then to the remaining fields once a role is selected when active roles exist (manual entry shows every section from the start). It preselects the last-used workplace, auto-selects a single role, keeps revealed sections open, and shows all fields when editing. The role control appears only when the selected workplace has roles to choose.
- Separate role selection from workplace selection in the new-shift flow; folded into the progressive form.
- Sales are listed alphabetically (Beer & wine, Food, Liquor, NA beverage) in the shift form, double-shift reports, and history; Additional sales sit in their own sub-card after them.
- Separate sales and tip reports: single shifts can be saved without a sales report, a tip report, or both. Each has its own toggle in its own card, is excluded from totals, and shows "No report" independently in history, recent activity, and CSV. Existing shifts and backups load unchanged (`noReport` still means both). Double shifts keep their per-report coverage.
- Load flash fix: saved theme and style apply from a small inline script before first paint, and the page stays hidden until the saved view has rendered. Confirm on a real device that it's gone; if flashing persists, capture which part flashes.
- Manual "Check for updates" button in Settings with checking, up-to-date, update-ready, offline, and error messages.
- App updates now appear in a dialog ("Update now" / "Later") and survive refreshes: the new worker waits until you accept, and the page detects a waiting worker on load.
- Add an hourly wage to roles: optional, validated, shown in the role summary, and kept in JSON backups.
- Shared workplace creation form for first-run setup and Settings, with pay-period frequency, anchor date for every-two-weeks periods, and optional start and end dates that never restrict logging.
- Workplaces and roles can be created from the shift selectors without losing the in-progress shift.
- Workplace and role selection has its own card in the shift form.
- Workplace filter, role-aware Job filter, "Role · Workplace" cards, and a Workplace CSV column in history.
- Roles that don't track sales or tip reports, with the shift form hiding report fields for them.
- Workplace and role selection when logging shifts, role templates that prefill empty fields only, and per-workplace pay periods.
- Workplaces and roles managed in Settings, with skippable first-run setup, job-name migration, and version 2 backups. Specified in [WORKPLACES_SPEC.md](WORKPLACES_SPEC.md).
- Explicit report coverage: single shifts can be saved with no report, shown as "No report" rather than $0.00 in history, recent activity, and CSV.
- Reliable PWA refresh and update behavior, with automatic checks when returning online or to the foreground and a reload safeguard for unsaved shifts.
- Accessibility pass: skip link, focus moved to the page heading on navigation, quick-navigation names matching visible text, plain disclosure for shift actions, and reduced-motion support.
- Data reliability: shared validation for stored and imported shifts, a recovery copy and notice for unreadable data, and clearer storage-failure messages.
- Settings organized into focused cards with linked field hints and visible keyboard focus.
- Previous Shifts controls with the heading separated from sorting and filtering, plus removable filter chips.
- Consistent page headings, concise orientation copy, and mobile top spacing; new views open at the top.
- Success notices that auto-dismiss, with errors kept visible and stale notices cleared on navigation.
- Predictable Back and Forward navigation between app views, preserving unfinished form values.
- Responsive desktop navigation and thumb-friendly mobile bottom navigation.
- Optional hiding of zero-value shift details and unrecorded breaks in history.
- Auto-gratuity tracking across net tips, edits, double reports, CSV, and backups.
- Independent lunch, dinner, and whole-double reports with partial-report labels and double-count-safe totals.
- Overnight shift handling, grouped under the recorded start date.
- Shift validation with linked field errors, auto-selected number fields, and multiple notes.
- Seven visual styles with system, light, and dark modes; responsive Settings cards.
- Shift history with date/job filters, sorting, responsive cards, and expandable sales and tip breakdowns.
- Dashboard totals, weekly and monthly summaries, recent activity, and configurable sections and core stats.
- Local shift storage, JSON backup and restore, configurable preferences, and descriptive CSV export filenames.
