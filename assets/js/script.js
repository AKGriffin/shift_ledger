const STORAGE_KEY = "shift-ledger-shifts-v1";
const SETTINGS_KEY = "shift-ledger-settings-v1";
const { getAutoGratuity, getDurationMinutes, getFinancialBreakdown, getNetTips, getSalesTotal, toMinutes } = window.ShiftMath;
const CARD_BREAKDOWN_SELECTORS = {
    foodSales: ".card-food-sales",
    bawSales: ".card-baw-sales",
    liquorSales: ".card-liquor-sales",
    naBevSales: ".card-na-bev-sales",
    additionalSales: ".card-additional-sales",
    ccTips: ".card-cc-tips",
    cashTips: ".card-cash-tips",
    tipsPaidOut: ".card-tips-paid-out",
    tipOutReceived: ".card-tip-out-received",
};

const state = {
    shifts: loadShifts(),
    settings: loadSettings(),
    currentView: null,
    editingShiftId: null,
};

const navButtons = document.querySelectorAll("[data-view]");
const formStatus = document.getElementById("form-status");
const form = document.getElementById("shift-form");
const formTitle = document.getElementById("form-title");
const clearFormButton = document.getElementById("clear-form");
const cancelFormButton = document.getElementById("cancel-form");
const shiftList = document.getElementById("shift-list");
const sortBySelect = document.getElementById("sort-by");
const filterJobSelect = document.getElementById("filter-job");
const filterDateFrom = document.getElementById("filter-date-from");
const filterDateTo = document.getElementById("filter-date-to");
const historyFilterDialog = document.getElementById("history-filter-dialog");
const openHistoryFiltersButton = document.getElementById("open-history-filters");
const activeFilterCount = document.getElementById("active-filter-count");
const clearFiltersButton = document.getElementById("clear-filters");
const historyStatus = document.getElementById("history-status");
const weekSummary = document.getElementById("week-summary");
const monthSummary = document.getElementById("month-summary");
const weekDateRange = document.getElementById("week-date-range");
const monthDateRange = document.getElementById("month-date-range");
const doubleReportList = document.getElementById("double-report-list");
const doubleReportTemplate = document.getElementById("double-report-template");
const reportPeriods = [
    ["lunch", "Lunch report"],
    ["dinner", "Dinner report"],
    ["whole", "Whole-double report"],
];
const reportAmountFields = [
    "foodSales", "bawSales", "liquorSales", "naBevSales", "additionalSales",
    "ccTips", "cashTips", "autoGratuity", "tipsPaidOut", "tipOutReceived",
];

const fields = {
    date: document.getElementById("shift-date"),
    mealPeriod: document.getElementById("shift-meal-period"),
    job: document.getElementById("shift-job"),
    clockIn: document.getElementById("shift-clock-in"),
    clockOut: document.getElementById("shift-clock-out"),
    breakStart: document.getElementById("shift-break-start"),
    breakEnd: document.getElementById("shift-break-end"),
    foodSales: document.getElementById("shift-food-sales"),
    bawSales: document.getElementById("shift-baw-sales"),
    liquorSales: document.getElementById("shift-liquor-sales"),
    naSales: document.getElementById("shift-na-sales"),
    additionalSales: document.getElementById("shift-additional-sales"),
    ccTips: document.getElementById("shift-cc-tips"),
    cashTips: document.getElementById("shift-cash-tips"),
    autoGratuity: document.getElementById("shift-auto-gratuity"),
    tipOutPaid: document.getElementById("shift-tip-out-paid"),
    tipOutReceived: document.getElementById("shift-tip-out-received"),
};

const notesList = document.getElementById("notes-list");
const addNoteButton = document.getElementById("add-note");

const statEls = {
    totalShifts: document.getElementById("summary-total-shifts"),
    totalHours: document.getElementById("summary-total-hours"),
    totalSales: document.getElementById("summary-total-sales"),
    totalTips: document.getElementById("summary-total-tips"),
};

const recentShiftsEl = document.getElementById("recent-shifts");
const template = document.getElementById("shift-card-template");
const appShell = document.querySelector(".app-shell");
const styleSetting = document.getElementById("setting-style");
const modeSetting = document.getElementById("setting-mode");
const weekStartSetting = document.getElementById("setting-week-start");
const zeroDetailsSetting = document.getElementById("setting-zero-details");
const currencySetting = document.getElementById("setting-currency");
const mobileLayout = window.matchMedia("(max-width: 720px)");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

bindEvents();
setNoteRows([]);
initializeDoubleReports();
initializeSettings();
renderDashboard();
renderPreviousShifts();
showView(mobileLayout.matches ? "mobile-home" : "dashboard");
registerServiceWorker();

function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.error("Unable to register the offline app worker:", error);
    });
}

