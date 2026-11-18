import { describe, expect, test } from "./assert.js";
import { makeShift, PRE_FLEXIBLE_REPORTS_STORAGE_KEY, SHIFT_STORAGE_KEY, withApp } from "./app-harness.js";

describe("Single-shift report coverage", () => {
    const check = ({ element, fire }, id) => {
        const box = element(id);
        box.checked = true;
        fire(box, "change");
    };
    const markNoReport = (harness) => {
        check(harness, "#shift-no-sales-report");
        check(harness, "#shift-no-tips-report");
    };

    test("lets a single shift be saved with no report and disables its amount fields", () => withApp((harness) => {
        const { fillForm, openView, submitForm, savedShifts } = harness;
        openView("new-shift");
        fillForm({ date: "2026-10-23", mealPeriod: "Dinner", job: "Server", clockIn: "16:00", clockOut: "22:00", foodSales: 150 });
        markNoReport(harness);
        expect([...harness.elements("[data-report-inputs] input[type='number']")].every((input) => input.disabled)).toBe(true);
        submitForm();

        const [saved] = savedShifts();
        expect(saved.noReport).toBe(true);
        expect(saved.foodSales).toBe(0);
    }));

    test("saves a shift with tips but no sales report", () => withApp((harness) => {
        const { fillForm, openView, submitForm, savedShifts } = harness;
        openView("new-shift");
        fillForm({ date: "2026-10-23", mealPeriod: "Dinner", job: "Server", clockIn: "16:00", clockOut: "22:00", foodSales: 150, ccTips: 30 });
        check(harness, "#shift-no-sales-report");
        submitForm();

        const [saved] = savedShifts();
        expect(saved.noSales).toBe(true);
        expect(saved.noReport).toBeUndefined();
        expect(saved.foodSales).toBe(0);
        expect(saved.ccTips).toBe(30);
    }));

    test("saves a shift with sales but no tip report", () => withApp((harness) => {
        const { fillForm, openView, submitForm, savedShifts } = harness;
        openView("new-shift");
        fillForm({ date: "2026-10-23", mealPeriod: "Dinner", job: "Server", clockIn: "16:00", clockOut: "22:00", foodSales: 150, ccTips: 30 });
        check(harness, "#shift-no-tips-report");
        submitForm();

        const [saved] = savedShifts();
        expect(saved.noTips).toBe(true);
        expect(saved.foodSales).toBe(150);
        expect(saved.ccTips).toBe(0);
    }));

    test("shows only the missing report as No report", () => withApp({
        shifts: [makeShift({ noSales: true, ccTips: 30 })],
    }, ({ element, openView }) => {
        openView("previous-shifts");
        const card = element(".shift-card");
        expect(card.querySelector(".card-report-status").textContent).toBe("No sales report");
        expect(card.querySelector(".card-sales").textContent).toBe("No report");
        expect(card.querySelector(".card-tips").textContent).toBe("$30.00");
    }));

    test("shows no-report shifts as such instead of as zero dollars", () => withApp({
        shifts: [makeShift({ noReport: true }), makeShift({ date: "2026-10-21" })],
    }, ({ element, elements, openView }) => {
        openView("previous-shifts");
        const cards = elements(".shift-card");
        const noReport = cards.find((card) => card.querySelector(".card-report-status").textContent === "No sales or tip report");
        expect(noReport).toBeDefined();
        expect(noReport.querySelector(".card-sales").textContent).toBe("No report");
        expect(noReport.querySelector(".card-tips").textContent).toBe("No report");
        const reported = cards.find((card) => card !== noReport);
        expect(reported.querySelector(".card-sales").textContent).toBe("$0.00");
        expect(reported.querySelector(".card-report-status").hidden).toBe(true);
    }));

    test("restores the no-report choices when editing and resets after cancelling", () => withApp({
        shifts: [makeShift({ noTips: true })],
    }, async ({ element, openView, respondToConfirmDialog }) => {
        openView("previous-shifts");
        element(".edit-shift").click();
        expect(element("#shift-no-tips-report").checked).toBe(true);
        expect(element("#shift-no-sales-report").checked).toBe(false);

        element("#cancel-form").click();
        await respondToConfirmDialog(true);
        openView("new-shift");
        expect(element("#shift-no-tips-report").checked).toBe(false);
        expect([...element("#single-report-fields").querySelectorAll("input")].every((input) => !input.disabled)).toBe(true);
    }));

    test("hides the no-report choices for doubles", () => withApp(({ element, fire, openView }) => {
        openView("new-shift");
        const mealPeriod = element("#shift-meal-period");
        mealPeriod.value = "Double";
        fire(mealPeriod, "change");
        expect(element("#single-report-fields").hidden).toBe(true);
    }));

    test("keeps no-report shifts through backup restore and zeroes their amounts", () => withApp(async (harness) => {
        const { element, fire, openView, win, savedShifts, respondToConfirmDialog } = harness;
        openView("settings");
        const input = element("#backup-file");
        const transfer = new win.DataTransfer();
        transfer.items.add(new win.File(
            [JSON.stringify([makeShift({ noReport: true, foodSales: 40 }), makeShift({ noReport: "yes", foodSales: 5 })])],
            "backup.json",
            { type: "application/json" }
        ));
        input.files = transfer.files;
        fire(input, "change");
        await respondToConfirmDialog(true);

        const [first, second] = savedShifts();
        expect(first.noReport).toBe(true);
        expect(first.foodSales).toBe(0);
        expect(second.noReport).toBeUndefined();
        expect(second.foodSales).toBe(5);
    }));
});

