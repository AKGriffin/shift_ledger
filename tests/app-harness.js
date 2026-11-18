export const SHIFT_STORAGE_KEY = "shift-ledger-shifts-v1";
export const SHIFT_DRAFT_STORAGE_KEY = `${SHIFT_STORAGE_KEY}-draft`;
export const SETTINGS_STORAGE_KEY = "shift-ledger-settings-v1";
export const RECOVERY_STORAGE_KEY = "shift-ledger-shifts-v1-recovery";
export const WORKPLACES_STORAGE_KEY = "shift-ledger-workplaces-v1";
export const PRE_WORKPLACES_STORAGE_KEY = "shift-ledger-shifts-v1-pre-workplaces";
export const PRE_FLEXIBLE_REPORTS_STORAGE_KEY = "shift-ledger-shifts-v1-pre-flexible-reports";

const FIELD_IDS = {
    date: "shift-date",
    mealPeriod: "shift-meal-period",
    shiftLabel: "shift-other-label",
    job: "shift-job",
    workplace: "shift-workplace",
    role: "shift-role",
    clockIn: "shift-clock-in",
    clockOut: "shift-clock-out",
    breakStart: "shift-break-start",
    breakEnd: "shift-break-end",
    foodSales: "shift-food-sales",
    ccTips: "shift-cc-tips",
    cashTips: "shift-cash-tips",
    autoGratuity: "shift-auto-gratuity",
    tipOutPaid: "shift-tip-out-paid",
    tipOutReceived: "shift-tip-out-received",
};
const REPORT_FIELD_NAMES = {
    foodSales: "foodSales",
    bawSales: "bawSales",
    liquorSales: "liquorSales",
    naBevSales: "naBevSales",
    additionalSales: "additionalSales",
    ccTips: "ccTips",
    cashTips: "cashTips",
    autoGratuity: "autoGratuity",
    tipOutPaid: "tipsPaidOut",
    tipOutReceived: "tipOutReceived",
};

const DEFAULT_FORM_VALUES = {
    date: "2026-10-20",
    mealPeriod: "Dinner",
    job: "Server",
    clockIn: "16:00",
    clockOut: "22:00",
};
const DEFAULT_WORKPLACES = {
    version: 1,
    setupDismissed: true,
    workplaces: [{
        id: "test-workplace",
        name: "Test Workplace",
        archived: false,
        roles: [{ id: "test-server", name: "Server", archived: false }],
    }],
};

let nextShiftId = 1;

export function makeShift(overrides = {}) {
    return {
        id: nextShiftId++,
        date: "2026-10-20",
        mealPeriod: "Dinner",
        job: "Server",
        clockIn: "16:00",
        clockOut: "22:00",
        breakStart: "",
        breakEnd: "",
        foodSales: 0,
        bawSales: 0,
        liquorSales: 0,
        naBevSales: 0,
        additionalSales: 0,
        ccTips: 0,
        cashTips: 0,
        autoGratuity: 0,
        tipsPaidOut: 0,
        tipOutReceived: 0,
        notes: "",
        ...overrides,
    };
}

