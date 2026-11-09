# Partial Shifts Implementation Plan

## Overview
Enable users to save shifts with minimal data (date required only) and gradually fill in details. Features incomplete shifts with badges, missing field reviews, and proper handling throughout the app.

## Implementation Phases

### Phase 1: Core Data Model & Validation (HIGH PRIORITY)

#### 1.1 Add `isIncomplete` Property to Shift Objects
**File**: All places shifts are created/read
```javascript
shift = {
  id: string,
  date: string,  // REQUIRED
  isIncomplete: boolean,  // NEW: true if any required field missing
  
  // Optional fields (can be missing)
  mealPeriod?: string,
  workplaceId?: string,
  roleId?: string,
  job?: string,
  clockIn?: string,
  clockOut?: string,
  breakStart?: string,
  breakEnd?: string,
  
  // Report fields (optional)
  noSalesReport?: boolean,
  noTipsReport?: boolean,
  foodSales?: number,
  // ... all sales/tips fields optional
}
```

**Changes needed:**
1. `readFormValues()` - Set `isIncomplete` flag
2. `normalizeImportedShift()` - Preserve/infer flag on import
3. JSON backup/restore - Include flag

#### 1.2 Create Helper Function: `getIncompleteFields(shift)`
Returns array of missing fields with human-readable names.

```javascript
function getIncompleteFields(shift) {
  const missing = [];
  
  // Core required when workplace mode
  if (isWorkplaceMode()) {
    if (!shift.workplaceId) missing.push("Workplace");
    if (!shift.roleId) missing.push("Role");
  } else if (!shift.job) {
    missing.push("Job");
  }
  
  if (!shift.mealPeriod && !isWorkplaceMode()) missing.push("Meal period");
  if (!shift.clockIn) missing.push("Clock in");
  if (!shift.clockOut) missing.push("Clock out");
  
  // Only show if partial break (has start but no end, or vice versa)
  if (shift.breakStart && !shift.breakEnd) missing.push("Break end");
  if (shift.breakEnd && !shift.breakStart) missing.push("Break start");
  
  return missing;
}
```

#### 1.3 Modify Validation: Two Modes
```javascript
function validateShift(shift, allowPartial = false) {
  const issues = [];
  
  // Always required: date
  if (!shift.date) {
    issues.push({ field: "date", message: "Date is required." });
    return issues;
  }
  
  if (!allowPartial) {
    // Full validation (current behavior)
    // ... existing validation ...
  } else {
    // Partial validation: only validate provided values
    if (shift.clockIn && shift.clockOut) {
      // Validate clock times are different
      if (toMinutes(shift.clockOut) === toMinutes(shift.clockIn)) {
        issues.push({
          field: "clockOut",
          message: "Clock out must differ from clock in; an earlier time means the next day.",
        });
      }
    }
    
    // Always validate: if break exists, needs both ends
    if (shift.breakStart && !shift.breakEnd) {
      issues.push({ field: "breakEnd", message: "Break end is required when a break starts." });
    }
    if (shift.breakEnd && !shift.breakStart) {
      issues.push({ field: "breakStart", message: "Break start is required when a break ends." });
    }
    
    // Validate break is within shift (if all time fields present)
    if (shift.clockIn && shift.clockOut && shift.breakStart && shift.breakEnd) {
      // ... existing break validation ...
    }
  }
  
  return issues;
}
```

### Phase 2: Form & Review UI (HIGH PRIORITY)

#### 2.1 Add "Save Incomplete" Option in Review Screen
- Show when shift has missing fields
- Warning message: "Some fields are missing. You can fill them in later."
- Button: "Save as incomplete" (secondary button)
- Still have "Back to edit" and "Save" (primary)

**Changes:**
- `showShiftReview(shift)` - Check if incomplete, show extra option
- Add new button to shift review template
- Wire up button to save with `isIncomplete=true`

