import { describe, expect, test } from "./assert.js";
import { makeShift, withApp } from "./app-harness.js";

describe("Shift form validation", () => {
    test("marks every missing required field and focuses the first", () => withApp(({ doc, element, elements, openView, submitForm, savedShifts }) => {
        openView("new-shift");
        submitForm();

        expect(element("#shift-date").getAttribute("aria-invalid")).toBe("true");
        expect(element("#shift-date-error").textContent).toBe("Date is required.");
        expect(element("#shift-meal-period-error").textContent).toBe("Meal period is required.");
        expect(element("#shift-job-error").textContent).toBe("Job is required.");
        expect(element("#shift-clock-in-error").textContent).toBe("Clock in is required.");
        expect(element("#shift-clock-out-error").textContent).toBe("Clock out is required.");
        expect(element("#form-errors").hidden).toBe(false);
        expect(element("#form-errors").textContent).toContain("Please fix the following before saving:");
        expect(elements("#form-errors a")[0].getAttribute("href")).toBe("#shift-date");
        expect(doc.activeElement.id).toBe("shift-date");
        expect(savedShifts()).toHaveLength(0);
    }));

    test("drops an error once its field is corrected while keeping the others", () => withApp(({ element, elements, fire, openView, submitForm }) => {
        openView("new-shift");
        submitForm();

        element("#shift-date").value = "2026-10-19";
        fire(element("#shift-date"), "change");

        expect(element("#form-errors").hidden).toBe(false);
        expect(element("#shift-date").hasAttribute("aria-invalid")).toBe(false);
        expect(element("#shift-clock-in").getAttribute("aria-invalid")).toBe("true");
        expect(elements("#form-errors a").map((link) => link.getAttribute("href"))).not.toContain("#shift-date");
    }));

    test("rejects identical clock-in and clock-out times", () => withApp(({ element, fillForm, openView, submitForm, savedShifts }) => {
        openView("new-shift");
        fillForm({ date: "2026-10-19", mealPeriod: "Dinner", job: "Server", clockIn: "16:00", clockOut: "16:00" });
        submitForm();

        expect(element("#shift-clock-out").getAttribute("aria-invalid")).toBe("true");
        expect(element("#shift-clock-out-error").textContent)
            .toBe("Clock out must differ from clock in; an earlier time means the next day.");
        expect(savedShifts()).toHaveLength(0);
    }));

    test("requires both ends of a break", () => withApp(({ element, saveShift, savedShifts }) => {
        saveShift({ breakStart: "18:00" });

        expect(element("#shift-break-end-error").textContent).toBe("Break end is required when a break starts.");
        expect(savedShifts()).toHaveLength(0);
    }));

    test("rejects a break outside the shift", () => withApp(({ element, saveShift, savedShifts }) => {
        saveShift({ clockIn: "22:00", clockOut: "06:00", breakStart: "07:00", breakEnd: "08:00" });

        expect(element("#shift-break-start").getAttribute("aria-invalid")).toBe("true");
        expect(element("#form-errors").textContent).toContain("Break start must be during the shift.");
        expect(savedShifts()).toHaveLength(0);
    }));
});

