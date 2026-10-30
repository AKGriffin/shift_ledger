import { describe, expect, test } from "./assert.js";
import { makeShift, PRE_WORKPLACES_STORAGE_KEY, withApp } from "./app-harness.js";

const { Workplaces } = window;

const sampleData = () => ({
    version: 1,
    setupDismissed: true,
    workplaces: [{
        id: "wp-1",
        name: "Bistro",
        archived: false,
        roles: [
            { id: "r-1", name: "Server", archived: false },
            { id: "r-2", name: "Bartender", archived: false },
        ],
    }],
});

const sampleDataWithTemplate = () => ({
    version: 1,
    setupDismissed: true,
    workplaces: [{
        id: "wp-1",
        name: "Bistro",
        archived: false,
        payPeriod: { type: "weekly", anchorDate: "2026-10-19" },
        roles: [
            {
                id: "r-1",
                name: "Server",
                archived: false,
                template: {
                    mealPeriod: "Dinner",
                    clockIn: "16:00",
                    clockOut: "22:00",
                    breakStart: "19:00",
                    breakEnd: "19:30",
                },
            },
            { id: "r-2", name: "Bartender", archived: false },
        ],
    }],
});

const tick = (win) => new Promise((resolve) => win.setTimeout(resolve, 50));

describe("Workplaces data module", () => {
    test("validates names, including duplicates among active siblings", () => {
        const data = sampleData();
        expect(Workplaces.validateName("  ", data.workplaces, "workplace")).toBe("Enter a name.");
        expect(Workplaces.validateName("bistro", data.workplaces, "workplace")).toContain("already have");
        expect(Workplaces.validateName("Bistro", data.workplaces, "workplace", "wp-1")).toBe("");
        expect(Workplaces.validateName("x".repeat(61), data.workplaces, "workplace")).toContain("60");
    });

    test("setTracksReports stores only false and survives normalization", () => {
        const data = sampleData();
        Workplaces.setTracksReports(data, "r-1", false);
        expect(data.workplaces[0].roles[0].tracksReports).toBe(false);
        expect(Workplaces.normalizeData(data).workplaces[0].roles[0].tracksReports).toBe(false);
        Workplaces.setTracksReports(data, "r-1", true);
        expect(data.workplaces[0].roles[0].tracksReports).toBeUndefined();
        expect(Workplaces.setTracksReports(data, "nope", false).error).toBeTruthy();
    });

    test("adds, renames, archives and deletes", () => {
        const data = sampleData();
        const role = Workplaces.addRole(data, "wp-1", "Host").item;
        expect(Workplaces.addRole(data, "wp-1", "server").error).toBeTruthy();
        expect(Workplaces.rename(data, "role", role.id, "Expo").item.name).toBe("Expo");
        expect(Workplaces.setArchived(data, "role", role.id, true).item.archived).toBe(true);
        expect(Workplaces.remove(data, "role", role.id, []).error).toBeUndefined();
        expect(data.workplaces[0].roles).toHaveLength(2);
    });

    test("blocks deleting items that saved shifts use", () => {
        const data = sampleData();
        const shifts = [makeShift({ workplaceId: "wp-1", roleId: "r-1" })];
        expect(Workplaces.remove(data, "role", "r-1", shifts).error).toContain("archived");
        expect(Workplaces.remove(data, "workplace", "wp-1", shifts).error).toContain("archived");
        expect(Workplaces.remove(data, "role", "r-2", shifts).error).toBeUndefined();
    });

    test("blocks unarchiving into a name conflict", () => {
        const data = sampleData();
        Workplaces.setArchived(data, "role", "r-1", true);
        Workplaces.addRole(data, "wp-1", "Server");
        expect(Workplaces.setArchived(data, "role", "r-1", false).error).toContain("Rename");
    });

    test("parses role names and finds distinct jobs", () => {
        expect(Workplaces.parseRoleNames("Server, bartender,\nserver,  ").names).toEqual(["Server", "bartender"]);
        expect(Workplaces.parseRoleNames("x".repeat(61)).error).toBeTruthy();
        const jobs = Workplaces.distinctJobs([makeShift({ job: "Server" }), makeShift({ job: "server " }), makeShift({ job: "Host" })]);
        expect(jobs).toEqual(["Server", "Host"]);
    });

    test("links only shifts whose job matches a role and keeps the job", () => {
        const data = sampleData();
        const shifts = [makeShift({ job: "server" }), makeShift({ job: "Host" })];
        const { shifts: linked, changed } = Workplaces.linkShifts(shifts, data.workplaces[0]);
        expect(changed).toBe(1);
        expect(linked[0].roleId).toBe("r-1");
        expect(linked[0].workplaceId).toBe("wp-1");
        expect(linked[0].job).toBe("server");
        expect(linked[1].roleId).toBeUndefined();
    });

    test("rejects invalid stored data", () => {
        const bad = sampleData();
        bad.workplaces.push({ ...bad.workplaces[0] });
        expect(() => Workplaces.normalizeData(bad)).toThrow();
    });

    test("saves templates and pay periods with validation", () => {
        const data = sampleData();
        expect(Workplaces.setTemplate(data, "r-1", {
            mealPeriod: "Lunch",
            clockIn: "10:00",
            clockOut: "15:00",
        }).item.template.mealPeriod).toBe("Lunch");
        expect(Workplaces.setTemplate(data, "r-1", { breakStart: "12:00" }).error).toContain("both break times");
        expect(Workplaces.setPayPeriod(data, "wp-1", { type: "weekly", startDay: "monday" }).item.payPeriod)
            .toEqual({ type: "weekly", startDay: "monday" });
        expect(Workplaces.setPayPeriod(data, "wp-1", {
            type: "biweekly",
            startDay: "friday",
            anchorDate: "2026-10-16",
        }).item.payPeriod).toEqual({ type: "biweekly", startDay: "friday", anchorDate: "2026-10-16" });
        expect(Workplaces.setPayPeriod(data, "wp-1", {
            type: "biweekly",
            startDay: "monday",
            anchorDate: "2026-10-16",
        }).error).toContain("selected start weekday");
        expect(Workplaces.setPayPeriod(data, "wp-1", { type: "biweekly", startDay: "monday" }).error)
            .toContain("reference date");
        expect(Workplaces.setPayPeriod(data, "wp-1", { type: "weekly", startDay: "funday" }).error)
            .toContain("weekday");
    });

    test("migrates legacy pay-period anchors and validates workplace dates", () => {
        const data = sampleDataWithTemplate();
        const normalized = Workplaces.normalizeData(data).workplaces[0];
        expect(normalized.payPeriod).toEqual({ type: "weekly", startDay: "monday" });

        expect(Workplaces.setDates(data, "wp-1", {
            startDate: "2020-03-10",
            endDate: "2026-10-29",
        }).item).toBe(data.workplaces[0]);
        const datedWorkplace = Workplaces.normalizeData(data).workplaces[0];
        expect(datedWorkplace.startDate).toBe("2020-03-10");
        expect(datedWorkplace.endDate).toBe("2026-10-29");
        expect(Workplaces.setDates(data, "wp-1", {
            startDate: "2026-10-30",
            endDate: "2026-10-29",
        }).error).toContain("on or after");
        expect(() => Workplaces.normalizeData({
            ...sampleData(),
            workplaces: [{ ...sampleData().workplaces[0], startDate: "2026-02-30", roles: [] }],
        })).toThrow();
    });

    test("keeps a recovery copy of corrupt data", () => {
        const store = new Map([[Workplaces.STORAGE_KEY, "{nope"]]);
        const storage = {
            getItem: (key) => store.get(key) ?? null,
            setItem: (key, value) => store.set(key, value),
            removeItem: (key) => store.delete(key),
        };
        const originalError = console.error;
        const logged = [];
        console.error = (...args) => logged.push(args);
        let result;
        try {
            result = Workplaces.load(storage);
        } finally {
            console.error = originalError;
        }
        expect(logged.length).toBeGreaterThan(0);
        expect(result.notice.length).toBeGreaterThan(0);
        expect(result.data.workplaces).toEqual([]);
        expect(result.data.setupDismissed).toBe(true);
        expect(store.get(Workplaces.RECOVERY_KEY)).toBe("{nope");
    });
});