function bindEvents() {
    navButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            if (button.tagName === "A") {
                event.preventDefault();
            }
            showView(button.dataset.view);
        });
    });

    document.getElementById("back-to-menu").addEventListener("click", () => showView("mobile-home"));
    form.addEventListener("submit", handleFormSubmit);
    form.addEventListener("change", updateValidationErrors);
    fields.mealPeriod.addEventListener("change", updateMealPeriodFields);
    doubleReportList.addEventListener("change", handleDoubleReportToggle);
    form.addEventListener("focusin", selectNumberOnFocus);
    form.addEventListener("mouseup", (event) => {
        if (event.target.type === "number" && event.target.dataset.selectedOnFocus) {
            event.preventDefault();
            delete event.target.dataset.selectedOnFocus;
        }
    });
    addNoteButton.addEventListener("click", () => addNoteRow("", { focus: true }));
    notesList.addEventListener("click", handleNoteRemove);
    notesList.addEventListener("input", (event) => autosizeNote(event.target));
    notesList.addEventListener("keydown", handleNoteKeydown);
    clearFormButton.addEventListener("click", resetForm);
    cancelFormButton.addEventListener("click", () => {
        resetForm();
        showView("dashboard");
    });
    sortBySelect.addEventListener("change", renderPreviousShifts);
    filterJobSelect.addEventListener("change", renderPreviousShifts);
    filterDateFrom.addEventListener("change", renderPreviousShifts);
    filterDateTo.addEventListener("change", renderPreviousShifts);
    openHistoryFiltersButton.addEventListener("click", () => {
        if (!historyFilterDialog.open) {
            historyFilterDialog.showModal();
        }
        openHistoryFiltersButton.setAttribute("aria-expanded", "true");
    });
    historyFilterDialog.addEventListener("close", () => {
        openHistoryFiltersButton.setAttribute("aria-expanded", "false");
        if (state.currentView === "previous-shifts") {
            openHistoryFiltersButton.focus();
        }
    });
    historyFilterDialog.addEventListener("cancel", () => openHistoryFiltersButton.setAttribute("aria-expanded", "false"));
    document.getElementById("close-history-filters").addEventListener("click", closeHistoryFilterDialog);
    document.getElementById("done-history-filters").addEventListener("click", closeHistoryFilterDialog);
    historyFilterDialog.addEventListener("click", (event) => {
        if (event.target === historyFilterDialog) {
            closeHistoryFilterDialog();
        }
    });
    clearFiltersButton.addEventListener("click", clearHistoryFilters);
    document.getElementById("export-csv").addEventListener("click", exportShiftsCsv);
    shiftList.addEventListener("click", handleListAction);
    document.addEventListener("click", (event) => {
        if (!event.target.closest(".card-menu")) {
            closeCardMenus();
        }
    });
    shiftList.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
            return;
        }
        const openToggle = shiftList.querySelector(".card-menu-toggle[aria-expanded='true']");
        if (openToggle) {
            closeCardMenus();
            openToggle.focus();
        }
    });
    styleSetting.addEventListener("change", () => updateSetting("visualStyle", styleSetting.value));
    modeSetting.addEventListener("change", () => updateSetting("colorMode", modeSetting.value));
    weekStartSetting.addEventListener("change", () => updateSetting("weekStartsOn", weekStartSetting.value));
    currencySetting.addEventListener("change", () => updateSetting("currency", currencySetting.value));
    zeroDetailsSetting.addEventListener("change", () => updateSetting("zeroDetails", zeroDetailsSetting.value));
    document.getElementById("export-backup").addEventListener("click", exportBackup);
    document.getElementById("import-backup").addEventListener("click", () => {
        document.getElementById("backup-file").click();
    });
    document.getElementById("backup-file").addEventListener("change", importBackup);
    document.getElementById("clear-all-data").addEventListener("click", clearAllShifts);
    mobileLayout.addEventListener("change", handleLayoutChange);
    systemTheme.addEventListener("change", () => {
        if (state.settings.colorMode === "system") {
            applyTheme();
        }
    });
}

function showView(viewName) {
    state.currentView = viewName;
    if (historyFilterDialog.open && viewName !== "previous-shifts") {
        closeHistoryFilterDialog(false);
    }
    const isMobileHome = mobileLayout.matches && viewName === "mobile-home";
    appShell.classList.toggle("is-mobile-home", isMobileHome);
    document.body.classList.toggle("is-mobile-home", isMobileHome);

    document.querySelectorAll(".view").forEach((section) => {
        const visible = section.id === viewName;
        section.classList.toggle("is-visible", visible);
        section.classList.toggle("is-hidden", !visible);
        section.hidden = !visible;
    });

    if (viewName === "new-shift") {
        notesList.querySelectorAll(".note-input").forEach(autosizeNote);
    }

    document.getElementById("back-to-menu").hidden = !mobileLayout.matches || viewName === "mobile-home";
    document.querySelectorAll(".main-nav [data-view]").forEach((button) => {
        if (button.tagName === "BUTTON") {
            if (button.dataset.view === viewName) {
                button.setAttribute("aria-current", "page");
            } else {
                button.removeAttribute("aria-current");
            }
        }
    });
}

function closeHistoryFilterDialog(restoreFocus = true) {
    if (historyFilterDialog.open) {
        historyFilterDialog.close();
    }
    openHistoryFiltersButton.setAttribute("aria-expanded", "false");
    if (restoreFocus) {
        openHistoryFiltersButton.focus();
    }
}

function handleLayoutChange(event) {
    if (event.matches && state.currentView === "dashboard") {
        showView("mobile-home");
    } else if (!event.matches && state.currentView === "mobile-home") {
        showView("dashboard");
    } else {
        showView(state.currentView);
    }
}

function initializeSettings() {
    styleSetting.value = state.settings.visualStyle;
    modeSetting.value = state.settings.colorMode;
    weekStartSetting.value = state.settings.weekStartsOn;
    currencySetting.value = state.settings.currency;
    zeroDetailsSetting.value = state.settings.zeroDetails;
    applyTheme();
}

function updateSetting(name, value) {
    const previousValue = state.settings[name];
    state.settings[name] = value;

    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch (error) {
        state.settings[name] = previousValue;
        initializeSettings();
        console.error("Unable to save settings:", error);
        setStatus("Unable to save your settings in this browser.", true);
        return;
    }

    if (name === "visualStyle" || name === "colorMode") {
        applyTheme();
    } else if (name === "weekStartsOn") {
        renderPeriodSummaries();
    } else if (name === "currency" || name === "zeroDetails") {
        renderDashboard();
        renderPreviousShifts();
    }
}

function applyTheme() {
    document.documentElement.dataset.style = state.settings.visualStyle;
    if (state.settings.colorMode === "system") {
        document.documentElement.removeAttribute("data-theme");
    } else {
        document.documentElement.dataset.theme = state.settings.colorMode;
    }

    const dark = state.settings.colorMode === "dark"
        || (state.settings.colorMode === "system" && systemTheme.matches);
    const themeColors = {
        minimalist: dark ? "#202124" : "#ffffff",
        material: dark ? "#d0bcff" : "#6750a4",
        "neo-brutalist": dark ? "#ffb4a9" : "#efbd26",
        cyberpunk: dark ? "#ff007f" : "#b000a5",
        glassmorphism: dark ? "#a78bfa" : "#6366f1",
        skeuomorphic: dark ? "#7dd3fc" : "#3b6d9a",
        "high-contrast": dark ? "#39ff14" : "#0047ff",
    };
    document.querySelector('meta[name="theme-color"]').content =
        themeColors[state.settings.visualStyle] || themeColors.minimalist;
}

