const STORAGE_KEY = "shift-ledger-shifts-v1";

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

    const recent = [...state.shifts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

    if (recent.length === 0) {
        recentShiftsEl.innerHTML = "<p class=\"empty-state\">No shifts logged yet. Add your first shift to get started.</p>";
        return;
    }

    recentShiftsEl.innerHTML = recent.map((shift) => {
        const shiftDate = formatDate(shift.date);
        return `
            <div class="recent-item">
                <div>
                    <strong>${shiftDate}</strong>
                    <span>${shift.job} • ${shift.mealPeriod}</span>
                </div>
                <div class="recent-metrics">
                    <span>${formatCurrency(getSalesTotal(shift))}</span>
                    <span>${formatCurrency(getNetTips(shift))}</span>
                </div>
            </div>
        `;
    }).join("");
}

function renderPreviousShifts() {
    const sortMode = sortBySelect.value;
    const jobFilter = filterJobSelect.value;

    const filtered = state.shifts.filter((shift) => {
        if (jobFilter === "all") {
            return true;
        }
        return shift.job === jobFilter;
    });

    const sorted = [...filtered].sort((a, b) => {
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

    if (sorted.length === 0) {
        shiftList.innerHTML = "<p class=\"empty-state\">No shifts match the current filters.</p>";
        return;
    }

    const fragment = document.createDocumentFragment();

    sorted.forEach((shift) => {
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

    shiftList.innerHTML = "";
    shiftList.appendChild(fragment);
}

function getSalesTotal(shift) {
    return round(
        (Number(shift.foodSales) || 0)
        + (Number(shift.bawSales) || 0)
        + (Number(shift.liquorSales) || 0)
        + (Number(shift.naBevSales) || 0)
        + (Number(shift.additionalSales) || 0)
    );
}

function getNetTips(shift) {
    return round(
        (Number(shift.ccTips) || 0)
        + (Number(shift.cashTips) || 0)
        + (Number(shift.tipOutReceived) || 0)
        - (Number(shift.tipsPaidOut) || 0)
    );
}

function getDurationMinutes(shift) {
    if (!shift.clockIn || !shift.clockOut) {
        return 0;
    }

    const startMinutes = toMinutes(shift.clockIn);
    const endMinutes = toMinutes(shift.clockOut);
    let breakMinutes = 0;

    if (shift.breakStart && shift.breakEnd) {
        breakMinutes = Math.max(0, toMinutes(shift.breakEnd) - toMinutes(shift.breakStart));
    }

    return Math.max(0, endMinutes - startMinutes - breakMinutes);
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

function toMinutes(timeValue) {
    if (!timeValue) {
        return 0;
    }

    const [hours, minutes] = timeValue.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
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

function round(value) {
    return Number(value.toFixed(2));
}
