export const SHIFT_STORAGE_KEY = "shift-ledger-shifts-v1";
export const SETTINGS_STORAGE_KEY = "shift-ledger-settings-v1";
export const RECOVERY_STORAGE_KEY = "shift-ledger-shifts-v1-recovery";
export const WORKPLACES_STORAGE_KEY = "shift-ledger-workplaces-v1";
export const PRE_WORKPLACES_STORAGE_KEY = "shift-ledger-shifts-v1-pre-workplaces";

const FIELD_IDS = {
    date: "shift-date",
    mealPeriod: "shift-meal-period",
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

const DEFAULT_FORM_VALUES = {
    date: "2026-10-20",
    mealPeriod: "Dinner",
    job: "Server",
    clockIn: "16:00",
    clockOut: "22:00",
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

async function runWithApp({ width = 1200, height = 1000, shifts, settings, workplaces } = {}, callback) {
    const previous = {
        shifts: localStorage.getItem(SHIFT_STORAGE_KEY),
        settings: localStorage.getItem(SETTINGS_STORAGE_KEY),
        workplaces: localStorage.getItem(WORKPLACES_STORAGE_KEY),
        preWorkplaces: localStorage.getItem(PRE_WORKPLACES_STORAGE_KEY),
        workplacesRecovery: localStorage.getItem(`${WORKPLACES_STORAGE_KEY}-recovery`),
    };
    const frame = document.createElement("iframe");
    frame.title = "Shift Ledger app test";
    frame.style.cssText = `position:fixed;left:-${width + 100}px;top:0;width:${width}px;height:${height}px;`;

    localStorage.removeItem(SHIFT_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(PRE_WORKPLACES_STORAGE_KEY);
    localStorage.removeItem(`${WORKPLACES_STORAGE_KEY}-recovery`);
    // Tests start with first-run setup already dismissed unless they ask otherwise.
    if (workplaces === null) {
        localStorage.removeItem(WORKPLACES_STORAGE_KEY);
    } else {
        localStorage.setItem(WORKPLACES_STORAGE_KEY, typeof workplaces === "string"
            ? workplaces
            : JSON.stringify({ version: 1, setupDismissed: true, workplaces: [], ...workplaces }));
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
        await loaded;
        await new Promise((resolve) => frame.contentWindow.requestAnimationFrame(() => (
            frame.contentWindow.requestAnimationFrame(resolve)
        )));

        return await callback(createHarness(frame));
    } finally {
        frame.remove();
        restoreItem(SHIFT_STORAGE_KEY, previous.shifts);
        restoreItem(SETTINGS_STORAGE_KEY, previous.settings);
        restoreItem(RECOVERY_STORAGE_KEY, previousRecovery);
        restoreItem(WORKPLACES_STORAGE_KEY, previous.workplaces);
        restoreItem(PRE_WORKPLACES_STORAGE_KEY, previous.preWorkplaces);
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

function createHarness(frame) {
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

    const openView = (name) => element(`.main-nav [data-view="${name}"]`).click();
    const fillForm = (values) => {
        Object.entries(values).forEach(([key, value]) => {
            const id = FIELD_IDS[key];
            if (!id) {
                throw new Error(`Unknown shift form field: ${key}`);
            }
            doc.getElementById(id).value = String(value);
        });
    };
    const submitForm = () => fire(element("#shift-form"), "submit");
    const saveShift = (values = {}) => {
        openView("new-shift");
        fillForm({ ...DEFAULT_FORM_VALUES, ...values });
        submitForm();
    };
    const change = (selector, value) => {
        const target = element(selector);
        target.value = value;
        fire(target, "change");
    };

    return {
        frame,
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
        savedShifts: () => JSON.parse(localStorage.getItem(SHIFT_STORAGE_KEY) || "[]"),
        savedSettings: () => JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "{}"),
        savedWorkplaces: () => JSON.parse(localStorage.getItem(WORKPLACES_STORAGE_KEY) || "null"),
    };
}