function loadSettings() {
    const defaults = {
        visualStyle: "minimalist",
        colorMode: "system",
        weekStartsOn: "monday",
        currency: "USD",
        zeroDetails: "hide",
    };

    try {
        const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        if (!stored || typeof stored !== "object") {
            return defaults;
        }

        const availableStyles = [
            "minimalist", "material", "neo-brutalist", "cyberpunk",
            "glassmorphism", "skeuomorphic", "high-contrast",
        ];
        const legacyTheme = ["system", "light", "dark", ...availableStyles].includes(stored.theme)
            ? stored.theme
            : null;
        const legacyStyle = legacyTheme && availableStyles.includes(legacyTheme) && legacyTheme !== "minimalist"
            ? legacyTheme
            : "minimalist";
        const legacyMode = legacyTheme === "light" || legacyTheme === "dark"
            ? legacyTheme
            : legacyTheme === "system" ? "system"
                : legacyTheme ? "light" : defaults.colorMode;

        return {
            visualStyle: availableStyles.includes(stored.visualStyle)
                ? stored.visualStyle
                : legacyStyle,
            colorMode: ["system", "light", "dark"].includes(stored.colorMode)
                ? stored.colorMode
                : legacyMode,
            weekStartsOn: ["monday", "sunday"].includes(stored.weekStartsOn)
                ? stored.weekStartsOn
                : defaults.weekStartsOn,
            currency: ["USD", "CAD", "GBP", "EUR"].includes(stored.currency)
                ? stored.currency
                : defaults.currency,
            zeroDetails: ["hide", "show"].includes(stored.zeroDetails)
                ? stored.zeroDetails
                : defaults.zeroDetails,
        };
    } catch (error) {
        console.error("Unable to read saved settings:", error);
        return defaults;
    }
}

function closeCardMenus(except = null) {
    shiftList.querySelectorAll(".card-menu-toggle[aria-expanded='true']").forEach((toggle) => {
        if (toggle === except) {
            return;
        }
        toggle.setAttribute("aria-expanded", "false");
        toggle.nextElementSibling.hidden = true;
    });
}

function setCardStatExpanded(toggle, expanded) {
    const stat = toggle.closest(".card-stat");
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", toggle.getAttribute("aria-label").replace(/^(Show|Hide)/, expanded ? "Hide" : "Show"));
    stat.classList.toggle("is-expanded", expanded);
}

function updateExpandAllButton(card) {
    const toggles = [...card.querySelectorAll(".card-stat-toggle")];
    const expanded = toggles.every((toggle) => toggle.getAttribute("aria-expanded") === "true");
    const button = card.querySelector(".card-expand-all");
    button.setAttribute("aria-expanded", String(expanded));
    button.textContent = expanded ? "Hide all details" : "Show all details";
}

function handleListAction(event) {
    const button = event.target.closest("button");
    if (!button) {
        return;
    }

    const card = button.closest(".shift-card");
    if (!card) {
        return;
    }

    if (button.classList.contains("card-menu-toggle")) {
        const open = button.getAttribute("aria-expanded") !== "true";
        closeCardMenus(button);
        button.setAttribute("aria-expanded", String(open));
        button.nextElementSibling.hidden = !open;
        if (open) {
            button.nextElementSibling.querySelector("button").focus();
        }
        return;
    }

    closeCardMenus();

    if (button.classList.contains("card-stat-toggle")) {
        const expanded = button.getAttribute("aria-expanded") !== "true";
        setCardStatExpanded(button, expanded);
        updateExpandAllButton(card);
        return;
    }

    if (button.classList.contains("card-expand-all")) {
        const expanded = button.getAttribute("aria-expanded") !== "true";
        card.querySelectorAll(".card-stat-toggle").forEach((toggle) => setCardStatExpanded(toggle, expanded));
        updateExpandAllButton(card);
        return;
    }

    const shiftId = Number(card.dataset.shiftId);
    const shift = state.shifts.find((entry) => entry.id === shiftId);

    if (!shift) {
        return;
    }

    if (button.classList.contains("delete-shift")) {
        state.shifts = state.shifts.filter((entry) => entry.id !== shiftId);
        persistShifts();
        renderDashboard();
        renderPreviousShifts();
        setStatus("Shift deleted.");
        return;
    }

    if (button.classList.contains("edit-shift")) {
        populateForm(shift);
        formTitle.textContent = "Edit Shift";
        showView("new-shift");
    }
}

function createShiftId() {
    return Date.now() + Math.random();
}

function setStatus(message, isError = false) {
    formStatus.textContent = message;
    formStatus.classList.toggle("error", isError);
    formStatus.hidden = !message;
}

// Older saves stored notes as one string; newer ones store a list of notes.
function getNotes(shift) {
    const notes = Array.isArray(shift.notes) ? shift.notes : [shift.notes];
    return notes
        .filter((note) => typeof note === "string")
        .map((note) => note.trim())
        .filter(Boolean);
}

function setNoteRows(notes) {
    notesList.replaceChildren();
    (notes.length > 0 ? notes : [""]).forEach((note) => addNoteRow(note));
}

function addNoteRow(value = "", { focus = false, after = null } = {}) {
    const row = document.createElement("li");
    row.className = "note-row";

    const input = document.createElement("textarea");
    input.className = "note-input";
    input.rows = 1;
    input.value = value;
    input.placeholder = "Add a note";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost-button note-remove";
    remove.textContent = "✕";

    row.append(input, remove);
    if (after) {
        after.after(row);
    } else {
        notesList.appendChild(row);
    }
    labelNoteRows();
    autosizeNote(input);
    if (focus) {
        input.focus();
    }
    return row;
}

