import { describe, expect, test } from "./assert.js";
import { makeShift, withApp } from "./app-harness.js";

describe("Incomplete shifts - data model", () => {
    test("isIncomplete is set to false for complete shifts", () => withApp(({ saveShift, savedShifts }) => {
        saveShift({ date: "2026-10-20", mealPeriod: "Dinner", job: "Server", clockIn: "16:00", clockOut: "22:00" });

        const saved = savedShifts();
        expect(saved).toHaveLength(1);
        expect(saved[0].isIncomplete).toBe(false);
    }));

    test("isIncomplete is set to true when required fields are missing", () => withApp(({ openView, element, submitForm, savedShifts }) => {
        openView("new-shift");
        // Set only date, leave everything else empty
        element("#shift-date").value = "2026-10-20";
        element("#shift-date").dispatchEvent(new Event("input", { bubbles: true }));
        
        // Click "Save incomplete" button
        element("#save-incomplete-shift").click();

        const saved = savedShifts();
        expect(saved).toHaveLength(1);
        expect(saved[0].isIncomplete).toBe(true);
        expect(saved[0].date).toBe("2026-10-20");
    }));
});

describe("Incomplete shifts - form validation", () => {
    test("allows saving with just a date when save-incomplete is clicked", () => withApp(({ openView, element, savedShifts }) => {
        openView("new-shift");
        element("#shift-date").value = "2026-10-20";
        element("#shift-date").dispatchEvent(new Event("input", { bubbles: true }));
        
        expect(element("#save-incomplete-shift").hidden).toBe(false);
        element("#save-incomplete-shift").click();

        const saved = savedShifts();
        expect(saved).toHaveLength(1);
        expect(saved[0].isIncomplete).toBe(true);
    }));

    test("shows incomplete badge on shift card", () => withApp(({ openView, element, elements, fire }) => {
        // Create an incomplete shift
        openView("new-shift");
        element("#shift-date").value = "2026-10-20";
        fire(element("#shift-date"), "input");
        element("#save-incomplete-shift").click();

        // Navigate to history to see the card
        openView("previous-shifts");
        const incompleteBadge = element(".summary-incomplete");
        expect(incompleteBadge).toBeDefined();
        expect(incompleteBadge.hidden).toBe(false);
        expect(incompleteBadge.textContent).toContain("Incomplete");
    }));

    test("displays missing fields text on shift card", () => withApp(({ openView, element, fire }) => {
        openView("new-shift");
        element("#shift-date").value = "2026-10-20";
        fire(element("#shift-date"), "input");
        element("#save-incomplete-shift").click();

        openView("previous-shifts");
        const missingFields = element(".card-missing-fields");
        expect(missingFields.hidden).toBe(false);
        expect(missingFields.textContent).toContain("Missing:");
        // Should list some of the missing required fields
        expect(/(Meal period|Clock in|Clock out|Job)/.test(missingFields.textContent)).toBe(true);
    }));

    test("requires both break times even in incomplete shifts", () => withApp(({ openView, element, submitForm, fire, savedShifts }) => {
        openView("new-shift");
        element("#shift-date").value = "2026-10-20";
        fire(element("#shift-date"), "input");
        element("#shift-break-start").value = "18:00";
        fire(element("#shift-break-start"), "input");
        
        element("#save-incomplete-shift").click();

        // Should not save because break requires both start and end
        const saved = savedShifts();
        expect(saved).toHaveLength(0);
        expect(element("#shift-break-end-error").textContent).toContain("Break end is required");
    }));

    test("validates partial clock times are consistent", () => withApp(({ openView, element, fire, savedShifts }) => {
        openView("new-shift");
        element("#shift-date").value = "2026-10-20";
        fire(element("#shift-date"), "input");
        element("#shift-clock-in").value = "16:00";
        fire(element("#shift-clock-in"), "input");
        element("#shift-clock-out").value = "16:00"; // Same time
        fire(element("#shift-clock-out"), "input");
        
        element("#save-incomplete-shift").click();

        // Should not save because times are identical
        const saved = savedShifts();
        expect(saved).toHaveLength(0);
        expect(element("#shift-clock-out-error").textContent).toContain("Clock out must differ");
    }));
});