describe("Workplace setup", () => {
    test("opens on first launch and Skip persists the dismissal", () => withApp({ workplaces: null }, async ({ win, element, savedWorkplaces }) => {
        expect(element("#workplace-setup-dialog").open).toBe(true);
        element("#skip-workplace-setup").click();
        await tick(win);
        expect(element("#workplace-setup-dialog").open).toBe(false);
        expect(savedWorkplaces().setupDismissed).toBe(true);
        expect(savedWorkplaces().workplaces).toEqual([]);
    }));

    test("does not open once dismissed", () => withApp(({ element }) => {
        expect(element("#workplace-setup-dialog").open).toBe(false);
    }));

    test("shows Skip for now on first run and Cancel when opened from Settings", () => withApp({ workplaces: null }, ({ element, openView }) => {
        expect(element("#skip-workplace-setup").textContent).toBe("Skip for now");
        element("#skip-workplace-setup").click();
        openView("settings");
        element("#open-workplace-setup").click();
        expect(element("#workplace-setup-dialog").open).toBe(true);
        expect(element("#skip-workplace-setup").textContent).toBe("Cancel");
        expect(element("#workplace-setup-title").textContent).toBe("Add a workplace");
    }));

    test("prefills roles from saved jobs, then links shifts and keeps a pre-migration copy", () => withApp({
        workplaces: null,
        shifts: [makeShift({ job: "Server" }), makeShift({ job: "Host" })],
    }, async ({ win, element, elements, fire, savedShifts,     savedWorkplaces }) => {
            const roleValues = () => elements("#setup-roles .note-input").map((input) => input.value);
            expect(roleValues()).toEqual(["Server", "Host"]);
        const original = localStorage.getItem("shift-ledger-shifts-v1");
        element("#setup-workplace-name").value = "Bistro";
            element("#setup-pay-period-type").value = "weekly";
            fire(element("#setup-pay-period-type"), "change");
            element("#setup-pay-period-start-day").value = "monday";
            element("#setup-workplace-start-date").value = "2020-03-10";
            element("#setup-workplace-end-date").value = "2026-10-29";
            element("#setup-roles .note-input").value = "Server";
        elements("#setup-roles .note-input")[1].value = "Bartender";
        fire(element("#add-setup-role"), "click");
        elements("#setup-roles .note-input")[2].value = "Host";
        fire(elements("#setup-roles .note-remove")[2], "click");
        expect(roleValues()).toEqual(["Server", "Bartender"]);
        fire(element("#workplace-setup-form"), "submit");
        await tick(win);

        const saved = savedWorkplaces();
        expect(saved.workplaces[0].name).toBe("Bistro");
        expect(saved.workplaces[0].payPeriod).toEqual({ type: "weekly", startDay: "monday" });
        expect(saved.workplaces[0].startDate).toBe("2020-03-10");
        expect(saved.workplaces[0].endDate).toBe("2026-10-29");
        expect(saved.workplaces[0].roles).toHaveLength(2);
        const shifts = savedShifts();
        expect(shifts[0].roleId).toBe(saved.workplaces[0].roles[0].id);
        expect(shifts[0].job).toBe("Server");
        expect(shifts[1].roleId).toBeUndefined();
        expect(localStorage.getItem(PRE_WORKPLACES_STORAGE_KEY)).toBe(original);
        expect(element("#workplace-setup-dialog").open).toBe(false);
        expect(element("#workplace-list").textContent).toContain("Bistro");
    }));

    test("Enter adds a role row and Backspace on an empty row removes it", () => withApp({ workplaces: null }, ({ element, elements, fire, win }) => {
        const first = element("#setup-roles .note-input");
        first.value = "Server";
        first.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        expect(elements("#setup-roles .note-input")).toHaveLength(2);
        const second = elements("#setup-roles .note-input")[1];
        second.dispatchEvent(new win.KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true }));
        expect(elements("#setup-roles .note-input")).toHaveLength(1);
    }));

    test("shows an error and creates nothing when the name is empty", () => withApp({ workplaces: null }, async ({ win, element, fire, savedWorkplaces }) => {
        fire(element("#workplace-setup-form"), "submit");
        await tick(win);
        expect(element("#setup-workplace-error").hidden).toBe(false);
        expect(element("#setup-workplace-name").getAttribute("aria-invalid")).toBe("true");
        expect(element("#workplace-setup-dialog").open).toBe(true);
        expect(savedWorkplaces()).toBeNull();
    }));

    test("requires an aligned reference date for an every-two-weeks pay period", () => withApp({ workplaces: null }, async ({ win, element, fire, savedWorkplaces }) => {
        element("#setup-workplace-name").value = "Bistro";
        element("#setup-pay-period-type").value = "biweekly";
        fire(element("#setup-pay-period-type"), "change");
        fire(element("#workplace-setup-form"), "submit");
        await tick(win);
        expect(element("#setup-pay-period-error").hidden).toBe(false);
        expect(element("#setup-pay-period-anchor").getAttribute("aria-invalid")).toBe("true");
        expect(element("#workplace-setup-dialog").open).toBe(true);
        expect(savedWorkplaces()).toBeNull();
    }));

    test("rejects workplace dates that end before they start", () => withApp({ workplaces: null }, async ({ win, element, fire, savedWorkplaces }) => {
        element("#setup-workplace-name").value = "Bistro";
        element("#setup-workplace-start-date").value = "2026-10-30";
        element("#setup-workplace-end-date").value = "2026-10-29";
        fire(element("#workplace-setup-form"), "submit");
        await tick(win);
        expect(element("#setup-workplace-dates-error").hidden).toBe(false);
        expect(element("#workplace-setup-dialog").open).toBe(true);
        expect(savedWorkplaces()).toBeNull();
    }));
});

