const STORAGE_KEY = "shift-ledger-shifts-v1";
const SETTINGS_KEY = "shift-ledger-settings-v1";
const VIEW_HISTORY_KEY = "shiftLedgerView";
const SHIFT_GUARD_KEY = "shiftLedgerEntryGuard";
const DASHBOARD_STATS = ["shifts", "hours", "sales", "tips"];
const VIEW_TITLES = {
    "dashboard": "Dashboard",
    "new-shift": "New Shift",
    "previous-shifts": "Shifts",
    "paystubs": "Paystubs",
    "settings": "Settings",
};
const { getAutoGratuity, getDurationMinutes, getFinancialBreakdown, getNetTips, getSalesTotal, hasSalesReport, hasTipReport, inferMissingReport, toMinutes } = window.ShiftMath;
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
const ADD_WORKPLACE_OPTION = "__add_workplace__";
const ADD_ROLE_OPTION = "__add_role__";
const LEGACY_ROLE = "__legacy__";
const reportAmountFields = [
    "foodSales", "bawSales", "liquorSales", "naBevSales", "additionalSales",
    "ccTips", "cashTips", "autoGratuity", "tipsPaidOut", "tipOutReceived",
];
const salesAmountFields = reportAmountFields.slice(0, 5);
const tipAmountFields = reportAmountFields.slice(5);
let loadNotice = "";
let setupSaved = false;
let setupFirstRun = false;
let setupReturnToShift = false;

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
// Undo/redo snapshots for the Edit phase of shift entry.
const formHistory = { undo: [], redo: [], current: null };let shiftFormProgress = { workplace: false, details: false };
let entryMode = null;
let shiftReviewing = false;
let guidedStep = { element: null, index: 0 };
let guidedNextAttempted = false;
let allowUpdateReload = false;
let updateRequested = false;
let serviceWorkerRegistration = null;
let hadServiceWorkerController = "serviceWorker" in navigator
    && Boolean(navigator.serviceWorker.controller);

let entryReturnView = "previous-shifts";
let shiftEntryHistoryDepth = 0;
let shiftNavSwitching = false;

const navButtons = document.querySelectorAll("[data-view]");
const formStatus = document.getElementById("form-status");
const appUpdateDialog = document.getElementById("app-update-dialog");
const checkForUpdatesButton = document.getElementById("check-for-updates");
const updateCheckStatus = document.getElementById("update-check-status");
const reloadAppButton = document.getElementById("reload-app");
const dismissAppUpdateButton = document.getElementById("dismiss-app-update");
const form = document.getElementById("shift-form");
const formTitle = document.getElementById("form-title");
const cancelFormButton = document.getElementById("cancel-form");
const guidedCancelButton = document.getElementById("guided-cancel");
const closeEntryModeButton = document.getElementById("close-entry-mode");
const shiftList = document.getElementById("shift-list");
const sortBySelect = document.getElementById("sort-by");
const filterJobSelect = document.getElementById("filter-job");
const filterWorkplaceSelect = document.getElementById("filter-workplace");
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
// Report periods for double shifts. Values: [id, displayName, capability]
// Capability determines when to show this period based on role.
// Updated dynamically in initializeDoubleReports().
let reportPeriods = [
    ["lunch", "Lunch", "lunch"],
    ["dinner", "Dinner", "dinner"],
    ["whole", "Whole", "whole"],
];
const EDIT_PHASE_INTRO = "Edit your shift below, then review it before saving.";
const GUIDED_REPORT_KINDS = {
    sales: { radioName: "guided-has-sales-report", checkboxId: "shift-no-sales-report" },
    tips: { radioName: "guided-has-tips-report", checkboxId: "shift-no-tips-report" },
};

