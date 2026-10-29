# Shift Ledger Roadmap

This roadmap describes the direction of Shift Ledger, not a release schedule. Priorities may change as user needs become clearer. Use GitHub Issues for detailed bugs and implementation tasks; keep this file focused on product direction.

The work is grouped by theme. Within each section, items are listed in the order they should be built, and later items often depend on earlier ones. Completed work is summarized under "Recently completed".

## Now: workplaces and roles

The first round of polish, reliability, and accessibility work is done. The next focus is the biggest structural change: letting people track more than one job. The design is settled in [WORKPLACES_SPEC.md](WORKPLACES_SPEC.md), and these items build on it in order.

- [x] **Model shift-report coverage explicitly** - Distinguish no report from a received zero-value report, represent partial and whole-double reports, and prevent overlapping totals from being counted twice. Build this first: roles without reports depend on it.
- [x] **Manage workplaces and roles in Settings** - Add, rename, archive, and unarchive workplaces and roles, and delete unused ones. Includes the skippable first-run setup dialog, the migration that links existing shifts by `job`, and version 2 backups that carry workplaces. Archived items stay on historical shifts.
- [x] **Use roles and templates when logging shifts** - Select a workplace and role, start from an editable role template that never overwrites typed values, and configure per-workplace pay periods.
- [x] **Support roles without shift reports** - A role can be marked as not tracking sales or tip reports; its shifts hide the report fields and save as "No report", leaving sales totals untouched.
- [x] **Make history and the dashboard workplace-aware** - Previous Shifts has a Workplace filter and a Job filter built from your roles and past jobs, cards show "Role · Workplace", and the CSV export includes a Workplace column. A dashboard workplace scope is still to do.

### Workplace and shift-form refinements

Findings from hands-on testing. Do the first three first, since they change the workplace flow the others build on. The Settings redesign comes last so it reflects the merged flow.

- [x] **Merge "Set up workplace" and "Add workplace" into one flow** - They should be the same form and behavior, reused by first-run setup and Settings.
- [x] **Add pay period to the new-workplace form** - Choose the pay-period frequency and starting weekday when creating a workplace; every-two-weeks periods retain a reference date for cycle alignment.
- [x] **Add optional start and end dates to workplaces** - For data tracking only; they must not restrict logging shifts or filter history unless the user asks.
- [ ] **Split workplace and role into their own card in the new shift form** - Separate "where and as what" from the time, sales, and tip fields.
- [ ] **Add workplaces and roles from inside the shift form** - Evaluate an inline "Add new…" option that opens the shared workplace/role form and returns to the unfinished shift with the new item selected, without losing typed values.
- [ ] **Add an hourly wage to roles** - Optional per-role hourly wage, set in the role form and kept in backups. Stored for tracking and later earnings estimates; never required to log a shift.
- [ ] **Let shifts be saved without a sales report** - A server always has a report but may not have it on hand (lost, not printed). For roles that track sales, allow saving a shift with the report left out, shown as "No report" and excluded from sales totals, so sales can be added later by editing the shift. Builds on the existing report-coverage model.
- [ ] **Replace role templates with yes/no capability switches** - Rework the role form as a short series of switches, for example: has a sales report, receives tips, tips out to others, receives a tip-out. Exact set to be decided; keep them mapped onto the existing "no report" role setting so current data migrates cleanly.
- [ ] **Make the shift form react to the role's capabilities** - Show only the inputs the selected role needs (sales, tips, tip-out, tip-out received) and hide the rest. Hidden fields save as empty, not zero, and editing an old shift keeps any values already stored. Depends on the capability switches above.
- [ ] **Redesign the Settings workplace section** - Show a list of workplaces, each with a short summary (roles active and archived, pay period, dates) and an Edit button that opens a dialog with the workplace form and its roles. Larger touch targets; verify on phones. Open question to settle first: edit roles inside the same larger workplace form, or close it and open a separate role dialog. Prefer one dialog with an inline role section so no context is lost; prototype both before committing.
## Next: everyday polish

Smaller improvements that make the app more comfortable to use and do not depend on the workplace work.

