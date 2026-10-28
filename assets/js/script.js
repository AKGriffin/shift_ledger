const STORAGE_KEY = "shift-ledger-shifts-v1";
const SETTINGS_KEY = "shift-ledger-settings-v1";
const VIEW_HISTORY_KEY = "shiftLedgerView";
const DASHBOARD_STATS = ["shifts", "hours", "sales", "tips"];
const VIEW_TITLES = {
    "dashboard": "Dashboard",
    "new-shift": "New Shift",
    "previous-shifts": "Previous Shifts",
    "settings": "Settings",
};
const { getAutoGratuity, getDurationMinutes, getFinancialBreakdown, getNetTips, getSalesTotal, hasReport, toMinutes } = window.ShiftMath;
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

const RECOVERY_KEY = "shift-ledger-shifts-v1-recovery";
const PRE_WORKPLACES_KEY = "shift-ledger-shifts-v1-pre-workplaces";
const MEAL_PERIODS = ["Lunch", "Dinner", "Double"];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const reportAmountFields = [
    "foodSales", "bawSales", "liquorSales", "naBevSales", "additionalSales",
    "ccTips", "cashTips", "autoGratuity", "tipsPaidOut", "tipOutReceived",
];
let loadNotice = "";
let setupSaved = false;

const workplaceLoad = window.Workplaces.load(localStorage);

const state = {
    shifts: loadShifts(),
    workplaces: workplaceLoad.data,
    settings: loadSettings(),
    currentView: null,
    editingShiftId: null,
};
if (workplaceLoad.notice) {
    loadNotice = loadNotice ? `${loadNotice} ${workplaceLoad.notice}` : workplaceLoad.notice;
}
let formStatusTimeout = null;
let formStatusExpiresAt = null;
let shiftFormDirty = false;
let allowUpdateReload = false;
let serviceWorkerRegistration = null;
let hadServiceWorkerController = "serviceWorker" in navigator
    && Boolean(navigator.serviceWorker.controller);

const navButtons = document.querySelectorAll("[data-view]");
const formStatus = document.getElementById("form-status");
const appUpdateNotice = document.getElementById("app-update-notice");
const reloadAppButton = document.getElementById("reload-app");
const dismissAppUpdateButton = document.getElementById("dismiss-app-update");
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
const activeFiltersList = document.getElementById("active-filters");
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
const fields = {
    date: document.getElementById("shift-date"),
    mealPeriod: document.getElementById("shift-meal-period"),
    job: document.getElementById("shift-job"),
    workplace: document.getElementById("shift-workplace"),
    role: document.getElementById("shift-role"),
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
const styleSetting = document.getElementById("setting-style");
const modeSetting = document.getElementById("setting-mode");
const weekStartSetting = document.getElementById("setting-week-start");
const zeroDetailsSetting = document.getElementById("setting-zero-details");
const currencySetting = document.getElementById("setting-currency");
const dashboardCustomizeDialog = document.getElementById("dashboard-customize-dialog");
const workplaceList = document.getElementById("workplace-list");
const workplaceEmpty = document.getElementById("workplace-empty");
const nameDialog = document.getElementById("name-dialog");
const nameForm = document.getElementById("name-form");
const nameInput = document.getElementById("name-input");
const nameError = document.getElementById("name-input-error");
const setupDialog = document.getElementById("workplace-setup-dialog");
const setupForm = document.getElementById("workplace-setup-form");
const setupWorkplaceName = document.getElementById("setup-workplace-name");
const setupRoles = document.getElementById("setup-roles");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

bindEvents();
setNoteRows([]);
initializeDoubleReports();
initializeSettings();
renderWorkplaces();
renderDashboard();
renderPreviousShifts();
showView(getInitialView(), { historyAction: "replace" });
if (loadNotice) {
    setStatus(loadNotice, true);
}
if (!workplaceLoad.exists) {
    openWorkplaceSetup();
}
registerServiceWorker();

function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hadServiceWorkerController) {
            appUpdateNotice.hidden = false;
        }
        hadServiceWorkerController = true;
    });
    window.addEventListener("online", checkForServiceWorkerUpdate);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            checkForServiceWorkerUpdate();
        }
    });

    navigator.serviceWorker.register("./sw.js")
        .then((registration) => {
            serviceWorkerRegistration = registration;
        })
        .catch((error) => {
            console.error("Unable to register the offline app worker:", error);
        });
}

function checkForServiceWorkerUpdate() {
    if (!serviceWorkerRegistration) {
        return;
    }

    serviceWorkerRegistration.update().catch((error) => {
        console.warn("Unable to check for app updates:", error);
    });
}

function reloadForAppUpdate() {
    if (shiftFormDirty && !window.confirm("Reload now and discard the unsaved shift changes?")) {
        return;
    }

    allowUpdateReload = true;
    window.location.reload();
}

function guardUnsavedShiftChanges(event) {
    if (!shiftFormDirty || allowUpdateReload) {
        return;
    }

    event.preventDefault();
    event.returnValue = "";
}

