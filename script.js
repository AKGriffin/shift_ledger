// DOM references

const buttonMenuNewShift = document.getElementById("menu-new-shift");
const buttonMenuPreviousShifts = document.getElementById("menu-previous-shifts");
const buttonMenuSettings = document.getElementById("menu-settings");
const buttonMenu = document.getElementById("button-menu");
const buttonMenuClose = document.getElementById("button-menu-close");

const buttonSettingsClose = document.getElementById("settings-button-close");
const buttonSettingsSave = document.getElementById("settings-button-save");
const buttonSettingsDefault = document.getElementById("settings-button-default");
const buttonSettingsClear = document.getElementById("settings-button-clear");
const buttonSettingsManageData = document.getElementById("settings-button-manage-data");

const buttonReviewEdit = document.getElementById("review-button-edit");
const buttonReviewConfirm = document.getElementById("review-button-confirm");
const buttonReviewCancel = document.getElementById("review-button-cancel");

// const buttonManageDataImport = document.getElementById("manage-data-button-import-data");
// const buttonImportData = document.getElementById("settings-button-import-data");
// const buttonExportData = document.getElementById("settings-button-export-data");
// const buttonClearData = document.getElementById("settings-button-clear-data");
// const buttonImportPasteText = document.getElementById("dialog-import-button-paste-text");
// const buttonImportUploadFile = document.getElementById("dialog-import-button-upload-file");
// const buttonImportCancel = document.getElementById("dialog-import-button-cancel");
// const buttonImportConfirm = document.getElementById("dialog-import-confirm");
// const buttonImportBack = document.getElementById("dialog-import-back");
// const buttonImportTextConfirm = document.getElementById("dialog-import-text-confirm");
// const buttonImportTextCancel = document.getElementById("dialog-import-text-cancel");
// const buttonImportTextClear = document.getElementById("dialog-import-button-clear-paste");
// const buttonImportFileConfirm = document.getElementById("dialog-import-button-confirm-file");
// const buttonImportFileCancel = document.getElementById("dialog-import-button-cancel-file");
// const buttonImportFileClear = document.getElementById("dialog-import-button-clear-file");

// const textAreaImportPaste = document.getElementById("dialog-import-textarea-paste");

// const buttonExportConfirm = document.getElementById("dialog-export-button-confirm");
// const buttonExportCancel = document.getElementById("dialog-export-button-cancel");

const previousShiftsText = document.getElementById("previous-shifts-text");
const appHeader = document.getElementById("app-header");
const sectionNewShift = document.getElementById("section-new-shift");
const sectionPreviousShifts = document.getElementById("section-previous-shifts");
const sectionSettings = document.getElementById("section-settings");
const sectionReviewNewShift = document.getElementById("section-review-new-shift");
const sectionManageData = document.getElementById("section-manage-data");

// const dialogImportData = document.getElementById("dialog-import-data");

const buttonSaveShift = document.getElementById("form-save");
const buttonCancelShift = document.getElementById("form-cancel");
const buttonClearShift = document.getElementById("form-clear");

const reviewNewShiftSection = document.getElementById("section-review-new-shift");

const newShiftForm = document.getElementById("form-new-shift");
const newShiftDateInput = document.getElementById("form-date");
const newShiftMealPeriodInput = document.getElementById("form-meal-period");
const newShiftJobInput = document.getElementById("form-job");
const newShiftClockInInput = document.getElementById("form-clock-in-time");
const newShiftClockOutInput = document.getElementById("form-clock-out-time");
const newShiftBreakStartInput = document.getElementById("form-break-start-time");
const newShiftBreakEndInput = document.getElementById("form-break-end-time");
const newShiftFoodSalesInput = document.getElementById("form-food-sales-amount");
const newShiftBawSalesInput = document.getElementById("form-baw-sales-amount");
const newShiftLiquorSalesInput = document.getElementById("form-liquor-sales-amount");
const newShiftNaBevSalesInput = document.getElementById("form-na-bev-sales-amount");
const newShiftAdditionalSalesInput = document.getElementById("form-additional-sales-amount");
const newShiftCcTipsInput = document.getElementById("form-cc-tips-amount");
const newShiftCashTipsInput = document.getElementById("form-cash-tips-amount");
const newShiftTipsPaidOutInput = document.getElementById("form-tip-out-paid-amount");
const newShiftTipOutReceivedInput = document.getElementById("form-tip-out-received-amount");
const newShiftNotesInput = document.getElementById("form-shift-notes");