function labelNoteRows() {
    notesList.querySelectorAll(".note-row").forEach((row, index) => {
        row.querySelector(".note-input").setAttribute("aria-label", `Note ${index + 1}`);
        row.querySelector(".note-remove").setAttribute("aria-label", `Remove note ${index + 1}`);
    });
}

function autosizeNote(input) {
    if (!input.classList?.contains("note-input") || input.scrollHeight === 0) {
        return;
    }
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
}

function removeNoteRow(row, { focusPrevious = false } = {}) {
    const rows = [...notesList.querySelectorAll(".note-row")];
    if (rows.length === 1) {
        const input = row.querySelector(".note-input");
        input.value = "";
        autosizeNote(input);
        input.focus();
        return;
    }

    const index = rows.indexOf(row);
    const preferPrevious = focusPrevious || index === rows.length - 1;
    const neighbor = (preferPrevious ? rows[index - 1] : rows[index + 1]) || rows[index + 1] || rows[index - 1];
    row.remove();
    labelNoteRows();
    neighbor.querySelector(".note-input").focus();
}

function handleNoteRemove(event) {
    const button = event.target.closest(".note-remove");
    if (button) {
        removeNoteRow(button.closest(".note-row"));
    }
}

function handleNoteKeydown(event) {
    const input = event.target;
    if (!input.classList.contains("note-input")) {
        return;
    }
    const row = input.closest(".note-row");

    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        addNoteRow("", { focus: true, after: row });
    } else if (event.key === "Backspace" && input.value === "" && notesList.children.length > 1) {
        event.preventDefault();
        removeNoteRow(row, { focusPrevious: true });
    }
}

function readNotes() {
    return [...notesList.querySelectorAll(".note-input")]
        .map((input) => input.value.trim())
        .filter(Boolean);
}

function resetForm(shouldClearStatus = true) {
    form.reset();
    updateMealPeriodFields();
    setNoteRows([]);
    state.editingShiftId = null;
    formTitle.textContent = "New Shift";
    Object.values(fields).forEach((field) => {
        if (field.tagName === "INPUT" || field.tagName === "TEXTAREA") {
            field.value = field.defaultValue || "";
        }
    });

    clearValidationErrors();
    if (shouldClearStatus) {
        setStatus("");
    }
}

function populateForm(shift) {
    state.editingShiftId = shift.id;
    fields.date.value = shift.date || "";
    fields.mealPeriod.value = shift.mealPeriod || "";
    updateMealPeriodFields();
    fields.job.value = shift.job || "";
    fields.clockIn.value = shift.clockIn || "";
    fields.clockOut.value = shift.clockOut || "";
    fields.breakStart.value = shift.breakStart || "";
    fields.breakEnd.value = shift.breakEnd || "";
    fields.foodSales.value = Number(shift.foodSales || 0).toFixed(2);
    fields.bawSales.value = Number(shift.bawSales || 0).toFixed(2);
    fields.liquorSales.value = Number(shift.liquorSales || 0).toFixed(2);
    fields.naSales.value = Number(shift.naBevSales || 0).toFixed(2);
    fields.additionalSales.value = Number(shift.additionalSales || 0).toFixed(2);
    fields.ccTips.value = Number(shift.ccTips || 0).toFixed(2);
    fields.cashTips.value = Number(shift.cashTips || 0).toFixed(2);
    fields.autoGratuity.value = Number(shift.autoGratuity || 0).toFixed(2);
    fields.tipOutPaid.value = Number(shift.tipsPaidOut || 0).toFixed(2);
    fields.tipOutReceived.value = Number(shift.tipOutReceived || 0).toFixed(2);
    setNoteRows(getNotes(shift));
    reportPeriods.forEach(([period]) => {
        const report = shift.reports?.[period];
        const reportNode = getReportNode(period);
        const toggle = reportNode.querySelector("[data-report-toggle]");
        toggle.checked = Boolean(report);
        reportAmountFields.forEach((field) => {
            const input = reportNode.querySelector(`[data-report-field="${field}"]`);
            input.value = Number(report?.[field] || 0).toFixed(2);
        });
        setReportInputsEnabled(reportNode, toggle.checked);
    });
}

function handleFormSubmit(event) {
    event.preventDefault();

    try {
        const shift = readFormValues();
        const issues = validateShift(shift);
        if (issues.length > 0) {
            showValidationErrors(issues);
            return;
        }
        clearValidationErrors();

        if (state.editingShiftId !== null) {
            const index = state.shifts.findIndex((entry) => entry.id === state.editingShiftId);
            if (index >= 0) {
                state.shifts[index] = shift;
            }
        } else {
            state.shifts.push(shift);
        }

        persistShifts();
        renderDashboard();
        renderPreviousShifts();
        const successMessage = state.editingShiftId !== null ? "Shift updated." : "Shift saved.";
        resetForm(false);
        setStatus(successMessage);
        showView("dashboard");
    } catch (error) {
        setStatus(error.message, true);
    }
}

function readFormValues() {
    const baseline = {
        id: state.editingShiftId ?? createShiftId(),
        date: fields.date.value.trim(),
        mealPeriod: fields.mealPeriod.value,
        job: fields.job.value,
        clockIn: fields.clockIn.value,
        clockOut: fields.clockOut.value,
        breakStart: fields.breakStart.value,
        breakEnd: fields.breakEnd.value,
        foodSales: toNumber(fields.foodSales.value),
        bawSales: toNumber(fields.bawSales.value),
        liquorSales: toNumber(fields.liquorSales.value),
        naBevSales: toNumber(fields.naSales.value),
        additionalSales: toNumber(fields.additionalSales.value),
        ccTips: toNumber(fields.ccTips.value),
        cashTips: toNumber(fields.cashTips.value),
        autoGratuity: toNumber(fields.autoGratuity.value),
        tipsPaidOut: toNumber(fields.tipOutPaid.value),
        tipOutReceived: toNumber(fields.tipOutReceived.value),
        notes: readNotes(),
    };

    if (baseline.mealPeriod === "Double") {
        reportAmountFields.forEach((field) => {
            baseline[field] = 0;
        });
        baseline.reports = Object.fromEntries(reportPeriods.map(([period]) => {
            const reportNode = getReportNode(period);
            const enabled = reportNode.querySelector("[data-report-toggle]").checked;
            const values = Object.fromEntries(reportAmountFields.map((field) => [
                field,
                enabled ? toNumber(reportNode.querySelector(`[data-report-field="${field}"]`).value) : 0,
            ]));
            return [period, enabled ? values : null];
        }));
    }

    return baseline;
}