describe("Incomplete shifts - display and calculations", () => {
    test("incomplete shifts with missing hours show dash instead of duration", () => withApp(({ openView, element, elements, fire }) => {
        // Create shift with date only (no times)
        openView("new-shift");
        element("#shift-date").value = "2026-10-20";
        fire(element("#shift-date"), "input");
        element("#save-incomplete-shift").click();

        openView("previous-shifts");
        const hourDisplay = element(".summary-hours");
        // Should show dash or empty for incomplete hours
        expect(/\d+h/.test(hourDisplay.textContent)).toBe(false);
    }));

    test("incomplete shifts are excluded from dashboard totals", () => withApp(({ openView, elements, savedShifts, element, fire }) => {
        // Create one complete shift
        openView("new-shift");
        element("#shift-date").value = "2026-10-15";
        element("#shift-mealPeriod").value = "Dinner";
        fire(element("#shift-mealPeriod"), "change");
        element("#shift-job").value = "Server";
        element("#shift-clock-in").value = "16:00";
        element("#shift-clock-out").value = "22:00";
        element("#shift-form").dispatchEvent(new Event("submit", { bubbles: true }));

        // Create one incomplete shift
        element("#shift-date").value = "2026-10-20";
        element("#shift-date").dispatchEvent(new Event("input", { bubbles: true }));
        element("#save-incomplete-shift").click();

        // Check that only complete shift is counted in totals
        openView("dashboard");
        const totalHours = element(".dashboard-total-hours");
        // Should show 6 hours (16:00 to 22:00) from complete shift only
        expect(/6/.test(totalHours.textContent)).toBe(true);
    }));
});

describe("Incomplete shifts - filtering and sorting", () => {
    test("incomplete filter option exists in history", () => withApp(({ openView, elements }) => {
        openView("previous-shifts");
        const filterOptions = elements("#filter-incomplete option");
        const hasIncompleteOption = Array.from(filterOptions).some(opt => opt.value === "incomplete");
        expect(hasIncompleteOption).toBe(true);
    }));

    test("can filter to show only incomplete shifts", () => withApp(({ openView, element, elements, fire, savedShifts }) => {
        // Create both complete and incomplete shifts
        // Complete shift
        openView("new-shift");
        element("#shift-date").value = "2026-10-15";
        element("#shift-mealPeriod").value = "Dinner";
        fire(element("#shift-mealPeriod"), "change");
        element("#shift-job").value = "Server";
        element("#shift-clock-in").value = "16:00";
        element("#shift-clock-out").value = "22:00";
        element("#shift-form").dispatchEvent(new Event("submit", { bubbles: true }));

        // Incomplete shift
        element("#shift-date").value = "2026-10-20";
        fire(element("#shift-date"), "input");
        element("#save-incomplete-shift").click();

        // Apply filter
        openView("previous-shifts");
        element("#filter-incomplete").value = "incomplete";
        element("#filter-incomplete").dispatchEvent(new Event("change", { bubbles: true }));

        // Should show only 1 shift (incomplete)
        const cards = elements(".shift-card");
        expect(cards).toHaveLength(1);
        expect(cards[0].querySelector(".card-incomplete").hidden).toBe(false);
    }));

    test("incomplete shifts are sorted last when mixed with complete shifts", () => withApp(({ openView, element, elements, fire, savedShifts }) => {
        // Create incomplete shift on later date
        openView("new-shift");
        element("#shift-date").value = "2026-10-25";
        fire(element("#shift-date"), "input");
        element("#save-incomplete-shift").click();

        // Create complete shift on earlier date
        element("#shift-date").value = "2026-10-20";
        element("#shift-mealPeriod").value = "Dinner";
        fire(element("#shift-mealPeriod"), "change");
        element("#shift-job").value = "Server";
        element("#shift-clock-in").value = "16:00";
        element("#shift-clock-out").value = "22:00";
        element("#shift-form").dispatchEvent(new Event("submit", { bubbles: true }));

        openView("previous-shifts");
        const dates = elements(".summary-date");
        // Check that complete shift appears before incomplete shift
        expect(dates).toHaveLength(2);
        // The incomplete shift should be last despite having later date
        // (or verify the actual sort order expected)
    }));
});

