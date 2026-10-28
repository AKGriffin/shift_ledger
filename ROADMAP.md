# Shift Ledger Roadmap

This is a lightweight view of where Shift Ledger is headed, not a promise or a release schedule. Items may be reordered as the app and its users' needs become clearer. Use GitHub Issues for detailed, actionable bugs and implementation tasks; keep this file focused on the bigger picture.

## Now

- [x] **Make PWA refresh and update behavior reliable** - Refreshes preserve saved shifts, updates are checked when the app returns online or to the foreground, and active versions offer a manual reload without discarding unsaved shift changes.
- [x] **Make mobile Back and Forward predictable** - Browser navigation revisits app views instead of immediately leaving the app, and unfinished form values stay in place when moving between views.
- [x] **Improve one-handed mobile reachability** - Keep the four main views available from a compact, fixed bottom navigation on mobile.
- [ ] **Create a consistent section-header and mobile-spacing system** - Give Dashboard, New Shift, Previous Shifts, and Settings the same top spacing, heading hierarchy, and responsive behavior. Use Settings' borderless page header as the direction for the other primary views, with a short eyebrow or supporting phrase where it improves orientation (for example, "At a glance" or "Shift entry"). Keep supporting copy optional or compact on phones.
- [ ] **Refine Previous Shifts sorting and filtering** - Separate the section header from the sort/filter controls so the controls can remain in a compact card or toolbar without making the heading feel boxed in. Test placement and touch reach on narrow screens, and make the active filter state obvious.
- [ ] **Refine Settings information architecture and field semantics** - Break Settings into focused cards such as Personalized Appearance, Preferences, Work Setup, and Data. Put descriptions after headings and before the associated control; use a real label for the control and connect its supporting text with `aria-describedby` when needed. Do not force descriptions where they add no value.
- [ ] **Model workplaces, roles, and shift templates** - Separate restaurants/workplaces from the positions worked there. A workplace owns its roles; each role can have a reusable shift template. Define how existing `job` values and saved shifts migrate without losing history.
- [ ] **Manage workplaces and roles in Settings** - Let users add, rename, and archive a workplace and its roles. Make clear what happens to historical shifts when an item is archived.
- [ ] **Add pay-period settings and use roles and templates when logging a shift** - Configure a workplace's pay period, select a workplace and role when logging, and start from that role's editable shift template.
- [ ] **Organize Settings as a durable card-based hub** - Give preferences, time format, jobs and roles, notifications, and data tools clear sections that can grow without becoming one long form. Include the existing roadmap option to let users show or hide descriptive text.

## Next