const reviewDate = document.getElementById("review-date");
const reviewMealPeriod = document.getElementById("review-meal-period");
const reviewJob = document.getElementById("review-job");
const reviewClockIn = document.getElementById("review-clock-in");
const reviewClockOut = document.getElementById("review-clock-out");
const reviewBreakStart = document.getElementById("review-break-start");
const reviewBreakEnd = document.getElementById("review-break-end");
const reviewFoodSales = document.getElementById("review-food-sales");
const reviewBawSales = document.getElementById("review-baw-sales");
const reviewLiquorSales = document.getElementById("review-liquor-sales");
const reviewNaBevSales = document.getElementById("review-na-bev-sales");
const reviewAdditionalSales = document.getElementById("review-additional-sales");
const reviewCcTips = document.getElementById("review-cc-tips");
const reviewCashTips = document.getElementById("review-cash-tips");
const reviewTipsPaidOut = document.getElementById("review-tip-out-paid");
const reviewTipOutReceived = document.getElementById("review-tip-out-received");
const reviewNotes = document.getElementById("review-notes");

// Application state
let shifts = [];

let newShiftData = {
    date: "",
    mealPeriod: "",
    job: "",
    clockIn: "",
    clockOut: "",
    breakStart: "",
    breakEnd: "",
    foodSales: 0,
    bawSales: 0,
    liquorSales: 0,
    naBevSales: 0,
    additionalSales: 0,
    ccTips: 0,
    cashTips: 0,
    tipsPaidOut: 0,
    tipOutReceived: 0,
    notes: ""
};

let currentView = "header";
let pausedView = null;

// New shift form functions
function clearNewShiftForm() {
    newShiftDateInput.value = "";
    newShiftMealPeriodInput.value = "";
    newShiftJobInput.value = "";
    newShiftClockInInput.value = "";
    newShiftClockOutInput.value = "";
    newShiftBreakStartInput.value = "";
    newShiftBreakEndInput.value = "";
    newShiftFoodSalesInput.value = "";
    newShiftBawSalesInput.value = "";
    newShiftLiquorSalesInput.value = "";
    newShiftNaBevSalesInput.value = "";
    newShiftAdditionalSalesInput.value = "";
    newShiftCcTipsInput.value = "";
    newShiftCashTipsInput.value = "";
    newShiftTipsPaidOutInput.value = "";
    newShiftTipOutReceivedInput.value = "";
    newShiftNotesInput.value = "";
}

function clearNewShiftData() {
    newShiftData = {
        date: "",
        mealPeriod: "",
        job: "",
        clockIn: "",
        clockOut: "",
        breakStart: "",
        breakEnd: "",
        foodSales: 0,
        bawSales: 0,
        liquorSales: 0,
        naBevSales: 0,
        additionalSales: 0,
        ccTips: 0,
        cashTips: 0,
        tipsPaidOut: 0,
        tipOutReceived: 0,
        notes: ""
    };
}

function updateNewShiftData() {
    newShiftData.date = newShiftDateInput.value;
    newShiftData.mealPeriod = newShiftMealPeriodInput.value;
    newShiftData.job = newShiftJobInput.value;
    newShiftData.clockIn = newShiftClockInInput.value;
    newShiftData.clockOut = newShiftClockOutInput.value;
    newShiftData.breakStart = newShiftBreakStartInput.value;
    newShiftData.breakEnd = newShiftBreakEndInput.value;
    newShiftData.foodSales = parseFloat(newShiftFoodSalesInput.value) || 0;
    newShiftData.bawSales = parseFloat(newShiftBawSalesInput.value) || 0;
    newShiftData.liquorSales = parseFloat(newShiftLiquorSalesInput.value) || 0;
    newShiftData.naBevSales = parseFloat(newShiftNaBevSalesInput.value) || 0;
    newShiftData.additionalSales = parseFloat(newShiftAdditionalSalesInput.value) || 0;
    newShiftData.ccTips = parseFloat(newShiftCcTipsInput.value) || 0;
    newShiftData.cashTips = parseFloat(newShiftCashTipsInput.value) || 0;
    newShiftData.tipsPaidOut = parseFloat(newShiftTipsPaidOutInput.value) || 0;
    newShiftData.tipOutReceived = parseFloat(newShiftTipOutReceivedInput.value) || 0;
    newShiftData.notes = newShiftNotesInput.value;
}

// Navigation functions
function showView(view) {
    currentView = view;

    disableMenuButtons(pausedView);

    appHeader.hidden = currentView !== "menu" && currentView !== "appHeader";

    sectionNewShift.hidden = currentView !== "newShift" && currentView !== "reviewNewShift";
    newShiftForm.hidden = currentView !== "newShift";
    reviewNewShiftSection.hidden = currentView !== "reviewNewShift";

    sectionPreviousShifts.hidden = currentView !== "previousShifts";

    // sectionSettings.hidden = currentView !== "settings" && currentView !== "manageData";
    // sectionManageData.hidden = currentView !== "manageData";


    buttonMenu.hidden = currentView === "menu" || currentView === "appHeader" || currentView === "settings";
    buttonMenuClose.hidden = currentView !== "menu";
}