#### 2.2 Modify Form Submission Flow
```javascript
function handleFormSubmit(event) {
  // ... existing code ...
  
  const shift = readFormValues();
  
  // Check if user wants to save incomplete
  const shouldAllowPartial = isUserSavingIncomplete();
  
  const issues = validateShift(shift, shouldAllowPartial);
  if (issues.length > 0) {
    showValidationErrors(issues);
    return;
  }
  
  // Set incomplete flag
  if (shouldAllowPartial || getIncompleteFields(shift).length > 0) {
    shift.isIncomplete = true;
  }
  
  // ... rest of save logic ...
}
```

#### 2.3 Show Missing Fields Review
When saving incomplete shift, show:
- "This shift is incomplete"
- "Missing: Clock in, Clock out, Meal period"
- "You can edit it anytime to add these details"

---

### Phase 3: Display & Reporting (MEDIUM PRIORITY)

#### 3.1 Add "Incomplete" Badge to Shift Cards
**File**: Shift card template / rendering

```html
<article class="shift-card">
  <div class="shift-card-header">
    <span class="shift-date">Oct 22</span>
    <span class="shift-badge" data-badge="incomplete">Incomplete</span>
  </div>
  <!-- rest of card -->
</article>
```

**Styling**: Subtle but clear (yellow/amber background)

#### 3.2 Show Missing Fields in Card Summary
```html
<div class="shift-summary">
  <p class="shift-job">Server · Blue Restaurant</p>
  <p class="shift-missing" data-missing-fields>
    Missing: Hours, Meal period, Sales
  </p>
</div>
```

#### 3.3 Update History & Dashboard
- **History totals**: Exclude incomplete shifts or show separately
- **Dashboard**: Show incomplete shift count or separate section
- **CSV export**: Include `isIncomplete` column or note in existing columns

---

### Phase 4: Filtering & Sorting (MEDIUM PRIORITY)

#### 4.1 Add "Incomplete" Filter in History
- Filter chip: "Show all" / "Complete only" / "Incomplete only"
- Default: Show all
- Sorting: Incomplete shifts appear last

**Changes:**
- `renderPreviousShifts()` - Apply incomplete filter
- Add filter UI to history toolbar
- Add to filter chips display

#### 4.2 Update Sort Logic
When sorting by date/hours/earnings:
- Complete shifts sorted normally
- Incomplete shifts group at end (within same sort order)

---

### Phase 5: Data Integrity & Cleanup (LOW PRIORITY, PHASE 2+)

#### 5.1 Migration & Backward Compatibility
- Existing shifts: Set `isIncomplete = false`
- Import old backups: Infer incomplete status from data
- Don't break existing functionality

#### 5.2 Auto-complete Detection
When editing incomplete shift:
- If user fills in all required fields, auto-remove `isIncomplete` flag
- Show success message: "Shift is now complete!"

#### 5.3 Incomplete Shift Cleanup (Future)
- Option to delete incomplete shifts older than 30 days
- Warning in Settings
- Manual cleanup UI

---

## Implementation Checklist

### Phase 1: Core Data Model
- [ ] Add `isIncomplete` to shift creation
- [ ] Create `getIncompleteFields()` helper
- [ ] Create `getMissingFieldsText()` for display
- [ ] Modify `validateShift()` for partial mode
- [ ] Update `readFormValues()` to set flag
- [ ] Update `normalizeImportedShift()` to preserve flag
- [ ] Add to JSON backup/restore

### Phase 2: Form & Review
- [ ] Modify `showShiftReview()` to show missing fields
- [ ] Add "Save incomplete" button to review
- [ ] Wire up button to save with `isIncomplete=true`
- [ ] Update `handleFormSubmit()` to use partial validation
- [ ] Add warning message when saving incomplete
- [ ] Test guided vs manual entry paths

### Phase 3: Display
- [ ] Add incomplete badge CSS
- [ ] Update shift card rendering
- [ ] Show missing fields in card
- [ ] Update dashboard to handle incomplete
- [ ] Update CSV export
- [ ] Test on mobile

### Phase 4: Filtering
- [ ] Add incomplete filter UI
- [ ] Implement filter logic
- [ ] Update sort logic
- [ ] Test filter combinations