describe("Saving shifts", () => {
    test("saves a valid shift and totals it on the dashboard", () => withApp(({ element, saveShift, savedShifts }) => {
        saveShift({ foodSales: 100, ccTips: 20, cashTips: 5, autoGratuity: 7, tipOutPaid: 3, tipOutReceived: 2 });

        expect(element("#form-errors").hidden).toBe(true);
        expect(element("#form-status").textContent).toBe("Shift saved.");
        expect(savedShifts()).toHaveLength(1);
        expect(element("#summary-total-shifts").textContent).toBe("1");
        expect(element("#summary-total-hours").textContent).toBe("6h 0m");
        expect(element("#summary-total-sales").textContent).toBe("$100.00");
        expect(element("#summary-total-tips").textContent).toBe("$31.00");
        expect(savedShifts()[0].autoGratuity).toBe(7);
    }));

    test("automatically clears a success notice after six seconds", () => withApp((harness) => {
        const originalSetTimeout = harness.win.setTimeout;
        const originalClearTimeout = harness.win.clearTimeout;
        let scheduledNotice = null;
        let nextTimeoutId = 0;
        const clearedTimeouts = [];
        harness.win.setTimeout = (callback, delay) => {
            scheduledNotice = { callback, delay, id: ++nextTimeoutId };
            return nextTimeoutId;
        };
        harness.win.clearTimeout = (id) => clearedTimeouts.push(id);

        try {
            harness.saveShift();
            const firstNotice = scheduledNotice;
            harness.saveShift({ job: "Expo" });

            expect(harness.element("#form-status").hidden).toBe(false);
            expect(scheduledNotice.delay).toBe(6000);
            expect(clearedTimeouts).toEqual([firstNotice.id]);

            firstNotice.callback();
            expect(harness.element("#form-status").hidden).toBe(false);

            scheduledNotice.callback();

            expect(harness.element("#form-status").hidden).toBe(true);
            expect(harness.element("#form-status").textContent).toBe("");
        } finally {
            harness.win.setTimeout = originalSetTimeout;
            harness.win.clearTimeout = originalClearTimeout;
        }
    }));

    test("clears a success notice when navigating to another view", () => withApp((harness) => {
        harness.saveShift();
        expect(harness.element("#form-status").hidden).toBe(false);

        harness.openView("previous-shifts");

        expect(harness.element("#form-status").hidden).toBe(true);
        expect(harness.element("#form-status").textContent).toBe("");
    }));

    test("clears an expired success notice when the app returns to the foreground", () => withApp((harness) => {
        const originalSetTimeout = harness.win.setTimeout;
        const originalClearTimeout = harness.win.clearTimeout;
        const originalNow = harness.win.Date.now;
        let currentTime = 1000;
        harness.win.setTimeout = () => 1;
        harness.win.clearTimeout = () => {};
        harness.win.Date.now = () => currentTime;
        Object.defineProperty(harness.doc, "hidden", { configurable: true, value: false });

        try {
            harness.saveShift();
            expect(harness.element("#form-status").hidden).toBe(false);

            currentTime += 6001;
            harness.fire(harness.doc, "visibilitychange");

            expect(harness.element("#form-status").hidden).toBe(true);
            expect(harness.element("#form-status").textContent).toBe("");
        } finally {
            harness.win.setTimeout = originalSetTimeout;
            harness.win.clearTimeout = originalClearTimeout;
            harness.win.Date.now = originalNow;
        }
    }));

    test("adds each new shift to the totals", () => withApp(({ element, saveShift, savedShifts }) => {
        saveShift({ date: "2026-10-20", foodSales: 100, ccTips: 20, cashTips: 5, tipOutPaid: 3, tipOutReceived: 2 });
        saveShift({ date: "2026-10-21", job: "Expo", foodSales: 200, ccTips: 50, cashTips: 10 });

        expect(savedShifts()).toHaveLength(2);
        expect(element("#summary-total-shifts").textContent).toBe("2");
        expect(element("#summary-total-sales").textContent).toBe("$300.00");
        expect(element("#summary-total-tips").textContent).toBe("$84.00");
    }));

    test("keeps an overnight shift under its start date", () => withApp(({ element, saveShift, savedShifts }) => {
        saveShift({
            date: "2026-10-22",
            clockIn: "22:00",
            clockOut: "06:00",
            breakStart: "23:30",
            breakEnd: "00:30",
        });

        expect(savedShifts()).toHaveLength(1);
        expect(savedShifts()[0].date).toBe("2026-10-22");
        expect(savedShifts()[0].clockOut).toBe("06:00");
        expect(element("#summary-total-hours").textContent).toBe("7h 0m");
    }));
});

describe("Editing and deleting shifts", () => {
    test("edits a saved shift in place", () => withApp(({ element, fillForm, openView, saveShift, savedShifts, submitForm }) => {
        saveShift({ foodSales: 100 });
        openView("previous-shifts");
        element(".edit-shift").click();

        expect(element("#form-title").textContent).toBe("Edit Shift");
        expect(element("#shift-food-sales").value).toBe("100.00");

        fillForm({ foodSales: "125.50" });
        submitForm();

        expect(element("#form-status").textContent).toBe("Shift updated.");
        expect(savedShifts()).toHaveLength(1);
        expect(savedShifts()[0].foodSales).toBe(125.5);
        expect(element("#summary-total-sales").textContent).toBe("$125.50");
    }));

    test("keeps auto-gratuity separate when editing and includes it in net tips", () => withApp(({ element, fillForm, openView, saveShift, savedShifts, submitForm }) => {
        saveShift({ ccTips: 20, autoGratuity: 12 });
        openView("previous-shifts");
        element(".edit-shift").click();

        expect(element("#shift-auto-gratuity").value).toBe("12.00");
        fillForm({ autoGratuity: "18.50" });
        submitForm();

        expect(savedShifts()[0].ccTips).toBe(20);
        expect(savedShifts()[0].autoGratuity).toBe(18.5);
        expect(element("#summary-total-tips").textContent).toBe("$38.50");
    }));

    test("deletes a shift from history", () => withApp({
        shifts: [makeShift({ date: "2026-10-20" }), makeShift({ date: "2026-10-21", job: "Expo" })],
    }, ({ element, openView, savedShifts }) => {
        openView("previous-shifts");
        element(".shift-card .delete-shift").click();

        expect(savedShifts()).toHaveLength(1);
        expect(element("#summary-total-shifts").textContent).toBe("1");
    }));
});

