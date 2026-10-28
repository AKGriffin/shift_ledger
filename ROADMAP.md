# Shift Ledger Roadmap

This roadmap describes the direction of Shift Ledger, not a release schedule. Priorities may change as user needs become clearer. Use GitHub Issues for detailed bugs and implementation tasks; keep this file focused on product direction.

The work is grouped by theme. Within each section, items are listed in the order they should be built, and later items often depend on earlier ones. Completed work is summarized under "Recently completed".

## Now: workplaces and roles

The first round of polish, reliability, and accessibility work is done. The next focus is the biggest structural change: letting people track more than one job. The design is settled in [WORKPLACES_SPEC.md](WORKPLACES_SPEC.md), and these items build on it in order.

- [x] **Model shift-report coverage explicitly** - Distinguish no report from a received zero-value report, represent partial and whole-double reports, and prevent overlapping totals from being counted twice. Build this first: roles without reports depend on it.
- [ ] **Manage workplaces and roles in Settings** - Add, rename, archive, and unarchive workplaces and roles, and delete unused ones. Include the first-run setup dialog (with a Skip option), the migration that links existing shifts by `job`, and version 2 backups that carry workplaces. Explain how archived items affect historical shifts.
- [ ] **Use roles and templates when logging shifts** - Select a workplace and role, start from an editable role template that never overwrites typed values, and configure per-workplace pay periods.
- [ ] **Support roles without shift reports** - Let a role mark sales and report details as unavailable so users can record hours and other known details without inventing numbers.
- [ ] **Make history and the dashboard workplace-aware** - Add workplace and role filters to Previous Shifts, show "Role · Workplace" on cards, and let the dashboard and CSV export scope to a workplace.

## Next: everyday polish

Smaller improvements that make the app more comfortable to use and do not depend on the workplace work.

- [ ] **Add a manual app update check in Settings** - Complement automatic checks with an on-demand check. Show checking, up-to-date, update-ready, offline, and error states; reuse the current update/reload flow and preserve the unsaved-form safeguard.
- [ ] **Improve transient notification feedback** - Add dismissible notices with a visible countdown, sensible timeout, reduced-motion support, and Settings controls for adjusting or disabling them.
- [ ] **Add configurable text size** - Offer Default, Large, and Larger sizes while respecting browser font settings; verify key phone views and dialogs at each size.
- [ ] **Add configurable time display preferences** - Support 12-hour and 24-hour clocks, keeping stored shift times and historical records safe when preferences change.
- [ ] **Unify theme-dependent accents and palette choices** - Define curated palettes for each visual style, reuse semantic colors consistently, and verify contrast in light and dark modes. This also covers the remaining contrast review from the accessibility pass.
- [ ] **Improve Material Dark colors** - Refine the dark palette so it feels intentional and cohesive with the paper-inspired light theme. Do this together with the palette work above.
- [ ] **Add undo and redo while editing forms** - Provide accessible controls and keyboard shortcuts without interfering with native input undo.
- [ ] **Strengthen and clarify the test suite** - Improve assertion readability, focused behavior coverage, and failure output without adding unnecessary dependencies. Add a documented way to run the suite from the command line, since contributors currently need a browser.
- [ ] **Run a manual accessibility review** - Check screen-reader behavior (VoiceOver, TalkBack, NVDA), keyboard-only use, zoom and reflow, and every theme in light and dark modes, to find what automated tests cannot.

## Next: dashboard and insights

These share the dashboard code, so plan them together. Period summaries should build on workplace pay periods.

- [ ] **Expand dashboard customization** - Add section ordering, workplace and role filters, density options, and optional tips per hour, average sales per shift, and tip percentage.
- [ ] **Add flexible dashboard period summaries** - Support configurable week, month, pay-period, year, all-time, and custom-range cards; migrate the current week and month cards as defaults.
- [ ] **Make dashboard labels adaptable** - Reduce descriptive text in dense views with a discoverable way to reveal it; keep labels accessible without relying on hover.
- [ ] **Design an accessible dashboard edit mode** - Let users explicitly add, remove, and reorder preset cards with keyboard- and touch-accessible interactions; explore guided text-based custom-card configuration after preset cards.
- [ ] **Expand dashboard insights** - Add trends and visualizations where they clarify hours, sales, tips, or comparisons.
- [ ] **Improve reporting** - Add useful date-range summaries and make reports easy to read on small screens.