export function contrastRatio(firstHex, secondHex) {
    const linearize = (channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (hex) => {
        const color = hex.replace("#", "");
        const channels = [0, 2, 4].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
        return channels.reduce((sum, channel, index) => (
            sum + linearize(channel) * [0.2126, 0.7152, 0.0722][index]
        ), 0);
    };
    const first = luminance(firstHex);
    const second = luminance(secondHex);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

// App tests share the page's localStorage, so fixtures run one at a time.
let queue = Promise.resolve();

export function withApp(options, callback) {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }

    const run = queue.then(() => runWithApp(options, callback));
    queue = run.catch(() => {});
    return run;
}

async function runWithApp({ width = 1200, height = 1000, shifts, settings, workplaces, expectConsoleErrors = false } = {}, callback) {
    const consoleErrors = [];
    const previous = {
        shifts: localStorage.getItem(SHIFT_STORAGE_KEY),
        shiftDraft: localStorage.getItem(SHIFT_DRAFT_STORAGE_KEY),
        settings: localStorage.getItem(SETTINGS_STORAGE_KEY),
        workplaces: localStorage.getItem(WORKPLACES_STORAGE_KEY),
        preWorkplaces: localStorage.getItem(PRE_WORKPLACES_STORAGE_KEY),
        preFlexibleReports: Object.keys(localStorage)
            .filter((key) => key === PRE_FLEXIBLE_REPORTS_STORAGE_KEY || key.startsWith(`${PRE_FLEXIBLE_REPORTS_STORAGE_KEY}-`))
            .map((key) => [key, localStorage.getItem(key)]),
        workplacesRecovery: localStorage.getItem(`${WORKPLACES_STORAGE_KEY}-recovery`),
    };
    const frame = document.createElement("iframe");
    frame.title = "Shift Ledger app test";
    frame.style.cssText = `position:fixed;left:-${width + 100}px;top:0;width:${width}px;height:${height}px;`;

    localStorage.removeItem(SHIFT_STORAGE_KEY);
    localStorage.removeItem(SHIFT_DRAFT_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(PRE_WORKPLACES_STORAGE_KEY);
    previous.preFlexibleReports.forEach(([key]) => localStorage.removeItem(key));
    localStorage.removeItem(`${WORKPLACES_STORAGE_KEY}-recovery`);
    // Tests start with first-run setup already dismissed unless they ask otherwise.
    if (workplaces === null) {
        localStorage.removeItem(WORKPLACES_STORAGE_KEY);
    } else {
        const fixture = workplaces === undefined ? DEFAULT_WORKPLACES : workplaces;
        localStorage.setItem(WORKPLACES_STORAGE_KEY, typeof fixture === "string"
            ? fixture
            : JSON.stringify({ version: 1, setupDismissed: true, workplaces: [], ...fixture }));
    }
    if (shifts) {
        localStorage.setItem(SHIFT_STORAGE_KEY, typeof shifts === "string" ? shifts : JSON.stringify(shifts));
    }
    const previousRecovery = localStorage.getItem(RECOVERY_STORAGE_KEY);
    localStorage.removeItem(RECOVERY_STORAGE_KEY);
    if (settings) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }

    try {
        const loaded = new Promise((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error("The app test frame did not load.")), 10000);
            frame.addEventListener("load", () => {
                window.clearTimeout(timeout);
                resolve();
            }, { once: true });
        });
        frame.src = "../index.html";
        document.body.appendChild(frame);
        if (expectConsoleErrors) {
            // Tests that exercise error handling capture the app's logged errors instead of printing them.
            // Patch repeatedly so the stub is in place before the app's scripts run on load.
            const capture = (...args) => consoleErrors.push(args);
            const patch = () => {
                try {
                    frame.contentWindow.console.error = capture;
                } catch {
                    // The frame is between documents.
                }
            };
            const timer = window.setInterval(patch, 0);
            frame.addEventListener("load", () => {
                window.clearInterval(timer);
                patch();
            }, { once: true });
            patch();
        }
        await loaded;
        await new Promise((resolve) => frame.contentWindow.requestAnimationFrame(() => (
            frame.contentWindow.requestAnimationFrame(resolve)
        )));

        return await callback(createHarness(frame, consoleErrors));
    } finally {
        frame.remove();
        restoreItem(SHIFT_STORAGE_KEY, previous.shifts);
        restoreItem(SHIFT_DRAFT_STORAGE_KEY, previous.shiftDraft);
        restoreItem(SETTINGS_STORAGE_KEY, previous.settings);
        restoreItem(RECOVERY_STORAGE_KEY, previousRecovery);
        restoreItem(WORKPLACES_STORAGE_KEY, previous.workplaces);
        restoreItem(PRE_WORKPLACES_STORAGE_KEY, previous.preWorkplaces);
        Object.keys(localStorage)
            .filter((key) => key === PRE_FLEXIBLE_REPORTS_STORAGE_KEY || key.startsWith(`${PRE_FLEXIBLE_REPORTS_STORAGE_KEY}-`))
            .forEach((key) => localStorage.removeItem(key));
        previous.preFlexibleReports.forEach(([key, value]) => restoreItem(key, value));
        restoreItem(`${WORKPLACES_STORAGE_KEY}-recovery`, previous.workplacesRecovery);
    }
}

function restoreItem(key, value) {
    if (value === null) {
        localStorage.removeItem(key);
    } else {
        localStorage.setItem(key, value);
    }
}