function bindEvents() {
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && formStatusTimeout !== null && Date.now() >= formStatusExpiresAt) {
            setStatus("");
        }
    });

    navButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            if (button.tagName === "A") {
                event.preventDefault();
            }
            showView(button.dataset.view);
        });
    });

    window.addEventListener("popstate", handlePopState);
    form.addEventListener("submit", handleFormSubmit);
    form.addEventListener("input", markShiftFormDirty);
    form.addEventListener("change", markShiftFormDirty);
    form.addEventListener("change", updateValidationErrors);
    window.addEventListener("beforeunload", guardUnsavedShiftChanges);
    reloadAppButton.addEventListener("click", reloadForAppUpdate);
    dismissAppUpdateButton.addEventListener("click", () => {
        appUpdateNotice.hidden = true;
    });
    fields.mealPeriod.addEventListener("change", updateMealPeriodFields);
    document.getElementById("shift-no-report").addEventListener("change", updateMealPeriodFields);
    doubleReportList.addEventListener("change", handleDoubleReportToggle);
    form.addEventListener("focusin", selectNumberOnFocus);
    form.addEventListener("mouseup", (event) => {
        if (event.target.type === "number" && event.target.dataset.selectedOnFocus) {
            event.preventDefault();
            delete event.target.dataset.selectedOnFocus;
        }
    });
    addNoteButton.addEventListener("click", handleAddNote);
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
    document.getElementById("open-dashboard-customize").addEventListener("click", () => {
        dashboardCustomizeDialog.showModal();
    });
    document.getElementById("close-dashboard-customize").addEventListener("click", () => {
        dashboardCustomizeDialog.close();
    });
    document.getElementById("done-dashboard-customize").addEventListener("click", () => {
        dashboardCustomizeDialog.close();
    });
    document.querySelectorAll("[data-dashboard-option]").forEach((option) => {
        option.addEventListener("change", () => updateDashboardPreference(
            option.dataset.dashboardOption,
            option.dataset.dashboardKey,
            option.checked
        ));
    });
    document.getElementById("export-backup").addEventListener("click", exportBackup);
    document.getElementById("import-backup").addEventListener("click", () => {
        document.getElementById("backup-file").click();
    });
    document.getElementById("backup-file").addEventListener("change", importBackup);
    document.getElementById("clear-all-data").addEventListener("click", clearAllShifts);
    document.getElementById("add-workplace").addEventListener("click", addWorkplaceFromSettings);
    fields.workplace.addEventListener("change", handleWorkplaceFieldChange);
    fields.role.addEventListener("change", applyRoleTemplate);
    document.getElementById("pay-period-type").addEventListener("change", updatePayPeriodAnchor);
    document.getElementById("open-workplace-setup").addEventListener("click", openWorkplaceSetup);
    workplaceList.addEventListener("click", handleWorkplaceAction);
    setupForm.addEventListener("submit", handleSetupSubmit);
    document.getElementById("skip-workplace-setup").addEventListener("click", () => setupDialog.close());
    setupDialog.addEventListener("close", handleSetupClose);
    systemTheme.addEventListener("change", () => {
        if (state.settings.colorMode === "system") {
            applyTheme();
        }
    });
}

function showView(viewName, { historyAction = "push" } = {}) {
    if (state.currentView !== null && state.currentView !== viewName) {
        setStatus("");
    }

    if (historyAction !== "none"
        && (historyAction === "replace" || state.currentView !== viewName)) {
        const historyState = {
            ...(window.history.state || {}),
            [VIEW_HISTORY_KEY]: viewName,
        };
        if (historyAction === "replace") {
            window.history.replaceState(historyState, "", window.location.href);
        } else {
            window.history.pushState(historyState, "", window.location.href);
        }
    }

    const previousView = state.currentView;
    const viewChanged = previousView !== viewName;
    state.currentView = viewName;
    if (historyFilterDialog.open && viewName !== "previous-shifts") {
        closeHistoryFilterDialog(false);
    }

    document.querySelectorAll(".view").forEach((section) => {
        const visible = section.id === viewName;
        section.classList.toggle("is-visible", visible);
        section.classList.toggle("is-hidden", !visible);
        section.hidden = !visible;
    });

    if (viewChanged) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document.title = `${VIEW_TITLES[viewName] || "Shift Ledger"} · Shift Ledger`;
        if (previousView !== null) {
            const heading = document.getElementById(viewName)?.querySelector("h1");
            if (heading) {
                heading.tabIndex = -1;
                heading.focus({ preventScroll: true });
            }
        }
    }

    if (viewName === "new-shift") {
        notesList.querySelectorAll(".note-input").forEach(autosizeNote);
    }

    document.querySelectorAll(".main-nav [data-view], .mobile-bottom-nav [data-view]").forEach((button) => {
        if (button.tagName === "BUTTON") {
            if (button.dataset.view === viewName) {
                button.setAttribute("aria-current", "page");
            } else {
                button.removeAttribute("aria-current");
            }
        }
    });
}

function handlePopState(event) {
    const viewName = event.state?.[VIEW_HISTORY_KEY];
    if (typeof viewName === "string" && document.getElementById(viewName)?.classList.contains("view")) {
        showView(viewName, { historyAction: "none" });
        return;
    }

    showView("dashboard", { historyAction: "replace" });
}

