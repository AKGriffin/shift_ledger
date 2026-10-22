const STORAGE_KEY = "shift-ledger-shifts-v1";
const { getDurationMinutes, getNetTips, getSalesTotal } = window.ShiftMath;

const state = {
    shifts: loadShifts(),
    currentView: "dashboard",
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
const historyStatus = document.getElementById("history-status");
const weekSummary = document.getElementById("week-summary");
const monthSummary = document.getElementById("month-summary");
const weekDateRange = document.getElementById("week-date-range");
const monthDateRange = document.getElementById("month-date-range");

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
    tipOutPaid: document.getElementById("shift-tip-out-paid"),
    tipOutReceived: document.getElementById("shift-tip-out-received"),
    notes: document.getElementById("shift-notes"),
};

const statEls = {
    totalShifts: document.getElementById("summary-total-shifts"),
    totalHours: document.getElementById("summary-total-hours"),
    totalSales: document.getElementById("summary-total-sales"),
    totalTips: document.getElementById("summary-total-tips"),
};

const recentShiftsEl = document.getElementById("recent-shifts");
const template = document.getElementById("shift-card-template");

bindEvents();
renderDashboard();
renderPreviousShifts();
showView("dashboard");
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
        button.addEventListener("click", () => {
            showView(button.dataset.view);
        });
    });

    form.addEventListener("submit", handleFormSubmit);
    clearFormButton.addEventListener("click", resetForm);
    cancelFormButton.addEventListener("click", () => {
        resetForm();
        showView("dashboard");
    });
    sortBySelect.addEventListener("change", renderPreviousShifts);
    filterJobSelect.addEventListener("change", renderPreviousShifts);
    filterDateFrom.addEventListener("change", renderPreviousShifts);
    filterDateTo.addEventListener("change", renderPreviousShifts);
    document.getElementById("clear-filters").addEventListener("click", clearHistoryFilters);
    document.getElementById("export-csv").addEventListener("click", exportFilteredShifts);
    shiftList.addEventListener("click", handleListAction);
}

function showView(viewName) {
    state.currentView = viewName;

    document.querySelectorAll(".view").forEach((section) => {
        const visible = section.id === viewName;
        section.classList.toggle("is-visible", visible);
        section.classList.toggle("is-hidden", !visible);
        section.hidden = !visible;
    });
}