function createHarness(frame, consoleErrors) {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;

    const element = (selector) => {
        const found = doc.querySelector(selector);
        if (!found) {
            throw new Error(`App test element not found: ${selector}`);
        }
        return found;
    };
    const elements = (selector) => [...doc.querySelectorAll(selector)];
    const fire = (target, type) => {
        target.dispatchEvent(new win.Event(type, { bubbles: true, cancelable: true }));
    };
    const style = (target) => win.getComputedStyle(target);
    const rootStyleValue = (name) => style(doc.documentElement).getPropertyValue(name).trim();

    const openView = (name, { entryMode = "manual" } = {}) => {
        element(name === "new-shift" ? "#open-new-shift" : `.main-nav [data-view="${name}"]`).click();
        // New entry always starts guided; "manual" jumps straight to the edit phase for form-level tests.
        if (entryMode === "manual"
            && name === "new-shift"
            && !doc.getElementById("shift-draft-dialog").open
            && !state_hasEditingShift()) {
            win.setEntryMode("manual");
        }
    };
    const state_hasEditingShift = () => doc.getElementById("form-title").textContent !== "New Shift";
    const fillForm = (values) => {
        Object.entries(values).forEach(([key, value]) => {
            if (key === "workedPeriods" || Object.hasOwn(REPORT_FIELD_NAMES, key)
                || key === "noSales" || key === "noTips") {
                return;
            }
            const id = FIELD_IDS[key];
            if (!id) {
                throw new Error(`Unknown shift form field: ${key}`);
            }
            doc.getElementById(id).value = String(value);
        });
        if (Array.isArray(values.workedPeriods)) {
            const list = element("#worked-period-list");
            while (list.children.length > 1) {
                list.lastElementChild.remove();
            }
            const labels = values.workedPeriods;
            const first = list.querySelector("[data-worked-period]");
            first.value = labels[0] || "";
            for (const label of labels.slice(1)) {
                element("#add-worked-period").click();
                list.lastElementChild.querySelector("[data-worked-period]").value = label;
            }
            win.updateWorkedPeriodFields();
        }
        const hasReportValues = Object.keys(values).some((key) => (
            Object.hasOwn(REPORT_FIELD_NAMES, key) || key === "noSales" || key === "noTips"
        ));
        if (hasReportValues) {
            let report = element("#flexible-report-list").firstElementChild;
            if (!report) {
                element("#add-flexible-report").click();
                report = element("#flexible-report-list").firstElementChild;
                report.querySelector('[data-report-field="coverage"]').value = "whole";
            }
            Object.entries(REPORT_FIELD_NAMES).forEach(([key, reportField]) => {
                if (Object.hasOwn(values, key)) {
                    report.querySelector(`[data-report-field="${reportField}"]`).value = String(values[key]);
                }
            });
            ["noSales", "noTips"].forEach((key) => {
                if (values[key]) {
                    report.querySelector(`[data-report-field="${key}"]`).checked = true;
                }
            });
        }
    };
    const submitForm = () => {
        fire(element("#shift-form"), "submit");
        // A valid submit lands on the review step; submitting again saves.
        if (!element("#shift-review").hidden) {
            fire(element("#shift-form"), "submit");
        }
    };
    const saveShift = (values = {}) => {
        openView("new-shift");
        fillForm({ ...DEFAULT_FORM_VALUES, ...values });
        if (element("#flexible-report-list").children.length === 0) {
            element("#add-flexible-report").click();
            const report = element("#flexible-report-list").firstElementChild;
            report.querySelector('[data-report-field="coverage"]').value = "whole";
        }
        submitForm();
    };
    const change = (selector, value) => {
        const target = element(selector);
        target.value = value;
        fire(target, "change");
    };
    const respondToConfirmDialog = async (accepted = true) => {
        const dialog = element("#confirm-dialog");
        for (let attempt = 0; attempt < 100 && !dialog.open; attempt += 1) {
            await new Promise((resolve) => win.setTimeout(resolve, 10));
        }
        if (!dialog.open) {
            throw new Error(`Confirmation dialog did not open. Status: ${element("#form-status").textContent}`);
        }
        element(accepted ? "#confirm-ok" : "#confirm-cancel").click();
    };

    return {
        frame,
        consoleErrors,
        win,
        doc,
        element,
        elements,
        fire,
        style,
        rootStyleValue,
        openView,
        fillForm,
        submitForm,
        saveShift,
        change,
        respondToConfirmDialog,
        savedShifts: () => JSON.parse(localStorage.getItem(SHIFT_STORAGE_KEY) || "[]"),
        savedDraft: () => {
            const raw = localStorage.getItem(SHIFT_DRAFT_STORAGE_KEY);
            return raw === null ? null : JSON.parse(raw);
        },
        savedSettings: () => JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}"),
        savedWorkplaces: () => JSON.parse(localStorage.getItem(WORKPLACES_STORAGE_KEY) || "null"),
    };
}