describe("Legacy double-report migration", () => {
    test("preserves disagreeing whole reports and part totals through editing", () => {
        const original = [makeShift({ mealPeriod: "Double", reports: {
            lunch: { foodSales: 100, ccTips: 20 },
            dinner: { foodSales: 200, ccTips: 30 },
            whole: { foodSales: 900, ccTips: 90 },
        } })];
        return withApp({ shifts: original }, (harness) => {
            expect(JSON.parse(localStorage.getItem(PRE_FLEXIBLE_REPORTS_STORAGE_KEY))).toEqual(original);
            const reports = harness.savedShifts()[0].reports;
            expect(reports.map((report) => report.coverage)).toEqual(["part", "part", "reference"]);
            expect(reports[2].foodSales).toBe(900);
            harness.openView("previous-shifts");
            expect(harness.element("#summary-total-sales").textContent).toBe("$300.00");
            expect(harness.element("#summary-total-tips").textContent).toBe("$50.00");
            harness.element(".edit-shift").click();
            expect(harness.element("#flexible-report-list").children).toHaveLength(3);
            harness.submitForm();
            expect(harness.savedShifts()[0].reports[2].coverage).toBe("reference");
            harness.openView("previous-shifts");
            expect(harness.element("#summary-total-sales").textContent).toBe("$300.00");
            expect(harness.element("#summary-total-tips").textContent).toBe("$50.00");
        });
    });

    test("does not fill missing whole-report categories from a separate report", () => withApp({
        shifts: [makeShift({ mealPeriod: "Double", reports: {
            lunch: { foodSales: 100, ccTips: 25 },
            dinner: null,
            whole: { foodSales: 500, noSales: true, ccTips: 60 },
        } })],
    }, (harness) => {
        harness.openView("previous-shifts");
        expect(harness.element(".card-sales").textContent).toBe("No report");
        expect(harness.element(".card-tips").textContent).toBe("$60.00");
        harness.element(".edit-shift").click();
        const whole = harness.element("#flexible-report-list").children[1];
        expect(whole.querySelector('[data-report-field="strictWhole"]').checked).toBe(true);
        harness.submitForm();
        expect(harness.savedShifts()[0].reports[1].strictWhole).toBe(true);
        harness.openView("previous-shifts");
        expect(harness.element(".card-sales").textContent).toBe("No report");
        expect(harness.element(".card-tips").textContent).toBe("$60.00");
    }));

    test("distinguishes no reports, zero reports, and legacy combined amounts", () => withApp({
        shifts: [
            makeShift({ mealPeriod: "Double", reports: {} }),
            makeShift({ mealPeriod: "Double", reports: { lunch: { foodSales: 0 } } }),
            makeShift({ mealPeriod: "Double", foodSales: 250, ccTips: 40 }),
        ],
    }, (harness) => {
        const [empty, zero, combined] = harness.savedShifts();
        expect(empty.reports).toHaveLength(0);
        expect(zero.reports).toHaveLength(1);
        expect(zero.reports[0].foodSales).toBe(0);
        expect(combined.reports[0].coverage).toBe("whole");
        expect(combined.reports[0].foodSales).toBe(250);
        expect(combined.reports[0].ccTips).toBe(40);
    }));

    test("imports older JSON backups as flexible reports", () => withApp(async (harness) => {
        const legacy = makeShift({ mealPeriod: "Double", reports: {
            lunch: { foodSales: 25 },
            dinner: { foodSales: 35 },
            whole: { foodSales: 100 },
        } });
        harness.openView("settings");
        const input = harness.element("#backup-file");
        const transfer = new harness.win.DataTransfer();
        transfer.items.add(new harness.win.File([JSON.stringify([legacy])], "old.json", { type: "application/json" }));
        input.files = transfer.files;
        harness.fire(input, "change");
        await harness.respondToConfirmDialog(true);
        expect(harness.savedShifts()[0].reports[2].coverage).toBe("reference");
        harness.openView("previous-shifts");
        expect(harness.element("#summary-total-sales").textContent).toBe("$60.00");
    }));

    test("does not overwrite stored data when a record is unreadable", () => {
        const raw = JSON.stringify([makeShift({ mealPeriod: "Double", reports: {} }), { bad: true }]);
        return withApp({ shifts: raw, expectConsoleErrors: true }, (harness) => {
            expect(harness.element("#form-status").textContent).toContain("Saving is disabled");
            harness.saveShift();
            expect(localStorage.getItem(SHIFT_STORAGE_KEY)).toBe(raw);
        });
    });

    test("keeps an existing migration backup when converting different data", () => withApp((harness) => {
        const oldBackup = "previous recovery data";
        const raw = JSON.stringify([makeShift({ mealPeriod: "Double", reports: { lunch: { foodSales: 7 } } })]);
        localStorage.setItem(PRE_FLEXIBLE_REPORTS_STORAGE_KEY, oldBackup);
        localStorage.setItem(SHIFT_STORAGE_KEY, raw);
        harness.win.eval("loadShifts()");
        expect(localStorage.getItem(PRE_FLEXIBLE_REPORTS_STORAGE_KEY)).toBe(oldBackup);
        expect(localStorage.getItem(`${PRE_FLEXIBLE_REPORTS_STORAGE_KEY}-2`)).toBe(raw);
        expect(JSON.parse(localStorage.getItem(SHIFT_STORAGE_KEY))[0].reports[0].foodSales).toBe(7);
    }));

    test("leaves original data untouched if the migration backup cannot be saved", () => withApp({
        expectConsoleErrors: true,
    }, (harness) => {
        const raw = JSON.stringify([makeShift({ mealPeriod: "Double", reports: { lunch: { foodSales: 7 } } })]);
        localStorage.setItem(SHIFT_STORAGE_KEY, raw);
        const storage = harness.win.Storage.prototype;
        const original = storage.setItem;
        storage.setItem = function failBackup(key, value) {
            if (key === PRE_FLEXIBLE_REPORTS_STORAGE_KEY) throw new Error("Storage unavailable");
            return original.call(this, key, value);
        };
        try {
            harness.win.eval("loadShifts()");
            expect(harness.win.eval("shiftStorageWriteBlocked")).toBe(true);
            expect(localStorage.getItem(SHIFT_STORAGE_KEY)).toBe(raw);
            expect(localStorage.getItem(PRE_FLEXIBLE_REPORTS_STORAGE_KEY)).toBeNull();
        } finally {
            storage.setItem = original;
        }
    }));

    test("keeps the backup and original when converted shifts cannot be written", () => withApp({
        expectConsoleErrors: true,
    }, (harness) => {
        const raw = JSON.stringify([makeShift({ mealPeriod: "Double", reports: { lunch: { foodSales: 7 } } })]);
        localStorage.setItem(SHIFT_STORAGE_KEY, raw);
        const storage = harness.win.Storage.prototype;
        const original = storage.setItem;
        storage.setItem = function failShifts(key, value) {
            if (key === SHIFT_STORAGE_KEY) throw new Error("Storage unavailable");
            return original.call(this, key, value);
        };
        try {
            harness.win.eval("loadShifts()");
            expect(harness.win.eval("shiftStorageWriteBlocked")).toBe(true);
            expect(localStorage.getItem(SHIFT_STORAGE_KEY)).toBe(raw);
            expect(localStorage.getItem(PRE_FLEXIBLE_REPORTS_STORAGE_KEY)).toBe(raw);
        } finally {
            storage.setItem = original;
        }
    }));
});

