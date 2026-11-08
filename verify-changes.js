// Quick verification that our changes work correctly
// This script checks the HTML structure and basic CSS classes

console.log("=== Verifying Double-Shift Report Selection Changes ===\n");

// Check 1: Template structure
const template = document.getElementById("double-report-template");
if (template) {
    console.log("✓ Template found: #double-report-template");
    const content = template.content.querySelector(".double-report-toggle");
    if (content) {
        console.log("✓ Toggle structure found with class: .double-report-toggle");
        console.log("  - Has checkbox input:", !!content.querySelector("input[type='checkbox']"));
        console.log("  - Has label text span:", !!content.querySelector("[data-report-label]"));
        console.log("  - Has indicator (✓):", !!content.querySelector(".report-toggle-indicator"));
    }
} else {
    console.error("✗ Template #double-report-template not found");
}

// Check 2: CSS for toggle chips
const styles = document.querySelectorAll("style");
let hasCSSForToggle = false;
let hasCSSForDisabled = false;

for (let style of styles) {
    const text = style.textContent;
    if (text.includes(".double-report-toggle")) {
        hasCSSForToggle = true;
        console.log("✓ CSS styles found for .double-report-toggle");
    }
    if (text.includes(".double-report fieldset:disabled")) {
        hasCSSForDisabled = true;
        console.log("✓ CSS styles found for disabled fieldset states");
    }
}

// Check 3: Section heading
const doubleReportFields = document.getElementById("double-report-fields");
if (doubleReportFields) {
    console.log("✓ Section found: #double-report-fields");
    const heading = doubleReportFields.querySelector("h3");
    if (heading && heading.textContent.includes("reports")) {
        console.log("✓ Updated heading: " + heading.textContent);
    }
    const description = doubleReportFields.querySelector("p");
    if (description && description.textContent.includes("Toggle")) {
        console.log("✓ Updated description mentions toggle interaction");
    }
}

// Check 4: Report periods variable
if (typeof reportPeriods !== "undefined") {
    console.log("\n✓ reportPeriods variable exists");
    console.log(`  Periods defined: ${reportPeriods.map(([id, label]) => `${id}(${label})`).join(", ")}`);
} else {
    console.warn("⚠ reportPeriods not yet initialized (will be when form loads)");
}

// Check 5: Functions exist
const functionsToCheck = ["initializeDoubleReports", "handleDoubleReportToggle", "updateMealPeriodFields"];
functionsToCheck.forEach(fname => {
    if (typeof window[fname] === "function") {
        console.log(`✓ Function exists: ${fname}`);
    }
});

console.log("\n=== Verification Complete ===");