function validateShift(shift) {
    const issues = [];

    if (!shift.date) issues.push({ field: "date", message: "Date is required." });
    if (!shift.mealPeriod) issues.push({ field: "mealPeriod", message: "Meal period is required." });
    if (!shift.job) issues.push({ field: "job", message: "Job is required." });
    if (!shift.clockIn) issues.push({ field: "clockIn", message: "Clock in is required." });
    if (!shift.clockOut) issues.push({ field: "clockOut", message: "Clock out is required." });

    if (shift.clockIn && shift.clockOut && toMinutes(shift.clockOut) === toMinutes(shift.clockIn)) {
        issues.push({
            field: "clockOut",
            message: "Clock out must differ from clock in; an earlier time means the next day.",
        });
    }

    if (shift.breakStart && !shift.breakEnd) {
        issues.push({ field: "breakEnd", message: "Break end is required when a break starts." });
    }
    if (shift.breakEnd && !shift.breakStart) {
        issues.push({ field: "breakStart", message: "Break start is required when a break ends." });
    }

    if (shift.breakStart && shift.breakEnd) {
        const shiftStartMinutes = toMinutes(shift.clockIn);
        let shiftEndMinutes = toMinutes(shift.clockOut);
        if (shiftEndMinutes < shiftStartMinutes) {
            shiftEndMinutes += 24 * 60;
        }

        let breakStartMinutes = toMinutes(shift.breakStart);
        let breakEndMinutes = toMinutes(shift.breakEnd);
        if (breakStartMinutes < shiftStartMinutes) {
            breakStartMinutes += 24 * 60;
        }
        if (breakEndMinutes < shiftStartMinutes) {
            breakEndMinutes += 24 * 60;
        }
        if (breakEndMinutes < breakStartMinutes) {
            breakEndMinutes += 24 * 60;
        }

        if (breakEndMinutes <= breakStartMinutes) {
            issues.push({ field: "breakEnd", message: "Break end must be later than break start." });
        }

        if (shift.clockIn && shift.clockOut && shiftEndMinutes > shiftStartMinutes) {
            if (breakStartMinutes < shiftStartMinutes || breakStartMinutes >= shiftEndMinutes) {
                issues.push({ field: "breakStart", message: "Break start must be during the shift." });
            }
            if (breakEndMinutes > shiftEndMinutes || breakEndMinutes <= shiftStartMinutes) {
                issues.push({ field: "breakEnd", message: "Break end must be during the shift." });
            }
        }
    }

    return issues;
}