### Phase 5: Data & Cleanup
- [ ] Test import/export compatibility
- [ ] Test editing incomplete → complete flow
- [ ] Test with real incomplete shifts
- [ ] Performance check (no slowdown with flag)

---

## Testing Strategy

### Unit Tests Needed
- `getIncompleteFields()` with various shifts
- `validateShift()` in partial mode
- Filter logic with incomplete shifts
- Sort logic with incomplete shifts

### Integration Tests
- Save incomplete shift → appears in history with badge
- Edit incomplete → add fields → remove flag automatically
- Filter by incomplete → shows only those
- CSV export includes incomplete status

### Manual Testing
- Guided entry → save incomplete
- Manual entry → save incomplete
- Edit existing shift → mark complete
- Backup/restore with incomplete shifts
- Mobile: badge visibility, missing fields display

---

## UI/UX Considerations

### Color & Styling
- Badge: Amber/yellow (warning, not danger)
- Missing fields: Gray text, subtle styling
- "Save incomplete" button: Secondary styling

### Messaging
- Clear what's missing: "Missing: Hours, Job title"
- Encouraging: "You can fill these in later"
- Non-punitive: Incomplete shifts work fine for basic tracking

### Mobile
- Badge readable on small screens
- Missing fields list doesn't overflow
- "Save incomplete" button clearly visible
- No breaking layout at any viewport

### Accessibility
- Badge and missing text properly labeled
- Filter controls keyboard accessible
- Screen reader announces "Incomplete" status
- High contrast for badge color

---

## Database/Storage Impact

### Shift Object Changes
```diff
{
  id: string,
  date: string,
+ isIncomplete: boolean,  // NEW
  mealPeriod?: string,
  // ... rest unchanged
}
```

### Storage Size
- New flag: 1 byte boolean per shift
- Impact: Negligible for typical users (< 500 shifts)
- JSON storage: ~20-30 bytes per shift (key + value)

### Backward Compatibility
- Old shifts without flag: Infer from data completeness
- Import: Preserve flag if present, infer if missing
- Export: Always include flag

---

## Performance Considerations

### Runtime
- `getIncompleteFields()`: O(1) per shift
- `validateShift()` partial mode: O(1) vs O(n) for breaks
- Filter application: O(n) like existing filters
- Impact: Negligible

### Storage
- No new database/IndexedDB changes
- localStorage size: < 1% increase for typical usage

### Rendering
- Badge: Simple DOM element
- Missing fields text: Simple append
- No complex calculations
- Impact: None

---

## Edge Cases to Handle

1. **Shift with only date**: Valid, incomplete
2. **Shift with workplace but no role**: Invalid (if role required)
3. **Shift with break but no times**: Caught by validation
4. **Incomplete shift edited and saved again**: Check if now complete
5. **Filter set to "Incomplete only" with no incomplete shifts**: Show message
6. **CSV export with mixed complete/incomplete**: Show both clearly
7. **Backup with only incomplete shifts**: Should work fine
8. **Import old backup (no isIncomplete field)**: Infer from data

---

## Future Enhancements

1. **Shift Drafts**: Store in-progress shifts separately (separate feature)
2. **Auto-save**: Periodically save incomplete shifts
3. **Resume Flow**: "Resume incomplete shift" button in entry
4. **Incomplete Alerts**: In dashboard or settings
5. **Analytics**: Track how many incomplete shifts get completed vs deleted
6. **Mobile Quick Entry**: Minimal form for quick incomplete saves
7. **Templates**: Pre-fill from previous complete shifts

---

## Success Criteria

✅ Users can save shifts with only a date
✅ Incomplete shifts clearly marked with badge
✅ Missing fields listed and actionable
✅ No data loss when saving incomplete
✅ Complete/incomplete filtering works
✅ CSV export includes status
✅ Mobile layout unaffected
✅ Existing tests still pass
✅ New tests cover partial validation
✅ Performance unaffected