## Next: onboarding and money tracking

- [ ] **Offer a guided shift-entry flow** - Add an optional step-by-step mode while preserving the current form for users who prefer it.
- [ ] **Add an optional onboarding wizard** - Build on the first-run workplace setup to cover appearance, formats, workplaces, and a first shift. Every step stays skippable.
- [ ] **Add paystub tracking** - Record paystub dates, pay-period details, gross/net pay, deductions, and optional notes; relate paystubs to shifts or workplaces without requiring an account.
- [ ] **Add thoughtful feedback and bug reporting** - Let users report problems or request features without sharing shift or personal data unless they explicitly choose to.

## Later

- [ ] **Evaluate IndexedDB for local storage** - Measure data needs after workplaces and paystubs exist. If a migration is justified, define schema versioning, localStorage migration, backup compatibility, failure handling, and rollback.
- [ ] **Offer a non-destructive demo mode** - Let users explore sample data without mixing it with real shifts, and make entering and exiting demo mode clear.
- [ ] **Evaluate pull-to-refresh on mobile** - Add a custom gesture only if normal browser refresh is insufficient and the gesture does not conflict with scrolling or accessibility.
- [ ] **Explore optional accounts and synchronization** - Keep local-only use account-free; consider sync only if needed, with clear privacy and data controls.
- [ ] **Broaden shift workflows** - Explore multiple named templates per role, recurring shifts, faster entry, and additional export formats based on user needs.

## Recently completed

- Reliable PWA refresh and update behavior, including automatic checks when returning online or to the foreground and a reload safeguard for unsaved shifts.
- Predictable Back and Forward navigation between app views, preserving unfinished form values.
- Responsive desktop navigation and thumb-friendly mobile bottom navigation.
- Dashboard totals, weekly and monthly summaries, recent activity, and configurable sections and core stats.
- Shift history with date/job filters, sorting, responsive cards, and expandable sales and tip breakdowns.
- Local shift storage, JSON backup and restore, configurable preferences, and descriptive CSV export filenames.
- Seven visual styles with system, light, and dark modes; responsive Settings cards.
- Shift validation with linked field errors, auto-selected number fields, and support for multiple notes.
- Overnight shift handling, grouped under the recorded start date in summaries and history.
- Independent lunch, dinner, and whole-double reports with partial-report labels and double-count-safe totals.
- Auto-gratuity tracking across net tips, edits, double reports, CSV, and backups.
- Optional hiding of zero-value shift details and unrecorded breaks in history.
- Success notices that auto-dismiss, with errors kept visible and stale notices cleared on navigation or return to the app.
- Consistent page headings, concise orientation copy, and mobile top spacing across the dashboard, shift entry, history, and settings; new views open at the top.
- Previous Shifts controls with the heading separated from sorting and filtering, plus removable chips for active filters.
- Settings organized into focused Appearance, Formats & display, Dashboard, Jobs & roles, and Your data cards with linked field hints and visible keyboard focus.
- Data reliability: shared validation for stored and imported shifts, a recovery copy plus notice for unreadable data, and clearer storage-failure messages.
- Workplaces, roles, and templates specified in [WORKPLACES_SPEC.md](WORKPLACES_SPEC.md).
- Accessibility pass: skip link, focus moved to the page heading with updated tab titles on navigation, quick-navigation names that match visible text, a plain disclosure for shift actions, and reduced-motion support.
- Explicit report coverage: single shifts can be saved with no sales or tip report, shown as "No report" rather than $0.00 in history, recent activity, and CSV; doubles already distinguish no report, partial, and whole reports.