function showValidationErrors(issues, shouldFocus = true) {
    clearValidationErrors();
    if (issues.length === 0) {
        return;
    }

    const summary = document.getElementById("form-errors");
    const list = summary.querySelector("ul");
    const firstField = fields[issues[0].field];

    issues.forEach(({ field, message }) => {
        const input = fields[field];
        const error = document.getElementById(`${input.id}-error`);
        input.setAttribute("aria-invalid", "true");
        error.textContent = message;
        error.hidden = false;

        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${input.id}`;
        link.textContent = message;
        item.appendChild(link);
        list.appendChild(item);
    });

    summary.hidden = false;
    if (shouldFocus) {
        firstField.focus();
    }
}

function selectNumberOnFocus(event) {
    const input = event.target;
    if (input.tagName === "INPUT" && input.type === "number") {
        input.dataset.selectedOnFocus = "true";
        input.select();
    }
}

function updateValidationErrors() {
    const summary = document.getElementById("form-errors");
    if (!summary.hidden) {
        showValidationErrors(validateShift(readFormValues()), false);
    }
}

function clearValidationErrors() {
    const summary = document.getElementById("form-errors");
    summary.querySelector("ul").replaceChildren();
    summary.hidden = true;

    Object.values(fields).forEach((field) => {
        if (!field.hasAttribute("aria-invalid")) {
            return;
        }

        field.removeAttribute("aria-invalid");
        const error = document.getElementById(`${field.id}-error`);
        error.textContent = "";
        error.hidden = true;
    });
}

function renderDashboard() {
    const totalShifts = state.shifts.length;
    const totalHours = state.shifts.reduce((sum, shift) => sum + getDurationMinutes(shift), 0);
    const totalSales = state.shifts.reduce((sum, shift) => sum + getSalesTotal(shift), 0);
    const totalTips = state.shifts.reduce((sum, shift) => sum + getNetTips(shift), 0);

    statEls.totalShifts.textContent = String(totalShifts);
    statEls.totalHours.textContent = formatDuration(totalHours);
    statEls.totalSales.textContent = formatCurrency(totalSales);
    statEls.totalTips.textContent = formatCurrency(totalTips);

    renderPeriodSummaries();

    const recent = [...state.shifts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

    if (recent.length === 0) {
        recentShiftsEl.replaceChildren(createEmptyState("No shifts logged yet. Add your first shift to get started."));
        return;
    }

    const fragment = document.createDocumentFragment();
    recent.forEach((shift) => {
        const item = document.createElement("div");
        item.className = "recent-item";

        const details = document.createElement("div");
        const date = document.createElement("strong");
        date.textContent = formatDate(shift.date);
        const description = document.createElement("span");
        description.textContent = shift.mealPeriod === "Double"
            ? `${shift.job} · Double · ${getDoubleReportStatus(shift)}`
            : `${shift.job} · ${shift.mealPeriod}`;
        details.append(date, description);

        const metrics = document.createElement("div");
        metrics.className = "recent-metrics";
        const sales = document.createElement("span");
        sales.textContent = formatCurrency(getSalesTotal(shift));
        const tips = document.createElement("span");
        tips.textContent = formatCurrency(getNetTips(shift));
        metrics.append(sales, tips);

        item.append(details, metrics);
        fragment.appendChild(item);
    });
    recentShiftsEl.replaceChildren(fragment);
}

function renderPreviousShifts() {
    updateFilterControls();
    const fromDate = filterDateFrom.value;
    const toDate = filterDateTo.value;
    const filtered = getFilteredShifts();

    if (fromDate && toDate && fromDate > toDate) {
        historyStatus.textContent = "The start date must be on or before the end date.";
        shiftList.replaceChildren();
        return;
    }

    historyStatus.textContent = filtered.length === 1 ? "1 shift" : `${filtered.length} shifts`;

    if (filtered.length === 0) {
        shiftList.replaceChildren(createEmptyState("No shifts match the current filters."));
        return;
    }

    const fragment = document.createDocumentFragment();

    filtered.forEach((shift) => {
        const cardNode = template.content.cloneNode(true);
        const card = cardNode.querySelector(".shift-card");
        card.dataset.shiftId = String(shift.id);
        card.querySelector(".card-date").textContent = formatDate(shift.date);
        card.querySelector(".card-meal").textContent = shift.mealPeriod;
        const reportStatus = card.querySelector(".card-report-status");
        if (shift.mealPeriod === "Double") {
            reportStatus.textContent = getDoubleReportStatus(shift);
            reportStatus.hidden = false;
        } else {
            reportStatus.hidden = true;
        }
        card.querySelector(".card-job").textContent = shift.job;
        card.querySelector(".card-hours").textContent = formatDuration(getDurationMinutes(shift));
        card.querySelector(".card-sales").textContent = formatCurrency(getSalesTotal(shift));
        card.querySelector(".card-tips").textContent = formatCurrency(getNetTips(shift));
        card.querySelector(".card-auto-gratuity").textContent = formatCurrency(getAutoGratuity(shift));
        const breakdown = getFinancialBreakdown(shift);
        Object.entries(CARD_BREAKDOWN_SELECTORS).forEach(([field, selector]) => {
            const value = card.querySelector(selector);
            value.textContent = formatCurrency(breakdown[field]);
            value.parentElement.hidden = state.settings.zeroDetails === "hide" && !breakdown[field];
        });
        card.querySelector(".card-clock-in").textContent = formatTime(shift.clockIn);
        card.querySelector(".card-clock-out").textContent = formatClockOut(shift);
        card.querySelector(".card-break").textContent = shift.breakStart && shift.breakEnd
            ? `${formatTime(shift.breakStart)} - ${formatBreakEnd(shift)}`
            : "None";
        const notesEl = card.querySelector(".card-notes");
        const notes = getNotes(shift);
        if (notes.length > 0) {
            const list = document.createElement("ul");
            list.className = "card-note-list";
            notes.forEach((note) => {
                const item = document.createElement("li");
                item.textContent = note;
                list.appendChild(item);
            });
            notesEl.replaceChildren(list);
        } else {
            notesEl.textContent = "No notes recorded.";
        }
        fragment.appendChild(cardNode);
    });

    shiftList.replaceChildren(fragment);
}

function renderPeriodSummaries() {
    const today = new Date();
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const firstDay = state.settings.weekStartsOn === "sunday" ? 0 : 1;
    const daysSinceWeekStart = (weekStart.getDay() - firstDay + 7) % 7;
    weekStart.setDate(weekStart.getDate() - daysSinceWeekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const weekFrom = toLocalDateString(weekStart);
    const weekTo = toLocalDateString(weekEnd);
    const monthFrom = toLocalDateString(monthStart);
    const monthTo = toLocalDateString(monthEnd);

    const weekLabel = state.settings.weekStartsOn === "sunday" ? "Sunday to Saturday" : "Monday to Sunday";
    weekDateRange.closest(".period-card").querySelector(".eyebrow").textContent = weekLabel;
    weekDateRange.textContent = `${formatDate(weekFrom)} – ${formatDate(weekTo)}`;
    monthDateRange.textContent = `${formatDate(monthFrom)} – ${formatDate(monthTo)}`;
    renderPeriodSummary(weekSummary, weekFrom, weekTo);
    renderPeriodSummary(monthSummary, monthFrom, monthTo);
}

function renderPeriodSummary(container, fromDate, toDate) {
    const shifts = state.shifts.filter((shift) => shift.date >= fromDate && shift.date <= toDate);
    const hours = shifts.reduce((sum, shift) => sum + getDurationMinutes(shift), 0);
    const sales = shifts.reduce((sum, shift) => sum + getSalesTotal(shift), 0);
    const tips = shifts.reduce((sum, shift) => sum + getNetTips(shift), 0);
    const values = [
        ["Shifts", String(shifts.length)],
        ["Hours", formatDuration(hours)],
        ["Sales", formatCurrency(sales)],
        ["Net tips", formatCurrency(tips)],
    ];
    const fragment = document.createDocumentFragment();

    values.forEach(([label, value]) => {
        const metric = document.createElement("div");
        metric.className = "period-metric";
        const metricLabel = document.createElement("span");
        metricLabel.textContent = label;
        const metricValue = document.createElement("strong");
        metricValue.textContent = value;
        metric.append(metricLabel, metricValue);
        fragment.appendChild(metric);
    });

    container.replaceChildren(fragment);
}

function getFilteredShifts() {
    const fromDate = filterDateFrom.value;
    const toDate = filterDateTo.value;
    const jobFilter = filterJobSelect.value;
    const sortMode = sortBySelect.value;

    return state.shifts
        .filter((shift) => (!fromDate || shift.date >= fromDate)
            && (!toDate || shift.date <= toDate)
            && (jobFilter === "all" || shift.job === jobFilter))
        .sort((a, b) => {
            switch (sortMode) {
                case "date-asc":
                    return a.date.localeCompare(b.date);
                case "sales-desc":
                    return getSalesTotal(b) - getSalesTotal(a);
                case "tips-desc":
                    return getNetTips(b) - getNetTips(a);
                case "date-desc":
                default:
                    return b.date.localeCompare(a.date);
            }
        });
}

function clearHistoryFilters() {
    filterDateFrom.value = "";
    filterDateTo.value = "";
    filterJobSelect.value = "all";
    renderPreviousShifts();
}

function updateFilterControls() {
    const count = Number(Boolean(filterDateFrom.value))
        + Number(Boolean(filterDateTo.value))
        + Number(filterJobSelect.value !== "all");
    activeFilterCount.textContent = `${count} active`;
    activeFilterCount.hidden = count === 0;
    clearFiltersButton.disabled = count === 0;
}

function exportShiftsCsv() {
    const shifts = state.shifts;
    if (shifts.length === 0) {
        setStatus("There are no shifts to export.", true);
        return;
    }

    const headers = [
        "Date", "Meal period", "Job", "Clock in", "Clock out", "Break start", "Break end",
        "Hours worked", "Food sales", "Beer and wine sales", "Liquor sales", "NA beverage sales",
        "Additional sales", "Total sales", "CC tips", "Cash tips", "Auto-gratuity", "Tips paid out",
        "Tip out received", "Net tips", "Report coverage",
        ...reportPeriods.flatMap(([, label]) => reportAmountFields.map((field) => `${label} ${formatReportFieldName(field)}`)),
        "Notes",
    ];
    const rows = shifts.map((shift) => {
        const isDouble = shift.mealPeriod === "Double";
        const reports = getCsvReports(shift);
        return [
            shift.date,
            shift.mealPeriod,
            shift.job,
            shift.clockIn,
            `${shift.clockOut}${isOvernightShift(shift) ? " (+1 day)" : ""}`,
            shift.breakStart,
            `${shift.breakEnd}${isOvernightBreak(shift) ? " (+1 day)" : ""}`,
            (getDurationMinutes(shift) / 60).toFixed(2),
            ...(isDouble ? Array(5).fill("") : [
                shift.foodSales, shift.bawSales, shift.liquorSales, shift.naBevSales, shift.additionalSales,
            ]),
            getSalesTotal(shift),
            ...(isDouble ? Array(5).fill("") : [
                shift.ccTips, shift.cashTips, Number(shift.autoGratuity) || 0, shift.tipsPaidOut, shift.tipOutReceived,
            ]),
            getNetTips(shift),
            isDouble ? getDoubleReportStatus(shift) : "",
            ...reportPeriods.flatMap(([period]) => reportAmountFields.map((field) => (
                reports[period] ? reports[period][field] : ""
            ))),
            getNotes(shift).join(" | "),
        ];
    });
    const csv = [headers, ...rows]
        .map((row) => row.map(escapeCsvValue).join(","))
        .join("\r\n");
    const file = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = `shift-ledger-${toLocalDateString(new Date())}.csv`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`${shifts.length} ${shifts.length === 1 ? "shift" : "shifts"} exported to CSV.`);
}

function exportBackup() {
    const backup = {
        format: "shift-ledger-backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        shifts: state.shifts,
    };
    downloadFile(
        JSON.stringify(backup, null, 2),
        `shift-ledger-backup-${toLocalDateString(new Date())}.json`,
        "application/json"
    );
    setStatus(`Backup downloaded with ${state.shifts.length} ${state.shifts.length === 1 ? "shift" : "shifts"}.`);
}

async function importBackup(event) {
    const fileInput = event.target;
    const file = fileInput.files[0];
    if (!file) {
        return;
    }

    try {
        const parsed = JSON.parse(await file.text());
        const records = Array.isArray(parsed) ? parsed : parsed?.shifts;
        if (!Array.isArray(records)) {
            throw new Error("This file is not a Shift Ledger backup.");
        }

        const importedShifts = records.map(normalizeImportedShift);
        if (!window.confirm(`Replace your ${state.shifts.length} saved shifts with ${importedShifts.length} shifts from this backup?`)) {
            return;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(importedShifts));
        state.shifts = importedShifts;
        renderDashboard();
        renderPreviousShifts();
        setStatus(`Restored ${importedShifts.length} ${importedShifts.length === 1 ? "shift" : "shifts"}.`);
    } catch (error) {
        console.error("Unable to restore backup:", error);
        setStatus(error instanceof SyntaxError ? "The selected backup is not valid JSON." : error.message, true);
    } finally {
        fileInput.value = "";
    }
}

function normalizeImportedShift(shift, index) {
    if (!shift || typeof shift !== "object" || Array.isArray(shift)
        || typeof shift.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(shift.date)
        || typeof shift.mealPeriod !== "string" || typeof shift.job !== "string"
        || typeof shift.clockIn !== "string" || typeof shift.clockOut !== "string") {
        throw new Error(`Backup shift ${index + 1} is missing valid required fields.`);
    }

    const amountFields = [
        "foodSales", "bawSales", "liquorSales", "naBevSales", "additionalSales",
        "ccTips", "cashTips", "autoGratuity", "tipsPaidOut", "tipOutReceived",
    ];
    const normalized = {
        ...shift,
        id: typeof shift.id === "number" && Number.isFinite(shift.id) ? shift.id : createShiftId(),
    };
    amountFields.forEach((field) => {
        const amount = Number(shift[field] ?? 0);
        if (!Number.isFinite(amount) || amount < 0) {
            throw new Error(`Backup shift ${index + 1} has an invalid ${field} amount.`);
        }
        normalized[field] = amount;
    });

    if (Object.hasOwn(shift, "reports")) {
        if (!shift.reports || typeof shift.reports !== "object" || Array.isArray(shift.reports)) {
            throw new Error(`Backup shift ${index + 1} has invalid report data.`);
        }
        const reports = {};
        for (const [period, report] of Object.entries(shift.reports)) {
            if (!["lunch", "dinner", "whole"].includes(period)) {
                throw new Error(`Backup shift ${index + 1} has an unknown report period.`);
            }
            if (report === null) {
                reports[period] = null;
                continue;
            }
            if (!report || typeof report !== "object" || Array.isArray(report)) {
                throw new Error(`Backup shift ${index + 1} has invalid ${period} report data.`);
            }
            const normalizedReport = {};
            reportAmountFields.forEach((field) => {
                const amount = Number(report[field] ?? 0);
                if (!Number.isFinite(amount) || amount < 0) {
                    throw new Error(`Backup shift ${index + 1} has an invalid ${period} ${field} amount.`);
                }
                normalizedReport[field] = amount;
            });
            reports[period] = normalizedReport;
        }
        normalized.reports = reports;
    }

    normalized.notes = getNotes(shift);

    return normalized;
}

function clearAllShifts() {
    if (state.shifts.length === 0) {
        setStatus("There are no shifts to delete.");
        return;
    }
    if (!window.confirm(`Permanently delete all ${state.shifts.length} saved shifts? Export a backup first if you may need these records.`)) {
        return;
    }

    try {
        localStorage.removeItem(STORAGE_KEY);
        state.shifts = [];
        renderDashboard();
        renderPreviousShifts();
        setStatus("All shifts have been deleted.");
    } catch (error) {
        console.error("Unable to delete saved shifts:", error);
        setStatus("Unable to delete saved shifts from this browser.", true);
    }
}

function downloadFile(content, fileName, contentType) {
    const file = new Blob([content], { type: `${contentType};charset=utf-8` });
    const url = URL.createObjectURL(file);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCsvValue(value) {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[\s]*[=+\-@]/.test(text)) {
        text = `'${text}`;
    }
    return `"${text.replace(/"/g, '""')}"`;
}

function createEmptyState(message) {
    const emptyState = document.createElement("p");
    emptyState.className = "empty-state";
    emptyState.textContent = message;
    return emptyState;
}

function toLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function persistShifts() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.shifts));
    } catch (error) {
        console.error("Unable to save shifts:", error);
        setStatus("Unable to save locally. Your browser storage may be full.", true);
    }
}