describe("Workplace manager in Settings", () => {
    const submitName = async ({ win, element, fire }, value) => {
        element("#name-input").value = value;
        fire(element("#name-form"), "submit");
        await tick(win);
    };

    test("shows the empty state with a setup button", () => withApp(({ element, openView }) => {
        openView("settings");
        expect(element("#workplace-empty").hidden).toBe(false);
        expect(element("#workplace-list").hidden).toBe(true);
    }));

    test("adds a workplace and a role", () => withApp(async (app) => {
        const { win, element, elements, fire, openView, savedWorkplaces } = app;
        openView("settings");
        element("#add-workplace").click();
        expect(element("#workplace-setup-dialog").open).toBe(true);
        element("#setup-workplace-name").value = "Cafe";
        element("#setup-pay-period-type").value = "biweekly";
        fire(element("#setup-pay-period-type"), "change");
        element("#setup-pay-period-start-day").value = "friday";
        element("#setup-pay-period-anchor").value = "2026-10-16";
        element("#setup-roles .note-input").value = "Barista";
        fire(element("#add-setup-role"), "click");
        elements("#setup-roles .note-input")[1].value = "Host";
        fire(element("#workplace-setup-form"), "submit");
        await tick(win);
        expect(savedWorkplaces().workplaces[0].name).toBe("Cafe");
        expect(savedWorkplaces().workplaces[0].payPeriod).toEqual({
            type: "biweekly",
            startDay: "friday",
            anchorDate: "2026-10-16",
        });
        expect(savedWorkplaces().workplaces[0].roles).toHaveLength(2);
        expect(savedWorkplaces().workplaces[0].roles[1].name).toBe("Host");
        expect(element("#workplace-list").textContent).toContain("Barista");
    }));

    test("rejects an existing role name when adding roles", () => withApp({ workplaces: sampleData() }, async ({ win, element, openView, fire, savedWorkplaces }) => {
        openView("settings");
        element('button[data-action="add-role"]').click();
        element("#add-roles-list .note-input").value = "server";
        fire(element("#add-roles-form"), "submit");
        await tick(win);
        expect(element("#add-roles-dialog").open).toBe(true);
        expect(element("#add-roles-error").hidden).toBe(false);
        expect(savedWorkplaces().workplaces[0].roles).toHaveLength(2);
    }));

    test("rejects duplicate workplace names inline and keeps the shared dialog open", () => withApp({ workplaces: sampleData() }, async (app) => {
        const { element, fire, openView, savedWorkplaces } = app;
        openView("settings");
        element("#add-workplace").click();
        element("#setup-workplace-name").value = "bistro";
        fire(element("#workplace-setup-form"), "submit");
        await tick(app.win);
        expect(element("#workplace-setup-dialog").open).toBe(true);
        expect(element("#setup-workplace-error").hidden).toBe(false);
        expect(savedWorkplaces().workplaces).toHaveLength(1);
        element("#skip-workplace-setup").click();
        await tick(app.win);
        expect(element("#workplace-setup-dialog").open).toBe(false);
    }));

    test("renames, archives and unarchives", () => withApp({ workplaces: sampleData() }, async (app) => {
        const { win, element, openView, savedWorkplaces } = app;
        openView("settings");
        element('button[data-action="rename"][data-id="r-1"]').click();
        await submitName(app, "Waiter");
        expect(savedWorkplaces().workplaces[0].roles[0].name).toBe("Waiter");

        element('button[data-action="archive"][data-id="r-1"]').click();
        await tick(win);
        expect(savedWorkplaces().workplaces[0].roles[0].archived).toBe(true);
        expect(app.doc.activeElement.dataset.action).toBe("unarchive");

        element('button[data-action="unarchive"][data-id="r-1"]').click();
        await tick(win);
        expect(savedWorkplaces().workplaces[0].roles[0].archived).toBe(false);
    }));

    test("hides Delete for items used by shifts and deletes unused ones", () => withApp({
        workplaces: sampleData(),
        shifts: [makeShift({ workplaceId: "wp-1", roleId: "r-1" })],
    }, async ({ win, doc, element, elements, openView, savedWorkplaces }) => {
        openView("settings");
        win.confirm = () => true;
        expect(elements('button[data-action="delete"][data-id="r-1"]')).toHaveLength(0);
        expect(elements('button[data-action="delete"][data-id="wp-1"]')).toHaveLength(0);

        element('button[data-action="delete"][data-id="r-2"]').click();
        await tick(win);
        expect(savedWorkplaces().workplaces[0].roles).toHaveLength(1);
        expect(doc.activeElement).toBeDefined();
    }));

    test("edits role templates and workplace pay periods", () => withApp({ workplaces: sampleData() }, async ({ win, element, openView, fire, savedWorkplaces }) => {
        openView("settings");
        element('button[data-action="template"][data-id="r-1"]').click();
        element("#template-meal-period").value = "Lunch";
        element("#template-clock-in").value = "11:00";
        element("#template-clock-out").value = "15:00";
        fire(element("#template-form"), "submit");
        await tick(win);
        expect(savedWorkplaces().workplaces[0].roles[0].template.clockIn).toBe("11:00");

        element('button[data-action="pay-period"][data-id="wp-1"]').click();
        element("#pay-period-type").value = "biweekly";
        fire(element("#pay-period-type"), "change");
        element("#pay-period-start-day").value = "friday";
        element("#pay-period-anchor").value = "2026-10-16";
        fire(element("#pay-period-form"), "submit");
        await tick(win);
        expect(savedWorkplaces().workplaces[0].payPeriod.type).toBe("biweekly");
        expect(savedWorkplaces().workplaces[0].payPeriod.startDay).toBe("friday");
        expect(savedWorkplaces().workplaces[0].payPeriod.anchorDate).toBe("2026-10-16");

        element('button[data-action="dates"][data-id="wp-1"]').click();
        element("#workplace-start-date").value = "2020-03-10";
        element("#workplace-end-date").value = "2026-10-29";
        fire(element("#workplace-dates-form"), "submit");
        await tick(win);
        expect(savedWorkplaces().workplaces[0].startDate).toBe("2020-03-10");
        expect(savedWorkplaces().workplaces[0].endDate).toBe("2026-10-29");
        expect(element("#workplace-list").textContent).toContain("Workplace dates:");
    }));
});

