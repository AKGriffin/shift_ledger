import { describe, expect, test } from "./assert.js";
import { makeShift, SHIFT_DRAFT_STORAGE_KEY, withApp } from "./app-harness.js";

function createDraft(harness, date = "2026-10-28") {
    harness.openView("new-shift", { entryMode: "manual" });
    const dateField = harness.element("#shift-date");
    dateField.value = date;
    harness.fire(dateField, "input");
}

function reopenDraftPrompt(harness) {
    harness.openView("previous-shifts");
    harness.openView("new-shift", { entryMode: null });
}

describe("Unfinished shift drafts", () => {
    test("restores flexible report labels, coverage, and amounts", () => withApp((harness) => {
        createDraft(harness);
        harness.change("#shift-meal-period", "Double");
        harness.element("#add-flexible-report").click();
        const node = harness.element("#flexible-report-list").firstElementChild;
        const label = node.querySelector('[data-report-field="label"]');
        label.value = "Overnight";
        harness.fire(label, "input");
        const coverage = node.querySelector('[data-report-field="coverage"]');
        coverage.value = "whole";
        harness.fire(coverage, "change");
        const amount = node.querySelector('[data-report-field="ccTips"]');
        amount.value = "45.50";
        harness.fire(amount, "input");
        reopenDraftPrompt(harness);
        harness.element("#resume-shift-draft").click();
        const restored = harness.element("#flexible-report-list").firstElementChild;
        expect(restored.querySelector('[data-report-field="label"]').value).toBe("Overnight");
        expect(restored.querySelector('[data-report-field="coverage"]').value).toBe("whole");
        expect(restored.querySelector('[data-report-field="ccTips"]').value).toBe("45.50");
    }));

    test("autosaves entry separately from saved shifts", () => withApp(({ savedDraft, savedShifts, element, fire, openView }) => {
        openView("new-shift", { entryMode: "manual" });
        const dateField = element("#shift-date");
        dateField.value = "2026-10-28";
        fire(dateField, "input");

        expect(savedDraft().version).toBe(1);
        expect(savedDraft().mode).toBe("manual");
        expect(savedDraft().values["id:shift-date"]).toBe("2026-10-28");
        expect(savedShifts()).toHaveLength(0);
    }));

    test("does not warn before reload when the new-shift draft is safely stored", () => withApp((harness) => {
        createDraft(harness);
        const event = new harness.win.Event("beforeunload", { cancelable: true });
        harness.win.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
    }));

    test("resumes the saved form values when returning to shift entry", () => withApp((harness) => {
        createDraft(harness);
        reopenDraftPrompt(harness);

        expect(harness.element("#shift-draft-dialog").open).toBe(true);
        harness.element("#resume-shift-draft").click();

        expect(harness.element("#shift-draft-dialog").open).toBe(false);
        expect(harness.doc.querySelector("#entry-mode-chooser")).toBe(null);
        expect(harness.element("#shift-date").value).toBe("2026-10-28");
        expect(harness.savedDraft().values["id:shift-date"]).toBe("2026-10-28");
    }));

    test("discard removes the draft and restarts the guided questions empty", () => withApp((harness) => {
        createDraft(harness);
        reopenDraftPrompt(harness);
        harness.element("#discard-shift-draft").click();

        expect(harness.element("#shift-draft-dialog").open).toBe(false);
        expect(harness.savedDraft()).toBeNull();
        expect(harness.element("#guided-progress").textContent).toContain("Step 1");
        expect(harness.element("#shift-date").value).toBe("");
    }));

    test("Not now keeps the draft and returns to the previous view", () => withApp((harness) => {
        createDraft(harness);
        reopenDraftPrompt(harness);
        harness.element("#dismiss-shift-draft").click();

        expect(harness.element("#previous-shifts").hidden).toBe(false);
        expect(harness.savedDraft().values["id:shift-date"]).toBe("2026-10-28");
    }));

    test("successful shift save clears its draft", () => withApp((harness) => {
        createDraft(harness);
        harness.fillForm({
            mealPeriod: "Dinner",
            job: "Server",
            clockIn: "16:00",
            clockOut: "22:00",
        });
        harness.fire(harness.element("#shift-clock-out"), "input");
        harness.submitForm();

        expect(harness.savedShifts()).toHaveLength(1);
        expect(harness.savedDraft()).toBeNull();
    }));

    test("canceling an edit does not remove a separate new-shift draft", () => withApp(
        { shifts: [makeShift()] },
        async (harness) => {
            harness.win.localStorage.setItem(SHIFT_DRAFT_STORAGE_KEY, JSON.stringify({
                version: 1,
                mode: "manual",
                values: { "id:shift-date": "2026-10-28" },
                notes: [],
                step: { id: "", index: 0, review: false },
            }));
            harness.openView("previous-shifts");
            harness.element(".edit-shift").click();
            harness.element("#cancel-form").click();
            harness.element("#confirm-ok").click();
            await Promise.resolve();

            expect(harness.savedDraft().values["id:shift-date"]).toBe("2026-10-28");
        },
    ));

    test("converts legacy double-report drafts without losing amounts", () => withApp((harness) => {
        harness.win.localStorage.setItem(SHIFT_DRAFT_STORAGE_KEY, JSON.stringify({
            version: 1,
            mode: "manual",
            values: {
                "id:shift-meal-period": "Double",
                "id:shift-use-flexible-reports": false,
                "report:lunch:enabled": true,
                "report:lunch:foodSales": "123.45",
                "report:whole:enabled": true,
                "report:whole:foodSales": "300",
            },
            notes: [],
            step: { id: "", index: 0, review: false },
        }));
        harness.openView("new-shift", { entryMode: null });
        harness.element("#resume-shift-draft").click();
        const [lunch, whole] = harness.element("#flexible-report-list").children;
        expect(lunch.querySelector('[data-report-field="label"]').value).toBe("Lunch");
        expect(lunch.querySelector('[data-report-field="foodSales"]').value).toBe("123.45");
        expect(whole.querySelector('[data-report-field="coverage"]').value).toBe("whole");
        expect(whole.querySelector('[data-report-field="strictWhole"]').checked).toBe(true);
        expect(whole.querySelector('[data-report-field="foodSales"]').value).toBe("300");
    }));

    test("unreadable drafts can be explicitly discarded", () => withApp((harness) => {
        harness.win.localStorage.setItem(SHIFT_DRAFT_STORAGE_KEY, "{");
        harness.openView("new-shift", { entryMode: null });

        expect(harness.element("#resume-shift-draft").disabled).toBe(true);
        expect(harness.element("#shift-draft-dialog").open).toBe(true);
        harness.element("#discard-shift-draft").click();

        expect(harness.savedDraft()).toBeNull();
    }));
});