function disableMenuButtons(view) {
    enableMenuButtons();

    buttonMenuNewShift.disabled = view === "newShift";
    buttonMenuPreviousShifts.disabled = view === "previousShifts";
    // buttonMenuSettings.disabled = view === "settings";
};

function enableMenuButtons() {
    buttonMenuNewShift.disabled = false;
    buttonMenuPreviousShifts.disabled = false;
    // buttonMenuSettings.disabled = false;
}

// Event handlers

function populateReviewSection() {
    clearReviewSection();

    reviewDate.textContent = newShiftData.date;
    reviewMealPeriod.textContent = newShiftData.mealPeriod;
    reviewJob.textContent = newShiftData.job;
    reviewClockIn.textContent = newShiftData.clockIn;
    reviewClockOut.textContent = newShiftData.clockOut;
    reviewBreakStart.textContent = newShiftData.breakStart;
    reviewBreakEnd.textContent = newShiftData.breakEnd;
    reviewFoodSales.textContent = newShiftData.foodSales.toFixed(2);
    reviewBawSales.textContent = newShiftData.bawSales.toFixed(2);
    reviewLiquorSales.textContent = newShiftData.liquorSales.toFixed(2);
    reviewNaBevSales.textContent = newShiftData.naBevSales.toFixed(2);
    reviewAdditionalSales.textContent = newShiftData.additionalSales.toFixed(2);
    reviewCcTips.textContent = newShiftData.ccTips.toFixed(2);
    reviewCashTips.textContent = newShiftData.cashTips.toFixed(2);
    reviewTipsPaidOut.textContent = newShiftData.tipsPaidOut.toFixed(2);
    reviewTipOutReceived.textContent = newShiftData.tipOutReceived.toFixed(2);
    reviewNotes.textContent = newShiftData.notes;
};

function clearReviewSection() {
    reviewDate.textContent = "";
    reviewMealPeriod.textContent = "";
    reviewJob.textContent = "";
    reviewClockIn.textContent = "";
    reviewClockOut.textContent = "";
    reviewBreakStart.textContent = "";
    reviewBreakEnd.textContent = "";
    reviewFoodSales.textContent = "";
    reviewBawSales.textContent = "";
    reviewLiquorSales.textContent = "";
    reviewNaBevSales.textContent = "";
    reviewAdditionalSales.textContent = "";
    reviewCcTips.textContent = "";
    reviewCashTips.textContent = "";
    reviewTipsPaidOut.textContent = "";
    reviewTipOutReceived.textContent = "";
    reviewNotes.textContent = "";
};

function handleNewShiftFormInput() {
    updateNewShiftData();

    buttonClearShift.disabled = !isNewShiftFormFilled();
}

function isNewShiftFormFilled() {
    return newShiftDateInput.value.trim() !== "" ||
        newShiftMealPeriodInput.value.trim() !== "" ||
        newShiftJobInput.value.trim() !== "" ||
        newShiftClockInInput.value.trim() !== "" ||
        newShiftClockOutInput.value.trim() !== "" ||
        newShiftBreakStartInput.value.trim() !== "" ||
        newShiftBreakEndInput.value.trim() !== "" ||
        newShiftFoodSalesInput.value.trim() !== "" ||
        newShiftBawSalesInput.value.trim() !== "" ||
        newShiftLiquorSalesInput.value.trim() !== "" ||
        newShiftNaBevSalesInput.value.trim() !== "" ||
        newShiftAdditionalSalesInput.value.trim() !== "" ||
        newShiftCcTipsInput.value.trim() !== "" ||
        newShiftCashTipsInput.value.trim() !== "" ||
        newShiftTipsPaidOutInput.value.trim() !== "" ||
        newShiftTipOutReceivedInput.value.trim() !== "" ||
        newShiftNotesInput.value.trim() !== "";
};

function populatePreviousShiftsSection() {
    previousShiftsText.textContent = "";

    if (shifts.length === 0) {
        previousShiftsText.textContent = "No previous shifts recorded.";
    } else {
        shifts.forEach(shift => {
            let shiftData = JSON.stringify(shift, null, 2);
            let PRE = document.createElement("pre");
            PRE.textContent = shiftData;
            previousShiftsText.appendChild(PRE);
        });
    };
};

function handleNewShiftFormSubmit(event) {
    event.preventDefault();

    updateNewShiftData();
    populateReviewSection();

    showView("reviewNewShift");
}

function handleNewShiftReviewSubmit(event) {
    event.preventDefault();

    console.log("New Shift Data Submitted:", newShiftData);

    newShiftForm.hidden = true;
    reviewNewShiftSection.hidden = true;

    clearNewShiftForm();
    clearNewShiftData();
    clearReviewSection();

    showView("appHeader");
}