function getInitialView() {
    const historyView = window.history.state?.[VIEW_HISTORY_KEY];
    if (typeof historyView === "string" && document.getElementById(historyView)?.classList.contains("view")) {
        return historyView;
    }

    return "dashboard";
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

function initializeSettings() {
    styleSetting.value = state.settings.visualStyle;
    modeSetting.value = state.settings.colorMode;
    weekStartSetting.value = state.settings.weekStartsOn;
    currencySetting.value = state.settings.currency;
    zeroDetailsSetting.value = state.settings.zeroDetails;
    syncDashboardOptionControls();
    applyTheme();
}

function syncDashboardOptionControls() {
    document.querySelectorAll("[data-dashboard-option]").forEach((option) => {
        const group = option.dataset.dashboardOption === "section" ? "sections" : "stats";
        option.checked = state.settings.dashboard[group][option.dataset.dashboardKey];
    });
}

function updateDashboardPreference(groupName, key, value) {
    const group = groupName === "section" ? "sections" : "stats";
    const previousValue = state.settings.dashboard[group][key];
    state.settings.dashboard[group][key] = value;

    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch (error) {
        state.settings.dashboard[group][key] = previousValue;
        syncDashboardOptionControls();
        console.error("Unable to save dashboard settings:", error);
        setStatus("Unable to save your dashboard settings in this browser.", true);
        return;
    }

    syncDashboardOptionControls();
    renderDashboard();
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
        dashboard: {
            sections: { totals: true, periods: true, recent: true },
            stats: { shifts: true, hours: true, sales: true, tips: true },
        },
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

        const storedDashboard = stored.dashboard && typeof stored.dashboard === "object"
            ? stored.dashboard
            : {};
        const storedSections = storedDashboard.sections && typeof storedDashboard.sections === "object"
            ? storedDashboard.sections
            : {};
        const storedStats = storedDashboard.stats && typeof storedDashboard.stats === "object"
            ? storedDashboard.stats
            : {};

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
            dashboard: {
                sections: {
                    totals: typeof storedSections.totals === "boolean" ? storedSections.totals : true,
                    periods: typeof storedSections.periods === "boolean" ? storedSections.periods : true,
                    recent: typeof storedSections.recent === "boolean" ? storedSections.recent : true,
                },
                stats: {
                    shifts: typeof storedStats.shifts === "boolean" ? storedStats.shifts : true,
                    hours: typeof storedStats.hours === "boolean" ? storedStats.hours : true,
                    sales: typeof storedStats.sales === "boolean" ? storedStats.sales : true,
                    tips: typeof storedStats.tips === "boolean" ? storedStats.tips : true,
                },
            },
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
        const saved = persistShifts();
        renderDashboard();
        renderPreviousShifts();
        if (saved) {
            setStatus("Shift deleted.");
        }
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
    if (formStatusTimeout !== null) {
        window.clearTimeout(formStatusTimeout);
        formStatusTimeout = null;
    }
    formStatusExpiresAt = null;

    formStatus.textContent = message;
    formStatus.classList.toggle("error", isError);
    formStatus.hidden = !message;

    if (message && !isError) {
        formStatusExpiresAt = Date.now() + 6000;
        const timeoutId = window.setTimeout(() => {
            if (formStatusTimeout !== timeoutId) {
                return;
            }
            formStatus.textContent = "";
            formStatus.hidden = true;
            formStatusTimeout = null;
        }, 6000);
        formStatusTimeout = timeoutId;
    }
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

function handleAddNote() {
    const blank = [...notesList.querySelectorAll(".note-input")].find((input) => input.value.trim() === "");
    if (blank) {
        blank.focus();
    } else {
        addNoteRow("", { focus: true });
    }
}

function handleNoteRemove(event) {
    const button = event.target.closest(".note-remove");
    if (button) {
        const row = button.closest(".note-row");
        if (row.querySelector(".note-input").value.trim()) {
            markShiftFormDirty();
        }
        removeNoteRow(row);
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
        if (input.value.trim() !== "") {
            addNoteRow("", { focus: true, after: row });
        }
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

const LEGACY_ROLE = "__legacy__";

function getEditingShift() {
    return state.editingShiftId === null
        ? null
        : state.shifts.find((shift) => shift.id === state.editingShiftId) || null;
}

function findRole(roleId) {
    for (const workplace of state.workplaces.workplaces) {
        const role = workplace.roles.find((entry) => entry.id === roleId);
        if (role) {
            return { workplace, role };
        }
    }
    return null;
}

function isWorkplaceMode() {
    const editing = getEditingShift();
    return state.workplaces.workplaces.some((workplace) => !workplace.archived)
        || Boolean(editing?.roleId && findRole(editing.roleId));
}

function hasLegacyJob(editing) {
    return Boolean(editing?.job) && !(editing.roleId && findRole(editing.roleId));
}

function fillSelect(select, options, value) {
    select.replaceChildren(...options.map(([optionValue, label]) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = label;
        return option;
    }));
    select.value = options.some(([optionValue]) => optionValue === value) ? value : "";
}

function renderWorkplaceFields() {
    const mode = isWorkplaceMode();
    document.getElementById("shift-workplace-field").hidden = !mode;
    document.getElementById("shift-role-field").hidden = !mode;
    document.getElementById("shift-job-field").hidden = mode;
    if (!mode) {
        return;
    }

    const editing = getEditingShift();
    const active = state.workplaces.workplaces.filter((workplace) => !workplace.archived);
    const current = fields.workplace.value
        || editing?.workplaceId
        || (!editing && active.length === 1 ? active[0].id : "");
    const options = [["", "Select"]];
    state.workplaces.workplaces
        .filter((workplace) => !workplace.archived || workplace.id === editing?.workplaceId)
        .forEach((workplace) => options.push([workplace.id, workplace.archived ? `${workplace.name} (archived)` : workplace.name]));
    fillSelect(fields.workplace, options, current);
    renderRoleOptions();
}

function renderRoleOptions() {
    const editing = getEditingShift();
    const workplace = state.workplaces.workplaces.find((entry) => entry.id === fields.workplace.value);
    const current = fields.role.value || editing?.roleId || (hasLegacyJob(editing) ? LEGACY_ROLE : "");
    const options = [["", "Select"]];
    if (hasLegacyJob(editing)) {
        options.push([LEGACY_ROLE, `${editing.job} (no role)`]);
    }
    (workplace?.roles || [])
        .filter((role) => !role.archived || role.id === editing?.roleId)
        .forEach((role) => options.push([role.id, role.archived ? `${role.name} (archived)` : role.name]));
    fillSelect(fields.role, options, current);
}

function applyRoleTemplate() {
    const hint = document.getElementById("shift-role-hint");
    hint.textContent = "";
    updateMealPeriodFields();
    const match = findRole(fields.role.value);
    if (!match?.role.template) {
        return;
    }

    const template = match.role.template;
    let filled = 0;
    [
        [fields.mealPeriod, template.mealPeriod],
        [fields.clockIn, template.clockIn],
        [fields.clockOut, template.clockOut],
        [fields.breakStart, template.breakStart],
        [fields.breakEnd, template.breakEnd],
    ].forEach(([field, value]) => {
        if (value && !field.value) {
            field.value = value;
            filled += 1;
        }
    });
    if (filled > 0) {
        updateMealPeriodFields();
        markShiftFormDirty();
        hint.textContent = `Filled ${filled} empty ${filled === 1 ? "field" : "fields"} from the ${match.role.name} template.`;
    }
}

function handleWorkplaceFieldChange() {
    renderRoleOptions();
    updateMealPeriodFields();
    document.getElementById("shift-role-hint").textContent = "";
}

function resetForm(shouldClearStatus = true) {
    form.reset();
    shiftFormDirty = false;
    updateMealPeriodFields();
    setNoteRows([]);
    state.editingShiftId = null;
    renderWorkplaceFields();
    updateMealPeriodFields();
    document.getElementById("shift-role-hint").textContent = "";
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
    shiftFormDirty = false;
    state.editingShiftId = shift.id;
    fields.date.value = shift.date || "";
    fields.mealPeriod.value = shift.mealPeriod || "";
    document.getElementById("shift-no-report").checked = shift.noReport === true && shift.mealPeriod !== "Double";
    updateMealPeriodFields();
    fields.workplace.value = "";
    fields.role.value = "";
    renderWorkplaceFields();
    document.getElementById("shift-role-hint").textContent = "";
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
    updateMealPeriodFields();
}

function markShiftFormDirty() {
    shiftFormDirty = true;
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

        const saved = persistShifts();
        renderDashboard();
        renderPreviousShifts();
        const successMessage = state.editingShiftId !== null ? "Shift updated." : "Shift saved.";
        resetForm(false);
        showView("dashboard");
        if (saved) {
            setStatus(successMessage);
        }
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

    if (isWorkplaceMode()) {
        const editing = getEditingShift();
        const match = findRole(fields.role.value);
        if (match) {
            baseline.workplaceId = match.workplace.id;
            baseline.roleId = match.role.id;
            baseline.job = editing?.roleId === match.role.id ? editing.job : match.role.name;
        } else {
            baseline.job = fields.role.value === LEGACY_ROLE && editing ? editing.job : "";
        }
    }

    const skipReports = !roleTracksReports();
    if (skipReports || (baseline.mealPeriod !== "Double" && document.getElementById("shift-no-report").checked)) {
        reportAmountFields.forEach((field) => {
            baseline[field] = 0;
        });
        if (baseline.mealPeriod !== "Double") {
            baseline.noReport = true;
        }
    }

    if (baseline.mealPeriod === "Double") {
        reportAmountFields.forEach((field) => {
            baseline[field] = 0;
        });
        baseline.reports = Object.fromEntries(reportPeriods.map(([period]) => {
            const reportNode = getReportNode(period);
            const enabled = !skipReports && reportNode.querySelector("[data-report-toggle]").checked;
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
    if (!shift.job) {
        issues.push(isWorkplaceMode()
            ? { field: "role", message: "Choose a workplace and role." }
            : { field: "job", message: "Job is required." });
    }
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
    applyDashboardPreferences();
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
            : `${shift.job} · ${shift.mealPeriod}${hasReport(shift) ? "" : " · No report"}`;
        details.append(date, description);

        const metrics = document.createElement("div");
        metrics.className = "recent-metrics";
        metrics.hidden = !state.settings.dashboard.stats.sales && !state.settings.dashboard.stats.tips;
        [
            ["sales", "Sales", getSalesTotal(shift)],
            ["tips", "Net tips", getNetTips(shift)],
        ].filter(([key]) => state.settings.dashboard.stats[key]).forEach(([, label, amount]) => {
            const metric = document.createElement("div");
            metric.className = "recent-metric";
            const metricLabel = document.createElement("small");
            metricLabel.textContent = label;
            const metricValue = document.createElement("strong");
            metricValue.textContent = formatReportAmount(shift, amount);
            metric.append(metricLabel, metricValue);
            metrics.appendChild(metric);
        });

        item.append(details, metrics);
        fragment.appendChild(item);
    });
    recentShiftsEl.replaceChildren(fragment);
}

function applyDashboardPreferences() {
    const hasSelectedStats = DASHBOARD_STATS.some((key) => state.settings.dashboard.stats[key]);
    document.querySelectorAll("[data-dashboard-section]").forEach((section) => {
        const hasMetrics = section.dataset.dashboardSection === "totals"
            || section.dataset.dashboardSection === "periods";
        section.hidden = !state.settings.dashboard.sections[section.dataset.dashboardSection]
            || (hasMetrics && !hasSelectedStats);
    });
    document.querySelectorAll("[data-dashboard-stat]").forEach((stat) => {
        stat.hidden = !state.settings.dashboard.stats[stat.dataset.dashboardStat];
    });
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
        const reportStatusText = getReportStatus(shift);
        reportStatus.textContent = reportStatusText;
        reportStatus.hidden = !reportStatusText;
        card.querySelector(".card-job").textContent = shift.job;
        card.querySelector(".card-hours").textContent = formatDuration(getDurationMinutes(shift));
        card.querySelector(".card-sales").textContent = formatReportAmount(shift, getSalesTotal(shift));
        card.querySelector(".card-tips").textContent = formatReportAmount(shift, getNetTips(shift));
        const autoGratuity = getAutoGratuity(shift);
        const autoGratuityValue = card.querySelector(".card-auto-gratuity");
        autoGratuityValue.textContent = formatCurrency(autoGratuity);
        autoGratuityValue.parentElement.hidden = state.settings.zeroDetails === "hide" && !autoGratuity;
        const breakdown = getFinancialBreakdown(shift);
        Object.entries(CARD_BREAKDOWN_SELECTORS).forEach(([field, selector]) => {
            const value = card.querySelector(selector);
            value.textContent = formatCurrency(breakdown[field]);
            value.parentElement.hidden = state.settings.zeroDetails === "hide" && !breakdown[field];
        });
        card.querySelector(".card-clock-in").textContent = formatTime(shift.clockIn);
        card.querySelector(".card-clock-out").textContent = formatClockOut(shift);
        const hasBreak = Boolean(shift.breakStart && shift.breakEnd);
        const breakValue = card.querySelector(".card-break");
        breakValue.textContent = hasBreak
            ? `${formatTime(shift.breakStart)} - ${formatBreakEnd(shift)}`
            : "None";
        breakValue.parentElement.hidden = state.settings.zeroDetails === "hide" && !hasBreak;
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
        ["shifts", "Shifts", String(shifts.length)],
        ["hours", "Hours", formatDuration(hours)],
        ["sales", "Sales", formatCurrency(sales)],
        ["tips", "Net tips", formatCurrency(tips)],
    ].filter(([key]) => state.settings.dashboard.stats[key]);
    container.hidden = values.length === 0;
    const fragment = document.createDocumentFragment();

    values.forEach(([key, label, value]) => {
        const metric = document.createElement("div");
        metric.className = "period-metric";
        metric.dataset.stat = key;
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
    const filters = [];
    if (filterDateFrom.value) {
        filters.push({ label: `From ${formatDate(filterDateFrom.value)}`, input: filterDateFrom, empty: "" });
    }
    if (filterDateTo.value) {
        filters.push({ label: `To ${formatDate(filterDateTo.value)}`, input: filterDateTo, empty: "" });
    }
    if (filterJobSelect.value !== "all") {
        filters.push({ label: `Job: ${filterJobSelect.value}`, input: filterJobSelect, empty: "all" });
    }

    const count = filters.length;
    activeFilterCount.textContent = `${count} active`;
    activeFilterCount.hidden = count === 0;
    clearFiltersButton.disabled = count === 0;

    const chips = filters.map(({ label, input, empty }) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter-chip";
        button.setAttribute("aria-label", `Remove filter: ${label}`);
        button.append(label, Object.assign(document.createElement("span"), {
            textContent: "×",
            ariaHidden: "true",
        }));
        button.addEventListener("click", () => {
            input.value = empty;
            renderPreviousShifts();
            openHistoryFiltersButton.focus();
        });
        item.appendChild(button);
        return item;
    });
    activeFiltersList.replaceChildren(...chips);
    activeFiltersList.hidden = count === 0;
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
            hasReport(shift) ? getSalesTotal(shift) : "",
            ...(isDouble ? Array(5).fill("") : [
                shift.ccTips, shift.cashTips, Number(shift.autoGratuity) || 0, shift.tipsPaidOut, shift.tipOutReceived,
            ]),
            hasReport(shift) ? getNetTips(shift) : "",
            getReportStatus(shift),
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
    downloadLink.download = getCsvExportFilename(shifts);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`${shifts.length} ${shifts.length === 1 ? "shift" : "shifts"} exported to CSV.`);
}

function getCsvExportFilename(shifts) {
    const dates = shifts.map((shift) => shift.date).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
    const dateRange = dates.length === 0
        ? toLocalDateString(new Date())
        : dates[0] === dates[dates.length - 1]
            ? dates[0]
            : `${dates[0]}-to-${dates[dates.length - 1]}`;
    const jobs = [...new Set(shifts.map((shift) => String(shift.job || "").trim()).filter(Boolean))];
    const job = jobs.length === 1
        ? jobs[0].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        : "";

    return `shift-ledger-shifts-${dateRange}${job ? `-${job}` : ""}.csv`;
}

function exportBackup() {
    const backup = {
        format: "shift-ledger-backup",
        version: 2,
        exportedAt: new Date().toISOString(),
        shifts: state.shifts,
        workplaces: state.workplaces.workplaces,
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

        const importedShifts = dedupeShiftIds(records.map(normalizeImportedShift));
        let importedWorkplaces = null;
        if (!Array.isArray(parsed) && parsed.workplaces !== undefined) {
            try {
                importedWorkplaces = window.Workplaces.normalizeData({
                    version: 1,
                    setupDismissed: true,
                    workplaces: parsed.workplaces,
                });
            } catch (error) {
                throw new Error("This backup has invalid workplace data.");
            }
        }
        const workplaceNote = importedWorkplaces ? " and its workplaces" : "";
        if (!window.confirm(`Replace your ${state.shifts.length} saved shifts with ${importedShifts.length} shifts${workplaceNote} from this backup?`)) {
            return;
        }

        const previousWorkplaces = localStorage.getItem(window.Workplaces.STORAGE_KEY);
        try {
            if (importedWorkplaces) {
                window.Workplaces.save(localStorage, importedWorkplaces);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(importedShifts));
        } catch (error) {
            console.error("Unable to store restored shifts:", error);
            try {
                if (importedWorkplaces) {
                    if (previousWorkplaces === null) {
                        localStorage.removeItem(window.Workplaces.STORAGE_KEY);
                    } else {
                        localStorage.setItem(window.Workplaces.STORAGE_KEY, previousWorkplaces);
                    }
                }
            } catch (rollbackError) {
                console.error("Unable to roll back workplaces:", rollbackError);
            }
            throw new Error("Unable to restore: browser storage is full or unavailable. Your existing shifts were not changed.");
        }
        state.shifts = importedShifts;
        if (importedWorkplaces) {
            state.workplaces = importedWorkplaces;
            renderWorkplaces();
        }
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
        || !MEAL_PERIODS.includes(shift.mealPeriod) || typeof shift.job !== "string"
        || !TIME_PATTERN.test(shift.clockIn) || !TIME_PATTERN.test(shift.clockOut)) {
        throw new Error(`Backup shift ${index + 1} is missing valid required fields.`);
    }
    for (const field of ["breakStart", "breakEnd"]) {
        if (shift[field] !== undefined && shift[field] !== "" && !TIME_PATTERN.test(shift[field])) {
            throw new Error(`Backup shift ${index + 1} has an invalid ${field} time.`);
        }
    }

    const amountFields = reportAmountFields;
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

    ["workplaceId", "roleId"].forEach((field) => {
        if (typeof shift[field] !== "string" || !shift[field]) {
            delete normalized[field];
        }
    });

    if (shift.noReport === true && shift.mealPeriod !== "Double") {
        reportAmountFields.forEach((field) => {
            normalized[field] = 0;
        });
    } else {
        delete normalized.noReport;
    }

    return normalized;
}

function showFieldError(input, errorElement, message) {
    errorElement.textContent = message;
    errorElement.hidden = !message;
    if (message) {
        input.setAttribute("aria-invalid", "true");
    } else {
        input.removeAttribute("aria-invalid");
    }
}

function persistWorkplaces(data, { quiet = false } = {}) {
    try {
        window.Workplaces.save(localStorage, data);
        return true;
    } catch (error) {
        console.error("Unable to save workplaces:", error);
        if (!quiet) {
            setStatus("Unable to save workplaces. Your browser storage may be full.", true);
        }
        return false;
    }
}

function commitWorkplaces(change) {
    const draft = structuredClone(state.workplaces);
    const result = change(draft);
    if (result.error) {
        return result;
    }
    if (!persistWorkplaces(draft)) {
        return { failed: true };
    }
    state.workplaces = draft;
    return result;
}

function createActionButton(label, text, data, className = "ghost-button") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.setAttribute("aria-label", label);
    Object.assign(button.dataset, data);
    return button;
}

function createItemActions(kind, entry) {
    const actions = document.createElement("div");
    actions.className = "item-actions";
    const data = { kind, id: entry.id };
    const archiveAction = entry.archived ? "unarchive" : "archive";
    const archiveText = entry.archived ? "Unarchive" : "Archive";
    if (kind === "workplace") {
        actions.append(createActionButton(`Set pay period for ${entry.name}`, "Pay period", { ...data, action: "pay-period" }));
    } else {
        actions.append(createActionButton(`Edit template for role ${entry.name}`, "Template", { ...data, action: "template" }));
    }
    actions.append(
        createActionButton(`Rename ${kind} ${entry.name}`, "Rename", { ...data, action: "rename" }),
        createActionButton(`${archiveText} ${kind} ${entry.name}`, archiveText, { ...data, action: archiveAction })
    );
    if (!window.Workplaces.isInUse(state.shifts, kind, entry.id)) {
        actions.append(createActionButton(`Delete ${kind} ${entry.name}`, "Delete", { ...data, action: "delete" }, "ghost-button danger-text"));
    }
    return actions;
}

function createArchivedPill() {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = "Archived";
    return pill;
}

function createItemSummary(text) {
    const summary = document.createElement("span");
    summary.className = "item-summary";
    summary.textContent = text;
    return summary;
}

function formatPayPeriod(payPeriod) {
    if (!payPeriod) {
        return "Pay period: follows your week start setting";
    }
    const labels = {
        weekly: "Weekly",
        biweekly: "Every two weeks",
        semimonthly: "Twice a month (1st and 16th)",
        monthly: "Monthly",
    };
    if (!payPeriod.anchorDate) {
        return `Pay period: ${labels[payPeriod.type]}`;
    }
    const [year, month, day] = payPeriod.anchorDate.split("-").map(Number);
    const start = new Date(year, month - 1, day)
        .toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `Pay period: ${labels[payPeriod.type]}, starting ${start}`;
}

function formatTemplate(template, tracksReports) {
    const parts = [template?.mealPeriod];
    if (template?.clockIn || template?.clockOut) {
        parts.push(`${template.clockIn || "?"}–${template.clockOut || "?"}`);
    }
    if (template?.breakStart) {
        parts.push(`break ${template.breakStart}–${template.breakEnd}`);
    }
    const text = template ? `Template: ${parts.filter(Boolean).join(", ")}` : "No template";
    return tracksReports === false ? `${text} · No sales or tip reports` : text;
}

function createWorkplaceItem(workplace) {
    const item = document.createElement("li");
    item.className = "workplace-item";
    item.classList.toggle("is-archived", workplace.archived);

    const head = document.createElement("div");
    head.className = "workplace-head";
    const title = document.createElement("h3");
    title.tabIndex = -1;
    title.dataset.id = workplace.id;
    title.textContent = workplace.name;
    head.append(title);
    if (workplace.archived) {
        head.append(createArchivedPill());
    }
    head.append(createItemActions("workplace", workplace));

    const summary = createItemSummary(formatPayPeriod(workplace.payPeriod));
    const roles = document.createElement("ul");
    roles.className = "role-list";
    roles.setAttribute("aria-label", `Roles at ${workplace.name}`);
    if (workplace.roles.length === 0) {
        const empty = document.createElement("li");
        empty.className = "role-empty";
        empty.textContent = "No roles yet.";
        roles.append(empty);
    }
    workplace.roles.forEach((role) => {
        const roleItem = document.createElement("li");
        roleItem.className = "role-item";
        roleItem.classList.toggle("is-archived", role.archived);
        const name = document.createElement("span");
        name.className = "role-name";
        name.textContent = role.name;
        roleItem.append(name);
        if (role.archived) {
            roleItem.append(createArchivedPill());
        }
        roleItem.append(createItemActions("role", role), createItemSummary(formatTemplate(role.template, role.tracksReports)));
        roles.append(roleItem);
    });

    item.append(head, summary, roles, createActionButton(
        `Add role to ${workplace.name}`,
        "Add role",
        { action: "add-role", kind: "workplace", id: workplace.id },
        "secondary-button"
    ));
    return item;
}

function renderWorkplaces(focusSelector = null) {
    const { workplaces } = state.workplaces;
    workplaceEmpty.hidden = workplaces.length > 0;
    workplaceList.hidden = workplaces.length === 0;
    workplaceList.replaceChildren(...workplaces.map(createWorkplaceItem));
    renderWorkplaceFields();
    if (focusSelector) {
        (workplaceList.querySelector(focusSelector) || document.getElementById("add-workplace")).focus();
    }
}

function askForName({ title, hint, value = "", submitLabel, validate }) {
    return new Promise((resolve) => {
        document.getElementById("name-dialog-title").textContent = title;
        document.getElementById("name-dialog-hint").textContent = hint;
        document.getElementById("submit-name").textContent = submitLabel;
        nameInput.value = value;
        showFieldError(nameInput, nameError, "");

        const finish = (result) => {
            if (!nameDialog.open && !finish.pending) {
                return;
            }
            finish.pending = false;
            nameForm.removeEventListener("submit", onSubmit);
            nameDialog.removeEventListener("close", onClose);
            cancelButton.removeEventListener("click", onClose);
            if (nameDialog.open) {
                nameDialog.close();
            }
            resolve(result);
        };
        const onSubmit = (event) => {
            event.preventDefault();
            const problem = validate(nameInput.value);
            showFieldError(nameInput, nameError, problem);
            if (problem) {
                nameInput.focus();
                return;
            }
            finish(window.Workplaces.cleanName(nameInput.value));
        };
        const onClose = () => finish(null);
        const cancelButton = document.getElementById("cancel-name");
        finish.pending = true;
        nameForm.addEventListener("submit", onSubmit);
        nameDialog.addEventListener("close", onClose);
        cancelButton.addEventListener("click", onClose);
        nameDialog.showModal();
        nameInput.focus();
        nameInput.select();
    });
}

function runFormDialog({ dialog, form, cancelButton, onOpen, onSubmit }) {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
            if (settled) {
                return;
            }
            settled = true;
            form.removeEventListener("submit", submit);
            dialog.removeEventListener("close", cancel);
            cancelButton.removeEventListener("click", cancel);
            if (dialog.open) {
                dialog.close();
            }
            resolve(value);
        };
        const cancel = () => finish(null);
        const submit = (event) => {
            event.preventDefault();
            const outcome = onSubmit();
            if (outcome !== undefined) {
                finish(outcome);
            }
        };
        form.addEventListener("submit", submit);
        dialog.addEventListener("close", cancel);
        cancelButton.addEventListener("click", cancel);
        onOpen();
        dialog.showModal();
    });
}