function handleListAction(event) {
    const button = event.target.closest("button");
    if (!button) {
        return;
    }

    const card = button.closest(".shift-card");
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

function resetForm(shouldClearStatus = true) {
    form.reset();
    state.editingShiftId = null;
    formTitle.textContent = "New Shift";
    Object.values(fields).forEach((field) => {
        if (field.tagName === "INPUT" || field.tagName === "TEXTAREA") {
            field.value = field.defaultValue || "";
        }
    });

    if (shouldClearStatus) {
        setStatus("");
    }
}

function populateForm(shift) {
    state.editingShiftId = shift.id;
    fields.date.value = shift.date || "";
    fields.mealPeriod.value = shift.mealPeriod || "";
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
    fields.tipOutPaid.value = Number(shift.tipsPaidOut || 0).toFixed(2);
    fields.tipOutReceived.value = Number(shift.tipOutReceived || 0).toFixed(2);
    fields.notes.value = shift.notes || "";
}

function handleFormSubmit(event) {
    event.preventDefault();

    try {
        const shift = readFormValues();
        validateShift(shift);

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
        tipsPaidOut: toNumber(fields.tipOutPaid.value),
        tipOutReceived: toNumber(fields.tipOutReceived.value),
        notes: fields.notes.value.trim(),
    };

    return baseline;
}

function validateShift(shift) {
    const issues = [];

    if (!shift.date) issues.push("Date is required.");
    if (!shift.mealPeriod) issues.push("Meal period is required.");
    if (!shift.job) issues.push("Job is required.");
    if (!shift.clockIn || !shift.clockOut) issues.push("Clock in and clock out are required.");

    if (shift.clockIn && shift.clockOut && toMinutes(shift.clockOut) <= toMinutes(shift.clockIn)) {
        issues.push("Clock out must be later than clock in.");
    }

    if (shift.breakStart && !shift.breakEnd) issues.push("Break end is required when a break starts.");
    if (shift.breakEnd && !shift.breakStart) issues.push("Break start is required when a break ends.");

    if (shift.breakStart && shift.breakEnd) {
        const breakStartMinutes = toMinutes(shift.breakStart);
        const breakEndMinutes = toMinutes(shift.breakEnd);

        if (breakEndMinutes <= breakStartMinutes) {
            issues.push("Break end must be later than break start.");
        }

        const shiftMinutes = Math.max(0, toMinutes(shift.clockOut) - toMinutes(shift.clockIn));
        if (breakEndMinutes - breakStartMinutes > shiftMinutes) {
            issues.push("Break length cannot exceed the total shift length.");
        }
    }

    if (issues.length > 0) {
        throw new Error(issues.join(" "));
    }
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
        description.textContent = `${shift.job} · ${shift.mealPeriod}`;
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
        card.querySelector(".card-title").textContent = `${shift.job} shift`;
        card.querySelector(".card-meal").textContent = shift.mealPeriod;
        card.querySelector(".card-job").textContent = shift.job;
        card.querySelector(".card-hours").textContent = formatDuration(getDurationMinutes(shift));
        card.querySelector(".card-sales").textContent = formatCurrency(getSalesTotal(shift));
        card.querySelector(".card-tips").textContent = formatCurrency(getNetTips(shift));
        card.querySelector(".card-clock-in").textContent = formatTime(shift.clockIn);
        card.querySelector(".card-clock-out").textContent = formatTime(shift.clockOut);
        card.querySelector(".card-break").textContent = shift.breakStart && shift.breakEnd
            ? `${formatTime(shift.breakStart)} - ${formatTime(shift.breakEnd)}`
            : "None";
        card.querySelector(".card-notes").textContent = shift.notes ? shift.notes : "No notes recorded.";
        fragment.appendChild(cardNode);
    });

    shiftList.replaceChildren(fragment);
}

function renderPeriodSummaries() {
    const today = new Date();
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayFromMonday = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - dayFromMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const weekFrom = toLocalDateString(weekStart);
    const weekTo = toLocalDateString(weekEnd);
    const monthFrom = toLocalDateString(monthStart);
    const monthTo = toLocalDateString(monthEnd);

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
    sortBySelect.value = "date-desc";
    renderPreviousShifts();
}

function exportFilteredShifts() {
    if (filterDateFrom.value && filterDateTo.value && filterDateFrom.value > filterDateTo.value) {
        setStatus("Choose a valid date range before exporting.", true);
        return;
    }

    const shifts = getFilteredShifts();
    if (shifts.length === 0) {
        setStatus("There are no shifts in the current filter to export.", true);
        return;
    }

    const headers = [
        "Date", "Meal period", "Job", "Clock in", "Clock out", "Break start", "Break end",
        "Hours worked", "Food sales", "Beer and wine sales", "Liquor sales", "NA beverage sales",
        "Additional sales", "Total sales", "CC tips", "Cash tips", "Tips paid out",
        "Tip out received", "Net tips", "Notes",
    ];
    const rows = shifts.map((shift) => [
        shift.date,
        shift.mealPeriod,
        shift.job,
        shift.clockIn,
        shift.clockOut,
        shift.breakStart,
        shift.breakEnd,
        (getDurationMinutes(shift) / 60).toFixed(2),
        shift.foodSales,
        shift.bawSales,
        shift.liquorSales,
        shift.naBevSales,
        shift.additionalSales,
        getSalesTotal(shift),
        shift.ccTips,
        shift.cashTips,
        shift.tipsPaidOut,
        shift.tipOutReceived,
        getNetTips(shift),
        shift.notes,
    ]);
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

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
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

function toNumber(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}
