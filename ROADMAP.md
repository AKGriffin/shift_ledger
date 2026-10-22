# Shift Ledger Roadmap

This is a lightweight view of where Shift Ledger is headed, not a promise or a release schedule. Items may be reordered as the app and its users' needs become clearer. Use GitHub Issues for detailed, actionable bugs and implementation tasks; keep this file focused on the bigger picture.

## Now

- [ ] **Model workplaces, roles, and shift templates** - Separate restaurants/workplaces from the positions worked there. A workplace owns its roles; each role can have a reusable shift template. Define how existing `job` values and saved shifts migrate without losing history.
- [ ] **Manage workplaces and roles in Settings** - Let users add, rename, and archive a workplace and its roles. Make clear what happens to historical shifts when an item is archived.
- [ ] **Use roles and templates when logging a shift** - Select a workplace and one of its roles, then start from that role's template while keeping shift details editable.

## Next

- [ ] **Strengthen data reliability** - Validate imported and stored records consistently, handle storage failures clearly, and add coverage for backup restore and invalid data.
- [ ] **Improve reporting** - Add useful date-range summaries and make reports easy to read on small screens.
- [ ] **Improve accessibility** - Review keyboard navigation, focus visibility, labels, contrast, and screen-reader announcements across views and themes.

## Later

- [ ] **Optional synchronization and multi-device use** - Explore account-backed sync only if needed; keep local-first use and transparent privacy controls.
- [ ] **Richer work insights** - Consider goals, averages, and comparisons that help users understand hours, sales, and tips over time.
- [ ] **Broaden shift workflows** - Explore recurring shift templates, faster entry, and additional export formats based on user needs.

## Recently completed

- [x] Responsive desktop sidebar and mobile app menu.
- [x] Dashboard totals, weekly/monthly summaries, shift history, filters, and CSV export.
- [x] Local shift storage, JSON backup/restore, and configurable preferences.
- [x] Installable offline PWA support and browser-based tests.
- [x] Minimalist, Material, and neo-brutalist styles with system, light, and dark color modes.
- [x] Responsive settings cards with a Jobs & roles direction preview.