function showDialogError(element, message) {
    element.textContent = message;
    element.hidden = !message;
}

function askForTemplate(role) {
    const inputs = {
        mealPeriod: document.getElementById("template-meal-period"),
        clockIn: document.getElementById("template-clock-in"),
        clockOut: document.getElementById("template-clock-out"),
        breakStart: document.getElementById("template-break-start"),
        breakEnd: document.getElementById("template-break-end"),
    };
    const errorElement = document.getElementById("template-error");
    const noReportsInput = document.getElementById("template-no-reports");
    return runFormDialog({
        dialog: document.getElementById("template-dialog"),
        form: document.getElementById("template-form"),
        cancelButton: document.getElementById("cancel-template"),
        onOpen: () => {
            document.getElementById("template-dialog-title").textContent = `Template for ${role.name}`;
            Object.entries(inputs).forEach(([key, input]) => {
                input.value = role.template?.[key] || "";
            });
            showDialogError(errorElement, "");
            noReportsInput.checked = role.tracksReports === false;
            inputs.mealPeriod.focus();
        },
        onSubmit: () => {
            const value = Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, input.value]));
            const check = window.Workplaces.setTemplate(structuredClone(state.workplaces), role.id, value);
            if (check.error) {
                showDialogError(errorElement, check.error);
                return undefined;
            }
            return {
                value: Object.values(value).some(Boolean) ? value : null,
                tracksReports: !noReportsInput.checked,
            };
        },
    });
}