- [ ] **Unify theme-dependent accents and palette choices** - Define a small set of curated accent palettes for each visual style, with two or three tested choices per style. Reuse the selected semantic colors consistently across sections and tabs, and verify contrast in light and dark modes before exposing a palette to users.
- [ ] **Add configurable text size** - Offer Default, Large, and Larger text sizes in Settings by scaling one root size that all `rem`-based text follows, while still respecting the browser or system font setting. Verify the key phone views (bottom navigation, dashboard, shift form, history, dialogs) at every size without overflow or clipped text.
- [ ] **Make success and error notices dismiss reliably** - Ensure timed notices close while the app remains open, and that navigation, refresh, or visibility changes do not leave stale notices behind.
- [ ] **Strengthen and clarify the test suite** - Improve the lightweight assertion-based tests with expressive assertions, focused behavior coverage, and clear failure output, following useful patterns from flat_map_framework without adding unnecessary test dependencies.
- [ ] **Add undo and redo while editing forms** - Let users step back and forward through changes in the shift form, working with keyboard shortcuts and accessible controls without interfering with native input undo.
- [ ] **Improve Material Dark colors** - Refine its dark palette and contrast so it feels intentional and as cohesive as the paper-inspired light theme.
- [x] **Use descriptive export filenames** - Name downloads by export type and relevant date range (and job only when useful), rather than a generic filename; avoid adding personal identifiers by default.
- [ ] **Support roles that do not have shift reports** - Let a role's template mark sales/report details as unavailable or not applicable, so users can still log hours and other known shift details without entering invented numbers.
- [ ] **Add configurable time display preferences** - Support 12-hour (AM/PM) and 24-hour clocks, with an explicit time-zone preference if needed. Keep stored shift instants and historical records safe when display preferences change.
- [ ] **Improve transient notification feedback** - Use dismissible in-app notices with a close button and a visible circular countdown for automatic dismissal. Tapping a notice should dismiss it rather than open a destination; provide a sensible timeout, respect reduced-motion preferences, and let users adjust or disable these notices in Settings.
- [ ] **Offer a guided shift-entry flow** - Add an optional step-by-step mode for logging a shift while preserving the current form for users who prefer it.
- [ ] **Make dashboard labels adaptable** - Let users reduce descriptive text in dense views, with a discoverable way to reveal it on demand. Consider separate compact/expanded preferences for small and large screens, and ensure labels remain accessible without relying on hover.
- [x] **Customize dashboard sections and core stats** - Let users show or hide all-time totals, period summaries, and recent activity, and choose which core stats appear, from Settings or the dashboard's Customize dialog.
- [ ] **Expand dashboard customization** - Add section ordering, job filters, compact or detailed density, and optional tips per hour, average sales per shift, and tip % of sales.
- [ ] **Design an edit-mode dashboard experience** - Let users enter an explicit customization mode from the dashboard, reorder cards, edit cards individually, and add or remove cards. Support preset cards first, then a guided text-based configuration tree for custom cards; keep the interaction keyboard- and touch-accessible rather than depending on phone-style wiggle animations.
- [ ] **Add flexible dashboard period summaries** - Let users add any number of period cards, each set to a period type (week, month, year, all time, or a custom range) and which one (this, last, or a chosen period). Choose which stats appear in the top banner, keep the existing stat toggles applying to every card, and use a compact picker on phones. Migrate the current This week and This month cards as the defaults.
- [ ] **Expand dashboard insights** - Add useful trends and visualizations only where they clarify hours, sales, tips, or comparisons across time periods.
- [ ] **Model shift-report availability and coverage** - Represent no report, lunch, dinner, and whole-day reports explicitly, including partial combinations. Keep "not received" distinct from a received report containing zero values, show the available reports clearly in history, and prevent totals from double-counting overlapping reports.
- [ ] **Add paystub tracking** - Let users record paystub dates and pay-period details, gross/net pay, deductions, and optional notes; relate a paystub to the shifts or workplace it covers without requiring an account or exposing financial data.
- [ ] **Add thoughtful feedback and bug reporting** - Provide a clear way to report a problem or request a feature, without including shift or personal data unless the user explicitly chooses to share it.
- [ ] **Strengthen data reliability** - Validate imported and stored records consistently, handle storage failures clearly, and add coverage for backup restore and invalid data.
- [ ] **Evaluate IndexedDB for local data storage** - Measure the needs introduced by paystubs, richer dashboard configurations, and future attachments before changing storage. If IndexedDB is justified, define a versioned schema, migration from the current `localStorage` records, backup compatibility, failure handling, and a rollback-safe rollout; otherwise keep the simpler local-only storage.
- [ ] **Improve reporting** - Add useful date-range summaries and make reports easy to read on small screens.
- [ ] **Improve accessibility** - Review keyboard navigation, focus visibility, labels, contrast, and screen-reader announcements across views and themes.

## Later

- [ ] **Offer a non-destructive demo mode** - Let users explore sample shifts, reports, and settings without mixing demo content with their real local data; make entering and exiting demo mode obvious.
- [ ] **Evaluate pull-to-refresh on mobile** - First confirm the PWA's normal browser refresh behavior is sufficient; add a custom gesture only if it solves a demonstrated problem and does not conflict with scrolling or accessibility.
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
- [x] Mobile bottom navigation replaces the app menu: phones open to the dashboard and keep the main views within thumb reach.
- [x] App icon replaces the text monogram in the header, with the brand kept on one line.
- [x] Dashboard visually refreshed to match the other sections: header card, accented stat cards, tiled period metrics, and labeled recent-activity values.
- [x] Dashboard period summaries and previous-shift cards use a two-column heading-and-statistics layout.
- [x] Number fields in the shift form select their contents on focus, so values like 0 can be replaced without deleting.
- [x] Shift-form validation identifies affected fields, marks invalid inputs, and links an error summary beside the form actions.
- [x] Overnight shifts use the recorded date as their start date; earlier clock-out and break-end times are treated as next-day times, and the full shift is grouped under its start date in totals and filters.
- [x] Double shifts can record lunch, dinner, and whole-double reports independently; totals avoid double-counting, and history labels incomplete, combined, and legacy reports.
- [x] Auto-gratuity is stored separately from other tips, included in net tip totals, and carried through edits, double reports, CSV, backups, and records created before the field existed.
- [x] Previous shifts use a lighter single-column list, with sorting kept visible and date/job filters in an accessible dialog.
- [x] Previous shifts have a standalone header card and responsive per-shift cards grouped into time clock, sales and tips, with an expandable sales/tips breakdown.
- [x] New and edited shifts use a vertically stacked, width-limited form; sales are grouped directly under Sales, with dedicated sub-cards only for Break and Tip out.
- [x] Shift notes support multiple entries, with blank rows prevented from multiplying and ignored when saving.
- [x] Previous-shift details can hide zero-value sales and tip breakdowns, auto-gratuity, and unrecorded breaks, with a setting to show them again.
- [x] Successful status notices dismiss automatically; errors remain visible until replaced.
- [x] CSV exports use descriptive filenames based on the exported date range and include a job name only for single-job exports.
