import { describe, expect, test } from "./assert.js";
import { makeShift, withApp } from "./app-harness.js";

function revealShiftDetails(harness) {
    harness.openView("new-shift");
    harness.element("#shift-date").value = "2026-10-22";
    harness.fire(harness.element("#shift-date"), "input");
}

describe("Shift form validation", () => {
    test("starts with the date and focuses its error before revealing later fields", () => withApp(({ doc, element, elements, openView, submitForm, savedShifts }) => {
        openView("new-shift");
        expect(element("#shift-workplace-card").hidden).toBe(true);
        expect(element("#shift-details").hidden).toBe(true);
        submitForm();

        expect(element("#shift-date").getAttribute("aria-invalid")).toBe("true");
        expect(element("#shift-date-error").textContent).toBe("Date is required.");
        expect(element("#shift-meal-period-error").textContent).toBe("");
        expect(element("#shift-clock-in-error").textContent).toBe("");
        expect(element("#form-errors").hidden).toBe(false);
        expect(element("#form-errors").textContent).toContain("Please fix the following before saving:");
        expect(elements("#form-errors a").map((link) => link.getAttribute("href"))).toEqual(["#shift-date"]);
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

describe("Guided and manual entry", () => {
    const activeGuidedSteps = (elements) => elements("#shift-entry-fields [data-guided-step]")
        .filter((step) => !step.classList.contains("guided-off") && !step.closest("[hidden]"));

    function chooseMode(harness, mode) {
        harness.openView("new-shift", { entryMode: null });
        harness.element(`#choose-${mode}`).click();
    }

    function answerGuidedStep(harness) {
        const prompt = harness.element("#guided-question").textContent;
        if (prompt.includes("date did your shift start")) {
            harness.fillForm({ date: "2026-10-22" });
            harness.fire(harness.element("#shift-date"), "input");
        } else if (prompt.includes("Where did you work")) {
            if (harness.element("#shift-workplace").value !== "test-workplace") {
                harness.change("#shift-workplace", "test-workplace");
            }
        } else if (prompt.includes("lunch, dinner, or double")) {
            harness.change("#shift-meal-period", "Dinner");
        } else if (prompt.includes("clock in")) {
            harness.fillForm({ clockIn: "16:00" });
            harness.fire(harness.element("#shift-clock-in"), "input");
        } else if (prompt.includes("Did you have a break")) {
            chooseBreakAnswer(harness, "no");
        } else if (prompt.includes("shift end")) {
            harness.fillForm({ clockOut: "22:00" });
            harness.fire(harness.element("#shift-clock-out"), "input");
        }
    }

    function advanceGuidedUntil(harness, targetPrompt) {
        for (let guard = 0; guard < 30; guard += 1) {
            if (harness.element("#guided-question").textContent.includes(targetPrompt)) {
                return;
            }
            answerGuidedStep(harness);
            harness.element("#guided-next").click();
        }
        throw new Error(`Guided entry did not reach "${targetPrompt}".`);
    }

    function advanceGuidedToReview(harness) {
        for (let guard = 0; guard < 30 && !harness.element("#guided-next").hidden; guard += 1) {
            answerGuidedStep(harness);
            harness.element("#guided-next").click();
        }
    }

    function chooseBreakAnswer(harness, answer) {
        const radio = harness.element(`#shift-had-break-${answer}`);
        radio.checked = true;
        harness.fire(radio, "change");
    }

    test("asks for an entry mode each time and offers Close before entry starts", () => withApp({
        width: 390,
        height: 800,
    }, ({ element, openView, win, doc }) => {
        openView("new-shift", { entryMode: null });
        expect(doc.querySelector("#clear-form")).toBe(null);
        expect(doc.querySelector("#switch-entry-mode")).toBe(null);
        expect(element("#entry-mode-chooser").hidden).toBe(false);
        expect(element("#shift-entry-fields").hidden).toBe(true);
        expect(element("#save-shift").hidden).toBe(true);
        expect(element("#cancel-form").hidden).toBe(true);
        expect(element("#close-entry-mode").hidden).toBe(false);
        const chooserBounds = element("#entry-mode-chooser").getBoundingClientRect();
        expect(chooserBounds.bottom <= win.innerHeight).toBe(true);
        expect(win.innerHeight - chooserBounds.bottom < 40).toBe(true);
        expect(element("#new-shift .view-header").getBoundingClientRect().top < 100).toBe(true);
        expect(element(".mobile-bottom-nav").getBoundingClientRect().height).toBe(0);

        element("#choose-manual").click();
        expect(element("#entry-mode-chooser").hidden).toBe(true);
        expect(element("#shift-entry-fields").hidden).toBe(false);
        expect(element("#save-shift").hidden).toBe(false);
        expect(element("#cancel-form").hidden).toBe(false);
        expect(element("#guided-cancel").hidden).toBe(true);

        win.confirm = () => true;
        element("#cancel-form").click();
        expect(element("#entry-mode-chooser").hidden).toBe(false);
        expect(element("#shift-entry-fields").hidden).toBe(true);

        element("#close-entry-mode").click();
        expect(element("#new-shift").classList.contains("is-visible")).toBe(false);
        expect(element("#dashboard").classList.contains("is-visible")).toBe(true);
    }));

    test("manual entry shows every applicable field together once the role is chosen", () => withApp((harness) => {
        chooseMode(harness, "manual");
        harness.fillForm({ date: "2026-10-22" });
        harness.fire(harness.element("#shift-date"), "input");
        expect(harness.element("#shift-workplace-card").hidden).toBe(false);
        expect(harness.element("#guided-controls").hidden).toBe(true);
        expect(harness.doc.querySelector("#switch-entry-mode")).toBe(null);
    }));

    test("guided entry groups related fields into steps and moves with Next and Back", () => withApp((harness) => {
        const { element, elements } = harness;
        chooseMode(harness, "guided");
        expect(element("#guided-controls").hidden).toBe(false);
        expect(element("#guided-progress").textContent).toBe("Step 1");
        expect(element("#guided-back").disabled).toBe(true);
        expect(element("#guided-next").disabled).toBe(true);
        expect(activeGuidedSteps(elements).map((step) => step.id)).toEqual(["shift-date-card"]);
        expect(element("#guided-question").textContent).toContain("What date");

        harness.fillForm({ date: "2026-10-22" });
        harness.fire(element("#shift-date"), "input");
        expect(element("#guided-next").disabled).toBe(false);
        element("#guided-next").click();

        expect(element("#guided-progress").textContent).toContain("Step 2 of");
        expect(element("#shift-date-card").classList.contains("guided-off")).toBe(true);
        expect(activeGuidedSteps(elements).map((step) => step.id)).toEqual(["shift-workplace-card"]);

        element("#guided-back").click();
        expect(element("#guided-progress").textContent).toContain("Step 1 of");
    }));

    test("guided entry only reports errors for the open step", () => withApp((harness) => {
        const { element } = harness;
        chooseMode(harness, "guided");
        harness.submitForm();

        expect(element("#guided-progress").textContent).toBe("Step 1");
        expect(element("#shift-date-error").textContent).toBe("Date is required.");
        expect(element("#shift-date").getAttribute("aria-invalid")).toBe("true");
        expect(harness.elements("#form-errors li")).toHaveLength(1);
        expect(element("#shift-workplace-error").hidden).toBe(true);
    }));

    test("pressing Enter in a guided step acts like Next", () => withApp((harness) => {
        const { element } = harness;
        chooseMode(harness, "guided");
        harness.submitForm();

        expect(element("#shift-date-error").textContent).toBe("Date is required.");
        expect(harness.elements("#form-errors li")).toHaveLength(1);
    }));

    test("mobile guided entry stacks step, question, input and buttons at the bottom of the page", () => withApp({
        width: 390,
        height: 800,
    }, (harness) => {
        const { element, win } = harness;
        chooseMode(harness, "guided");

        const top = (selector) => element(selector).getBoundingClientRect().top;
        expect(top("#guided-progress") < top("#guided-question")).toBe(true);
        expect(top("#guided-question") < top("#shift-date")).toBe(true);
        expect(top("#shift-date") < top("#guided-buttons")).toBe(true);
        expect(element("#guided-cancel").hidden).toBe(false);
        expect(win.innerHeight - element("#guided-buttons").getBoundingClientRect().bottom < 40).toBe(true);
        expect(top("#guided-progress") > top("#new-shift .view-header")).toBe(true);
        expect(element("#shift-date-card").closest("#shift-entry-fields") !== null).toBe(true);

        element("#shift-date").value = "2026-10-22";
        harness.fire(element("#shift-date"), "change");
        expect(element("#guided-question").textContent).toContain("Where did you work");
    }));

    test("guided entry auto-advances after a required answer is valid", () => withApp((harness) => {
        const { element, fire } = harness;
        chooseMode(harness, "guided");
        element("#shift-date").value = "2026-10-22";
        fire(element("#shift-date"), "change");

        expect(element("#guided-question").textContent).toContain("Where did you work");
        expect(element("#guided-progress").textContent).toContain("Step 2 of");
    }));

    test("guided entry auto-advances break choices and completed break times", () => withApp((harness) => {
        const { element, fire } = harness;
        chooseMode(harness, "guided");
        advanceGuidedUntil(harness, "Did you have a break");

        chooseBreakAnswer(harness, "yes");
        expect(element("#guided-question").textContent).toContain("break start and end");

        element("#shift-break-start").value = "18:00";
        fire(element("#shift-break-start"), "change");
        expect(element("#guided-question").textContent).toContain("break start and end");

        element("#shift-break-end").value = "18:15";
        fire(element("#shift-break-end"), "change");
        expect(element("#guided-question").textContent).toContain("shift end");
    }));

    test("guided entry advances on a no-report choice but keeps optional amount groups together", () => withApp((harness) => {
        const { element, fire } = harness;
        chooseMode(harness, "guided");
        advanceGuidedUntil(harness, "sales report");

        element("#shift-food-sales").value = "75";
        fire(element("#shift-food-sales"), "change");
        expect(element("#guided-question").textContent).toContain("sales report");

        element("#shift-no-sales-report").checked = true;
        fire(element("#shift-no-sales-report"), "change");
        expect(element("#guided-question").textContent).toContain("tips report");
    }));

    test("guided break question conditionally reveals and validates break times", () => withApp((harness) => {
        const { element } = harness;
        chooseMode(harness, "guided");
        advanceGuidedUntil(harness, "Did you have a break");
        expect(element("#guided-next").disabled).toBe(true);
        element("#guided-next").click();
        expect(element("#shift-had-break-error").textContent).toBe("");

        chooseBreakAnswer(harness, "yes");
        expect(element("#break-time-fields").hidden).toBe(false);
        expect(element("#guided-next").disabled).toBe(true);
        element("#guided-next").click();
        expect(element("#shift-break-start-error").textContent).toBe("");
        harness.fillForm({ breakStart: "18:00", breakEnd: "18:15" });
        harness.fire(element("#shift-break-end"), "input");
        expect(element("#guided-next").disabled).toBe(false);
        element("#guided-next").click();
        expect(element("#guided-question").textContent).toContain("shift end");
    }));

    test("cancel confirms before discarding entry and returns to the mode chooser", () => withApp((harness) => {
        const { element } = harness;
        chooseMode(harness, "guided");
        harness.fillForm({ date: "2026-10-22" });
        harness.fire(element("#shift-date"), "input");

        harness.win.confirm = () => false;
        element("#guided-cancel").click();
        expect(element("#guided-controls").hidden).toBe(false);
        expect(element("#shift-date").value).toBe("2026-10-22");

        harness.win.confirm = () => true;
        element("#guided-cancel").click();
        expect(element("#entry-mode-chooser").hidden).toBe(false);
        expect(element("#shift-entry-fields").hidden).toBe(true);
        expect(element("#shift-date").value).toBe("");
        expect(element("#guided-controls").hidden).toBe(true);
    }));

    test("guided entry groups reports and ends with an editable full-form review", () => withApp((harness) => {
        const { element, fire, savedShifts } = harness;
        chooseMode(harness, "guided");
        expect(element("#save-shift").hidden).toBe(true);
        advanceGuidedUntil(harness, "sales report");
        element("#guided-next").click();
        expect(element("#guided-question").textContent).toContain("tips report");
        element("#guided-next").click();
        expect(element("#guided-question").textContent).toContain("tip anyone out");
        advanceGuidedToReview(harness);
        expect(element("#guided-question").textContent).toContain("Review your shift");
        expect(element("#shift-entry-fields").querySelectorAll(".guided-off")).toHaveLength(0);
        expect(element("#save-shift").hidden).toBe(false);
        element("#shift-food-sales").value = "75";
        fire(element("#shift-food-sales"), "input");
        element("#save-shift").click();
        expect(savedShifts()).toHaveLength(1);
        expect(savedShifts()[0].foodSales).toBe(75);
    }));

    test("changing the break answer from review stays on the review step", () => withApp((harness) => {
        const { element } = harness;
        chooseMode(harness, "guided");
        advanceGuidedToReview(harness);
        expect(element("#guided-question").textContent).toContain("Review your shift");

        chooseBreakAnswer(harness, "yes");
        expect(element("#guided-question").textContent).toContain("Review your shift");
        expect(element("#guided-progress").textContent).toContain("Review");
        expect(element("#break-time-fields").hidden).toBe(false);
        expect(element("#save-shift").hidden).toBe(false);

        chooseBreakAnswer(harness, "no");
        expect(element("#guided-question").textContent).toContain("Review your shift");
        expect(element("#guided-progress").textContent).toContain("Review");
        expect(element("#break-time-fields").hidden).toBe(true);
    }));

    test("editing a shift uses the manual layout without a mode prompt", () => withApp({ shifts: [makeShift()] }, ({ element, doc }) => {
        element(".main-nav [data-view=\"previous-shifts\"]").click();
        element(".edit-shift").click();

        expect(element("#entry-mode-chooser").hidden).toBe(true);
        expect(doc.querySelector("#entry-mode-bar")).toBe(null);
        expect(element("#shift-entry-fields").hidden).toBe(false);
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
        revealShiftDetails(harness);

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
        revealShiftDetails(harness);
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
        revealShiftDetails(harness);
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
        revealShiftDetails(harness);
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

        harness.win.confirm = () => true;
        harness.element("#cancel-form").click();
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