describe("Shift form workplace mode", () => {
    test("shows workplace and role selects and hides the legacy job field", () => withApp({ workplaces: sampleData() }, ({ element, openView }) => {
        openView("new-shift");
        expect(element("#shift-workplace-field").hidden).toBe(false);
        expect(element("#shift-role-field").hidden).toBe(false);
        expect(element("#shift-job-field").hidden).toBe(true);
        expect(element("#shift-workplace").value).toBe("wp-1");
    }));

    test("workplace dates do not restrict shift logging", () => withApp({ workplaces: (() => {
        const data = sampleData();
        data.workplaces[0].startDate = "2026-10-29";
        data.workplaces[0].endDate = "2026-10-29";
        return data;
    })() }, ({ element, openView }) => {
        openView("new-shift");
        expect(element("#shift-workplace").disabled).toBe(false);
        expect(element("#shift-role").disabled).toBe(false);
    }));

    test("applies template values only to empty fields", () => withApp({ workplaces: sampleDataWithTemplate() }, ({ element, change, openView }) => {
        openView("new-shift");
        change("#shift-clock-in", "17:00");
        change("#shift-role", "r-1");
        expect(element("#shift-meal-period").value).toBe("Dinner");
        expect(element("#shift-clock-in").value).toBe("17:00");
        expect(element("#shift-clock-out").value).toBe("22:00");
        expect(element("#shift-break-start").value).toBe("19:00");
        expect(element("#shift-role-hint").textContent).toContain("Filled");
    }));

    test("saves a shift with workplace and role ids while keeping a job snapshot", () => withApp({ workplaces: sampleDataWithTemplate() }, ({ fillForm, submitForm, openView, savedShifts }) => {
        openView("new-shift");
        fillForm({
            date: "2026-10-22",
            mealPeriod: "Dinner",
            workplace: "wp-1",
            role: "r-2",
            clockIn: "16:00",
            clockOut: "22:00",
        });
        submitForm();
        const [saved] = savedShifts();
        expect(saved.workplaceId).toBe("wp-1");
        expect(saved.roleId).toBe("r-2");
        expect(saved.job).toBe("Bartender");
    }));

    test("a role without reports hides the report fields and saves without them", () => withApp({
        workplaces: (() => {
            const data = sampleData();
            data.workplaces[0].roles[1].tracksReports = false;
            return data;
        })(),
    }, ({ element, change, fillForm, submitForm, openView, savedShifts }) => {
        openView("new-shift");
        expect(element("#single-report-fields").hidden).toBe(false);
        change("#shift-role", "r-2");
        expect(element("#single-report-fields").hidden).toBe(true);
        expect(element("#single-report-toggle").hidden).toBe(true);
        expect(element("#role-no-reports-note").hidden).toBe(false);
        fillForm({ date: "2026-10-22", mealPeriod: "Dinner", workplace: "wp-1", role: "r-2", clockIn: "16:00", clockOut: "22:00", foodSales: "50" });
        submitForm();
        const [saved] = savedShifts();
        expect(saved.noReport).toBe(true);
        expect(saved.foodSales).toBe(0);

        openView("new-shift");
        change("#shift-meal-period", "Double");
        expect(element("#double-report-fields").hidden).toBe(false);
        change("#shift-role", "r-2");
        expect(element("#double-report-fields").hidden).toBe(true);
        change("#shift-role", "r-1");
        expect(element("#double-report-fields").hidden).toBe(false);
    }));

    test("the Settings template dialog toggles tracksReports", () => withApp({ workplaces: sampleData() }, async ({ win, element, openView, fire, savedWorkplaces }) => {
        openView("settings");
        element('button[data-action="template"][data-id="r-1"]').click();
        element("#template-no-reports").checked = true;
        fire(element("#template-form"), "submit");
        await tick(win);
        expect(savedWorkplaces().workplaces[0].roles[0].tracksReports).toBe(false);
        expect(element(".role-item").textContent).toContain("No sales or tip reports");
    }));
});