function askForPayPeriod(workplace) {
    const typeInput = document.getElementById("pay-period-type");
    const anchorInput = document.getElementById("pay-period-anchor");
    const errorElement = document.getElementById("pay-period-error");
    return runFormDialog({
        dialog: document.getElementById("pay-period-dialog"),
        form: document.getElementById("pay-period-form"),
        cancelButton: document.getElementById("cancel-pay-period"),
        onOpen: () => {
            document.getElementById("pay-period-dialog-title").textContent = `Pay period for ${workplace.name}`;
            typeInput.value = workplace.payPeriod?.type || "";
            anchorInput.value = workplace.payPeriod?.anchorDate || "";
            updatePayPeriodAnchor();
            showDialogError(errorElement, "");
            typeInput.focus();
        },
        onSubmit: () => {
            const value = typeInput.value
                ? { type: typeInput.value, anchorDate: anchorInput.value }
                : null;
            const check = window.Workplaces.setPayPeriod(structuredClone(state.workplaces), workplace.id, value);
            if (check.error) {
                showDialogError(errorElement, check.error);
                return undefined;
            }
            return { value };
        },
    });
}

function updatePayPeriodAnchor() {
    const needsAnchor = ["weekly", "biweekly"].includes(document.getElementById("pay-period-type").value);
    document.getElementById("pay-period-anchor-field").hidden = !needsAnchor;
}

