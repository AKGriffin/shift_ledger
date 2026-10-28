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
        expect(Workplaces.setPayPeriod(data, "wp-1", { type: "biweekly", anchorDate: "2026-10-17" }).item.payPeriod.type).toBe("biweekly");
        expect(Workplaces.setPayPeriod(data, "wp-1", { type: "weekly", anchorDate: "2026-13-01" }).error).toContain("date");
    });

    test("keeps a recovery copy of corrupt data", () => {
        const store = new Map([[Workplaces.STORAGE_KEY, "{nope"]]);
        const storage = {
            getItem: (key) => store.get(key) ?? null,
            setItem: (key, value) => store.set(key, value),
            removeItem: (key) => store.delete(key),
        };
        const result = Workplaces.load(storage);
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

    test("prefills roles from saved jobs, then links shifts and keeps a pre-migration copy", () => withApp({
        workplaces: null,
        shifts: [makeShift({ job: "Server" }), makeShift({ job: "Host" })],
    }, async ({ win, element, fire, savedShifts, savedWorkplaces }) => {
        expect(element("#setup-roles").value).toBe("Server, Host");
        const original = localStorage.getItem("shift-ledger-shifts-v1");
        element("#setup-workplace-name").value = "Bistro";
        element("#setup-roles").value = "Server, Bartender";
        fire(element("#workplace-setup-form"), "submit");
        await tick(win);

        const saved = savedWorkplaces();
        expect(saved.workplaces[0].name).toBe("Bistro");
        expect(saved.workplaces[0].roles).toHaveLength(2);
        const shifts = savedShifts();
        expect(shifts[0].roleId).toBe(saved.workplaces[0].roles[0].id);
        expect(shifts[0].job).toBe("Server");
        expect(shifts[1].roleId).toBeUndefined();
        expect(localStorage.getItem(PRE_WORKPLACES_STORAGE_KEY)).toBe(original);
        expect(element("#workplace-setup-dialog").open).toBe(false);
        expect(element("#workplace-list").textContent).toContain("Bistro");
    }));

    test("shows an error and creates nothing when the name is empty", () => withApp({ workplaces: null }, async ({ win, element, fire, savedWorkplaces }) => {
        fire(element("#workplace-setup-form"), "submit");
        await tick(win);
        expect(element("#setup-workplace-error").hidden).toBe(false);
        expect(element("#setup-workplace-name").getAttribute("aria-invalid")).toBe("true");
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
        const { win, element, openView, savedWorkplaces } = app;
        openView("settings");
        element("#add-workplace").click();
        await submitName(app, "Cafe");
        expect(savedWorkplaces().workplaces[0].name).toBe("Cafe");

        element('button[data-action="add-role"]').click();
        await submitName(app, "Barista");
        await tick(win);
        expect(savedWorkplaces().workplaces[0].roles[0].name).toBe("Barista");
        expect(element("#workplace-list").textContent).toContain("Barista");
    }));

    test("rejects duplicate names inline and keeps the dialog open", () => withApp({ workplaces: sampleData() }, async (app) => {
        const { element, openView, savedWorkplaces } = app;
        openView("settings");
        element("#add-workplace").click();
        await submitName(app, "bistro");
        expect(element("#name-dialog").open).toBe(true);
        expect(element("#name-input-error").hidden).toBe(false);
        expect(savedWorkplaces().workplaces).toHaveLength(1);
        element("#cancel-name").click();
        await tick(app.win);
        expect(element("#name-dialog").open).toBe(false);
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
        element("#pay-period-anchor").value = "2026-10-16";
        fire(element("#pay-period-form"), "submit");
        await tick(win);
        expect(savedWorkplaces().workplaces[0].payPeriod.type).toBe("biweekly");
        expect(savedWorkplaces().workplaces[0].payPeriod.anchorDate).toBe("2026-10-16");
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

    test("rejects invalid workplace data without changing anything", () => withApp({ workplaces: sampleData(), shifts: [makeShift()] }, async (app) => {
        await restore(app, JSON.stringify({ shifts: [makeShift(), makeShift()], workplaces: [{ id: 1 }] }));
        expect(app.savedShifts()).toHaveLength(1);
        expect(app.savedWorkplaces().workplaces[0].name).toBe("Bistro");
    }));
});