describe("Editing shifts without a role", () => {
    test("keeps the old job as a no-role option and can move it to a role", () => withApp({
        workplaces: sampleData(),
        shifts: [makeShift({ id: 33, job: "Expo" })],
    }, ({ element, openView, fire, change, savedShifts }) => {
        openView("previous-shifts");
        fire(element('.shift-card[data-shift-id="33"] .card-menu-toggle'), "click");
        fire(element('.shift-card[data-shift-id="33"] .edit-shift'), "click");
        expect(element("#form-title").textContent).toBe("Edit Shift");
        expect(element("#shift-role").value).toBe("__legacy__");
        expect(element("#shift-role").textContent).toContain("Expo");

        fire(element("#shift-form"), "submit");
        expect(savedShifts()[0].job).toBe("Expo");
        expect(savedShifts()[0].roleId).toBeUndefined();
    }));

    test("saving with a chosen role links the shift", () => withApp({
        workplaces: sampleData(),
        shifts: [makeShift({ id: 34, job: "Expo" })],
    }, ({ element, openView, fire, change, savedShifts }) => {
        openView("previous-shifts");
        fire(element('.shift-card[data-shift-id="34"] .card-menu-toggle'), "click");
        fire(element('.shift-card[data-shift-id="34"] .edit-shift'), "click");
        change("#shift-workplace", "wp-1");
        change("#shift-role", "r-1");
        fire(element("#shift-form"), "submit");
        expect(savedShifts()[0].job).toBe("Server");
        expect(savedShifts()[0].roleId).toBe("r-1");
        expect(savedShifts()[0].workplaceId).toBe("wp-1");
    }));
});

