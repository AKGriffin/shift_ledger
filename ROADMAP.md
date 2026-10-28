# Shift Ledger Roadmap

This roadmap describes the direction of Shift Ledger, not a release schedule. Priorities may change as user needs become clearer. Use GitHub Issues for detailed bugs and implementation tasks; keep this file focused on product direction.

## Now

- [x] **Create a consistent section-header and mobile-spacing system** - Align Dashboard, New Shift, Previous Shifts, and Settings around a clear heading hierarchy and responsive spacing. Use concise supporting copy where it improves orientation.
- [x] **Refine Previous Shifts controls** - Separate the section heading from sorting and filtering, keep controls easy to reach on narrow screens, and make active filters obvious.
- [x] **Make Settings a clear, accessible hub** - Organize settings into focused cards, clarify field labels and descriptions, and keep explanatory text concise and optional where appropriate.
- [x] **Strengthen data reliability** - Validate imported and stored records consistently, handle storage failures clearly, and cover backup restore and invalid data.
- [x] **Improve accessibility across the app** - Review keyboard navigation, focus visibility, labels, contrast, and screen-reader announcements across views and themes.
- [x] **Define workplaces, roles, and shift templates** - Specified in [WORKPLACES_SPEC.md](WORKPLACES_SPEC.md): how workplaces own roles, how roles use reusable templates, and how existing `job` values and shift history migrate without data loss.

## Next

- [ ] **Manage workplaces and roles in Settings** - Let users add, rename, and archive workplaces and roles; explain how archived items affect historical shifts.
- [ ] **Use roles and templates when logging shifts** - Select a workplace and role, start from an editable role template, and configure workplace pay periods.
- [ ] **Support roles without shift reports** - Let a role mark sales and report details as unavailable so users can record hours and other known details without inventing numbers.
- [ ] **Add a manual app update check in Settings** - Complement automatic checks with an on-demand check. Show checking, up-to-date, update-ready, offline, and error states; reuse the current update/reload flow and preserve the unsaved-form safeguard.
- [ ] **Strengthen and clarify the test suite** - Improve assertion readability, focused behavior coverage, and failure output without adding unnecessary dependencies.
- [ ] **Unify theme-dependent accents and palette choices** - Define curated palettes for each visual style, reuse semantic colors consistently, and verify contrast in light and dark modes.
- [ ] **Improve Material Dark colors** - Refine the dark palette so it feels intentional and cohesive with the paper-inspired light theme.
- [ ] **Add configurable text size** - Offer Default, Large, and Larger sizes while respecting browser font settings; verify key phone views and dialogs at each size.
- [ ] **Add configurable time display preferences** - Support 12-hour and 24-hour clocks, keeping stored shift times and historical records safe when preferences change.
- [ ] **Improve transient notification feedback** - Add dismissible notices with a visible countdown, sensible timeout, reduced-motion support, and Settings controls for adjusting or disabling them.
- [ ] **Add undo and redo while editing forms** - Provide accessible controls and keyboard shortcuts without interfering with native input undo.
- [ ] **Offer a guided shift-entry flow** - Add an optional step-by-step mode while preserving the current form for users who prefer it.
- [ ] **Expand dashboard customization** - Add section ordering, job filters, density options, and optional tips per hour, average sales per shift, and tip percentage.
- [ ] **Make dashboard labels adaptable** - Reduce descriptive text in dense views with a discoverable way to reveal it; keep labels accessible without relying on hover.
- [ ] **Design an accessible dashboard edit mode** - Let users explicitly add, remove, and reorder preset cards with keyboard- and touch-accessible interactions; explore guided text-based custom-card configuration after preset cards.
- [ ] **Add flexible dashboard period summaries** - Support configurable week, month, year, all-time, and custom-range cards; migrate the current week and month cards as defaults.
- [ ] **Expand dashboard insights** - Add trends and visualizations where they clarify hours, sales, tips, or comparisons.
- [ ] **Model shift-report coverage explicitly** - Distinguish no report from a received zero-value report, represent partial and whole-double reports, and prevent overlapping totals from being counted twice.
- [ ] **Add paystub tracking** - Record paystub dates, pay-period details, gross/net pay, deductions, and optional notes; relate paystubs to shifts or workplaces without requiring an account.
- [ ] **Add thoughtful feedback and bug reporting** - Let users report problems or request features without sharing shift or personal data unless they explicitly choose to.
- [ ] **Evaluate IndexedDB for local storage** - Measure future data needs first; if a migration is justified, define schema versioning, localStorage migration, backup compatibility, failure handling, and rollback.
- [ ] **Improve reporting** - Add useful date-range summaries and make reports easy to read on small screens.

## Later

- [ ] **Offer a non-destructive demo mode** - Let users explore sample data without mixing it with real shifts, and make entering and exiting demo mode clear.
- [ ] **Evaluate pull-to-refresh on mobile** - Add a custom gesture only if normal browser refresh is insufficient and the gesture does not conflict with scrolling or accessibility.
- [ ] **Explore optional accounts and synchronization** - Keep local-only use account-free; consider sync only if needed, with clear privacy and data controls.
- [ ] **Broaden shift workflows** - Explore recurring templates, faster entry, and additional export formats based on user needs.

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