describe("Double-shift report entry", () => {
    test("saves flexible reports and avoids counting the whole shift twice", () => withApp((harness) => {
        const { element, fire, fillForm, openView, submitForm, savedShifts } = harness;
        openView("new-shift");
        fillForm({ date: "2026-10-23", mealPeriod: "Double", clockIn: "10:00", clockOut: "22:00" });
        fire(element("#shift-meal-period"), "change");
        element("#add-flexible-report").click();
        element("#add-flexible-report").click();
        const [part, whole] = element("#flexible-report-list").children;
        const set = (node, field, value, event = "input") => {
            const input = node.querySelector(`[data-report-field="${field}"]`);
            input.value = value;
            fire(input, event);
        };
        set(part, "label", "Breakfast");
        set(part, "foodSales", "100");
        set(part, "ccTips", "20");
        set(whole, "label", "All day");
        set(whole, "coverage", "whole", "change");
        set(whole, "foodSales", "300");
        set(whole, "ccTips", "50");
        expect(element("#flexible-report-summary").textContent).toContain("Calculated remainder");
        expect(element("#flexible-report-summary").textContent).toContain("$200.00");
        expect(element("#flexible-report-calculation").textContent).toContain("Food Sales: $200.00");
        submitForm();
        expect(savedShifts()).toHaveLength(1);
        expect(savedShifts()[0].reports.map((report) => report.label)).toEqual(["Breakfast", "All day"]);
        openView("previous-shifts");
        expect(element("#summary-total-sales").textContent).toBe("$300.00");
        expect(element("#summary-total-tips").textContent).toBe("$50.00");
        expect(element(".card-flexible-reports").textContent).toContain("Breakfast");
        expect(element(".card-flexible-reports").textContent).toContain("Calculated remainder");
        element(".edit-shift").click();
        expect(element("#flexible-report-list").children).toHaveLength(2);
        expect(element('#flexible-report-list [data-report-field="label"]').value).toBe("Breakfast");
    }));

    test("loads generic reports and supports more than three separate reports", () => withApp({
        shifts: [makeShift({ mealPeriod: "Double", reports: [1, 2, 3, 4].map((n) => ({
            id: `generic-${n}`, label: `Period ${n}`, coverage: "part", foodSales: n * 10, ccTips: n,
        })) })],
    }, (harness) => {
        harness.openView("previous-shifts");
        expect(harness.element("#summary-total-sales").textContent).toBe("$100.00");
        expect(harness.element("#summary-total-tips").textContent).toBe("$10.00");
        harness.element(".edit-shift").click();
        expect(harness.element("#flexible-report-list").children).toHaveLength(4);
        expect(harness.element("#flexible-report-summary").textContent).toContain("Sum of separate reports");
        harness.submitForm();
        expect(harness.savedShifts()[0].reports).toHaveLength(4);
    }));

    test("labels partial sales when the whole-shift report lacks sales", () => withApp({
        shifts: [makeShift({ mealPeriod: "Double", reports: [
            { id: "generic-1", label: "Breakfast", coverage: "part", foodSales: 80, ccTips: 20 },
            { id: "generic-2", label: "All day", coverage: "whole", noSales: true, ccTips: 50 },
        ] })],
    }, (harness) => {
        harness.openView("previous-shifts");
        expect(harness.element("#summary-total-sales").textContent).toBe("$80.00");
        expect(harness.element("#summary-total-tips").textContent).toBe("$50.00");
        expect(harness.element(".card-report-status").textContent).toContain("sales from separate periods only");
    }));

    test("tracks missing tips and sales independently on flexible reports", () => withApp((harness) => {
        harness.openView("new-shift");
        harness.fillForm({ date: "2026-10-23", mealPeriod: "Double", clockIn: "10:00", clockOut: "22:00" });
        harness.fire(harness.element("#shift-meal-period"), "change");
        harness.element("#add-flexible-report").click();
        const report = harness.element("#flexible-report-list").firstElementChild;
        report.querySelector('[data-report-field="noTips"]').click();
        expect(report.querySelector('[data-report-field="ccTips"]').disabled).toBe(true);
        const sales = report.querySelector('[data-report-field="foodSales"]');
        sales.value = "120";
        harness.fire(sales, "input");
        harness.submitForm();
        expect(harness.savedShifts()[0].reports[0].noTips).toBe(true);
        harness.openView("previous-shifts");
        expect(harness.element(".card-tips").textContent).toBe("No report");
        expect(harness.element(".card-sales").textContent).toBe("$120.00");
        harness.element(".edit-shift").click();
        expect(harness.element('#flexible-report-list [data-report-field="noTips"]').checked).toBe(true);
    }));

    test("refuses two whole-shift reports without losing entered data", () => withApp((harness) => {
        harness.openView("new-shift");
        harness.fillForm({ date: "2026-10-23", mealPeriod: "Double", clockIn: "10:00", clockOut: "22:00" });
        harness.fire(harness.element("#shift-meal-period"), "change");
        harness.element("#add-flexible-report").click();
        harness.element("#add-flexible-report").click();
        [...harness.element("#flexible-report-list").children].forEach((node) => {
            const select = node.querySelector('[data-report-field="coverage"]');
            select.value = "whole";
            harness.fire(select, "change");
        });
        harness.submitForm();
        expect(harness.savedShifts()).toHaveLength(0);
        expect(harness.element("#form-status").textContent).toContain("only one whole-shift");
        expect(harness.element("#flexible-report-list").children).toHaveLength(2);
    }));

    test("undo and redo preserve added flexible report controls", () => withApp((harness) => {
        harness.openView("new-shift");
        harness.change("#shift-meal-period", "Double");
        harness.element("#add-flexible-report").click();
        expect(harness.element("#flexible-report-list").children).toHaveLength(1);
        harness.element("#undo-edit").click();
        expect(harness.element("#flexible-report-list").children).toHaveLength(0);
        harness.element("#redo-edit").click();
        expect(harness.element("#flexible-report-list").children).toHaveLength(1);
    }));

    test("flexible report controls fit on a phone", () => withApp({ width: 390, height: 844 }, (harness) => {
        harness.openView("new-shift");
        harness.change("#shift-meal-period", "Double");
        harness.element("#add-flexible-report").click();
        const node = harness.element("#flexible-report-list").firstElementChild;
        const tips = node.querySelector('[aria-label="Tips"]');
        const sales = node.querySelector('[aria-label="Sales"]');
        expect(sales.getBoundingClientRect().top).toBeGreaterThan(tips.getBoundingClientRect().top);
        expect(harness.doc.documentElement.scrollWidth).toBeLessThanOrEqual(harness.win.innerWidth);
    }));

});