describe("History with workplaces", () => {
    const twoPlaces = () => {
        const data = sampleData();
        data.workplaces.push({ id: "wp-2", name: "Cafe", archived: false, roles: [{ id: "r-3", name: "Barista", archived: false }] });
        return data;
    };
    const shifts = () => [
        makeShift({ id: 41, date: "2026-10-20", job: "Server", workplaceId: "wp-1", roleId: "r-1" }),
        makeShift({ id: 42, date: "2026-10-21", job: "Barista", workplaceId: "wp-2", roleId: "r-3" }),
        makeShift({ id: 43, date: "2026-10-22", job: "Expo" }),
    ];

    test("cards show the role and workplace, and the filter narrows the list", () => withApp({
        workplaces: twoPlaces(),
        shifts: shifts(),
    }, ({ element, elements, openView, change }) => {
        openView("previous-shifts");
        expect(element('.shift-card[data-shift-id="41"] .card-job').textContent).toBe("Server · Bistro");
        expect(element('.shift-card[data-shift-id="43"] .card-job').textContent).toBe("Expo");
        expect(elements(".shift-card")).toHaveLength(3);

        change("#filter-workplace", "wp-2");
        expect(elements(".shift-card")).toHaveLength(1);
        expect(element(".shift-card").dataset.shiftId).toBe("42");
        expect(element("#active-filters").textContent).toContain("Workplace: Cafe");
    }));

    test("the job filter lists roles and past jobs", () => withApp({
        workplaces: twoPlaces(),
        shifts: shifts(),
    }, ({ element, elements, openView, change }) => {
        openView("previous-shifts");
        const values = [...element("#filter-job").options].map((option) => option.value);
        expect(values).toContain("Barista");
        expect(values).toContain("Expo");
        change("#filter-job", "Barista");
        expect(elements(".shift-card")).toHaveLength(1);
    }));
});