const fields = {
    date: document.getElementById("shift-date"),
    mealPeriod: document.getElementById("shift-meal-period"),
    job: document.getElementById("shift-job"),
    workplace: document.getElementById("shift-workplace"),
    role: document.getElementById("shift-role"),
    salesReport: document.getElementById("shift-has-sales-report-yes"),
    tipsReport: document.getElementById("shift-has-tips-report-yes"),
    clockIn: document.getElementById("shift-clock-in"),
    clockOut: document.getElementById("shift-clock-out"),
    breakStart: document.getElementById("shift-break-start"),
    breakEnd: document.getElementById("shift-break-end"),
    hadBreak: document.getElementById("shift-had-break-yes"),
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
const setupPayPeriodType = document.getElementById("setup-pay-period-type");
const setupPayPeriodAnchor = document.getElementById("setup-pay-period-anchor");
const setupPayPeriodStartDay = document.getElementById("setup-pay-period-start-day");
const setupPayPeriodStartDayField = document.getElementById("setup-pay-period-start-day-field");
const setupPayPeriodAnchorField = document.getElementById("setup-pay-period-anchor-field");
const setupPayPeriodError = document.getElementById("setup-pay-period-error");
const setupWorkplaceStartDate = document.getElementById("setup-workplace-start-date");
const setupWorkplaceEndDate = document.getElementById("setup-workplace-end-date");
const setupWorkplaceDatesError = document.getElementById("setup-workplace-dates-error");
const setupRoles = document.getElementById("setup-roles");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");

// 100dvh can be measured too tall right after a PWA refresh, so size from the real inner height.
function syncAppHeight() {
    document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
}
syncAppHeight();
["resize", "orientationchange", "pageshow", "load"].forEach((eventName) => {
    window.addEventListener(eventName, syncAppHeight);
});
window.visualViewport?.addEventListener("resize", syncAppHeight);
[100, 400, 1000].forEach((delay) => window.setTimeout(syncAppHeight, delay));

// Keep the focused field visible once the on-screen keyboard has finished opening.
function keepFocusedFieldVisible() {
    const field = document.activeElement;
    if (field?.matches?.("input, select, textarea") && document.body.classList.contains("is-entering-shift")) {
        field.scrollIntoView({ block: "center", behavior: "smooth" });
    }
}
document.addEventListener("focusin", () => window.setTimeout(keepFocusedFieldVisible, 300));
window.visualViewport?.addEventListener("resize", keepFocusedFieldVisible);

bindEvents();
setNoteRows([]);
initializeDoubleReports();
initializeSettings();
renderWorkplaces();
renderDashboard();
renderPreviousShifts();
showView(getInitialView(), { historyAction: "replace" });
document.documentElement.classList.remove("is-booting");
if (loadNotice) {
    setStatus(loadNotice, true);
}
if (!workplaceLoad.exists) {
    openWorkplaceSetup({ firstRun: true });
}
registerServiceWorker();

function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (updateRequested) {
            allowUpdateReload = true;
            window.location.reload();
            return;
        }
        if (hadServiceWorkerController) {
            showAppUpdateDialog();
        }
        hadServiceWorkerController = true;
    });
    window.addEventListener("online", checkForServiceWorkerUpdate);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            checkForServiceWorkerUpdate();
        }
    });

    // The offline cache cannot hold file: URLs, so the worker only installs over http(s).
    if (!/^https?:$/.test(window.location.protocol)) {
        return;
    }

    navigator.serviceWorker.register("./sw.js")
        .then((registration) => {
            serviceWorkerRegistration = registration;
            offerWaitingWorker(registration);
            registration.addEventListener("updatefound", () => {
                const installing = registration.installing;
                if (!installing) {
                    return;
                }
                installing.addEventListener("statechange", () => {
                    if (installing.state === "installed") {
                        offerWaitingWorker(registration);
                    }
                });
            });
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

async function runManualUpdateCheck() {
    const setResult = (message) => {
        updateCheckStatus.textContent = message;
    };

    if (!serviceWorkerRegistration) {
        setResult("Updates are only available when the app is opened from its web address.");
        return;
    }
    if (!navigator.onLine) {
        setResult("You're offline. Connect to the internet and try again.");
        return;
    }

    checkForUpdatesButton.disabled = true;
    setResult("Checking for updates…");
    try {
        await serviceWorkerRegistration.update();
        const installing = serviceWorkerRegistration.installing;
        if (installing) {
            await new Promise((resolve) => {
                installing.addEventListener("statechange", () => {
                    if (installing.state === "installed" || installing.state === "redundant") {
                        resolve();
                    }
                });
            });
        }

        if (serviceWorkerRegistration.waiting) {
            setResult("An update is ready.");
            showAppUpdateDialog();
        } else {
            setResult("Shift Ledger is up to date.");
        }
    } catch (error) {
        console.warn("Unable to check for app updates:", error);
        setResult("Couldn't check for updates. Try again later.");
    } finally {
        checkForUpdatesButton.disabled = false;
    }
}

function showAppUpdateDialog() {
    if (!appUpdateDialog.open) {
        appUpdateDialog.showModal();
    }
}

// A first install has no controller, so only a replacement worker counts as an update.
function offerWaitingWorker(registration) {
    if (registration.waiting && navigator.serviceWorker.controller) {
        showAppUpdateDialog();
    }
}

function reloadForAppUpdate() {
    if (shiftFormDirty && !window.confirm("Reload now and discard the unsaved shift changes?")) {
        return;
    }

    const waitingWorker = serviceWorkerRegistration && serviceWorkerRegistration.waiting;
    if (waitingWorker) {
        updateRequested = true;
        waitingWorker.postMessage({ type: "SKIP_WAITING" });
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
    form.addEventListener("input", updateShiftFormProgression);
    form.addEventListener("change", updateShiftFormProgression);
    document.getElementById("choose-guided").addEventListener("click", () => setEntryMode("guided"));
    document.getElementById("choose-manual").addEventListener("click", () => setEntryMode("manual"));
    closeEntryModeButton.addEventListener("click", closeNewShiftEntry);
    document.getElementById("guided-back").addEventListener("click", () => moveGuidedStep(-1));
    document.getElementById("guided-next").addEventListener("click", () => moveGuidedStep(1));
    cancelFormButton.addEventListener("click", cancelShiftEntry);
    document.getElementById("cancel-review").addEventListener("click", cancelShiftEntry);
    document.getElementById("edit-shift").addEventListener("click", editShiftFromReview);
    guidedCancelButton.addEventListener("click", cancelShiftEntry);
    form.addEventListener("change", (event) => {
        if (![fields.workplace, fields.role, fields.job].includes(event.target)) {
            updateValidationErrors();
        }
        if (event.target.matches('input[name="guided-had-break"]')) {
            handleGuidedBreakAnswer();
            updateGuidedBreakQuestion();
            updateValidationErrors();
        }
        if (getGuidedReportKind(event.target)) {
            handleGuidedSalesReportChange(event.target);
        }
    });
    form.addEventListener("change", maybeAutoAdvanceGuidedStep);
    form.addEventListener("change", recordFormHistory);
    document.getElementById("undo-edit").addEventListener("click", () => stepFormHistory(-1));
    document.getElementById("redo-edit").addEventListener("click", () => stepFormHistory(1));
    document.addEventListener("keydown", handleFormHistoryKeydown);
    window.addEventListener("beforeunload", guardUnsavedShiftChanges);
    reloadAppButton.addEventListener("click", reloadForAppUpdate);
    checkForUpdatesButton.addEventListener("click", runManualUpdateCheck);
    dismissAppUpdateButton.addEventListener("click", () => {
        appUpdateDialog.close();
    });
    fields.mealPeriod.addEventListener("change", updateMealPeriodFields);
    document.getElementById("shift-no-sales-report").addEventListener("change", updateMealPeriodFields);
    document.getElementById("shift-no-tips-report").addEventListener("change", updateMealPeriodFields);
    document.getElementById("template-use-times").addEventListener("change", updateTemplateDefaultFields);
    document.getElementById("template-use-break").addEventListener("change", updateTemplateDefaultFields);
    doubleReportList.addEventListener("change", handleDoubleReportToggle);
    doubleReportList.addEventListener("input", (event) => {
        if (event.target.matches("[data-report-field]")) {
            updateInferredReports();
        }
    });
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
    sortBySelect.addEventListener("change", renderPreviousShifts);
    filterJobSelect.addEventListener("change", renderPreviousShifts);
    filterWorkplaceSelect.addEventListener("change", renderPreviousShifts);
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
    shiftList.addEventListener("click", (event) => {
        if (event.target.classList.contains("shift-detail-dialog")) {
            event.target.close();
        }
    });
    shiftList.addEventListener("close", (event) => {
        if (shiftNavSwitching || !event.target.classList?.contains("shift-detail-dialog")) {
            return;
        }
        if (shiftList.querySelector(".shift-detail-dialog[open]")) {
            return;
        }
        const summary = event.target.parentElement.querySelector(".shift-summary");
        summary.scrollIntoView({ block: "nearest" });
        summary.focus({ preventScroll: true });
    }, true);
    shiftList.addEventListener("keydown", (event) => {
        if ((event.key !== "ArrowLeft" && event.key !== "ArrowRight")
            || event.target.closest("input, select, textarea")) {
            return;
        }
        const dialog = shiftList.querySelector(".shift-detail-dialog[open]");
        if (dialog) {
            event.preventDefault();
            stepShiftDetail(dialog, event.key === "ArrowLeft" ? -1 : 1);
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
    document.getElementById("add-workplace").addEventListener("click", () => openWorkplaceSetup());
    fields.workplace.addEventListener("change", handleWorkplaceFieldChange);
    fields.role.addEventListener("change", handleRoleFieldChange);
    fields.job.addEventListener("change", handleLegacyJobFieldChange);
    const payPeriodType = document.getElementById("pay-period-type");
    const payPeriodStartDay = document.getElementById("pay-period-start-day");
    const payPeriodAnchor = document.getElementById("pay-period-anchor");
    const payPeriodError = document.getElementById("pay-period-error");
    const clearPayPeriodError = () => {
        showDialogError(payPeriodError, "");
        [payPeriodType, payPeriodStartDay, payPeriodAnchor].forEach((input) => input.removeAttribute("aria-invalid"));
    };
    payPeriodType.addEventListener("change", () => {
        updatePayPeriodFields();
        clearPayPeriodError();
    });
    payPeriodStartDay.addEventListener("change", clearPayPeriodError);
    payPeriodAnchor.addEventListener("input", clearPayPeriodError);
    setupPayPeriodType.addEventListener("change", () => {
        updateSetupPayPeriodFields();
        showFieldError(setupPayPeriodType, setupPayPeriodError, "");
        setupPayPeriodAnchor.removeAttribute("aria-invalid");
    });
    setupPayPeriodStartDay.addEventListener("change", () => {
        showFieldError(setupPayPeriodType, setupPayPeriodError, "");
        setupPayPeriodAnchor.removeAttribute("aria-invalid");
    });
    setupPayPeriodAnchor.addEventListener("input", () => {
        showFieldError(setupPayPeriodType, setupPayPeriodError, "");
        setupPayPeriodAnchor.removeAttribute("aria-invalid");
    });
    [setupWorkplaceStartDate, setupWorkplaceEndDate].forEach((input) => {
        input.addEventListener("input", () => {
            showDialogError(setupWorkplaceDatesError, "");
            setupWorkplaceStartDate.removeAttribute("aria-invalid");
            setupWorkplaceEndDate.removeAttribute("aria-invalid");
        });
    });
    [document.getElementById("workplace-start-date"), document.getElementById("workplace-end-date")]
        .forEach((input) => input.addEventListener("input", () => {
            showDialogError(document.getElementById("workplace-dates-error"), "");
            document.getElementById("workplace-start-date").removeAttribute("aria-invalid");
            document.getElementById("workplace-end-date").removeAttribute("aria-invalid");
        }));
    document.getElementById("open-workplace-setup").addEventListener("click", openWorkplaceSetup);
    workplaceList.addEventListener("click", handleWorkplaceAction);
    setupForm.addEventListener("submit", handleSetupSubmit);
    wireRoleList(setupRoles, document.getElementById("add-setup-role"));
    wireRoleList(document.getElementById("add-roles-list"), document.getElementById("add-roles-more"));
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
            shiftEntryHistoryDepth = 0;
            if (viewName === "new-shift") {
                // Extra entry so a back gesture steps through the entry flow instead of leaving it.
                window.history.pushState({ ...historyState, [SHIFT_GUARD_KEY]: true }, "", window.location.href);
                shiftEntryHistoryDepth = 2;
            }
        }
    }

    const previousView = state.currentView;
    const viewChanged = previousView !== viewName;
    if (viewName === "new-shift" && viewChanged && previousView !== null) {
        entryReturnView = previousView;
    }
    state.currentView = viewName;
    document.body.classList.toggle("is-entering-shift", viewName === "new-shift");
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

    const activeNav = viewName === "new-shift" ? "previous-shifts" : viewName;
    document.querySelectorAll(".main-nav [data-view], .mobile-bottom-nav [data-view]").forEach((button) => {
        if (button.tagName === "BUTTON") {
            if (button.dataset.view === activeNav) {
                button.setAttribute("aria-current", "page");
            } else {
                button.removeAttribute("aria-current");
            }
        }
    });
}

function handlePopState(event) {
    const viewName = event.state?.[VIEW_HISTORY_KEY];
    if (state.currentView === "new-shift" && viewName === "new-shift") {
        if (!event.state[SHIFT_GUARD_KEY]) {
            handleShiftEntryBack();
        }
        return;
    }
    if (typeof viewName === "string" && document.getElementById(viewName)?.classList.contains("view")) {
        showView(viewName, { historyAction: "none" });
        return;
    }

    showView("dashboard", { historyAction: "replace" });
}

// Back gesture or button inside new-shift entry: go back one stage, never silently discard.
function handleShiftEntryBack() {
    const stay = () => {
        window.history.pushState({ ...(window.history.state || {}), [SHIFT_GUARD_KEY]: true }, "", window.location.href);
    };
    const editing = Boolean(getEditingShift());
    const chosen = editing ? "manual" : entryMode;

    if (shiftReviewing) {
        editShiftFromReview();
        stay();
        return;
    }
    if (chosen === "guided" && !guidedStep.review) {
        moveGuidedStep(-1);
        stay();
        return;
    }
    if (chosen && shiftFormDirty
        && !window.confirm("Cancel this shift? Your entries will be discarded.")) {
        stay();
        return;
    }
    resetForm();
    shiftEntryHistoryDepth = 0;
    window.history.back();
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
    document.getElementById("current-app-version").textContent = window.SHIFT_LEDGER_VERSION;
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

function openShiftDetail(entry, { fromNav = false, step = 0 } = {}) {
    const dialog = entry.querySelector(".shift-detail-dialog");
    const entries = [...shiftList.querySelectorAll(".shift-entry")];
    const index = entries.indexOf(entry);
    dialog.querySelector(".shift-nav-count").textContent = `${index + 1} of ${entries.length}`;
    dialog.querySelector(".shift-nav-prev").disabled = index <= 0;
    dialog.querySelector(".shift-nav-next").disabled = index >= entries.length - 1;
    if (!dialog.open) {
        shiftNavSwitching = fromNav;
        if (step) {
            dialog.dataset.step = step > 0 ? "next" : "prev";
        } else {
            delete dialog.dataset.step;
        }
        dialog.showModal();
        shiftNavSwitching = false;
    }
    dialog.querySelector(".card-body").scrollTop = 0;
}

function stepShiftDetail(dialog, step) {
    const entries = [...shiftList.querySelectorAll(".shift-entry")];
    const target = entries[entries.indexOf(dialog.closest(".shift-entry")) + step];
    if (!target) {
        return;
    }
    shiftNavSwitching = true;
    dialog.close();
    shiftNavSwitching = false;
    openShiftDetail(target, { fromNav: true, step });
    const nextDialog = target.querySelector(".shift-detail-dialog");
    nextDialog.querySelector(step < 0 ? ".shift-nav-prev" : ".shift-nav-next").focus();
    if (nextDialog.querySelector(step < 0 ? ".shift-nav-prev" : ".shift-nav-next").disabled) {
        nextDialog.querySelector(".close-shift-detail").focus();
    }
}

function handleListAction(event) {
    const button = event.target.closest("button");
    if (!button) {
        return;
    }

    const summaryButton = button.classList.contains("shift-summary") ? button : null;
    if (summaryButton) {
        openShiftDetail(summaryButton.parentElement);
        return;
    }

    if (button.classList.contains("close-shift-detail")) {
        button.closest("dialog").close();
        return;
    }

    if (button.classList.contains("shift-nav-prev") || button.classList.contains("shift-nav-next")) {
        stepShiftDetail(button.closest("dialog"), button.classList.contains("shift-nav-prev") ? -1 : 1);
        return;
    }

    const card = button.closest(".shift-card");
    if (!card) {
        return;
    }

    const shiftId = Number(card.dataset.shiftId);
    const shift = state.shifts.find((entry) => entry.id === shiftId);

    if (!shift) {
        return;
    }

    if (button.classList.contains("delete-shift")) {
        const entries = [...shiftList.querySelectorAll(".shift-entry")];
        const entryIndex = entries.indexOf(card.closest(".shift-entry"));
        const wasInDialog = Boolean(card.closest("dialog"));
        state.shifts = state.shifts.filter((entry) => entry.id !== shiftId);
        const saved = persistShifts();
        renderDashboard();
        renderPreviousShifts();
        if (wasInDialog) {
            const remaining = [...shiftList.querySelectorAll(".shift-entry")];
            const neighbor = remaining[Math.min(entryIndex, remaining.length - 1)];
            if (neighbor) {
                openShiftDetail(neighbor, { fromNav: true });
            }
        }
        if (saved) {
            setStatus("Shift deleted.");
        }
        return;
    }

    if (button.classList.contains("edit-shift")) {
        card.closest("dialog")?.close();
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
        recordFormHistory();
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
        recordFormHistory();
    }
}

function readNotes() {
    if (getGuidedNotesAnswer() === "no") {
        return [];
    }
    return [...notesList.querySelectorAll(".note-input")]
        .map((input) => input.value.trim())
        .filter(Boolean);
}

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
    return state.editingShiftId === null
        || state.workplaces.workplaces.some((workplace) => !workplace.archived)
        || Boolean(editing?.workplaceId)
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
    document.getElementById("shift-workplace-card").hidden = !mode || !shiftFormProgress.workplace;
    document.getElementById("shift-workplace-field").hidden = !mode;
    document.getElementById("shift-job-field").hidden = mode;
    if (!mode) {
        return;
    }

    const editing = getEditingShift();
    const active = state.workplaces.workplaces.filter((workplace) => !workplace.archived);
    const preferred = getPreferredWorkplace(active);
    const notInitialized = fields.workplace.dataset.initialized !== "true";
    const current = fields.workplace.value
        || editing?.workplaceId
        || (notInitialized && !editing ? preferred : "");
    const options = [["", "Select"]];
    state.workplaces.workplaces
        .filter((workplace) => !workplace.archived || workplace.id === editing?.workplaceId)
        .forEach((workplace) => options.push([workplace.id, workplace.archived ? `${workplace.name} (archived)` : workplace.name]));
    options.push([ADD_WORKPLACE_OPTION, "+ Add workplace…"]);
    fillSelect(fields.workplace, options, current);
    fields.workplace.dataset.initialized = "true";
    fields.workplace.dataset.previousValue = fields.workplace.value;
    renderRoleOptions();
    updateShiftFormProgression();
}

function getPreferredWorkplace(activeWorkplaces) {
    const activeIds = new Set(activeWorkplaces.map((workplace) => workplace.id));
    const lastUsed = [...state.shifts].reverse().find((shift) => activeIds.has(shift.workplaceId));
    return lastUsed?.workplaceId || (activeWorkplaces.length === 1 ? activeWorkplaces[0].id : "");
}

function getActiveRoles(workplace) {
    return (workplace?.roles || []).filter((role) => !role.archived);
}

function renderRoleOptions() {
    const editing = getEditingShift();
    const workplace = state.workplaces.workplaces.find((entry) => entry.id === fields.workplace.value);
    const activeRoles = getActiveRoles(workplace);
    const hasLegacyRole = hasLegacyJob(editing);
    const current = fields.role.value || editing?.roleId || (hasLegacyJob(editing) ? LEGACY_ROLE : "");
    const options = [["", "Select"]];
    if (hasLegacyJob(editing)) {
        options.push([LEGACY_ROLE, `${editing.job} (no role)`]);
    }
    (workplace?.roles || [])
        .filter((role) => !role.archived || role.id === editing?.roleId)
        .forEach((role) => options.push([role.id, role.archived ? `${role.name} (archived)` : role.name]));
    if (workplace && !workplace.archived) {
        options.push([ADD_ROLE_OPTION, "+ Add role…"]);
    }
    const hasCurrent = Boolean(current) && options.some(([value]) => value === current);
    const autoSelected = !hasCurrent && !editing && activeRoles.length === 1;
    fillSelect(fields.role, options, autoSelected ? activeRoles[0].id : current);
    fields.role.required = activeRoles.length > 0;
    document.getElementById("shift-role-field").hidden = !isWorkplaceMode()
        || !workplace
        || (activeRoles.length === 0 && !editing?.roleId);
    document.getElementById("shift-role-hint").textContent = "";
    if (autoSelected) {
        fields.role.dataset.autoSelected = "true";
    } else {
        delete fields.role.dataset.autoSelected;
    }
    fields.role.dataset.previousValue = fields.role.value;
}

function updateShiftFormProgression() {
    const editing = getEditingShift();
    if (fields.date.value || editing) {
        shiftFormProgress.workplace = true;
    }

    const workplace = state.workplaces.workplaces.find((entry) => entry.id === fields.workplace.value);
    const hasRoles = getActiveRoles(workplace).length > 0;
    const roleMatch = findRole(fields.role.value);
    const hasSelectedRole = fields.role.value === LEGACY_ROLE
        ? Boolean(hasLegacyJob(editing))
        : Boolean(workplace && roleMatch?.workplace.id === workplace.id);
    if (editing || (shiftFormProgress.workplace && workplace && (!hasRoles || hasSelectedRole))) {
        shiftFormProgress.details = true;
    }

    document.getElementById("shift-workplace-card").hidden = !shiftFormProgress.workplace
        || !isWorkplaceMode();
    const details = document.getElementById("shift-details");
    const wasHidden = details.hidden;
    details.hidden = !shiftFormProgress.details;
    if (wasHidden && !details.hidden && fields.date.value && fields.role.dataset.autoSelected === "true") {
        delete fields.role.dataset.autoSelected;
        applyRoleTemplate();
    }
    renderEntryMode();
    syncFormHistory();
}

function syncFormHistory() {
    if (isFormHistoryActive() && !formHistory.current) {
        formHistory.current = captureFormSnapshot();
    }
    updateFormHistoryButtons();
}

function setEntryMode(mode) {
    entryMode = mode;
    guidedStep = { element: null, index: 0 };
    guidedNextAttempted = false;
    resetFormHistory();
    if (mode === "manual") {
        shiftFormProgress = { workplace: true, details: true };
        syncAnswerRadios();
    }
    updateShiftFormProgression();
    focusGuidedStep();
}

const GUIDED_STEP_SELECTOR = "[data-guided-step]";
const GUIDED_CONTAINER_SELECTOR = "fieldset, .sub-card, #double-report-fields, #double-report-list > *, #role-no-reports-note";

function getGuidedSteps() {
    const steps = [...document.getElementById("shift-entry-fields").querySelectorAll(GUIDED_STEP_SELECTOR)]
        .filter((element) => !element.closest("[hidden]"));
    const clockOutStep = steps.find((step) => step.contains(fields.clockOut));
    const breakStep = steps.find((step) => step.id === "break-time-fields")
        || steps.find((step) => step.id === "guided-break-question");
    if (clockOutStep && breakStep) {
        steps.splice(steps.indexOf(clockOutStep), 1);
        steps.splice(steps.indexOf(breakStep) + 1, 0, clockOutStep);
    }
    return steps;
}

function hasEntryQuestions() {
    return Boolean(entryMode) || Boolean(getEditingShift());
}

// Manual entry and editing show the same Yes/No questions as guided Edit, so derive the answers from the data.
function syncAnswerRadios() {
    const check = (id) => {
        document.getElementById(id).checked = true;
    };
    check(fields.breakStart.value || fields.breakEnd.value ? "shift-had-break-yes" : "shift-had-break-no");
    check(document.getElementById("shift-no-sales-report").checked ? "shift-has-sales-report-no" : "shift-has-sales-report-yes");
    check(document.getElementById("shift-no-tips-report").checked ? "shift-has-tips-report-no" : "shift-has-tips-report-yes");
    const hasNotes = [...notesList.querySelectorAll(".note-input")].some((input) => input.value.trim() !== "");
    check(hasNotes ? "shift-has-notes-yes" : "shift-has-notes-no");
}

function updateGuidedBreakQuestion(guided = hasEntryQuestions()) {
    const question = document.getElementById("guided-break-question");
    question.hidden = !guided;
    document.getElementById("break-time-fields").hidden = guided && getGuidedBreakAnswer() !== "yes";
}

function getGuidedReportAnswer(kind) {
    return form.querySelector(`input[name="${GUIDED_REPORT_KINDS[kind].radioName}"]:checked`)?.value || "";
}

function getGuidedReportKind(element) {
    return Object.keys(GUIDED_REPORT_KINDS)
        .find((kind) => element?.matches?.(`input[name="${GUIDED_REPORT_KINDS[kind].radioName}"]`)) || "";
}

function updateGuidedSalesReport(guided = hasEntryQuestions()) {
    const salesAnswer = getGuidedReportAnswer("sales");
    document.getElementById("guided-sales-report-step").hidden = !guided;
    document.getElementById("shift-no-sales-report-control").hidden = guided;
    document.getElementById("shift-no-sales-report-hint").hidden = guided;
    document.getElementById("guided-sales-report-hint").hidden = !guided || salesAnswer !== "no";
    document.getElementById("guided-sales-inputs").hidden = guided && salesAnswer !== "yes";

    const tipsAnswer = getGuidedReportAnswer("tips");
    document.getElementById("guided-tips-report-step").hidden = !guided;
    document.getElementById("shift-no-tips-report-control").hidden = guided;
    document.getElementById("shift-no-tips-report-hint").hidden = guided;
    document.getElementById("guided-tips-report-hint").hidden = !guided || tipsAnswer !== "no";
    document.getElementById("guided-tips-inputs").hidden = guided
        ? tipsAnswer !== "yes"
        : document.getElementById("shift-no-tips-report").checked;

    document.getElementById("guided-notes-question").hidden = !guided;
    document.getElementById("notes-entry").hidden = guided && getGuidedNotesAnswer() !== "yes";
}

function getGuidedNotesAnswer() {
    return form.querySelector('input[name="guided-has-notes"]:checked')?.value || "";
}

// A "yes" with no usable note, or no answer at all, reviews as "no".
function normalizeGuidedNotesAnswer() {
    if (getGuidedNotesAnswer() !== "yes" || readNotes().length === 0) {
        document.getElementById("shift-has-notes-no").checked = true;
    }
}

function getGuidedBreakAnswer() {
    return form.querySelector('input[name="guided-had-break"]:checked')?.value || "";
}

function handleGuidedBreakAnswer() {
    if (getGuidedBreakAnswer() === "no") {
        fields.breakStart.value = "";
        fields.breakEnd.value = "";
    }
}

function handleGuidedSalesReportChange(input) {
    const kind = getGuidedReportKind(input);
    document.getElementById(GUIDED_REPORT_KINDS[kind].checkboxId).checked = input.value === "no";
    updateMealPeriodFields();
    updateShiftFormProgression();
    updateValidationErrors();
}

function renderEntryMode() {
    const editing = Boolean(getEditingShift());
    const chosen = editing ? "manual" : entryMode;
    const guided = chosen === "guided";
    const reviewing = shiftReviewing && Boolean(chosen);
    const container = document.getElementById("shift-entry-fields");
    document.getElementById("entry-mode-chooser").hidden = Boolean(chosen);
    container.hidden = reviewing || (!chosen && !editing);
    document.getElementById("shift-review").hidden = !reviewing;
    form.classList.toggle("is-guided", Boolean(chosen));
    // Manual entry and editing are always in the Edit phase.
    form.classList.toggle("is-guided-review", Boolean(chosen) && !guided);

    const controls = document.getElementById("guided-controls");
    const guidedButtons = document.getElementById("guided-buttons");
    const formActions = document.getElementById("form-actions");
    const question = document.getElementById("guided-question");
    controls.hidden = !chosen || reviewing;
    guidedButtons.hidden = !guided || reviewing || Boolean(guidedStep.review);
    formActions.hidden = reviewing || !chosen || (guided && !guidedStep.review);
    guidedCancelButton.hidden = !guided || guidedStep.review;
    updateGuidedBreakQuestion(Boolean(chosen));
    updateGuidedSalesReport(Boolean(chosen));
    container.querySelectorAll(".guided-off").forEach((element) => element.classList.remove("guided-off"));
    container.querySelectorAll(".guided-current, .guided-active-context").forEach((element) => {
        element.classList.remove("guided-current", "guided-active-context");
    });
    container.querySelectorAll("[data-guided-original]").forEach((heading) => {
        heading.textContent = heading.dataset.guidedOriginal;
        delete heading.dataset.guidedOriginal;
        heading.classList.remove("guided-step-question");
    });
    if (!guided) {
        question.hidden = !chosen;
        question.textContent = EDIT_PHASE_INTRO;
        document.getElementById("guided-progress").textContent = "Edit";
        return;
    }

    const steps = getGuidedSteps();
    if (steps.length === 0) {
        return;
    }
    let index = guidedStep.review
        ? steps.length
        : guidedStep.element ? steps.indexOf(guidedStep.element) : guidedStep.index;
    if (index < 0 || index > steps.length) {
        index = Math.min(guidedStep.index, steps.length);
    }
    const review = shiftFormProgress.details && (guidedStep.review || index === steps.length);
    const current = review ? null : steps[index];
    guidedStep = { element: current, index: review ? steps.length : index, review };
    updateGuidedSalesReport(guided);
    question.hidden = !review;
    form.classList.toggle("is-guided-review", review);
    formActions.hidden = reviewing || !chosen || (guided && !review);
    guidedButtons.hidden = reviewing || review;
    guidedCancelButton.hidden = !guided || review;
    if (review) {
        question.textContent = EDIT_PHASE_INTRO;
        document.getElementById("guided-progress").textContent = "Edit";
    } else {
        steps.forEach((step) => {
            step.classList.toggle("guided-off", step !== current);
        });
        container.querySelectorAll(GUIDED_CONTAINER_SELECTOR).forEach((element) => {
            const partOfCurrentInputs = current.matches("[data-report-inputs]")
                && element.closest("[data-report-inputs]") === current;
            element.classList.toggle("guided-off", !element.contains(current) && !partOfCurrentInputs);
        });
        const prompt = current.dataset.guidedPrompt || "";
        question.textContent = prompt;
        current.classList.add("guided-current");
        const heading = getGuidedQuestionHeading(current);
        if (heading) {
            heading.dataset.guidedOriginal = heading.textContent;
            heading.textContent = prompt;
            heading.classList.add("guided-step-question");
            const context = current.parentElement.closest("fieldset");
            if (heading.parentElement === current && context) {
                context.classList.add("guided-active-context");
            }
        }
        document.getElementById("guided-progress").textContent = shiftFormProgress.details
            ? `Step ${index + 1} of ${steps.length + 1}`
            : `Step ${index + 1}`;
    }
    document.getElementById("guided-back").disabled = false;
    const next = document.getElementById("guided-next");
    next.hidden = review;
    next.textContent = shiftFormProgress.details && index === steps.length - 1 ? "Finish" : "Next";
    const nextIssues = review ? [] : getGuidedStepIssues(current);
    next.disabled = false;
    const nextHint = document.getElementById("guided-next-hint");
    const showHint = guidedNextAttempted && nextIssues.length > 0;
    nextHint.hidden = !showHint;
    nextHint.textContent = showHint ? `To continue: ${nextIssues[0].message}` : "";
}

function showShiftReview(shift) {
    const detail = buildShiftCardNode(shift).querySelector(".shift-card");
    detail.querySelector(".card-header-side")?.remove();
    detail.querySelector(".card-actions")?.remove();
    // Reuse the shift-detail styling so the preview matches the opened shift card.
    const preview = document.createElement("div");
    preview.className = "shift-detail-dialog shift-review-detail";
    preview.append(detail);
    document.getElementById("shift-review-card").replaceChildren(preview);
    shiftReviewing = true;
    updateShiftFormProgression();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.getElementById("shift-review-title").focus({ preventScroll: true });
}

function editShiftFromReview() {
    shiftReviewing = false;
    document.getElementById("shift-review-card").replaceChildren();
    updateShiftFormProgression();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    fields.date.focus({ preventScroll: true });
}

function getGuidedQuestionHeading(step) {
    if (step.matches("fieldset")) {
        return step.querySelector(":scope > legend");
    }
    if (step.matches("label.field")) {
        return step.closest("fieldset")?.querySelector(":scope > legend") || null;
    }
    return step.querySelector(":scope > .sub-card-title, :scope > h3, :scope > legend")
        || step.closest("fieldset")?.querySelector(":scope > legend")
        || null;
}

// Leave entry via an on-screen button and drop the history entries entry pushed,
// so a later back press doesn't land on a stale New Shift screen.
function leaveShiftEntry() {
    const unwind = shiftEntryHistoryDepth;
    shiftEntryHistoryDepth = 0;
    resetForm();
    showView(entryReturnView, { historyAction: unwind ? "none" : "push" });
    if (unwind) {
        window.history.go(-unwind);
    }
}

function closeNewShiftEntry() {
    leaveShiftEntry();
}

function cancelShiftEntry() {
    if (!window.confirm("Cancel this shift? Your entries will be discarded.")) {
        return;
    }

    leaveShiftEntry();
}

function moveGuidedStep(direction) {
    const steps = getGuidedSteps();
    let current = guidedStep.review
        ? steps.length
        : guidedStep.element ? steps.indexOf(guidedStep.element) : guidedStep.index;
    if (current < 0 || current > steps.length) {
        current = Math.min(guidedStep.index, steps.length);
    }
    if (direction < 0 && current === 0) {
        resetForm();
        const chooserTitle = document.getElementById("entry-mode-title");
        chooserTitle.tabIndex = -1;
        chooserTitle.focus({ preventScroll: true });
        return;
    }
    if (direction > 0 && current < steps.length) {
        const step = steps[current];
        const issues = getGuidedStepIssues(step);
        if (issues.length > 0) {
            guidedNextAttempted = true;
            showValidationErrors(issues);
            updateShiftFormProgression();
            return;
        }
    }
    if (direction > 0 && current >= steps.length) {
        return;
    }
    guidedNextAttempted = false;
    updateShiftFormProgression();
    const refreshedSteps = getGuidedSteps();
    const index = Math.max(0, Math.min(refreshedSteps.length, current + direction));
    if (index === refreshedSteps.length) {
        normalizeGuidedNotesAnswer();
    }
    guidedStep = { element: refreshedSteps[index] || null, index };
    updateShiftFormProgression();
    focusGuidedStep();
}

function getGuidedStepIssues(step) {
    if (!step) {
        return [];
    }
    return validateShift(readFormValues()).filter(({ field }) => step.contains(fields[field]));
}

function maybeAutoAdvanceGuidedStep(event) {
    if (entryMode !== "guided" || !guidedStep.element || !guidedStep.element.contains(event.target)) {
        return;
    }

    const step = guidedStep.element;
    const isBreakChoice = event.target.matches('input[name="guided-had-break"]');
    const isNoReportChoice = event.target.matches("#shift-no-sales-report, #shift-no-tips-report")
        && event.target.checked;
    const isNoSalesChoice = Boolean(getGuidedReportKind(event.target))
        || event.target.matches('input[name="guided-has-notes"]');
    const requiresBreakTimes = step.id === "break-time-fields" && getGuidedBreakAnswer() === "yes";
    if (!step.querySelector("[required]") && !isBreakChoice && !isNoReportChoice
        && !isNoSalesChoice && !requiresBreakTimes) {
        return;
    }

    const issues = validateShift(readFormValues())
        .filter(({ field }) => step.contains(fields[field]));
    if (issues.length === 0) {
        moveGuidedStep(1);
    }
}

function focusGuidedStep() {
    if (entryMode !== "guided") {
        return;
    }
    if (!guidedStep.element) {
        document.getElementById("guided-question").focus({ preventScroll: true });
        return;
    }
    const focusable = [...guidedStep.element.querySelectorAll("input, select, textarea, button")]
        .find((element) => !element.disabled && !element.closest("[hidden], .guided-off"));
    focusable?.focus({ preventScroll: true });
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
        [fields.clockIn, template.useTimes === false ? "" : template.clockIn],
        [fields.clockOut, template.useTimes === false ? "" : template.clockOut],
        [fields.breakStart, template.useBreak === false ? "" : template.breakStart],
        [fields.breakEnd, template.useBreak === false ? "" : template.breakEnd],
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
    if (fields.workplace.value === ADD_WORKPLACE_OPTION) {
        fields.workplace.value = fields.workplace.dataset.previousValue || "";
        renderRoleOptions();
        updateShiftFormProgression();
        updateValidationErrors();
        openWorkplaceSetup({ returnToShift: true });
        return;
    }
    fields.workplace.dataset.previousValue = fields.workplace.value;
    renderRoleOptions();
    if (fields.role.dataset.autoSelected === "true") {
        delete fields.role.dataset.autoSelected;
        applyRoleTemplate();
    }
    updateMealPeriodFields();
    document.getElementById("shift-role-hint").textContent = "";
    updateShiftFormProgression();
    updateValidationErrors();
}

function handleRoleFieldChange() {
    if (fields.role.value === ADD_ROLE_OPTION) {
        fields.role.value = fields.role.dataset.previousValue || "";
        void addRoleFromShift();
        return;
    }
    fields.role.dataset.previousValue = fields.role.value;
    delete fields.role.dataset.autoSelected;
    applyRoleTemplate();
    updateShiftFormProgression();
    updateValidationErrors();
}

function handleLegacyJobFieldChange() {
    if (fields.job.value !== ADD_WORKPLACE_OPTION) {
        fields.job.dataset.previousValue = fields.job.value;
        updateValidationErrors();
        return;
    }
    fields.job.value = fields.job.dataset.previousValue || "";
    updateValidationErrors();
    openWorkplaceSetup({ returnToShift: true });
}

async function addRoleFromShift() {
    const workplace = state.workplaces.workplaces.find((entry) => (
        entry.id === fields.workplace.value && !entry.archived
    ));
    if (!workplace) {
        return;
    }
    const added = await askForRoles(workplace);
    if (added === null) {
        fields.role.focus();
        return;
    }
    const result = commitWorkplaces((draft) => {
        let last = {};
        for (const name of added.names) {
            last = window.Workplaces.addRole(draft, workplace.id, name);
            if (last.error) {
                return last;
            }
        }
        return last;
    });
    if (result.error) {
        setStatus(result.error, true);
        return;
    }
    if (result.failed) {
        return;
    }
    renderWorkplaces();
    fields.workplace.value = workplace.id;
    fields.workplace.dataset.previousValue = workplace.id;
    renderRoleOptions();
    const role = state.workplaces.workplaces
        .find((entry) => entry.id === workplace.id)
        ?.roles.find((entry) => entry.name === added.names[0]);
    if (role) {
        fields.role.value = role.id;
        fields.role.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setStatus(added.names.length === 1
        ? `Added role “${added.names[0]}” to ${workplace.name}.`
        : `Added ${added.names.length} roles to ${workplace.name}.`);
}

function resetForm(shouldClearStatus = true) {
    form.reset();
    resetFormHistory();
    shiftFormDirty = false;
    shiftFormProgress = { workplace: false, details: false };
    entryMode = null;
    shiftReviewing = false;
    document.getElementById("shift-review-card").replaceChildren();
    guidedStep = { element: null, index: 0 };
    delete fields.workplace.dataset.initialized;
    guidedNextAttempted = false;
    updateMealPeriodFields();
    setNoteRows([]);
    state.editingShiftId = null;
    renderWorkplaceFields();
    updateMealPeriodFields();
    updateShiftFormProgression();
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
    shiftReviewing = false;
    shiftFormProgress = { workplace: true, details: true };
    state.editingShiftId = shift.id;
    fields.date.value = shift.date || "";
    fields.mealPeriod.value = shift.mealPeriod || "";
    const single = shift.mealPeriod !== "Double";
    document.getElementById("shift-no-sales-report").checked = single
        && (shift.noReport === true || shift.noSales === true);
    document.getElementById("shift-no-tips-report").checked = single
        && (shift.noReport === true || shift.noTips === true);
    updateMealPeriodFields();
    fields.workplace.value = "";
    fields.role.value = "";
    renderWorkplaceFields();
    document.getElementById("shift-role-hint").textContent = "";
    fields.job.value = shift.job || "";
    fields.job.dataset.previousValue = fields.job.value;
    fields.clockIn.value = shift.clockIn || "";
    fields.clockOut.value = shift.clockOut || "";
    fields.breakStart.value = shift.breakStart || "";
    fields.breakEnd.value = shift.breakEnd || "";
    const hadBreak = Boolean(shift.breakStart || shift.breakEnd);
    form.querySelector(`input[name="guided-had-break"][value="${hadBreak ? "yes" : "no"}"]`).checked = true;
    fields.foodSales.value = formatInputAmount(shift.foodSales);
    fields.bawSales.value = formatInputAmount(shift.bawSales);
    fields.liquorSales.value = formatInputAmount(shift.liquorSales);
    fields.naSales.value = formatInputAmount(shift.naBevSales);
    fields.additionalSales.value = formatInputAmount(shift.additionalSales);
    fields.ccTips.value = formatInputAmount(shift.ccTips);
    fields.cashTips.value = formatInputAmount(shift.cashTips);
    fields.autoGratuity.value = formatInputAmount(shift.autoGratuity);
    fields.tipOutPaid.value = formatInputAmount(shift.tipsPaidOut);
    fields.tipOutReceived.value = formatInputAmount(shift.tipOutReceived);
    setNoteRows(getNotes(shift));
    reportPeriods.forEach(([period]) => {
        const report = shift.reports?.[period];
        const reportNode = getReportNode(period);
        const toggle = reportNode.querySelector("[data-report-toggle]");
        toggle.checked = Boolean(report);
        reportAmountFields.forEach((field) => {
            const input = reportNode.querySelector(`[data-report-field="${field}"]`);
            input.value = report ? formatInputAmount(report[field]) : "0.00";
        });
        setReportInputsEnabled(reportNode, toggle.checked);
    });
    if (shift.mealPeriod === "Double") {
        updateInferredReports();
    }
    updateMealPeriodFields();
    syncAnswerRadios();
    resetFormHistory();
    updateShiftFormProgression();
}

function markShiftFormDirty() {
    shiftFormDirty = true;
}

// Snapshots are taken when a change is committed (not per keystroke),
// so text fields keep their native in-field undo.

function getHistoryControls() {
    return [...document.querySelectorAll(
        "#shift-entry-fields input, #shift-entry-fields select, #shift-entry-fields textarea:not(.note-input)",
    )];
}

function isFormHistoryActive() {
    const chosen = getEditingShift() ? "manual" : entryMode;
    return Boolean(chosen) && !shiftReviewing && (chosen !== "guided" || Boolean(guidedStep.review));
}

function captureFormSnapshot() {
    const controls = getHistoryControls();
    return {
        values: controls.map((control) => (
            control.type === "checkbox" || control.type === "radio" ? control.checked : control.value
        )),
        notes: [...notesList.querySelectorAll(".note-input")]
            .map((input) => input.value)
            .filter((value) => value.trim() !== ""),
    };
}

function resetFormHistory() {
    formHistory.undo = [];
    formHistory.redo = [];
    formHistory.current = null;
}

function getChangeLabel(target) {
    if (!target || target === notesList || notesList.contains(target)) {
        return "Notes";
    }
    const label = target.closest?.("label.field")?.querySelector(":scope > span")?.textContent
        || target.getAttribute?.("aria-label")
        || target.closest?.("fieldset")?.querySelector(":scope > legend")?.textContent
        || "Change";
    return label.trim();
}

function recordFormHistory(event) {
    if (!isFormHistoryActive()) {
        return;
    }
    const snapshot = captureFormSnapshot();
    snapshot.label = getChangeLabel(event?.target);
    if (!formHistory.current) {
        formHistory.current = snapshot;
        return;
    }
    const content = ({ values, notes }) => JSON.stringify({ values, notes });
    if (content(snapshot) === content(formHistory.current)) {
        return;
    }
    formHistory.undo.push(formHistory.current);
    formHistory.current = snapshot;
    formHistory.redo = [];
    updateFormHistoryButtons();
}

function applyFormSnapshot(snapshot) {
    const controls = getHistoryControls();
    if (controls.length !== snapshot.values.length) {
        return;
    }
    const apply = (control, value) => {
        if (control.type === "checkbox" || control.type === "radio") {
            control.checked = value;
        } else {
            control.value = value;
        }
    };
    // Role options depend on the workplace, so restore the workplace first.
    const workplaceIndex = controls.indexOf(fields.workplace);
    if (workplaceIndex >= 0) {
        apply(fields.workplace, snapshot.values[workplaceIndex]);
        fields.workplace.dataset.previousValue = fields.workplace.value;
        renderRoleOptions();
    }
    controls.forEach((control, index) => {
        if (control !== fields.workplace) {
            apply(control, snapshot.values[index]);
        }
    });
    delete fields.role.dataset.autoSelected;
    fields.role.dataset.previousValue = fields.role.value;
    fields.job.dataset.previousValue = fields.job.value;
    setNoteRows(snapshot.notes);
    shiftFormDirty = true;
    updateMealPeriodFields();
    updateShiftFormProgression();
    updateValidationErrors();
}

function stepFormHistory(direction) {
    if (!isFormHistoryActive()) {
        return;
    }
    const from = direction < 0 ? formHistory.undo : formHistory.redo;
    const to = direction < 0 ? formHistory.redo : formHistory.undo;
    if (from.length === 0 || !formHistory.current) {
        return;
    }
    to.push(formHistory.current);
    const undone = formHistory.current.label;
    formHistory.current = from.pop();
    applyFormSnapshot(formHistory.current);
    updateFormHistoryButtons();
    announceFormHistory(direction < 0 ? `Undid: ${undone}` : `Redid: ${formHistory.current.label}`);
}

let formHistoryMessageTimer = null;

function announceFormHistory(message) {
    const output = document.getElementById("edit-history-message");
    output.textContent = message;
    clearTimeout(formHistoryMessageTimer);
    formHistoryMessageTimer = setTimeout(() => {
        output.textContent = "";
    }, 3000);
}

function updateFormHistoryButtons() {
    const hasHistory = formHistory.undo.length > 0 || formHistory.redo.length > 0;
    document.getElementById("edit-history").hidden = !isFormHistoryActive() || !hasHistory;
    document.getElementById("undo-edit").disabled = formHistory.undo.length === 0;
    document.getElementById("redo-edit").disabled = formHistory.redo.length === 0;
}

function handleFormHistoryKeydown(event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || !isFormHistoryActive()) {
        return;
    }
    const key = event.key.toLowerCase();
    const isRedo = key === "y" || (key === "z" && event.shiftKey);
    const isUndo = key === "z" && !event.shiftKey;
    if (!isUndo && !isRedo) {
        return;
    }
    // Leave text fields to the browser's own undo.
    const target = event.target;
    if (target.matches?.("textarea, input:not([type=checkbox]):not([type=radio]):not([type=button])")) {
        return;
    }
    if (!document.getElementById("new-shift").contains(target) && target !== document.body) {
        return;
    }
    event.preventDefault();
    stepFormHistory(isRedo ? 1 : -1);
}

function handleFormSubmit(event) {
    event.preventDefault();

    if (entryMode === "guided" && !getEditingShift() && !guidedStep.review && guidedStep.element) {
        moveGuidedStep(1);
        return;
    }

    try {
        updateShiftFormProgression();
        const shift = readFormValues();
        const issues = validateShift(shift);
        if (issues.length > 0) {
            showValidationErrors(issues);
            return;
        }
        clearValidationErrors();

        if (!shiftReviewing) {
            showShiftReview(shift);
            return;
        }

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
    const editing = getEditingShift();
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
        const match = findRole(fields.role.value);
        const workplace = state.workplaces.workplaces.find((entry) => entry.id === fields.workplace.value);
        if (match) {
            baseline.workplaceId = match.workplace.id;
            baseline.roleId = match.role.id;
            baseline.job = editing?.roleId === match.role.id ? editing.job : match.role.name;
        } else {
            if (workplace) {
                baseline.workplaceId = workplace.id;
            }
            baseline.job = fields.role.value === LEGACY_ROLE && editing ? editing.job : "";
        }
    }

    const capabilities = selectedRoleCapabilities();
    const hasTipFields = capabilities.receivesTips || capabilities.tipsOut || capabilities.receivesTipOut;
    if (baseline.mealPeriod !== "Double") {
        const oldNoSales = editing && (editing.noReport === true || editing.noSales === true);
        const oldNoTips = editing && (editing.noReport === true || editing.noTips === true);
        const noSales = !capabilities.tracksSales
            ? Boolean(editing ? oldNoSales : true)
            : document.getElementById("shift-no-sales-report").checked;
        const noTips = !hasTipFields
            ? Boolean(editing ? oldNoTips : true)
            : document.getElementById("shift-no-tips-report").checked;
        const fieldCapabilities = {
            foodSales: capabilities.tracksSales,
            bawSales: capabilities.tracksSales,
            liquorSales: capabilities.tracksSales,
            naBevSales: capabilities.tracksSales,
            additionalSales: capabilities.tracksSales,
            ccTips: capabilities.receivesTips,
            cashTips: capabilities.receivesTips,
            autoGratuity: capabilities.receivesTips,
            tipsPaidOut: capabilities.tipsOut,
            tipOutReceived: capabilities.receivesTipOut,
        };
        Object.entries(fieldCapabilities).forEach(([field, available]) => {
            if (!available) {
                baseline[field] = editing && Object.hasOwn(editing, field) ? editing[field] : "";
            } else if ((salesAmountFields.includes(field) && noSales)
                || (tipAmountFields.includes(field) && noTips)) {
                baseline[field] = 0;
            }
        });
        if (noSales && noTips) {
            baseline.noReport = true;
        } else if (noSales) {
            baseline.noSales = true;
        } else if (noTips) {
            baseline.noTips = true;
        }
    }

    if (baseline.mealPeriod === "Double") {
        reportAmountFields.forEach((field) => {
            baseline[field] = editing && Object.hasOwn(editing, field) && !capabilityForField(field, capabilities)
                ? editing[field]
                : capabilityForField(field, capabilities) ? 0 : "";
        });
        baseline.reports = Object.fromEntries(reportPeriods.map(([period]) => {
            const reportNode = getReportNode(period);
            const enabled = reportNode.querySelector("[data-report-toggle]").checked;
            if (!enabled) {
                return [period, null];
            }
            const existing = editing?.reports?.[period];
            const fieldCapabilities = {
                foodSales: capabilities.tracksSales,
                bawSales: capabilities.tracksSales,
                liquorSales: capabilities.tracksSales,
                naBevSales: capabilities.tracksSales,
                additionalSales: capabilities.tracksSales,
                ccTips: capabilities.receivesTips,
                cashTips: capabilities.receivesTips,
                autoGratuity: capabilities.receivesTips,
                tipsPaidOut: capabilities.tipsOut,
                tipOutReceived: capabilities.receivesTipOut,
            };
            const values = Object.fromEntries(reportAmountFields.map((field) => {
                const available = fieldCapabilities[field];
                const value = available
                    ? toNumber(reportNode.querySelector(`[data-report-field="${field}"]`).value)
                    : (existing && Object.hasOwn(existing, field) ? existing[field] : "");
                return [field, value];
            }));
            const oldNoSales = existing?.noSales === true;
            const oldNoTips = existing?.noTips === true;
            if (editing ? oldNoSales : !capabilities.tracksSales) {
                values.noSales = true;
            }
            if (editing ? oldNoTips : !hasTipFields) {
                values.noTips = true;
            }
            return [period, values];
        }));
    }

    return baseline;
}

function validateShift(shift) {
    const issues = [];

    if (!shift.date) {
        issues.push({ field: "date", message: "Date is required." });
        return issues;
    }

    const editing = getEditingShift();
    const legacyEdit = editing && !editing.workplaceId && !editing.roleId;
    if (isWorkplaceMode() && !legacyEdit) {
        const workplace = state.workplaces.workplaces.find((entry) => entry.id === shift.workplaceId);
        if (!workplace || workplace.archived) {
            issues.push({ field: "workplace", message: "Choose a workplace." });
            return issues;
        }
        const roleMatch = findRole(shift.roleId);
        if (getActiveRoles(workplace).length > 0
            && (!roleMatch || roleMatch.workplace.id !== workplace.id)) {
            issues.push({ field: "role", message: "Choose a role for this workplace." });
            return issues;
        }
    } else if (!shift.job) {
        issues.push({ field: "job", message: "Job is required." });
        return issues;
    }

    if (!shift.mealPeriod) issues.push({ field: "mealPeriod", message: "Meal period is required." });
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
    if (entryMode === "guided" && !getGuidedBreakAnswer()) {
        issues.push({ field: "hadBreak", message: "Choose whether you had a break." });
    }
    if (entryMode === "guided"
        && guidedStep.element?.id === "guided-sales-report-step"
        && !getGuidedReportAnswer("sales")) {
        issues.push({ field: "salesReport", message: "Choose whether you have a sales report." });
    }
    if (entryMode === "guided"
        && guidedStep.element?.id === "guided-tips-report-step"
        && !getGuidedReportAnswer("tips")) {
        issues.push({ field: "tipsReport", message: "Choose whether you have a tips report." });
    }
    if (getGuidedBreakAnswer() === "yes") {
        if (!shift.breakStart) {
            issues.push({ field: "breakStart", message: "Break start is required when you had a break." });
        }
        if (!shift.breakEnd) {
            issues.push({ field: "breakEnd", message: "Break end is required when you had a break." });
        }
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
        const errorId = getValidationErrorId(field, input);
        const error = document.getElementById(errorId);
        input.setAttribute("aria-invalid", "true");
        error.textContent = message;
        error.hidden = false;

        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${input.id}`;
        link.textContent = message;
        link.addEventListener("click", () => revealGuidedField(input));
        item.appendChild(link);
        list.appendChild(item);
    });

    summary.hidden = false;
    if (shouldFocus) {
        revealGuidedField(firstField);
        firstField.focus();
    }
}

function revealGuidedField(input) {
    if (entryMode !== "guided" || getEditingShift()) {
        return;
    }
    const step = getGuidedSteps().find((element) => element.contains(input));
    if (step) {
        guidedStep = { element: step, index: 0 };
        renderEntryMode();
    }
}

function getValidationErrorId(field, input) {
    if (field === "hadBreak") {
        return "shift-had-break-error";
    }
    if (field === "salesReport") {
        return "shift-sales-report-error";
    }
    if (field === "tipsReport") {
        return "shift-tips-report-error";
    }
    return `${input.id}-error`;
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
        showValidationErrors(filterIssuesToGuidedStep(validateShift(readFormValues())), false);
    }
}

function filterIssuesToGuidedStep(issues) {
    if (entryMode !== "guided" || getEditingShift() || guidedStep.review || !guidedStep.element) {
        return issues;
    }
    return issues.filter(({ field }) => guidedStep.element.contains(fields[field]));
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
        const errorId = getValidationErrorId(
            field === fields.hadBreak ? "hadBreak"
                : field === fields.salesReport ? "salesReport"
                    : field === fields.tipsReport ? "tipsReport" : "",
            field
        );
        const error = document.getElementById(errorId);
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
            : `${shift.job} · ${shift.mealPeriod}${getRecentReportNote(shift)}`;
        details.append(date, description);

        const metrics = document.createElement("div");
        metrics.className = "recent-metrics";
        metrics.hidden = !state.settings.dashboard.stats.sales && !state.settings.dashboard.stats.tips;
        [
            ["sales", "Sales", getSalesTotal(shift)],
            ["tips", "Net tips", getNetTips(shift)],
        ].filter(([key]) => state.settings.dashboard.stats[key]).forEach(([key, label, amount]) => {
            const metric = document.createElement("div");
            metric.className = "recent-metric";
            const metricLabel = document.createElement("small");
            metricLabel.textContent = label;
            const metricValue = document.createElement("strong");
            metricValue.textContent = formatReportAmount(shift, amount, key);
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
        fragment.appendChild(buildShiftCardNode(shift));
    });

    shiftList.replaceChildren(fragment);
}

function buildShiftCardNode(shift) {
    const cardNode = template.content.cloneNode(true);
    const card = cardNode.querySelector(".shift-card");
    card.dataset.shiftId = String(shift.id);
    const summary = cardNode.querySelector(".shift-summary");
    summary.dataset.shiftId = String(shift.id);
    const weekday = new Date(`${shift.date}T00:00:00`)
        .toLocaleDateString("en-US", { weekday: "short" });
    summary.querySelector(".summary-date").textContent = Number.isNaN(Date.parse(shift.date))
        ? formatDate(shift.date)
        : `${weekday}, ${formatDate(shift.date)}`;
    summary.querySelector(".summary-job").textContent = [shift.job, getWorkplaceName(shift.workplaceId)].filter(Boolean).join(" · ");
    summary.querySelector(".summary-meal").textContent = shift.mealPeriod;
    const summaryStatus = summary.querySelector(".summary-status");
    const summaryStatusText = getReportStatus(shift);
    summaryStatus.textContent = summaryStatusText;
    summaryStatus.hidden = !summaryStatusText;
    summary.querySelector(".summary-hours").textContent = formatDuration(getDurationMinutes(shift));
    summary.querySelector(".summary-sales").textContent = formatReportAmount(shift, getSalesTotal(shift), "sales");
    summary.querySelector(".summary-tips").textContent = formatReportAmount(shift, getNetTips(shift), "tips");
    summary.setAttribute("aria-label", `View shift details: ${summary.querySelector(".summary-date").textContent}, ${summary.querySelector(".summary-job").textContent}`);
    card.querySelector(".card-date").textContent = formatDate(shift.date);
    card.querySelector(".card-meal").textContent = shift.mealPeriod;
    const reportStatus = card.querySelector(".card-report-status");
    const reportStatusText = getReportStatus(shift);
    reportStatus.textContent = reportStatusText;
    reportStatus.hidden = !reportStatusText;
    card.querySelector(".card-job").textContent = [shift.job, getWorkplaceName(shift.workplaceId)].filter(Boolean).join(" · ");
    card.querySelector(".card-hours").textContent = formatDuration(getDurationMinutes(shift));
    card.querySelector(".card-sales").textContent = formatReportAmount(shift, getSalesTotal(shift), "sales");
    card.querySelector(".card-tips").textContent = formatReportAmount(shift, getNetTips(shift), "tips");
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
        notesEl.hidden = false;
    } else {
        notesEl.replaceChildren();
        notesEl.hidden = true;
    }
    return cardNode;
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
    const workplaceFilter = filterWorkplaceSelect.value;
    const sortMode = sortBySelect.value;

    return state.shifts
        .filter((shift) => (!fromDate || shift.date >= fromDate)
            && (!toDate || shift.date <= toDate)
            && (workplaceFilter === "all" || shift.workplaceId === workplaceFilter)
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
    filterWorkplaceSelect.value = "all";
    renderPreviousShifts();
}

function getWorkplaceName(workplaceId) {
    return workplaceId ? state.workplaces.workplaces.find((entry) => entry.id === workplaceId)?.name || "" : "";
}

function fillFilterSelect(select, allLabel, options) {
    const current = select.value;
    const entries = [["all", allLabel], ...options];
    if (current !== "all" && !entries.some(([value]) => value === current)) {
        entries.push([current, current]);
    }
    select.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
    select.value = current;
    if (select.value !== current) {
        select.value = "all";
    }
}

function populateFilterOptions() {
    const { workplaces } = state.workplaces;
    const used = new Set(state.shifts.map((shift) => shift.workplaceId).filter(Boolean));
    fillFilterSelect(
        filterWorkplaceSelect,
        "All workplaces",
        workplaces
            .filter((entry) => !entry.archived || used.has(entry.id))
            .map((entry) => [entry.id, entry.archived ? `${entry.name} (archived)` : entry.name])
    );

    const jobs = new Set(state.shifts.map((shift) => String(shift.job || "").trim()).filter(Boolean));
    workplaces.forEach((entry) => entry.roles.forEach((role) => {
        if (!role.archived) {
            jobs.add(role.name);
        }
    }));
    fillFilterSelect(filterJobSelect, "All jobs", [...jobs].sort((a, b) => a.localeCompare(b)).map((job) => [job, job]));
}

function updateFilterControls() {
    populateFilterOptions();
    const filters = [];
    if (filterWorkplaceSelect.value !== "all") {
        filters.push({
            label: `Workplace: ${filterWorkplaceSelect.selectedOptions[0].textContent}`,
            input: filterWorkplaceSelect,
            empty: "all",
        });
    }
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
        "Date", "Meal period", "Job", "Workplace", "Clock in", "Clock out", "Break start", "Break end",
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
            getWorkplaceName(shift.workplaceId),
            shift.clockIn,
            `${shift.clockOut}${isOvernightShift(shift) ? " (+1 day)" : ""}`,
            shift.breakStart,
            `${shift.breakEnd}${isOvernightBreak(shift) ? " (+1 day)" : ""}`,
            (getDurationMinutes(shift) / 60).toFixed(2),
            ...(isDouble ? Array(5).fill("") : [
                shift.foodSales, shift.bawSales, shift.liquorSales, shift.naBevSales, shift.additionalSales,
            ]),
            hasSalesReport(shift) ? getSalesTotal(shift) : "",
            ...(isDouble ? Array(5).fill("") : [
                shift.ccTips, shift.cashTips, Number(shift.autoGratuity) || 0, shift.tipsPaidOut, shift.tipOutReceived,
            ]),
            hasTipReport(shift) ? getNetTips(shift) : "",
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
        if (shift[field] === "") {
            normalized[field] = "";
            return;
        }
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
                if (report[field] === "") {
                    normalizedReport[field] = "";
                    return;
                }
                const amount = Number(report[field] ?? 0);
                if (!Number.isFinite(amount) || amount < 0) {
                    throw new Error(`Backup shift ${index + 1} has an invalid ${period} ${field} amount.`);
                }
                normalizedReport[field] = amount;
            });
            if (report.noSales === true) {
                normalizedReport.noSales = true;
            }
            if (report.noTips === true) {
                normalizedReport.noTips = true;
            }
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

    const single = shift.mealPeriod !== "Double";
    const noSales = single && (shift.noReport === true || shift.noSales === true);
    const noTips = single && (shift.noReport === true || shift.noTips === true);
    delete normalized.noReport;
    delete normalized.noSales;
    delete normalized.noTips;
    if (noSales && noTips) {
        normalized.noReport = true;
    } else if (noSales) {
        normalized.noSales = true;
    } else if (noTips) {
        normalized.noTips = true;
    }
    salesAmountFields.filter(() => noSales).concat(tipAmountFields.filter(() => noTips)).forEach((field) => {
        if (normalized[field] !== "") {
            normalized[field] = 0;
        }
    });

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
        actions.append(createActionButton(`Set dates for ${entry.name}`, "Dates", { ...data, action: "dates" }));
    } else {
        actions.append(createActionButton(`Edit settings for role ${entry.name}`, "Role settings", { ...data, action: "template" }));
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
    if (payPeriod.startDay) {
        const day = payPeriod.startDay[0].toUpperCase() + payPeriod.startDay.slice(1);
        return payPeriod.type === "biweekly"
            ? `Pay period: Every two weeks, starting ${day} (reference ${formatDate(payPeriod.anchorDate)})`
            : `Pay period: ${labels[payPeriod.type]}, starting ${day}`;
    }
    if (!payPeriod.anchorDate) {
        return `Pay period: ${labels[payPeriod.type]}`;
    }
    return `Pay period: ${labels[payPeriod.type]}, starting ${formatDate(payPeriod.anchorDate)}`;
}

function formatDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(0);
    date.setHours(0, 0, 0, 0);
    date.setFullYear(year, month - 1, day);
    return date
        .toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatWorkplaceDates(workplace) {
    if (!workplace.startDate && !workplace.endDate) {
        return "Workplace dates: not set";
    }
    return `Workplace dates: ${workplace.startDate ? formatDate(workplace.startDate) : "not set"} – ${workplace.endDate ? formatDate(workplace.endDate) : "ongoing"}`;
}

function formatTemplate(template, role, hourlyWage) {
    const parts = [template?.mealPeriod];
    if (template?.useTimes && (template.clockIn || template.clockOut)) {
        parts.push(`${template.clockIn || "?"}–${template.clockOut || "?"}`);
    }
    if (template?.useBreak && template.breakStart) {
        parts.push(`break ${template.breakStart}–${template.breakEnd}`);
    }
    if (template?.useTimes && !template.clockIn && !template.clockOut) {
        parts.push("default times enabled");
    }
    if (template?.useBreak && !template.breakStart) {
        parts.push("default break enabled");
    }
    const text = template ? `Template: ${parts.filter(Boolean).join(", ")}` : "No template";
    const details = [text];
    if (hourlyWage !== undefined) {
        details.push(`${formatCurrency(hourlyWage)}/hr`);
    }
    const capabilities = window.Workplaces.getRoleCapabilities(role);
    if (!window.Workplaces.roleHasReports(role)) {
        details.push("No sales or tip reports");
    } else {
        if (!capabilities.tracksSales) {
            details.push("No sales report");
        }
        if (!capabilities.receivesTips) {
            details.push("No earned tips");
        }
        if (!capabilities.tipsOut) {
            details.push("No tips paid out");
        }
        if (!capabilities.receivesTipOut) {
            details.push("No tip-out received");
        }
    }
    return details.join(" · ");
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
        roleItem.append(createItemActions("role", role), createItemSummary(formatTemplate(role.template, role, role.hourlyWage)));
        roles.append(roleItem);
    });

    item.append(head, summary, createItemSummary(formatWorkplaceDates(workplace)), roles, createActionButton(
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
    renderPreviousShifts();
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

function updateTemplateDefaultFields(event) {
    const useTimes = document.getElementById("template-use-times").checked;
    const useBreak = document.getElementById("template-use-break").checked;
    document.getElementById("template-time-fields").hidden = !useTimes;
    document.getElementById("template-break-fields").hidden = !useBreak;
    if (event?.target?.id === "template-use-times" && !useTimes) {
        ["template-clock-in", "template-clock-out"].forEach((id) => {
            document.getElementById(id).value = "";
        });
    }
    if (event?.target?.id === "template-use-break" && !useBreak) {
        ["template-break-start", "template-break-end"].forEach((id) => {
            document.getElementById(id).value = "";
        });
    }
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
    const useTimesInput = document.getElementById("template-use-times");
    const useBreakInput = document.getElementById("template-use-break");
    const capabilityInputs = {
        tracksSales: document.getElementById("template-tracks-sales"),
        receivesTips: document.getElementById("template-receives-tips"),
        tipsOut: document.getElementById("template-tips-out"),
        receivesTipOut: document.getElementById("template-receives-tip-out"),
    };
    const capabilities = window.Workplaces.getRoleCapabilities(role);
    const hourlyWageInput = document.getElementById("template-hourly-wage");
    return runFormDialog({
        dialog: document.getElementById("template-dialog"),
        form: document.getElementById("template-form"),
        cancelButton: document.getElementById("cancel-template"),
        onOpen: () => {
            document.getElementById("template-dialog-title").textContent = `Role settings for ${role.name}`;
            Object.entries(inputs).forEach(([key, input]) => {
                input.value = role.template?.[key] || "";
            });
            useTimesInput.checked = role.template?.useTimes ?? Boolean(role.template?.clockIn || role.template?.clockOut);
            useBreakInput.checked = role.template?.useBreak ?? Boolean(role.template?.breakStart || role.template?.breakEnd);
            updateTemplateDefaultFields();
            hourlyWageInput.value = role.hourlyWage === undefined ? "" : String(role.hourlyWage);
            hourlyWageInput.removeAttribute("aria-invalid");
            showDialogError(errorElement, "");
            Object.entries(capabilityInputs).forEach(([name, input]) => {
                input.checked = capabilities[name];
            });
            inputs.mealPeriod.focus();
        },
        onSubmit: () => {
            const value = Object.fromEntries([
                ...Object.entries(inputs).map(([key, input]) => [key, input.value]),
                ["useTimes", useTimesInput.checked],
                ["useBreak", useBreakInput.checked],
            ]);
            const check = window.Workplaces.setTemplate(structuredClone(state.workplaces), role.id, value);
            if (check.error) {
                showDialogError(errorElement, check.error);
                return undefined;
            }
            const wageCheck = window.Workplaces.setHourlyWage(
                structuredClone(state.workplaces),
                role.id,
                hourlyWageInput.value
            );
            if (wageCheck.error) {
                showDialogError(errorElement, wageCheck.error);
                hourlyWageInput.setAttribute("aria-invalid", "true");
                hourlyWageInput.focus();
                return undefined;
            }
            return {
                value: Object.values(value).some(Boolean) ? value : null,
                capabilities: Object.fromEntries(Object.entries(capabilityInputs).map(([name, input]) => [
                    name,
                    input.checked,
                ])),
                hourlyWage: hourlyWageInput.value === "" ? null : Number(hourlyWageInput.value),
            };
        },
    });
}

function askForPayPeriod(workplace) {
    const typeInput = document.getElementById("pay-period-type");
    const startDayInput = document.getElementById("pay-period-start-day");
    const startDayField = document.getElementById("pay-period-start-day-field");
    const anchorInput = document.getElementById("pay-period-anchor");
    const anchorField = document.getElementById("pay-period-anchor-field");
    const errorElement = document.getElementById("pay-period-error");
    return runFormDialog({
        dialog: document.getElementById("pay-period-dialog"),
        form: document.getElementById("pay-period-form"),
        cancelButton: document.getElementById("cancel-pay-period"),
        onOpen: () => {
            document.getElementById("pay-period-dialog-title").textContent = `Pay period for ${workplace.name}`;
            typeInput.value = workplace.payPeriod?.type || "";
            startDayInput.value = workplace.payPeriod?.startDay || state.settings.weekStartsOn;
            anchorInput.value = workplace.payPeriod?.anchorDate || "";
            updatePayPeriodFields(typeInput, startDayField, anchorField);
            showDialogError(errorElement, "");
            [typeInput, startDayInput, anchorInput].forEach((input) => input.removeAttribute("aria-invalid"));
            typeInput.focus();
        },
        onSubmit: () => {
            const value = typeInput.value
                ? {
                    type: typeInput.value,
                    startDay: startDayInput.value,
                    ...(typeInput.value === "biweekly" ? { anchorDate: anchorInput.value } : {}),
                }
                : null;
            const check = window.Workplaces.setPayPeriod(structuredClone(state.workplaces), workplace.id, value);
            if (check.error) {
                showDialogError(errorElement, check.error);
                if (typeInput.value === "biweekly") {
                    anchorInput.setAttribute("aria-invalid", "true");
                    anchorInput.focus();
                } else {
                    startDayInput.setAttribute("aria-invalid", "true");
                    startDayInput.focus();
                }
                return undefined;
            }
            return { value };
        },
    });
}

function updatePayPeriodFields(
    typeInput = document.getElementById("pay-period-type"),
    startDayField = document.getElementById("pay-period-start-day-field"),
    anchorField = document.getElementById("pay-period-anchor-field")
) {
    const needsStartDay = ["weekly", "biweekly"].includes(typeInput.value);
    startDayField.hidden = !needsStartDay;
    anchorField.hidden = typeInput.value !== "biweekly";
}

function updateSetupPayPeriodFields() {
    const needsStartDay = ["weekly", "biweekly"].includes(setupPayPeriodType.value);
    setupPayPeriodStartDayField.hidden = !needsStartDay;
    setupPayPeriodAnchorField.hidden = setupPayPeriodType.value !== "biweekly";
}

function askForWorkplaceDates(workplace) {
    const startDateInput = document.getElementById("workplace-start-date");
    const endDateInput = document.getElementById("workplace-end-date");
    const errorElement = document.getElementById("workplace-dates-error");
    return runFormDialog({
        dialog: document.getElementById("workplace-dates-dialog"),
        form: document.getElementById("workplace-dates-form"),
        cancelButton: document.getElementById("cancel-workplace-dates"),
        onOpen: () => {
            document.getElementById("workplace-dates-title").textContent = `Dates for ${workplace.name}`;
            startDateInput.value = workplace.startDate || "";
            endDateInput.value = workplace.endDate || "";
            showDialogError(errorElement, "");
            [startDateInput, endDateInput].forEach((input) => input.removeAttribute("aria-invalid"));
            startDateInput.focus();
        },
        onSubmit: () => {
            const value = { startDate: startDateInput.value, endDate: endDateInput.value };
            const check = window.Workplaces.setDates(structuredClone(state.workplaces), workplace.id, value);
            if (check.error) {
                showDialogError(errorElement, check.error);
                endDateInput.setAttribute("aria-invalid", "true");
                endDateInput.focus();
                return undefined;
            }
            return { value };
        },
    });
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
        const added = await askForRoles(entry);
        if (added === null) {
            button.focus();
            return;
        }
        result = commitWorkplaces((draft) => {
            let last = {};
            for (const name of added.names) {
                last = window.Workplaces.addRole(draft, id, name);
                if (last.error) {
                    return last;
                }
            }
            return last;
        });
        message = added.names.length === 1
            ? `Added role “${added.names[0]}” to ${entry.name}.`
            : `Added ${added.names.length} roles to ${entry.name}.`;
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
        const roleSettings = await askForTemplate(entry);
        if (roleSettings === null) {
            button.focus();
            return;
        }
        result = commitWorkplaces((draft) => {
            const saved = window.Workplaces.setTemplate(draft, id, roleSettings.value);
            if (saved.error) {
                return saved;
            }
            const wage = window.Workplaces.setHourlyWage(draft, id, roleSettings.hourlyWage);
            return wage.error ? wage : window.Workplaces.setRoleCapabilities(draft, id, roleSettings.capabilities);
        });
        message = `Saved role settings for ${entry.name}.`;
    } else if (action === "pay-period") {
        const payPeriod = await askForPayPeriod(entry);
        if (payPeriod === null) {
            button.focus();
            return;
        }
        result = commitWorkplaces((draft) => window.Workplaces.setPayPeriod(draft, id, payPeriod.value));
        message = `Saved the pay period for ${entry.name}.`;
    } else if (action === "dates") {
        const dates = await askForWorkplaceDates(entry);
        if (dates === null) {
            button.focus();
            return;
        }
        result = commitWorkplaces((draft) => window.Workplaces.setDates(draft, id, dates.value));
        message = `Saved dates for ${entry.name}.`;
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

function openWorkplaceSetup(options) {
    if (setupDialog.open) {
        return;
    }
    const firstRun = options?.firstRun === true;
    setupFirstRun = firstRun;
    setupReturnToShift = options?.returnToShift === true;
    document.getElementById("skip-workplace-setup").textContent = firstRun ? "Skip for now" : "Cancel";
    document.getElementById("workplace-setup-title").textContent = firstRun ? "Set up your workplace" : "Add a workplace";
    document.getElementById("workplace-setup-text").textContent = firstRun
        ? "Tell Shift Ledger where you work and choose its pay period so shifts can be grouped by workplace and role. You can change these later in Settings, or skip setup for now."
        : "Add a workplace, choose its pay period, and add any roles you have there. You can change these later in Settings.";
    document.getElementById("save-workplace-setup").textContent = firstRun ? "Save and continue" : "Add workplace";
    const jobs = firstRun ? window.Workplaces.distinctJobs(state.shifts) : [];
    setupSaved = false;
    setupWorkplaceName.value = "";
    setupPayPeriodType.value = "";
    setupPayPeriodStartDay.value = state.settings.weekStartsOn;
    setupPayPeriodAnchor.value = "";
    setupWorkplaceStartDate.value = "";
    setupWorkplaceEndDate.value = "";
    updateSetupPayPeriodFields();
    showFieldError(setupPayPeriodType, setupPayPeriodError, "");
    setupPayPeriodAnchor.removeAttribute("aria-invalid");
    showDialogError(setupWorkplaceDatesError, "");
    fillRoleList(setupRoles, jobs);
    document.getElementById("setup-roles-hint").textContent = firstRun && jobs.length
        ? "These came from your saved shifts, and shifts with matching jobs will be linked to them. Press Enter for the next role."
        : "Add each role you work, for example Server or Bartender. Press Enter for the next role. You can add more later.";
    showFieldError(setupWorkplaceName, document.getElementById("setup-workplace-error"), "");
    document.getElementById("setup-roles-error").hidden = true;
    setupDialog.showModal();
    setupWorkplaceName.focus();
}

function addRoleRow(list, value = "", { focus = false, after = null } = {}) {
    const row = document.createElement("li");
    row.className = "note-row";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "note-input";
    input.value = value;
    input.maxLength = window.Workplaces.MAX_NAME_LENGTH;
    input.autocomplete = "off";
    input.placeholder = "Add a role";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost-button note-remove";
    remove.textContent = "✕";
    row.append(input, remove);
    if (after) {
        after.after(row);
    } else {
        list.appendChild(row);
    }
    labelRoleRows(list);
    if (focus) {
        input.focus();
    }
}

function labelRoleRows(list) {
    list.querySelectorAll(".note-row").forEach((row, index) => {
        row.querySelector(".note-input").setAttribute("aria-label", `Role ${index + 1}`);
        row.querySelector(".note-remove").setAttribute("aria-label", `Remove role ${index + 1}`);
    });
}

function removeRoleRow(list, row, { focusPrevious = false } = {}) {
    const rows = [...list.querySelectorAll(".note-row")];
    if (rows.length === 1) {
        const input = row.querySelector(".note-input");
        input.value = "";
        input.focus();
        return;
    }
    const index = rows.indexOf(row);
    const neighbor = (focusPrevious || index === rows.length - 1 ? rows[index - 1] : rows[index + 1]) || rows[index + 1] || rows[index - 1];
    row.remove();
    labelRoleRows(list);
    neighbor.querySelector(".note-input").focus();
}

function wireRoleList(list, addButton) {
    addButton.addEventListener("click", () => {
        const blank = [...list.querySelectorAll(".note-input")].find((input) => input.value.trim() === "");
        if (blank) {
            blank.focus();
        } else {
            addRoleRow(list, "", { focus: true });
        }
    });
    list.addEventListener("click", (event) => {
        const button = event.target.closest(".note-remove");
        if (button) {
            removeRoleRow(list, button.closest(".note-row"));
        }
    });
    list.addEventListener("keydown", (event) => {
        const input = event.target;
        if (!input.classList.contains("note-input")) {
            return;
        }
        const row = input.closest(".note-row");
        if (event.key === "Enter" && !event.isComposing) {
            event.preventDefault();
            if (input.value.trim() !== "") {
                addRoleRow(list, "", { focus: true, after: row });
            }
        } else if (event.key === "Backspace" && input.value === "" && list.children.length > 1) {
            event.preventDefault();
            removeRoleRow(list, row, { focusPrevious: true });
        }
    });
}

function fillRoleList(list, values) {
    list.replaceChildren();
    (values.length > 0 ? values : [""]).forEach((value) => addRoleRow(list, value));
}

function readRoleList(list) {
    return [...list.querySelectorAll(".note-input")].map((input) => input.value);
}

function askForRoles(workplace) {
    const list = document.getElementById("add-roles-list");
    const errorElement = document.getElementById("add-roles-error");
    return runFormDialog({
        dialog: document.getElementById("add-roles-dialog"),
        form: document.getElementById("add-roles-form"),
        cancelButton: document.getElementById("cancel-add-roles"),
        onOpen: () => {
            document.getElementById("add-roles-title").textContent = `Add roles to ${workplace.name}`;
            fillRoleList(list, []);
            showDialogError(errorElement, "");
            list.querySelector(".note-input").focus();
        },
        onSubmit: () => {
            const parsed = window.Workplaces.parseRoleNames(readRoleList(list).join("\n"));
            const taken = parsed.names
                .map((name) => window.Workplaces.validateName(name, workplace.roles, "role"))
                .find(Boolean);
            const error = parsed.error || taken || (parsed.names.length === 0 ? "Enter at least one role." : "");
            if (error) {
                showDialogError(errorElement, error);
                return undefined;
            }
            return { names: parsed.names };
        },
    });
}

function handleSetupClose() {
    if (!setupFirstRun || setupSaved || state.workplaces.setupDismissed) {
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
    const returnToShift = setupReturnToShift;
    const nameProblem = window.Workplaces.validateName(setupWorkplaceName.value, state.workplaces.workplaces, "workplace");
    const roleInputs = [...setupRoles.querySelectorAll(".note-input")];
    const roles = window.Workplaces.parseRoleNames(roleInputs.map((input) => input.value).join("\n"));
    showFieldError(setupWorkplaceName, document.getElementById("setup-workplace-error"), nameProblem);
    const rolesError = document.getElementById("setup-roles-error");
    rolesError.textContent = roles.error;
    rolesError.hidden = !roles.error;
    showFieldError(setupPayPeriodType, setupPayPeriodError, "");
    setupPayPeriodAnchor.removeAttribute("aria-invalid");
    showDialogError(setupWorkplaceDatesError, "");
    setupWorkplaceStartDate.removeAttribute("aria-invalid");
    setupWorkplaceEndDate.removeAttribute("aria-invalid");
    if (nameProblem || roles.error) {
        (nameProblem ? setupWorkplaceName : roleInputs[0]).focus();
        return;
    }

    const draft = structuredClone(state.workplaces);
    const { item: workplace } = window.Workplaces.addWorkplace(draft, setupWorkplaceName.value);
    const payPeriod = setupPayPeriodType.value
        ? {
            type: setupPayPeriodType.value,
            startDay: setupPayPeriodStartDay.value,
            ...(setupPayPeriodType.value === "biweekly" ? { anchorDate: setupPayPeriodAnchor.value } : {}),
        }
        : null;
    const payPeriodResult = window.Workplaces.setPayPeriod(draft, workplace.id, payPeriod);
    if (payPeriodResult.error) {
        showFieldError(setupPayPeriodType, setupPayPeriodError, payPeriodResult.error);
        if (["weekly", "biweekly"].includes(setupPayPeriodType.value)) {
            setupPayPeriodAnchor.setAttribute("aria-invalid", "true");
            setupPayPeriodAnchor.focus();
        } else {
            setupPayPeriodType.focus();
        }
        return;
    }
    const workplaceDates = {
        startDate: setupWorkplaceStartDate.value,
        endDate: setupWorkplaceEndDate.value,
    };
    const datesResult = window.Workplaces.setDates(draft, workplace.id, workplaceDates);
    if (datesResult.error) {
        showDialogError(setupWorkplaceDatesError, datesResult.error);
        setupWorkplaceEndDate.setAttribute("aria-invalid", "true");
        setupWorkplaceEndDate.focus();
        return;
    }
    roles.names.forEach((name) => window.Workplaces.addRole(draft, workplace.id, name));
    draft.setupDismissed = true;
    if (!persistWorkplaces(draft)) {
        return;
    }
    state.workplaces = draft;
    setupSaved = true;

    let linkedCount = 0;
    let linkProblem = false;
    if (setupFirstRun) {
        // Link existing shifts only after keeping an untouched copy of the originals.
        const { shifts: linked, changed } = window.Workplaces.linkShifts(state.shifts, workplace);
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
    }

    setupDialog.close();
    renderWorkplaces(returnToShift ? null : "h3");
    if (returnToShift && state.currentView === "new-shift") {
        fields.workplace.value = workplace.id;
        fields.workplace.dataset.previousValue = workplace.id;
        renderRoleOptions();
        const role = workplace.roles.find((entry) => !entry.archived);
        if (role) {
            fields.role.value = role.id;
            fields.role.dispatchEvent(new Event("change", { bubbles: true }));
            fields.role.focus();
        } else {
            fields.workplace.focus();
        }
    }
    setupReturnToShift = false;
    const roleCount = roles.names.length;
    const status = [
        `${setupFirstRun ? "Created" : "Added"} workplace “${workplace.name}”${roleCount ? ` with ${roleCount} ${roleCount === 1 ? "role" : "roles"}` : ""}.`,
        linkedCount ? `Linked ${linkedCount} saved ${linkedCount === 1 ? "shift" : "shifts"} to its roles.` : "",
        linkProblem ? "Your saved shifts could not be linked, so they were left unchanged." : "",
    ].filter(Boolean).join(" ");
    setStatus(status, linkProblem);
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
    // Clear existing reports (in case this is re-initialized)
    doubleReportList.innerHTML = "";
    
    // Build report nodes for each period
    reportPeriods.forEach(([period, label]) => {
        const reportNode = doubleReportTemplate.content.firstElementChild.cloneNode(true);
        reportNode.dataset.reportPeriod = period;
        reportNode.querySelector("[data-report-label]").textContent = label;
        doubleReportList.appendChild(reportNode);
    });
    updateMealPeriodFields();
}

function selectedRoleCapabilities() {
    const role = findRole(fields.role.value)?.role;
    return window.Workplaces.getRoleCapabilities(role);
}

function capabilityForField(field, capabilities) {
    if (salesAmountFields.includes(field)) {
        return capabilities.tracksSales;
    }
    if (["ccTips", "cashTips", "autoGratuity"].includes(field)) {
        return capabilities.receivesTips;
    }
    if (field === "tipsPaidOut") {
        return capabilities.tipsOut;
    }
    if (field === "tipOutReceived") {
        return capabilities.receivesTipOut;
    }
    return true;
}

function updateMealPeriodFields() {
    const isDouble = fields.mealPeriod.value === "Double";
    const capabilities = selectedRoleCapabilities();
    const hasTipFields = capabilities.receivesTips || capabilities.tipsOut || capabilities.receivesTipOut;
    const hasReports = capabilities.tracksSales || hasTipFields;
    document.querySelectorAll("[data-role-capability]").forEach((element) => {
        const capability = element.dataset.roleCapability;
        const enabled = capability === "tipReport"
            ? hasTipFields
            : capability === "tipOut"
                ? capabilities.tipsOut || capabilities.receivesTipOut
                : capabilities[capability];
        element.hidden = !enabled;
    });
    const note = document.getElementById("role-no-reports-note");
    note.hidden = hasReports;
    note.textContent = "This role has no report or tip fields enabled. This shift is saved without a report.";
    document.getElementById("single-report-fields").hidden = isDouble || !hasReports;
    [
        ["shift-no-sales-report", "sales"],
        ["shift-no-tips-report", "tips"],
    ].forEach(([toggleId, kind]) => {
        const missing = document.getElementById(toggleId).checked;
        document.querySelectorAll(`[data-report-inputs="${kind}"] input[type="number"]`).forEach((input) => {
            input.disabled = missing;
        });
    });
    updateGuidedSalesReport();
    document.getElementById("double-report-fields").hidden = !isDouble || !hasReports;
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

function updateInferredReports() {
    const reports = {};
    reportPeriods.forEach(([period]) => {
        const reportNode = getReportNode(period);
        const toggle = reportNode.querySelector("[data-report-toggle]");
        const fieldset = reportNode.querySelector("[data-report-fields]");
        
        if (!toggle.checked || (fieldset && fieldset.disabled)) {
            reports[period] = null;
            return;
        }
        
        const values = {};
        reportAmountFields.forEach((field) => {
            const input = reportNode.querySelector(`[data-report-field="${field}"]`);
            values[field] = toNumber(input.value);
        });
        reports[period] = values;
    });

    const inferred = inferMissingReport(reports);
    
    reportPeriods.forEach(([period]) => {
        const reportNode = getReportNode(period);
        const toggle = reportNode.querySelector("[data-report-toggle]");
        const fieldset = reportNode.querySelector("[data-report-fields]");
        
        if (inferred && inferred.period === period) {
            toggle.checked = true;
            toggle.disabled = true;
            toggle.title = "Inferred from other reports";
            if (fieldset) {
                fieldset.disabled = false;
            }
            reportAmountFields.forEach((field) => {
                const input = reportNode.querySelector(`[data-report-field="${field}"]`);
                input.value = formatInputAmount(inferred.report[field]);
                input.disabled = true;
                input.title = "Calculated from other reports";
            });
        } else {
            if (toggle.disabled) {
                toggle.checked = false;
                toggle.disabled = false;
                toggle.title = "";
                if (fieldset) {
                    fieldset.disabled = true;
                }
                reportAmountFields.forEach((field) => {
                    const input = reportNode.querySelector(`[data-report-field="${field}"]`);
                    input.value = "0.00";
                    input.disabled = false;
                    input.title = "";
                });
            }
        }
    });
}

function handleDoubleReportToggle(event) {
    if (!event.target.matches("[data-report-toggle]")) {
        return;
    }
    setReportInputsEnabled(event.target.closest(".double-report"), event.target.checked);
    updateInferredReports();
}

function getRecentReportNote(shift) {
    const status = getReportStatus(shift);
    return status ? ` · ${status === "No sales or tip report" ? "No report" : status}` : "";
}

function getReportStatus(shift) {
    if (shift.mealPeriod === "Double") {
        return getDoubleReportStatus(shift);
    }
    const hasSales = hasSalesReport(shift);
    const hasTips = hasTipReport(shift);
    if (!hasSales && !hasTips) {
        return "No sales or tip report";
    }
    if (!hasSales) {
        return "No sales report";
    }
    return hasTips ? "" : "No tip report";
}

function formatReportAmount(shift, amount, kind) {
    const covered = kind === "sales" ? hasSalesReport(shift) : hasTipReport(shift);
    return covered ? formatCurrency(amount) : "No report";
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

function formatInputAmount(value) {
    return value === "" ? "" : Number(value || 0).toFixed(2);
}