function handleCancelShift() {
    newShiftForm.reset();
    clearNewShiftData();
    clearReviewSection();
    clearPausedView();

    showView("appHeader");

    console.log("New Shift form cleared.");
}

function handleClearShift() {
    newShiftForm.reset();
    clearNewShiftData();
    clearReviewSection();
    handleNewShiftFormInput();

    console.log("New Shift form cleared.");
}

function handleOpenMenu() {
    pausedView = currentView;

    showView("menu");
    console.log("Menu displayed.");
};

function handlePausedView() {
    if (pausedView) {
        showView(pausedView);
        pausedView = null;
    } else {
        showView("appHeader");
    }
};

// function handleSettingsOpen() {
//     showView("settings");
//     console.log("Settings section opened.");
// }

// function handleSettingsClose() {
//     showView(pausedView || "appHeader");
//     console.log("Settings section closed.");
// };

// function handleManageDataOpen() {
//     showView("manageData");
//     console.log("Manage Data section open")
// }

// function handleImportDataOpen() {
//     dialogImportData.showModal();
// }

function handleViewPreviousShifts() {
    populatePreviousShiftsSection();
    showView("previousShifts");
    console.log("Previous Shifts section displayed.");
}

function handleViewNewShift() {
    showView("newShift");
    console.log("New Shift section displayed.");
}

function handleReviewEdit() {
    showView("newShift");
    console.log("Editing New Shift Data.");
}


function updateShifts(arr, shift) {
    arr.push(...shift);
    saveShiftsToLocalStorage();
    return true
}

function handleReviewConfirm() {
    updateShifts(shifts, [newShiftData]);
    console.log("New Shift Data Confirmed:", shifts);

    newShiftForm.reset();

    clearNewShiftData();
    clearReviewSection();
    clearPausedView();

    showView("appHeader");
}

function handleReviewCancel() {

    newShiftForm.reset();
    clearNewShiftData();
    clearReviewSection();
    clearPausedView();
    showView("appHeader");
}

function clearPausedView() {
    pausedView = null;
};

// Local Storage functions

function saveShiftsToLocalStorage() {
    localStorage.setItem("shifts", JSON.stringify(shifts));
    console.log("Shifts saved to local storage.");
}

function loadShiftsFromLocalStorage() {
    const storedShifts = localStorage.getItem("shifts");
    if (storedShifts) {
        shifts = JSON.parse(storedShifts);
        console.log("Shifts loaded from local storage:", shifts);
    } else {
        console.log("No shifts found in local storage.");
    }
};

function clearShiftsFromLocalStorage() {
    localStorage.removeItem("shifts");
    shifts = [];
    console.log("Shifts cleared from local storage.");
};

function handleImportPasteData() {
    const pastedData = textAreaImportPaste.textContent;

    if (pastedData) {
        try {
            const parsedData = JSON.parse(pastedData);
            if (Array.isArray(parsedData)) {
                shifts = parsedData;
                saveShiftsToLocalStorage();
                console.log("Data imported successfully:", shifts);
                alert("Data imported successfully.");
            } else {
                throw new Error("Invalid data format.");
            }
        } catch (error) {
            console.error("Error importing data:", error);
            alert("Failed to import data. Please ensure the format is correct.");
        }
    }
};

function handleExportData() {
    const exportedData = JSON.stringify(shifts, null, 2);
    prompt("Copy the exported data below:", exportedData);
    console.log("Data exported:", exportedData);
};


// Event listeners
buttonMenuNewShift.addEventListener("click", handleViewNewShift);
buttonMenuPreviousShifts.addEventListener("click", handleViewPreviousShifts);
// buttonMenuSettings.addEventListener("click", handleSettingsOpen);
buttonMenu.addEventListener("click", handleOpenMenu);
buttonMenuClose.addEventListener("click", handlePausedView);

// buttonSettingsClose.addEventListener("click", handleSettingsClose);

buttonCancelShift.addEventListener("click", handleCancelShift);
buttonClearShift.addEventListener("click", handleClearShift);
newShiftForm.addEventListener("submit", handleNewShiftFormSubmit);
newShiftForm.addEventListener("input", handleNewShiftFormInput);

buttonReviewEdit.addEventListener("click", handleReviewEdit);
buttonReviewConfirm.addEventListener("click", handleReviewConfirm);
buttonReviewCancel.addEventListener("click", handleReviewCancel);

// buttonSettingsManageData.addEventListener("click", handleManageDataOpen);
// buttonManageDataImport.addEventListener("click", handleImportDataOpen);
// buttonImportData.addEventListener("click", handleImportData);
// buttonExportData.addEventListener("click", handleExportData);
// buttonClearData.addEventListener("click", clearShiftsFromLocalStorage);

// Initialization
loadShiftsFromLocalStorage();
showView("appHeader");
console.log("Script loaded successfully.");