describe("Shift notes", () => {
    const typeNote = (harness, index, text) => {
        const input = harness.elements(".note-input")[index];
        input.value = text;
        harness.fire(input, "input");
    };

    test("starts with one empty note and adds more only after one is filled in", () => withApp((harness) => {
        harness.openView("new-shift");

        expect(harness.elements(".note-input")).toHaveLength(1);
        harness.element("#add-note").click();
        expect(harness.elements(".note-input")).toHaveLength(1);
        expect(harness.doc.activeElement).toBe(harness.element(".note-input"));

        typeNote(harness, 0, "One");
        harness.element("#add-note").click();
        expect(harness.elements(".note-input")).toHaveLength(2);
        typeNote(harness, 1, "Two");
        harness.element("#add-note").click();
        expect(harness.elements(".note-input")).toHaveLength(3);
        expect(harness.elements(".note-input")[2].getAttribute("aria-label")).toBe("Note 3");
    }));

    test("saves each note separately and ignores blank ones", () => withApp((harness) => {
        harness.openView("new-shift");
        typeNote(harness, 0, "  Large party  ");
        harness.element("#add-note").click();
        harness.element("#add-note").click();
        typeNote(harness, 1, "   ");
        harness.element("#add-note").click();
        typeNote(harness, 1, "Slow close");
        harness.fillForm({ date: "2026-10-20", mealPeriod: "Dinner", job: "Server", clockIn: "16:00", clockOut: "22:00" });
        harness.submitForm();

        expect(harness.savedShifts()[0].notes).toEqual(["Large party", "Slow close"]);

        harness.openView("previous-shifts");
        const items = harness.elements(".card-note-list li").map((item) => item.textContent);
        expect(items).toEqual(["Large party", "Slow close"]);
    }));

    test("Enter adds the next note only when the current one has text, and Backspace on an empty note removes it", () => withApp((harness) => {
        harness.openView("new-shift");
        const pressEnter = (target) => target.dispatchEvent(new harness.win.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        const first = harness.element(".note-input");
        first.focus();
        pressEnter(first);
        expect(harness.elements(".note-input")).toHaveLength(1);

        typeNote(harness, 0, "Something");
        pressEnter(first);

        expect(harness.elements(".note-input")).toHaveLength(2);
        expect(harness.doc.activeElement).toBe(harness.elements(".note-input")[1]);

        harness.doc.activeElement.dispatchEvent(new harness.win.KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true }));

        expect(harness.elements(".note-input")).toHaveLength(1);
        expect(harness.doc.activeElement).toBe(harness.element(".note-input"));
    }));

    test("removes a note with its button and keeps one empty row when all are removed", () => withApp((harness) => {
        harness.openView("new-shift");
        typeNote(harness, 0, "One");
        harness.element("#add-note").click();
        typeNote(harness, 1, "Two");

        harness.elements(".note-remove")[0].click();
        expect(harness.elements(".note-input").map((input) => input.value)).toEqual(["Two"]);

        harness.element(".note-remove").click();
        expect(harness.elements(".note-input").map((input) => input.value)).toEqual([""]);
    }));

    test("restores notes when editing and shows legacy text notes as a single note", () => withApp({
        shifts: [makeShift({ id: 1, notes: ["First", "Second"] }), makeShift({ id: 2, date: "2026-10-21", notes: "Old single note" })],
    }, (harness) => {
        harness.openView("previous-shifts");
        const cards = harness.elements(".shift-card");
        const legacy = cards.find((card) => card.textContent.includes("Old single note"));
        expect([...legacy.querySelectorAll(".card-note-list li")].map((item) => item.textContent)).toEqual(["Old single note"]);

        cards.find((card) => card.textContent.includes("Second")).querySelector(".edit-shift").click();
        expect(harness.elements(".note-input").map((input) => input.value)).toEqual(["First", "Second"]);

        harness.element("#clear-form").click();
        expect(harness.elements(".note-input").map((input) => input.value)).toEqual([""]);
    }));
});

describe("Number field focus", () => {
    test("selects a number field's contents when it receives focus", () => withApp(({ element, fire, openView }) => {
        openView("new-shift");
        const foodSales = element("#shift-food-sales");

        fire(foodSales, "focusin");

        expect(foodSales.dataset.selectedOnFocus).toBe("true");
    }));
});