async function addWorkplaceFromSettings() {
    const button = document.getElementById("add-workplace");
    const name = await askForName({
        title: "Add a workplace",
        hint: "Use the name of the restaurant, bar, or company you work for.",
        submitLabel: "Add workplace",
        validate: (value) => window.Workplaces.validateName(value, state.workplaces.workplaces, "workplace"),
    });
    if (name === null) {
        button.focus();
        return;
    }

    const result = commitWorkplaces((draft) => window.Workplaces.addWorkplace(draft, name));
    if (result.error) {
        setStatus(result.error, true);
    }
    if (result.error || result.failed) {
        return;
    }
    renderWorkplaces(`h3[data-id="${result.item.id}"]`);
    setStatus(`Added workplace “${name}”.`);
}

async function handleWorkplaceAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    const { action, kind, id } = button.dataset;
    const found = window.Workplaces.locate(state.workplaces, kind, id);
    if (!found) {
        return;
    }
    const entry = found.item;
    const focusSelector = (nextAction) => `button[data-action="${nextAction}"][data-kind="${kind}"][data-id="${id}"]`;
    let result;
    let message;
    let nextFocus = focusSelector(action);

    if (action === "add-role") {
        const name = await askForName({
            title: `Add a role to ${entry.name}`,
            hint: "A role is the position you work here, such as Server or Bartender.",
            submitLabel: "Add role",
            validate: (value) => window.Workplaces.validateName(value, entry.roles, "role"),
        });
        if (name === null) {
            button.focus();
            return;
        }
        result = commitWorkplaces((draft) => window.Workplaces.addRole(draft, id, name));
        message = `Added role “${name}” to ${entry.name}.`;
    } else if (action === "rename") {
        const name = await askForName({
            title: `Rename ${kind}`,
            hint: "Past shifts keep the name they were saved with. The new name appears on future shifts.",
            value: entry.name,
            submitLabel: "Save name",
            validate: (value) => window.Workplaces.validateName(value, found.siblings, kind, id),
        });
        if (name === null) {
            button.focus();
            return;
        }
        result = commitWorkplaces((draft) => window.Workplaces.rename(draft, kind, id, name));
        message = `Renamed to “${name}”.`;
    } else if (action === "template") {
        const template = await askForTemplate(entry);
        if (template === null) {
            button.focus();
            return;
        }
        result = commitWorkplaces((draft) => {
            const saved = window.Workplaces.setTemplate(draft, id, template.value);
            return saved.error ? saved : window.Workplaces.setTracksReports(draft, id, template.tracksReports);
        });
        message = `Saved the template and report settings for ${entry.name}.`;
    } else if (action === "pay-period") {
        const payPeriod = await askForPayPeriod(entry);
        if (payPeriod === null) {
            button.focus();
            return;
        }
        result = commitWorkplaces((draft) => window.Workplaces.setPayPeriod(draft, id, payPeriod.value));
        message = `Saved the pay period for ${entry.name}.`;
    } else if (action === "archive" || action === "unarchive") {
        const archived = action === "archive";
        result = commitWorkplaces((draft) => window.Workplaces.setArchived(draft, kind, id, archived));
        message = archived
            ? `Archived ${kind} “${entry.name}”. Past shifts keep it, and it won't be offered for new shifts.`
            : `Unarchived ${kind} “${entry.name}”.`;
        nextFocus = focusSelector(archived ? "unarchive" : "archive");
    } else if (action === "delete") {
        if (!window.confirm(`Delete the ${kind} “${entry.name}”? It has no saved shifts. This can't be undone.`)) {
            return;
        }
        result = commitWorkplaces((draft) => window.Workplaces.remove(draft, kind, id, state.shifts));
        message = `Deleted ${kind} “${entry.name}”.`;
        nextFocus = null;
    } else {
        return;
    }

    if (result.error) {
        setStatus(result.error, true);
        return;
    }
    if (result.failed) {
        return;
    }
    renderWorkplaces(nextFocus || "h3");
    setStatus(message);
}