describe("Backup with workplaces", () => {
    const restore = async ({ win, element, fire }, payload) => {
        win.confirm = () => true;
        const input = element("#backup-file");
        const transfer = new win.DataTransfer();
        transfer.items.add(new win.File([payload], "backup.json", { type: "application/json" }));
        input.files = transfer.files;
        fire(input, "change");
        await new Promise((resolve) => win.setTimeout(resolve, 100));
    };

    test("exports version 2 with workplaces", () => withApp({ workplaces: sampleData() }, async ({ win, element, openView }) => {
        let exported = "";
        win.Blob = class { constructor(parts) { exported = parts.join(""); } };
        win.URL.createObjectURL = () => "blob:test";
        win.URL.revokeObjectURL = () => {};
        openView("settings");
        element("#export-backup").click();
        const backup = JSON.parse(exported);
        expect(backup.version).toBe(2);
        expect(backup.workplaces[0].name).toBe("Bistro");
    }));

    test("restores workplaces together with shifts", () => withApp(async (app) => {
        const shift = makeShift({ workplaceId: "wp-1", roleId: "r-1" });
        await restore(app, JSON.stringify({ format: "shift-ledger-backup", version: 2, shifts: [shift], workplaces: sampleData().workplaces }));
        expect(app.savedWorkplaces().workplaces[0].name).toBe("Bistro");
        expect(app.savedShifts()[0].roleId).toBe("r-1");
        expect(app.element("#workplace-list").textContent).toContain("Bistro");
    }));

    test("a version 1 backup leaves workplaces untouched", () => withApp({ workplaces: sampleData() }, async (app) => {
        await restore(app, JSON.stringify({ format: "shift-ledger-backup", version: 1, shifts: [makeShift()] }));
        expect(app.savedWorkplaces().workplaces[0].name).toBe("Bistro");
        expect(app.savedShifts()).toHaveLength(1);
    }));

    test("rejects invalid workplace data without changing anything", () =>     withApp({ workplaces: sampleData(), shifts: [makeShift()], expectConsoleErrors: true }, async (app) => {
        await restore(app, JSON.stringify({ shifts: [makeShift(), makeShift()], workplaces: [{ id: 1 }] }));
        expect(app.savedShifts()).toHaveLength(1);
        expect(app.savedWorkplaces().workplaces[0].name).toBe("Bistro");
    }));
});