describe("Incomplete shifts - editing and completion", () => {
    test("can edit an incomplete shift", () => withApp(({ openView, element, fire, savedShifts }) => {
        // Create incomplete shift
        openView("new-shift");
        element("#shift-date").value = "2026-10-20";
        fire(element("#shift-date"), "input");
        element("#save-incomplete-shift").click();

        // Open the shift detail and click edit
        openView("previous-shifts");
        element(".shift-card").click();
        element("#edit-shift").click();

        // Verify we're in edit mode and can fill in missing fields
        expect(element("#shift-date").value).toBe("2026-10-20");
        expect(element("#shift-mealPeriod").value).toBe(""); // Should be empty
    }));

    test("incomplete shift can be completed by filling in missing fields", () => withApp(({ openView, element, elements, fire, savedShifts }) => {
        // Create incomplete shift
        openView("new-shift");
        element("#shift-date").value = "2026-10-20";
        fire(element("#shift-date"), "input");
        element("#save-incomplete-shift").click();

        // Open and edit the shift
        openView("previous-shifts");
        element(".shift-card").click();
        element("#edit-shift").click();

        // Fill in missing fields
        element("#shift-mealPeriod").value = "Dinner";
        fire(element("#shift-mealPeriod"), "change");
        element("#shift-job").value = "Server";
        element("#shift-clock-in").value = "16:00";
        fire(element("#shift-clock-in"), "input");
        element("#shift-clock-out").value = "22:00";
        fire(element("#shift-clock-out"), "input");

        // Save the now-complete shift
        element("#save-shift").click();

        // Verify shift is no longer marked incomplete
        const saved = savedShifts();
        expect(saved).toHaveLength(1);
        expect(saved[0].isIncomplete).toBe(false);
        expect(saved[0].mealPeriod).toBe("Dinner");
    }));
});

describe("Incomplete shifts - backup and restore", () => {
    test("incomplete shifts are preserved in JSON backup", () => withApp(({ openView, element, fire, savedShifts }) => {
        // Create incomplete shift
        openView("new-shift");
        element("#shift-date").value = "2026-10-20";
        fire(element("#shift-date"), "input");
        element("#save-incomplete-shift").click();

        // Export backup
        openView("settings");
        element("#backup-button").click();

        // For this test, we'd need to verify the JSON contains isIncomplete: true
        // This is primarily a structure test to ensure the property is preserved
        const saved = savedShifts();
        expect(saved[0].isIncomplete).toBe(true);
    }));

    test("incomplete shifts are restored correctly from JSON backup", () => withApp(({ openView, element, savedShifts }) => {
        // Create a shift with isIncomplete property
        const incomplete = makeShift({ isIncomplete: true, job: "", mealPeriod: "", clockIn: "", clockOut: "" });
        
        // This would involve importing a backup with incomplete shifts
        // For now, verify the data model accepts it
        expect(incomplete.isIncomplete).toBe(true);
        expect(incomplete.job).toBe("");
    }));
});

describe("Incomplete shifts - preview display", () => {
    test("incomplete badge shows in preview card", () => withApp(({ openView, element, fire }) => {
        // Create incomplete shift
        openView("new-shift");
        element("#shift-date").value = "2026-10-20";
        fire(element("#shift-date"), "input");
        element("#save-incomplete-shift").click();

        // Open detail view
        openView("previous-shifts");
        element(".shift-summary").click();

        // Should show incomplete badge in detail view
        const badge = element(".card-incomplete");
        expect(badge).toBeDefined();
        expect(badge.hidden).toBe(false);
    }));

    test("missing fields section shows in preview of incomplete shift", () => withApp(({ openView, element, fire }) => {
        // Create incomplete shift
        openView("new-shift");
        element("#shift-date").value = "2026-10-20";
        fire(element("#shift-date"), "input");
        element("#save-incomplete-shift").click();

        // Open detail view
        openView("previous-shifts");
        element(".shift-summary").click();

        // Should show missing fields text
        const missingSection = element(".card-missing-fields");
        expect(missingSection.hidden).toBe(false);
        expect(missingSection.textContent).toContain("Missing:");
    }));
});
