# Workplaces, Roles, and Shift Templates

Status: implementation reference. It records the workplace data model and behavior:

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
      "startDate": "2020-03-10",
      "endDate": "2026-10-29",
      "payPeriod": { "type": "biweekly", "startDay": "friday", "anchorDate": "2026-01-02" },
      "roles": [
        {
          "id": "role_1",
          "name": "Server",
          "archived": false,
          "tracksSales": true,
          "receivesTips": true,
          "tipsOut": true,
          "receivesTipOut": true,
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
- Workplace `startDate` and `endDate` are optional ISO dates. If both are set, the end date cannot precede the start date. They are descriptive only and never restrict shift logging or history.
- `payPeriod.type` is one of `weekly`, `biweekly`, `semimonthly`, `monthly`. Weekly and biweekly periods store a `startDay` weekday, defaulting to the app's week-start setting. Biweekly periods also require an `anchorDate` reference start to preserve alternating-week alignment; it must fall on `startDay`. Legacy weekly/biweekly anchor dates are normalized to their weekday, and legacy biweekly dates remain as the reference.
- `template` fields are all optional. Time fields use the same `HH:MM` validation as shifts. `mealPeriod` is Lunch, Dinner, or Double.
- `tracksSales`, `receivesTips`, `tipsOut`, and `receivesTipOut` default to `true`; only `false` values need to be stored. They control sales fields, earned-tip fields, tips-paid-out fields, and tip-out-received fields independently.
- Legacy `tracksReports: false` data normalizes to all four capabilities being `false`. Saving role settings writes the independent capabilities and removes the legacy property.
- Templates remain separate and continue to hold only meal period and time defaults.

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
- Offers an optional pay-period frequency and start weekday, defaulting to the week-start setting. Every two weeks also requires a reference start date to preserve the alternating-week cycle.
- Offers optional workplace start and end dates for recordkeeping only.
- Primary action "Save and continue" creates the workplace, roles and links, then runs the migration steps below.
- A "Skip for now" button closes the dialog without creating anything. The app keeps working with the legacy `job` behavior, and nothing is migrated.
- Skipping stores `setupDismissed: true` in the workplaces key so the prompt does not return on every launch. Settings keeps a "Set up workplaces" entry so users can start the setup later.
- Brand-new users with no shifts see the same dialog with no pre-filled roles.
- The dialog is a native `dialog` with a labeled heading, focus moved into it on open and returned afterwards, and Escape equals Skip.

Future: this dialog can become step one of an optional onboarding wizard (appearance, formats, workplaces, a first shift). That is out of scope here.

## Migration

Runs only when the user confirms the first-run setup, or later starts it from Settings. It is additive and never edits shifts destructively.

1. Use the workplace name, roles and pay period the user confirmed. The role list defaults to the distinct, trimmed `job` values from saved shifts. Without existing shifts, the user adds roles themselves.
2. Create the workplace with those roles, no templates, and all capabilities enabled.
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

## Role capabilities

- The role settings dialog independently controls sales reports, receiving earned tips, paying tips out, and receiving tip-outs. Templates and hourly wages remain in the same dialog but are not replaced by these switches.
- New shift entry hides fields the selected role does not use. Unsupported amounts on new shifts are saved as empty strings, not zero. Report coverage remains separate from a reported zero.
- For double reports, each report may carry `noSales` or `noTips` when a role lacks that capability. Totals and coverage exclude only the unavailable category.
- Existing shifts are historical records: editing them preserves amounts and report coverage even if the current role hides those fields. Capability changes affect future entries, not saved history.
- Legacy `tracksReports: false` roles migrate to all four capability switches being off; backups using the old property remain supported.

## History and dashboard

- Add a Workplace filter next to the existing Job filter. The Job filter lists active and archived roles.
- Cards show "Role · Workplace" when ids are present, otherwise only `job`.
- The dashboard stays all-workplace by default; a workplace scope control is a later enhancement.

## Settings

Replace the "Jobs & roles" explanation with a manager:

- List workplaces; add, rename, archive, unarchive, and delete if unused.
- Per workplace: list roles with the same actions, editable time templates and role capabilities, and the pay period.
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
- Role capabilities: only supported fields appear, unavailable categories stay out of totals, empty values survive backups, and editing historical shifts preserves their amounts.

## Decisions

1. A shift has exactly one role. A shift that covers two roles is logged as two shifts.
2. Pay periods are set per workplace. Weekly and biweekly periods start on a selected weekday; biweekly periods retain a reference date for accurate cycle alignment. The default weekday is the global week start.
3. Each role has one template for now. Several named templates per role are a later option.
4. The first-run setup is a prompt, not a silent migration (see "First-run setup"). Users can skip it.
5. An optional onboarding wizard is a possible future feature. The first-run prompt is designed so it can become the wizard's first step.

## Implementation notes

Where the shipped version differs from the plan above:

- The setup dialog uses an add-a-row list of roles, like the shift form's notes (Enter adds a row, Backspace on an empty row removes it), prefilled from existing jobs, instead of a checkbox list.
- The pre-linking copy of shifts is saved under `shift-ledger-shifts-v1-pre-workplaces`, separate from the corruption recovery key, so neither overwrites the other.
- Workplace setup and Settings share a form for pay periods and optional workplace dates. Workplace dates are also editable from the workplace's Settings actions and don't affect shifts or history.