function openWorkplaceSetup() {
    if (setupDialog.open) {
        return;
    }
    const jobs = window.Workplaces.distinctJobs(state.shifts);
    setupSaved = false;
    setupWorkplaceName.value = "";
    setupRoles.value = jobs.join(", ");
    document.getElementById("setup-roles-hint").textContent = jobs.length
        ? "Separate roles with commas. These came from your saved shifts, and shifts with matching jobs will be linked to them."
        : "Separate roles with commas, for example: Server, Bartender. You can add more later.";
    showFieldError(setupWorkplaceName, document.getElementById("setup-workplace-error"), "");
    showFieldError(setupRoles, document.getElementById("setup-roles-error"), "");
    setupDialog.showModal();
    setupWorkplaceName.focus();
}

function handleSetupClose() {
    if (setupSaved || state.workplaces.setupDismissed) {
        return;
    }
    const draft = structuredClone(state.workplaces);
    draft.setupDismissed = true;
    if (persistWorkplaces(draft, { quiet: true })) {
        state.workplaces = draft;
    }
}

function handleSetupSubmit(event) {
    event.preventDefault();
    const nameProblem = window.Workplaces.validateName(setupWorkplaceName.value, state.workplaces.workplaces, "workplace");
    const roles = window.Workplaces.parseRoleNames(setupRoles.value);
    showFieldError(setupWorkplaceName, document.getElementById("setup-workplace-error"), nameProblem);
    showFieldError(setupRoles, document.getElementById("setup-roles-error"), roles.error);
    if (nameProblem || roles.error) {
        (nameProblem ? setupWorkplaceName : setupRoles).focus();
        return;
    }

    const draft = structuredClone(state.workplaces);
    const { item: workplace } = window.Workplaces.addWorkplace(draft, setupWorkplaceName.value);
    roles.names.forEach((name) => window.Workplaces.addRole(draft, workplace.id, name));
    draft.setupDismissed = true;
    if (!persistWorkplaces(draft)) {
        return;
    }
    state.workplaces = draft;
    setupSaved = true;

    // Link existing shifts only after keeping an untouched copy of the originals.
    const { shifts: linked, changed } = window.Workplaces.linkShifts(state.shifts, workplace);
    let linkedCount = 0;
    let linkProblem = false;
    if (changed > 0) {
        try {
            localStorage.setItem(PRE_WORKPLACES_KEY, localStorage.getItem(STORAGE_KEY) ?? "[]");
            localStorage.setItem(STORAGE_KEY, JSON.stringify(linked));
            state.shifts = linked;
            linkedCount = changed;
        } catch (error) {
            console.error("Unable to link saved shifts to the new workplace:", error);
            linkProblem = true;
        }
    }

    setupDialog.close();
    renderWorkplaces("h3");
    const roleCount = roles.names.length;
    setStatus([
        `Created workplace “${workplace.name}”${roleCount ? ` with ${roleCount} ${roleCount === 1 ? "role" : "roles"}` : ""}.`,
        linkedCount ? `Linked ${linkedCount} saved ${linkedCount === 1 ? "shift" : "shifts"} to its roles.` : "",
        linkProblem ? "Your saved shifts could not be linked, so they were left unchanged." : "",
    ].filter(Boolean).join(" "), linkProblem);
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
        return true;
    } catch (error) {
        console.error("Unable to save shifts:", error);
        setStatus("Unable to save locally. Your browser storage may be full.", true);
        return false;
    }
}