function loadShifts() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Unable to read stored shifts:", error);
        return [];
    }
}

function formatDuration(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
}

function initializeDoubleReports() {
    reportPeriods.forEach(([period, label]) => {
        const reportNode = doubleReportTemplate.content.firstElementChild.cloneNode(true);
        reportNode.dataset.reportPeriod = period;
        reportNode.querySelector("[data-report-label]").textContent = label;
        doubleReportList.appendChild(reportNode);
    });
    updateMealPeriodFields();
}

function updateMealPeriodFields() {
    const isDouble = fields.mealPeriod.value === "Double";
    document.getElementById("single-report-fields").hidden = isDouble;
    document.getElementById("double-report-fields").hidden = !isDouble;
    reportPeriods.forEach(([period]) => {
        const reportNode = getReportNode(period);
        setReportInputsEnabled(reportNode, reportNode.querySelector("[data-report-toggle]").checked);
    });
}

function getReportNode(period) {
    const node = doubleReportList.querySelector(`[data-report-period="${period}"]`);
    if (!node) {
        throw new Error(`Double-shift report section not found: ${period}`);
    }
    return node;
}

function setReportInputsEnabled(reportNode, enabled) {
    reportNode.querySelector("[data-report-fields]").disabled = !enabled;
}

function handleDoubleReportToggle(event) {
    if (!event.target.matches("[data-report-toggle]")) {
        return;
    }
    setReportInputsEnabled(event.target.closest(".double-report"), event.target.checked);
}

