import { describe, expect, test } from "./assert.js";
import { makeShift, withApp } from "./app-harness.js";

function importBackup(harness, backup) {
    const input = harness.element("#backup-file");
    const transfer = new harness.win.DataTransfer();
    transfer.items.add(new harness.win.File([JSON.stringify(backup)], "backup.json", {
        type: "application/json",
    }));
    input.files = transfer.files;
    harness.fire(input, "change");
    return harness.respondToConfirmDialog(true);
}

describe("Incomplete shifts", () => {
    test("marks complete shifts as complete", () => withApp({
        shifts: [makeShift({ id: 21 })],
    }, ({ openView, element }) => {
        openView("previous-shifts");
        expect(element('.shift-card[data-shift-id="21"] .card-incomplete').hidden).toBe(true);
    }));

    test("shows the incomplete badge and missing fields in history", () => withApp({
        shifts: [makeShift({
            id: 22,
            job: "",
            mealPeriod: "",
            clockIn: "",
            clockOut: "",
            isIncomplete: true,
        })],
    }, ({ openView, element }) => {
        openView("previous-shifts");

        const card = element('.shift-card[data-shift-id="22"]');
        expect(card.querySelector(".card-incomplete").hidden).toBe(false);
        expect(card.querySelector(".card-missing-fields").hidden).toBe(false);
        expect(card.querySelector(".card-missing-fields").textContent).toContain("Missing:");
        expect(card.querySelector(".card-missing-fields").textContent).toContain("Worked period");
    }));

    test("excludes incomplete shifts from dashboard totals", () => withApp({
        shifts: [
            makeShift({ id: 23, foodSales: 100 }),
            makeShift({
                id: 24,
                date: "2026-10-21",
                job: "",
                mealPeriod: "",
                clockIn: "",
                clockOut: "",
                foodSales: 900,
                isIncomplete: true,
            }),
        ],
    }, ({ element, openView }) => {
        openView("dashboard");

        expect(element("#summary-total-shifts").textContent).toBe("1");
        expect(element("#summary-total-sales").textContent).toBe("$100.00");
    }));

    test("filters history to incomplete shifts only", () => withApp({
        shifts: [
            makeShift({ id: 25 }),
            makeShift({
                id: 26,
                job: "",
                mealPeriod: "",
                clockIn: "",
                clockOut: "",
                isIncomplete: true,
            }),
        ],
    }, ({ openView, element, elements, fire }) => {
        openView("previous-shifts");
        element("#filter-incomplete").value = "incomplete";
        fire(element("#filter-incomplete"), "change");

        const cards = elements(".shift-card");
        expect(cards).toHaveLength(1);
        expect(cards[0].dataset.shiftId).toBe("26");
        expect(cards[0].querySelector(".card-incomplete").hidden).toBe(false);
    }));

    test("filters history to complete shifts only", () => withApp({
        shifts: [
            makeShift({ id: 27 }),
            makeShift({
                id: 28,
                job: "",
                mealPeriod: "",
                clockIn: "",
                clockOut: "",
                isIncomplete: true,
            }),
        ],
    }, ({ openView, element, elements, fire }) => {
        openView("previous-shifts");
        element("#filter-incomplete").value = "complete";
        fire(element("#filter-incomplete"), "change");

        const cards = elements(".shift-card");
        expect(cards).toHaveLength(1);
        expect(cards[0].dataset.shiftId).toBe("27");
        expect(cards[0].querySelector(".card-incomplete").hidden).toBe(true);
    }));

    test("can complete an incomplete shift by editing its missing fields", () => withApp({
        shifts: [makeShift({
            id: 29,
            job: "",
            mealPeriod: "",
            clockIn: "",
            clockOut: "",
            isIncomplete: true,
        })],
    }, ({ element, openView, fillForm, change, savedShifts, submitForm }) => {
        openView("previous-shifts");
        element('.shift-card[data-shift-id="29"] .edit-shift').click();
        change("#shift-workplace", "test-workplace");
        change("#shift-role", "test-server");
        change("#shift-meal-period", "Dinner");
        fillForm({ clockIn: "16:00", clockOut: "22:00" });
        submitForm();

        expect(savedShifts()).toHaveLength(1);
        expect(savedShifts()[0].isIncomplete).toBe(false);
        expect(savedShifts()[0].mealPeriod).toBe("Dinner");
        expect(savedShifts()[0].clockOut).toBe("22:00");
    }));

    test("exports the incomplete flag in a backup", () => withApp({
        shifts: [makeShift({
            id: 30,
            job: "",
            mealPeriod: "",
            clockIn: "",
            clockOut: "",
            isIncomplete: true,
        })],
    }, (harness) => {
        let exported = "";
        harness.win.Blob = class {
            constructor(parts) {
                exported = parts.join("");
            }
        };
        harness.win.URL.createObjectURL = () => "blob:test";
        harness.win.URL.revokeObjectURL = () => {};
        harness.openView("settings");
        harness.element("#export-backup").click();

        const backup = JSON.parse(exported);
        expect(backup.shifts).toHaveLength(1);
        expect(backup.shifts[0].isIncomplete).toBe(true);
    }));

    test("restores an incomplete shift from a JSON backup", () => withApp(async (harness) => {
        harness.openView("settings");
        await importBackup(harness, {
            format: "shift-ledger-backup",
            version: 2,
            shifts: [makeShift({
                id: 31,
                job: "",
                mealPeriod: "",
                clockIn: "",
                clockOut: "",
                isIncomplete: true,
            })],
        });

        expect(harness.savedShifts()).toHaveLength(1);
        expect(harness.savedShifts()[0].isIncomplete).toBe(true);
        expect(harness.element("#form-status").textContent).toContain("Restored 1 shift");
    }));

    test("restores flexible reports from a JSON backup", () => withApp(async (harness) => {
        harness.openView("settings");
        await importBackup(harness, {
            format: "shift-ledger-backup",
            version: 2,
            shifts: [makeShift({ mealPeriod: "Double", reports: [
                { id: "generic-1", label: "Brunch", coverage: "part", foodSales: 100 },
                { id: "generic-2", label: "All day", coverage: "whole", foodSales: 300 },
            ] })],
        });
        expect(harness.savedShifts()[0].reports[0].label).toBe("Brunch");
        harness.openView("previous-shifts");
        expect(harness.element("#summary-total-sales").textContent).toBe("$300.00");
    }));
});
