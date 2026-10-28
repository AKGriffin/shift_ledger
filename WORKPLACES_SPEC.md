# Workplaces, Roles, and Shift Templates

Status: proposed design. Nothing here is implemented yet. It defines the data model and migration that the "Next" roadmap items build on:

- Manage workplaces and roles in Settings
- Use roles and templates when logging shifts
- Support roles without shift reports

## Goals

- Let one person track several workplaces, each with its own roles.
- Let a role carry a reusable, editable template that speeds up shift entry.
- Keep every existing shift and backup working with no data loss.
- Stay local-only and account-free.

## Today

- A shift has one free-text `job` string. The only choices are the hardcoded options `Server` and `Expo` in `index.html` (form and history filter).
- Settings has no job management. The "Jobs & roles" card is explanatory text only.
- Every shift is assumed to have sales, tips, and report fields.

## Concepts

| Concept | Meaning |
| --- | --- |
| Workplace | A place the user works, such as "Harbor Grill". Owns roles and its own pay-period setting. |
| Role | A position at one workplace, such as "Server". Belongs to exactly one workplace. |
| Template | Optional defaults for a role: meal period, clock-in/out times, break times, and whether the role tracks sales and reports. Used only to prefill the form. |
| Shift | A logged record. Keeps its own copy of the values, so editing or archiving a workplace, role, or template never rewrites history. |

The same title at two workplaces is two roles ("Server" at A, "Server" at B), so totals can be separated by workplace.

## Data model

Stored in a new key, `shift-ledger-workplaces-v1`, so the shift key stays backward compatible.

```json
{
  "version": 1,
  "setupDismissed": false,
  "workplaces": [
    {
      "id": "wp_1",
      "name": "Harbor Grill",
      "archived": false,
      "payPeriod": { "type": "biweekly", "anchorDate": "2026-01-02" },
      "roles": [
        {
          "id": "role_1",
          "name": "Server",
          "archived": false,
          "tracksReports": true,
          "template": {
            "mealPeriod": "Dinner",
            "clockIn": "16:00",
            "clockOut": "22:00",
            "breakStart": "",
            "breakEnd": ""
          }
        }
      ]
    }
  ]
}
```

Rules:

- `id` values are generated, unique, and never reused. Names are display-only and editable.
- Names are trimmed, 1-60 characters, and unique among non-archived siblings, compared case-insensitively.
- `payPeriod.type` is one of `weekly`, `biweekly`, `semimonthly`, `monthly`. Anchor dates apply to weekly and biweekly only. Defaults to the app's week-start setting.
- `template` fields are all optional. Time fields use the same `HH:MM` validation as shifts. `mealPeriod` is Lunch, Dinner, or Double.
- `tracksReports: false` means sales and report fields are unavailable for that role. See "Roles without reports".

## Changes to shifts

Add two optional fields; keep `job` unchanged:

```json
{ "workplaceId": "wp_1", "roleId": "role_1", "job": "Server" }
```

- `job` stays the display and export label. When a role is chosen, `job` is set to the role name at save time (a snapshot). Existing CSV export, filters, and the validator keep working.
- `workplaceId` and `roleId` are optional. Shifts without them are valid forever.
- A shift whose ids no longer match a role (deleted or imported from elsewhere) still displays using `job`.
- Optionally store `workplaceName` as a snapshot too, so a backup read on another device stays readable.

## First-run setup

Instead of silently creating "My workplace", the first launch after this feature ships (workplaces key absent) shows a short setup dialog:

- Asks for a workplace name. If the user has existing shifts, it lists the job values found in them (for example Server, Expo) as pre-checked roles the user can rename or uncheck.
- Offers pay-period type, defaulting to the week-start setting. Pay period can be left for later.
- Primary action "Save and continue" creates the workplace, roles and links, then runs the migration steps below.
- A "Skip for now" button closes the dialog without creating anything. The app keeps working with the legacy `job` behavior, and nothing is migrated.
- Skipping stores `setupDismissed: true` in the workplaces key so the prompt does not return on every launch. Settings keeps a "Set up workplaces" entry so users can start the setup later.
- Brand-new users with no shifts see the same dialog with no pre-filled roles.
- The dialog is a native `dialog` with a labeled heading, focus moved into it on open and returned afterwards, and Escape equals Skip.

Future: this dialog can become step one of an optional onboarding wizard (appearance, formats, workplaces, a first shift). That is out of scope here.

## Migration