function getDoubleReportStatus(shift) {
    if (!Object.hasOwn(shift, "reports")) {
        return "Whole-double report (legacy combined data)";
    }

    const reports = shift.reports || {};
    const hasLunch = Boolean(reports.lunch);
    const hasDinner = Boolean(reports.dinner);
    const hasWhole = Boolean(reports.whole);

    if (hasLunch && hasDinner) {
        return hasWhole
            ? "Lunch and dinner reports (whole-double report also saved)"
            : "Lunch and dinner reports";
    }
    if (hasWhole && hasLunch) return "Whole-double totals; lunch detail also saved";
    if (hasWhole && hasDinner) return "Whole-double totals; dinner detail also saved";
    if (hasWhole) return "Whole-double report";
    if (hasLunch) return "Partial report: lunch only";
    if (hasDinner) return "Partial report: dinner only";
    return "No sales or tip reports";
}

function getCsvReports(shift) {
    if (shift.mealPeriod === "Double" && !Object.hasOwn(shift, "reports")) {
        return { lunch: null, dinner: null, whole: Object.fromEntries(
            reportAmountFields.map((field) => [field, Number(shift[field]) || 0])
        ) };
    }
    return shift.reports || {};
}

function formatReportFieldName(field) {
    return field.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: state.settings.currency,
        minimumFractionDigits: 2,
    }).format(Number(amount) || 0);
}

function formatDate(dateString) {
    if (!dateString) {
        return "No date";
    }

    const date = new Date(`${dateString}T00:00:00`);
    return Number.isNaN(date.getTime()) ? dateString : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatTime(value) {
    if (!value) {
        return "—";
    }

    const [hours, minutes] = value.split(":").map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);

    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
}

function isOvernightShift(shift) {
    return Boolean(shift.clockIn && shift.clockOut
        && toMinutes(shift.clockOut) < toMinutes(shift.clockIn));
}

function isOvernightBreak(shift) {
    return Boolean(shift.breakStart && shift.breakEnd
        && toMinutes(shift.breakEnd) < toMinutes(shift.breakStart));
}

function formatClockOut(shift) {
    return `${formatTime(shift.clockOut)}${isOvernightShift(shift) ? " (next day)" : ""}`;
}

function formatBreakEnd(shift) {
    return `${formatTime(shift.breakEnd)}${isOvernightBreak(shift) ? " (next day)" : ""}`;
}

function toNumber(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}
