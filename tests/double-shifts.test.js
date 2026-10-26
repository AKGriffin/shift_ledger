import { describe, expect, test } from "./assert.js";
import { withApp } from "./app-harness.js";

function saveDouble(harness, reports = {}) {
    const { element, fire, fillForm, openView, submitForm } = harness;
    openView("new-shift");
    fillForm({
        date: "2026-10-23",
        mealPeriod: "Double",
        job: "Server",
        clockIn: "10:00",
        clockOut: "22:00",
    });
    const mealPeriod = element("#shift-meal-period");
    fire(mealPeriod, "change");

    Object.entries(reports).forEach(([period, amounts]) => {
        const section = element(`[data-report-period="${period}"]`);
        const toggle = section.querySelector("[data-report-toggle]");
        toggle.checked = true;
        fire(toggle, "change");
        Object.entries(amounts).forEach(([field, amount]) => {
            section.querySelector(`[data-report-field="${field}"]`).value = String(amount);
        });
    });
    submitForm();
}

describe("Double-shift report entry", () => {
    test("offers optional lunch, dinner, and whole-double reports", () => withApp(({ element, fire }) => {
        const form = element("#shift-meal-period");
        form.value = "Double";
        fire(form, "change");

        expect(element("#single-report-fields").hidden).toBe(true);
        expect(element("#double-report-fields").hidden).toBe(false);
        expect(element("#double-report-list").children).toHaveLength(3);
        expect([...element("#double-report-list").querySelectorAll("[data-report-toggle]")]
            .every((toggle) => !toggle.checked)).toBe(true);
    }));

    test("clearing a double resets report toggles and disables their fields", () => withApp(({ element, fire, openView }) => {
        openView("new-shift");
        const mealPeriod = element("#shift-meal-period");
        mealPeriod.value = "Double";
        fire(mealPeriod, "change");
        const lunch = element('[data-report-period="lunch"]');
        const toggle = lunch.querySelector("[data-report-toggle]");
        toggle.checked = true;
        fire(toggle, "change");

        element("#clear-form").click();

        expect(toggle.checked).toBe(false);
        expect(lunch.querySelector("[data-report-fields]").disabled).toBe(true);
    }));

    test("adds lunch and dinner reports without double-counting an optional whole report", () => withApp((harness) => {
        saveDouble(harness, {
            lunch: { foodSales: 100, ccTips: 20 },
            dinner: { foodSales: 200, ccTips: 30 },
            whole: { foodSales: 500, ccTips: 99 },
        });
        harness.openView("previous-shifts");

        expect(harness.element("#summary-total-sales").textContent).toBe("$300.00");
        expect(harness.element("#summary-total-tips").textContent).toBe("$50.00");
        expect(harness.element(".card-report-status").textContent)
            .toBe("Lunch and dinner reports (whole-double report also saved)");
    }));

    test("counts a single available shift report as partial", () => withApp((harness) => {
        saveDouble(harness, { dinner: { foodSales: 75, ccTips: 8 } });
        harness.openView("previous-shifts");

        expect(harness.element("#summary-total-sales").textContent).toBe("$75.00");
        expect(harness.element("#summary-total-tips").textContent).toBe("$8.00");
        expect(harness.element(".card-report-status").textContent).toBe("Partial report: dinner only");
    }));

    test("marks partial double totals in recent activity", () => withApp((harness) => {
        saveDouble(harness, { lunch: { foodSales: 90 } });
        harness.openView("dashboard");

        expect(harness.element(".recent-item span").textContent)
            .toBe("Server · Double · Partial report: lunch only");
    }));

    test("uses a whole-double report when no individual reports are available", () => withApp((harness) => {
        saveDouble(harness, { whole: { foodSales: 400, ccTips: 60 } });
        harness.openView("previous-shifts");

        expect(harness.element("#summary-total-sales").textContent).toBe("$400.00");
        expect(harness.element("#summary-total-tips").textContent).toBe("$60.00");
        expect(harness.element(".card-report-status").textContent).toBe("Whole-double report");
    }));

    test("uses a whole report for totals when only one individual report is also available", () => withApp((harness) => {
        saveDouble(harness, {
            lunch: { foodSales: 100, ccTips: 20 },
            whole: { foodSales: 400, ccTips: 60 },
        });
        harness.openView("previous-shifts");

        expect(harness.element("#summary-total-sales").textContent).toBe("$400.00");
        expect(harness.element("#summary-total-tips").textContent).toBe("$60.00");
        expect(harness.element(".card-report-status").textContent)
            .toBe("Whole-double totals; lunch detail also saved");
    }));

    test("keeps an explicitly unreported double distinct from a zero-value report", () => withApp((harness) => {
        saveDouble(harness);
        harness.openView("previous-shifts");

        expect(harness.element("#summary-total-sales").textContent).toBe("$0.00");
        expect(harness.element("#summary-total-tips").textContent).toBe("$0.00");
        expect(harness.element(".card-report-status").textContent).toBe("No sales or tip reports");
        expect(harness.savedShifts()[0].reports).toEqual({ lunch: null, dinner: null, whole: null });
    }));

    test("keeps a reported zero distinct from a missing report", () => withApp((harness) => {
        saveDouble(harness, { lunch: { foodSales: 0, ccTips: 0 } });
        harness.openView("previous-shifts");

        expect(harness.element(".card-report-status").textContent).toBe("Partial report: lunch only");
        expect(harness.savedShifts()[0].reports.lunch.foodSales).toBe(0);
        expect(harness.savedShifts()[0].reports.dinner).toBeNull();
    }));

    test("shows legacy double values as a combined report", () => withApp({
        shifts: [{
            id: 100,
            date: "2026-10-22",
            mealPeriod: "Double",
            job: "Server",
            clockIn: "10:00",
            clockOut: "22:00",
            foodSales: 250,
            ccTips: 40,
        }],
    }, ({ element, openView }) => {
        openView("previous-shifts");

        expect(element("#summary-total-sales").textContent).toBe("$250.00");
        expect(element(".card-report-status").textContent).toBe("Whole-double report (legacy combined data)");
    }));

    test("restores reports when editing a double", () => withApp((harness) => {
        saveDouble(harness, { lunch: { foodSales: 125, cashTips: 15 } });
        harness.openView("previous-shifts");
        harness.element(".edit-shift").click();

        expect(harness.element('[data-report-period="lunch"] [data-report-toggle]').checked).toBe(true);
        expect(harness.element('[data-report-period="lunch"] [data-report-field="foodSales"]').value).toBe("125.00");
        expect(harness.element('[data-report-period="dinner"] [data-report-toggle]').checked).toBe(false);
    }));
});