Runs only when the user confirms the first-run setup, or later starts it from Settings. It is additive and never edits shifts destructively.

1. Use the workplace name, roles and pay period the user confirmed. The role list defaults to the distinct, trimmed `job` values from saved shifts. Without existing shifts, the user adds roles themselves.
2. Create the workplace with those roles, no templates, and `tracksReports: true`.
3. Link existing shifts by setting `roleId` and `workplaceId` where the `job` value matches a role (case-insensitive). Unmatched shifts are left as they are.
4. Write the workplaces key before rewriting any shift. If the write fails, leave shifts untouched and keep working with the legacy `job` behavior.
5. Preserve the original shift data under the existing recovery key before the first linking write.

Rollback: the original `job` field is never changed, so removing the new fields restores the old behavior.

Backups: bump the backup `version` to 2 and include `workplaces`. Importing a version 1 backup, or a bare array, does not migrate automatically; the first-run setup (or Settings) handles it afterwards. Importing a v2 backup replaces workplaces and shifts together, and validates both with the shared validator.

## Archiving and deleting

- Archive is the default. Archived workplaces and roles are hidden from the form's pickers but remain in history, filters, and exports.
- Archiving a workplace archives its roles in the UI but does not change them. Unarchiving restores them.
- Archived items can be unarchived at any time. Settings explains that history is not affected.
- A role or workplace with no linked shifts may be permanently deleted after confirmation. One with linked shifts can only be archived.
- Renaming a role changes future shifts only. Existing shifts keep their snapshot `job`.

## Logging a shift

- The form gets Workplace and Role selects. Role options depend on the workplace.
- If there is exactly one active workplace, it is preselected.
- Choosing a role prefills the template values for empty fields only. Everything stays editable and nothing overwrites values the user typed.
- Editing an older shift without ids shows its `job` as a read-only legacy label with an option to choose a role.
- "Save as template" from a shift and "Reset to template" are possible later; they are out of scope for the first version.

## Roles without reports

- When `tracksReports` is false, the form hides or disables the sales, tips-related report, and double-report sections, and saves them as absent rather than `0`.
- Dashboard totals count hours and tips only for such shifts. Sales totals exclude them, and the UI does not show `$0.00` as if a value existed.
- This depends on the roadmap's "shift-report coverage" item, which distinguishes no report from a zero-value report. Until that is done, hidden values save as `0`, which is the existing behavior.

## History and dashboard

- Add a Workplace filter next to the existing Job filter. The Job filter lists active and archived roles.
- Cards show "Role · Workplace" when ids are present, otherwise only `job`.
- The dashboard stays all-workplace by default; a workplace scope control is a later enhancement.

## Settings

Replace the "Jobs & roles" explanation with a manager:

- List workplaces; add, rename, archive, unarchive, and delete if unused.
- Per workplace: list roles with the same actions, an editable template, the reports toggle, and the pay period.
- Validation errors appear inline with `aria-describedby`, following the existing field pattern.

## Accessibility

- Use native `select`, `button`, and `fieldset` elements.
- Announce add, rename, and archive results through the existing `role="status"` region.
- Return focus to a sensible control after dialogs and list changes.

## Test plan

- Migration: legacy shifts gain links, unmatched shifts are unchanged, a failed write changes nothing, and running twice is a no-op.
- Backup: v1 and v2 imports, invalid workplace data is rejected, and old backups still restore.
- Archiving: hides pickers, keeps history and filters, and blocks deleting a used role.
- Form: template prefill does not overwrite typed values, the role list follows the workplace, and `job` snapshots.
- Roles without reports: fields are hidden and totals are correct.

## Decisions

1. A shift has exactly one role. A shift that covers two roles is logged as two shifts.
2. Pay periods are set per workplace, defaulting to the global week start.
3. Each role has one template for now. Several named templates per role are a later option.
4. The first-run setup is a prompt, not a silent migration (see "First-run setup"). Users can skip it.
5. An optional onboarding wizard is a possible future feature. The first-run prompt is designed so it can become the wizard's first step.

## Implementation notes

Where the shipped version differs from the plan above:

- The setup dialog uses an add-a-row list of roles, like the shift form's notes (Enter adds a row, Backspace on an empty row removes it), prefilled from existing jobs, instead of a checkbox list.
- The pre-linking copy of shifts is saved under `shift-ledger-shifts-v1-pre-workplaces`, separate from the corruption recovery key, so neither overwrites the other.
- Pay period is not in the setup dialog; users set it per workplace from Settings.
