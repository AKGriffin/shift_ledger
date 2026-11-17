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
        expect(harness.element("#entry-mode-chooser").hidden).toBe(true);
        expect(harness.element("#shift-date").value).toBe("2026-10-28");
        expect(harness.savedDraft().values["id:shift-date"]).toBe("2026-10-28");
    }));

    test("discard removes the draft and starts with an empty mode chooser", () => withApp((harness) => {
        createDraft(harness);
        reopenDraftPrompt(harness);
        harness.element("#discard-shift-draft").click();

        expect(harness.element("#shift-draft-dialog").open).toBe(false);
        expect(harness.savedDraft()).toBeNull();
        expect(harness.element("#entry-mode-chooser").hidden).toBe(false);
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

    test("preserves double-shift report selections and amounts", () => withApp((harness) => {
        harness.openView("new-shift", { entryMode: "manual" });
        harness.change("#shift-meal-period", "Double");
        const toggle = harness.element('[data-report-period="lunch"] [data-report-toggle]');
        toggle.checked = true;
        harness.fire(toggle, "change");
        const amount = harness.element('[data-report-period="lunch"] [data-report-field="foodSales"]');
        amount.value = "123.45";
        harness.fire(amount, "input");

        expect(harness.savedDraft().values["report:lunch:enabled"]).toBe(true);
        expect(harness.savedDraft().values["report:lunch:foodSales"]).toBe("123.45");
        reopenDraftPrompt(harness);
        harness.element("#resume-shift-draft").click();

        expect(harness.element('[data-report-period="lunch"] [data-report-toggle]').checked).toBe(true);
        expect(harness.element('[data-report-period="lunch"] [data-report-field="foodSales"]').value).toBe("123.45");
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