- [ ] **Filter history by sales and tips ranges** - Add minimum and maximum sales and tips filters to Previous Shifts, with removable chips like the existing filters. Shifts with no report must not match a sales range.
- [ ] **Use icons beside labels** - Add consistent icons next to labels in forms, the dashboard, and history for scanning and accessibility. Icons must be decorative, with text labels staying the accessible name.
- [ ] **Add an option to show or hide icons** - Worth doing if icons are added: a Settings toggle, on by default, so the interface stays clean for those who prefer text only. Can share a settings pattern with the descriptive-text option.
- [ ] **Add a manual app update check in Settings** - Complement automatic checks with an on-demand check. Show checking, up-to-date, update-ready, offline, and error states; reuse the current update/reload flow and preserve the unsaved-form safeguard.
- [ ] **Improve transient notification feedback** - Add dismissible notices with a visible countdown, sensible timeout, reduced-motion support, and Settings controls for adjusting or disabling them.
- [ ] **Extend zero-value hiding to totals** - History already can hide zero-value shift details. Add the same show/hide choice for zero total hours, sales, and tips in the dashboard and summaries, keeping "No report" distinct from a received zero report.
- [ ] **Improve mobile text size and readability** - Headings and description text feel small on phones. First try modest default increases, then add configurable Default, Large, and Larger sizes that respect browser font settings; verify key phone views and dialogs at each size.
- [ ] **Add an option to show or hide descriptive text** - Shown by default for accessibility. When hidden, move it behind an accessible "i" info control that works by tap and keyboard, not hover. Applies app-wide, including dense dashboard labels.
- [ ] **Add configurable time display preferences** - Support 12-hour and 24-hour clocks, keeping stored shift times and historical records safe when preferences change.
- [ ] **Unify palettes and improve Material Dark** - Define curated palettes for each visual style, reuse semantic colors consistently, and refine the dark palette so it feels cohesive with the paper-inspired light theme. Verify contrast in light and dark modes, which also covers the remaining contrast review from the accessibility pass.
- [ ] **Add undo and redo while editing forms** - Provide accessible controls and keyboard shortcuts without interfering with native input undo.
- [ ] **Strengthen and clarify the test suite** - Improve assertion readability, focused behavior coverage, and failure output without adding unnecessary dependencies. Add a documented way to run the suite from the command line, since contributors currently need a browser.
- [ ] **Run a manual accessibility review** - Check screen-reader behavior (VoiceOver, TalkBack, NVDA), keyboard-only use, zoom and reflow, and every theme in light and dark modes, to find what automated tests cannot.

## Next: dashboard and insights

These share the dashboard code, so plan them together. Start with the stat layout, then customization and period summaries, which build on workplace pay periods. A dashboard workplace scope belongs to the customization item.

- [ ] **Rework dashboard stat layout** - Values and labels leave too much white space and stretch wide. Avoid both full-width rows and rigid 2x2 grids; consider compact flowing tiles, and moving shift count into the period/date-range line rather than its own stat.
- [ ] **Expand dashboard customization** - Add section ordering, workplace and role filters, density options, and optional tips per hour, average sales per shift, and tip percentage.
- [ ] **Add flexible dashboard period summaries** - Support configurable week, month, pay-period, year, all-time, and custom-range cards; migrate the current week and month cards as defaults.
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
- [ ] **Rethink the lunch/dinner/double shift type** - It may be too restrictive for non-restaurant work and could be derived from start/end times rather than declared. Brainstorm first: infer a label from times, keep it optional, and preserve how double-shift reports work today.
- [ ] **Broaden Shift Ledger beyond restaurants** - Long-term goal: a ledger for anyone tracking work. Use neutral wording, and keep restaurant-specific fields (sales, tip-outs) as role capabilities rather than defaults.
- [ ] **Broaden shift workflows** - Explore multiple named templates per role, recurring shifts, faster entry, and additional export formats based on user needs.

## Recently completed

- Workplace filter, role-aware Job filter, "Role · Workplace" cards, and a Workplace CSV column in history.
- Shared workplace creation form for first-run setup and Settings, including role creation.
- Roles that don't track sales or tip reports (set in the role's template dialog), with the shift form hiding report fields for them.
- Workplace and role selection in the shift form, with role templates that prefill empty fields only and per-workplace pay periods managed in Settings.
- Workplaces and roles managed in Settings, with a skippable first-run setup, job-name migration, and version 2 backups.
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
