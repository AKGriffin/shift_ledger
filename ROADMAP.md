# Shift Ledger Roadmap

This is a lightweight view of where Shift Ledger is headed, not a promise or a release schedule. Items may be reordered as the app and its users' needs become clearer. Use GitHub Issues for detailed, actionable bugs and implementation tasks; keep this file focused on the bigger picture.

## Now

- [ ] **Track automatic gratuity separately and include it in tips** - Add an optional auto-gratuity field, update net-tip calculations and totals, and carry it through editing, history, CSV export, backup/restore, and legacy records without changing existing values.
- [ ] **Redesign previous-shift browsing** - Replace the heavy nested-card appearance with a clearer, lighter history list; move filters into an accessible dialog or sheet while keeping sort easy to find and usable on mobile.
- [ ] **Make PWA refresh and update behavior reliable** - Ensure refreshes and app restarts preserve saved shifts, and make new app versions activate or become available predictably without requiring users to fully close the app.
- [ ] **Improve mobile navigation and reachability** - Keep in-app back/forward navigation predictable instead of unexpectedly leaving the app, and place frequently used mobile actions where they are easier to reach one-handed.
- [ ] **Model workplaces, roles, and shift templates** - Separate restaurants/workplaces from the positions worked there. A workplace owns its roles; each role can have a reusable shift template. Define how existing `job` values and saved shifts migrate without losing history.
- [ ] **Manage workplaces and roles in Settings** - Let users add, rename, and archive a workplace and its roles. Make clear what happens to historical shifts when an item is archived.
- [ ] **Add pay-period settings and use roles and templates when logging a shift** - Configure a workplace's pay period, select a workplace and role when logging, and start from that role's editable shift template.
- [ ] **Organize Settings as a durable card-based hub** - Give preferences, time format, jobs and roles, notifications, and data tools clear sections that can grow without becoming one long form.

## Next

- [ ] **Make success and error notices dismiss reliably** - Ensure timed notices close while the app remains open, and that navigation, refresh, or visibility changes do not leave stale notices behind.
- [ ] **Strengthen and clarify the test suite** - Improve the lightweight assertion-based tests with expressive assertions, focused behavior coverage, and clear failure output, following useful patterns from flat_map_framework without adding unnecessary test dependencies.
- [ ] **Add undo and redo while editing forms** - Let users step back and forward through changes in the shift form, working with keyboard shortcuts and accessible controls without interfering with native input undo.
- [ ] **Improve Material Dark colors** - Refine its dark palette and contrast so it feels intentional and as cohesive as the paper-inspired light theme.
- [ ] **Use descriptive export filenames** - Name downloads by export type and relevant date range (and job only when useful), rather than a generic filename; avoid adding personal identifiers by default.
- [ ] **Support roles that do not have shift reports** - Let a role's template mark sales/report details as unavailable or not applicable, so users can still log hours and other known shift details without entering invented numbers.
- [ ] **Add configurable time display preferences** - Support 12-hour (AM/PM) and 24-hour clocks, with an explicit time-zone preference if needed. Keep stored shift instants and historical records safe when display preferences change.
- [ ] **Improve transient notification feedback** - Use dismissible in-app notices with a close button and a visible circular countdown for automatic dismissal. Tapping a notice should dismiss it rather than open a destination; provide a sensible timeout, respect reduced-motion preferences, and let users adjust or disable these notices in Settings.
- [ ] **Offer a guided shift-entry flow** - Add an optional step-by-step mode for logging a shift while preserving the current form for users who prefer it.
- [ ] **Make dashboard labels adaptable** - Let users reduce descriptive text in dense views, with a discoverable way to reveal it on demand. Consider separate compact/expanded preferences for small and large screens, and ensure labels remain accessible without relying on hover.
- [ ] **Expand dashboard insights** - Add useful trends and visualizations only where they clarify hours, sales, tips, or comparisons across time periods.
- [ ] **Add thoughtful feedback and bug reporting** - Provide a clear way to report a problem or request a feature, without including shift or personal data unless the user explicitly chooses to share it.
- [ ] **Strengthen data reliability** - Validate imported and stored records consistently, handle storage failures clearly, and add coverage for backup restore and invalid data.
- [ ] **Improve reporting** - Add useful date-range summaries and make reports easy to read on small screens.
- [ ] **Improve accessibility** - Review keyboard navigation, focus visibility, labels, contrast, and screen-reader announcements across views and themes.

## Later

- [ ] **Offer a non-destructive demo mode** - Let users explore sample shifts, reports, and settings without mixing demo content with their real local data; make entering and exiting demo mode obvious.
- [ ] **Evaluate pull-to-refresh on mobile** - First confirm the PWA's normal browser refresh behavior is sufficient; add a custom gesture only if it solves a demonstrated problem and does not conflict with scrolling or accessibility.
- [ ] **Add theme color sets** - Offer curated primary/secondary palettes within the visual styles first; consider user-defined colors only after the built-in choices work consistently in light and dark modes.
- [ ] **Optional account, synchronization, and multi-device use** - Keep local-only use account-free. Explore account-backed sync only if needed, with explicit account, sync-status, privacy, and data controls in Settings.
- [ ] **Broaden shift workflows** - Explore recurring shift templates, faster entry, and additional export formats based on user needs.

## Recently completed

- [x] Responsive desktop sidebar and mobile app menu.
- [x] Dashboard totals, weekly/monthly summaries, shift history, filters, and CSV export.
- [x] Local shift storage, JSON backup/restore, and configurable preferences.
- [x] Installable offline PWA support and browser-based tests.
- [x] Seven visual styles, each supporting system, light, and dark color modes.
- [x] Responsive settings cards with a Jobs & roles direction preview.
- [x] Mobile app menu fits common phone screens and scrolls only when space is insufficient.
- [x] App icon replaces the text monogram in the header, with the brand kept on one line.
- [x] Dashboard period summaries and previous-shift cards use a two-column heading-and-statistics layout.
- [x] Number fields in the shift form select their contents on focus, so values like 0 can be replaced without deleting.
- [x] Shift-form validation identifies affected fields, marks invalid inputs, and links an error summary beside the form actions.
- [x] Overnight shifts use the recorded date as their start date; earlier clock-out and break-end times are treated as next-day times, and the full shift is grouped under its start date in totals and filters.
- [x] Double shifts can record lunch, dinner, and whole-double reports independently; totals avoid double-counting, and history labels incomplete, combined, and legacy reports.