function dedupeShiftIds(shifts) {
    const seen = new Set();
    return shifts.map((shift) => {
        let id = shift.id;
        while (seen.has(id)) {
            id = createShiftId();
        }
        seen.add(id);
        return id === shift.id ? shift : { ...shift, id };
    });
}

function preserveRecovery(raw) {
    try {
        localStorage.setItem(RECOVERY_KEY, raw);
        return true;
    } catch (error) {
        console.error("Unable to preserve unreadable shift data:", error);
        return false;
    }
}

function loadShifts() {
    let raw = null;
    try {
        raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            throw new Error("Stored shifts are not a list.");
        }

        const valid = [];
        parsed.forEach((record, index) => {
            try {
                valid.push(normalizeImportedShift(record, index));
            } catch (error) {
                console.error("Skipping invalid stored shift:", error);
            }
        });
        const skipped = parsed.length - valid.length;
        if (skipped > 0) {
            const kept = preserveRecovery(raw);
            loadNotice = `${skipped} saved ${skipped === 1 ? "shift was" : "shifts were"} unreadable and skipped.${kept ? " A copy of the original data was kept in this browser." : ""}`;
        }
        return dedupeShiftIds(valid);
    } catch (error) {
        console.error("Unable to read stored shifts:", error);
        const kept = raw ? preserveRecovery(raw) : false;
        loadNotice = `Saved shifts could not be read.${kept ? " A copy of the original data was kept in this browser." : ""}`;
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

function roleTracksReports() {
    return findRole(fields.role.value)?.role.tracksReports !== false;
}

function updateMealPeriodFields() {
    const isDouble = fields.mealPeriod.value === "Double";
    const tracks = roleTracksReports();
    const noReport = document.getElementById("shift-no-report").checked;
    document.getElementById("role-no-reports-note").hidden = tracks;
    document.getElementById("single-report-toggle").hidden = isDouble || !tracks;
    document.getElementById("single-report-fields").hidden = isDouble || !tracks;
    document.querySelectorAll("#single-report-fields fieldset").forEach((fieldset) => {
        fieldset.disabled = noReport;
    });
    document.getElementById("double-report-fields").hidden = !isDouble || !tracks;
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

function getReportStatus(shift) {
    if (shift.mealPeriod === "Double") {
        return getDoubleReportStatus(shift);
    }
    return hasReport(shift) ? "" : "No sales or tip report";
}

function formatReportAmount(shift, amount) {
    return hasReport(shift) ? formatCurrency(amount) : "No report";
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
