# Shift Ledger Roadmap

This is a lightweight view of where Shift Ledger is headed, not a promise or a release schedule. Items may be reordered as the app and its users' needs become clearer. Use GitHub Issues for detailed, actionable bugs and implementation tasks; keep this file focused on the bigger picture.

## Now

- [ ] **Keep the mobile menu within the viewport** - Prevent the opening menu from scrolling when its contents fit on screen; allow scrolling only on shorter screens or when content genuinely overflows.
- [ ] **Make dashboard and history summaries easier to scan** - Try a two-column summary-card layout with period labels and date ranges on one side and vertically stacked statistics on the other. Apply the same pattern to previous-shift cards and verify it at narrow widths.
- [ ] **Improve mobile navigation and reachability** - Keep in-app back/forward navigation predictable instead of unexpectedly leaving the app, and place frequently used mobile actions where they are easier to reach one-handed.
- [ ] **Model workplaces, roles, and shift templates** - Separate restaurants/workplaces from the positions worked there. A workplace owns its roles; each role can have a reusable shift template. Define how existing `job` values and saved shifts migrate without losing history.
- [ ] **Manage workplaces and roles in Settings** - Let users add, rename, and archive a workplace and its roles. Make clear what happens to historical shifts when an item is archived.
- [ ] **Add pay-period settings and use roles and templates when logging a shift** - Configure a workplace's pay period, select a workplace and role when logging, and start from that role's editable shift template.
- [ ] **Organize Settings as a durable card-based hub** - Give preferences, time format, jobs and roles, notifications, and data tools clear sections that can grow without becoming one long form.

## Next

- [ ] **Add configurable time display preferences** - Support 12-hour (AM/PM) and 24-hour clocks, with an explicit time-zone preference if needed. Keep stored shift instants and historical records safe when display preferences change.
- [ ] **Improve transient notification feedback** - Use dismissible in-app notices with a close button and a visible circular countdown for automatic dismissal. Tapping a notice should dismiss it rather than open a destination; provide a sensible timeout, respect reduced-motion preferences, and let users adjust or disable these notices in Settings.
- [ ] **Offer a guided shift-entry flow** - Add an optional step-by-step mode for logging a shift while preserving the current form for users who prefer it.
- [ ] **Make dashboard labels adaptable** - Let users reduce descriptive text in dense views, with a discoverable way to reveal it on demand. Consider separate compact/expanded preferences for small and large screens, and ensure labels remain accessible without relying on hover.
- [ ] **Polish app identity in the interface** - Use the installed app's icon mark in the header and keep the brand on one line where space allows.
- [ ] **Expand dashboard insights** - Add useful trends and visualizations only where they clarify hours, sales, tips, or comparisons across time periods.
- [ ] **Add thoughtful feedback and bug reporting** - Provide a clear way to report a problem or request a feature, without including shift or personal data unless the user explicitly chooses to share it.
- [ ] **Strengthen data reliability** - Validate imported and stored records consistently, handle storage failures clearly, and add coverage for backup restore and invalid data.
- [ ] **Improve reporting** - Add useful date-range summaries and make reports easy to read on small screens.
- [ ] **Improve accessibility** - Review keyboard navigation, focus visibility, labels, contrast, and screen-reader announcements across views and themes.

## Later

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
