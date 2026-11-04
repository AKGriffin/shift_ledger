import { describe, expect, test } from "./assert.js";
import { makeShift, withApp } from "./app-harness.js";

const notesWithMarkup = '<img src=x onerror="alert(1)">';

const seededShifts = () => [
    makeShift({
        date: "2026-10-20",
        job: "Server",
        foodSales: 100,
        ccTips: 20,
        cashTips: 5,
        autoGratuity: 7,
        tipsPaidOut: 3,
        tipOutReceived: 2,
        notes: notesWithMarkup,
    }),
    makeShift({ date: "2026-10-21", job: "Expo", foodSales: 200, ccTips: 50, cashTips: 10, notes: "Second shift" }),
];

describe("Dashboard summaries", () => {
    test("shows week and month summaries in two columns", () => withApp({ shifts: seededShifts() }, ({ element, elements, style }) => {
        element('.main-nav [data-view="dashboard"]').click();

        expect(elements(".period-metric")).toHaveLength(8);
        expect(style(element(".period-card")).gridTemplateColumns.split(" ")).toHaveLength(2);
    }));
});

describe("Previous shifts", () => {
    test("lists every saved shift with its summary metrics", () => withApp({ shifts: seededShifts() }, ({ element, elements, openView, style }) => {
        openView("previous-shifts");
        const serverCard = elements(".shift-card")
            .find((card) => card.querySelector(".card-job").textContent === "Server");

        expect(elements(".shift-card")).toHaveLength(2);
        expect(elements(".shift-summary")).toHaveLength(2);
        expect(serverCard).toBeDefined();
        expect(serverCard.closest("dialog").open).toBe(false);
        expect(serverCard.querySelector(".card-title .card-job").textContent).toBe("Server");
        expect(serverCard.querySelectorAll(".card-primary-metrics .card-stat")).toHaveLength(3);
        expect(Array.from(serverCard.querySelectorAll(".card-stat-label"), (label) => label.textContent))
            .toEqual(["Net tips", "Hours", "Sales"]);
        expect(serverCard.querySelector(".card-sales").textContent).toBe("$100.00");
        expect(serverCard.querySelector(".card-tips").textContent).toBe("$31.00");
        expect(serverCard.querySelector(".card-auto-gratuity").textContent).toBe("$7.00");
        expect(serverCard.querySelector(".card-cc-tips").textContent).toBe("$20.00");
        expect(serverCard.querySelector(".card-tips-paid-out").textContent).toBe("$3.00");
        expect(serverCard.querySelector(".card-food-sales").textContent).toBe("$100.00");
    }));

    test("hides zero-value breakdown lines unless the setting shows them", () => withApp({ shifts: seededShifts() }, ({ elements, openView, change, savedSettings }) => {
        openView("previous-shifts");
        const serverCard = () => elements(".shift-card")
            .find((card) => card.querySelector(".card-job").textContent === "Server");
        const expoCard = () => elements(".shift-card")
            .find((card) => card.querySelector(".card-job").textContent === "Expo");

        expect(serverCard().querySelector(".card-food-sales").parentElement.hidden).toBe(false);
        expect(serverCard().querySelector(".card-na-bev-sales").parentElement.hidden).toBe(true);
        expect(serverCard().querySelector(".card-auto-gratuity").parentElement.hidden).toBe(false);
        expect(serverCard().querySelector(".card-break").parentElement.hidden).toBe(true);
        expect(expoCard().querySelector(".card-auto-gratuity").parentElement.hidden).toBe(true);

        openView("settings");
        change("#setting-zero-details", "show");
        openView("previous-shifts");

        expect(savedSettings().zeroDetails).toBe("show");
        expect(serverCard().querySelector(".card-na-bev-sales").parentElement.hidden).toBe(false);
        expect(serverCard().querySelector(".card-break").parentElement.hidden).toBe(false);
        expect(serverCard().querySelector(".card-break").textContent).toBe("None");
    }));

    test("stacks the totals on mobile with every breakdown visible", () => withApp({
        width: 390,
        height: 800,
        shifts: seededShifts(),
    }, ({ element, elements, openView, style }) => {
        openView("previous-shifts");
        element(".shift-summary").click();

        expect(style(element(".shift-card-summary")).gridTemplateColumns.split(" ")).toHaveLength(1);
        expect(style(element(".card-stat-sales .card-substats")).display).not.toBe("none");
        expect(style(element(".card-stat-tips .card-substats")).display).not.toBe("none");
        expect(elements(".card-stat-toggle")).toHaveLength(0);
        expect(elements(".card-expand-all")).toHaveLength(0);
    }));

    test("leads with net tips above side-by-side hours and sales at tablet width", () => withApp({
        width: 700,
        height: 900,
        shifts: seededShifts(),
    }, ({ element, elements, openView, style }) => {
        openView("previous-shifts");
        element(".shift-summary").click();

        expect(style(element(".shift-card-summary")).gridTemplateColumns.split(" ")).toHaveLength(2);
        expect(style(element(".card-stat-tips")).gridColumnStart).toBe("1");
        expect(style(element(".card-stat-tips")).gridColumnEnd).toBe("-1");
        expect(elements(".card-stat-toggle")).toHaveLength(0);
        expect(style(element(".card-stat-sales .card-substats")).display).not.toBe("none");
    }));

    test("always shows sub-lists without a toggle on desktop", () => withApp({
        width: 1400,
        height: 900,
        shifts: seededShifts(),
    }, ({ element, elements, openView, style }) => {
        openView("previous-shifts");
        element(".shift-summary").click();

        expect(elements(".card-stat-toggle")).toHaveLength(0);
        expect(style(element(".card-stat-tips .card-substats")).display).not.toBe("none");
        expect(element(".card-stat-hours .card-clock-in")).not.toBeNull();
    }));

    test("steps through shifts in the dialog with buttons and arrow keys", () => withApp({ shifts: seededShifts() }, ({ doc, element, elements, openView }) => {
        openView("previous-shifts");
        const openDialogs = () => elements(".shift-detail-dialog").filter((dialog) => dialog.open);
        element(".shift-summary").click();

        expect(openDialogs()).toHaveLength(1);
        expect(element(".shift-detail-dialog[open] .shift-nav-count").textContent).toBe("1 of 2");
        expect(element(".shift-detail-dialog[open] .shift-nav-prev").disabled).toBe(true);
        element(".shift-detail-dialog[open] .shift-nav-next").click();
        expect(openDialogs()).toHaveLength(1);
        expect(element(".shift-detail-dialog[open] .shift-nav-count").textContent).toBe("2 of 2");
        expect(element(".shift-detail-dialog[open] .shift-nav-next").disabled).toBe(true);
        doc.dispatchEvent(new doc.defaultView.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
        element(".shift-detail-dialog[open] .shift-nav-prev").click();
        expect(element(".shift-detail-dialog[open] .shift-nav-count").textContent).toBe("1 of 2");
    }));

    test("keeps the detail dialog fixed and the page still while stepping", () => withApp({ shifts: seededShifts() }, ({ element, openView, style, win }) => {
        openView("previous-shifts");
        element(".shift-summary").click();
        const scrollBefore = win.scrollY;
        element(".shift-detail-dialog[open] .shift-nav-next").click();

        expect(style(element(".shift-detail-dialog[open]")).position).toBe("fixed");
        expect(win.scrollY).toBe(scrollBefore);
    }));

    test("shows the next shift after deleting from the dialog", () => withApp({ shifts: seededShifts() }, ({ element, elements, openView }) => {
        openView("previous-shifts");
        element(".shift-summary").click();
        element(".shift-detail-dialog[open] .delete-shift").click();

        expect(elements(".shift-summary")).toHaveLength(1);
        expect(element(".shift-detail-dialog[open] .shift-nav-count").textContent).toBe("1 of 1");
    }));

    test("shows visible edit and delete actions in the detail dialog", () => withApp({ shifts: seededShifts() }, ({ element, elements, openView }) => {
        openView("previous-shifts");
        element(".shift-summary").click();

        expect(elements(".card-menu-toggle, .card-menu-list")).toHaveLength(0);
        expect(element(".shift-detail-dialog[open] .edit-shift").textContent.trim()).toBe("Edit shift");
        expect(element(".shift-detail-dialog[open] .delete-shift").textContent.trim()).toBe("Delete");
    }));

    test("hides the notes section when a shift has no notes", () => withApp({
        shifts: [makeShift({ notes: "" })],
    }, ({ element, openView }) => {
        openView("previous-shifts");
        expect(element(".card-notes").hidden).toBe(true);
    }));

    test("shows shifts as separate cards in multiple columns on wide screens", () => withApp({
        width: 1400,
        height: 900,
        shifts: seededShifts(),
    }, ({ element, openView, style }) => {
        openView("previous-shifts");
        expect(style(element("#shift-list")).gridTemplateColumns.split(" ").length).toBeGreaterThan(1);
    }));

    test("stacks shift cards in one column on mobile without overflow", () => withApp({
        width: 390,
        height: 800,
        shifts: seededShifts(),
    }, ({ doc, element, openView, style }) => {
        openView("previous-shifts");
        expect(style(element("#shift-list")).gridTemplateColumns.split(" ")).toHaveLength(1);
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth);
    }));

    test("opens one accessible sort and filter dialog", () => withApp({
        shifts: seededShifts(),
    }, ({ doc, element, openView }) => {
        openView("previous-shifts");
        const openButton = element("#open-history-filters");
        const dialog = element("#history-filter-dialog");

        expect(doc.querySelector("#previous-shifts #export-csv")).toBeNull();
        expect(element("#sort-by").closest("dialog")).toBe(dialog);
        expect(dialog.open).toBe(false);
        expect(openButton.getAttribute("aria-haspopup")).toBe("dialog");

        openButton.click();

        expect(dialog.open).toBe(true);
        expect(openButton.getAttribute("aria-expanded")).toBe("true");
        expect(doc.activeElement.id).toBe("sort-by");
        element("#close-history-filters").click();

        expect(dialog.open).toBe(false);
        expect(openButton.getAttribute("aria-expanded")).toBe("false");
        expect(doc.activeElement.id).toBe("open-history-filters");
    }));

    test("renders notes as text instead of markup", () => withApp({ shifts: seededShifts() }, ({ elements, openView }) => {
        openView("previous-shifts");
        const serverCard = elements(".shift-card")
            .find((card) => card.querySelector(".card-job").textContent === "Server");

        expect(serverCard.querySelector(".card-notes").textContent).toBe(notesWithMarkup);
        expect(serverCard.querySelector(".card-notes img")).toBeNull();
    }));

    test("filters shifts by job", () => withApp({ shifts: seededShifts() }, ({ element, elements, openView, change }) => {
        openView("previous-shifts");
        element("#open-history-filters").click();
        change("#filter-job", "Expo");

        expect(elements(".shift-card")).toHaveLength(1);
        expect(element(".card-job").textContent).toBe("Expo");
    }));

    test("filters shifts by date range", () => withApp({ shifts: seededShifts() }, ({ element, elements, openView, change }) => {
        openView("previous-shifts");
        element("#open-history-filters").click();
        change("#filter-date-from", "2026-10-21");

        expect(elements(".shift-card")).toHaveLength(1);
        expect(element(".card-job").textContent).toBe("Expo");
        expect(element("#history-status").textContent).toBe("1 shift");
    }));

    test("reports an invalid date range instead of listing shifts", () => withApp({ shifts: seededShifts() }, ({ element, elements, openView, change }) => {
        openView("previous-shifts");
        element("#open-history-filters").click();
        change("#filter-date-from", "2026-10-22");
        change("#filter-date-to", "2026-10-20");

        expect(elements(".shift-card")).toHaveLength(0);
        expect(element("#history-status").textContent).toBe("The start date must be on or before the end date.");
    }));

    test("shows active filter count and preserves sort when clearing filters", () => withApp({
        shifts: seededShifts(),
    }, ({ element, elements, openView, change }) => {
        openView("previous-shifts");
        element("#open-history-filters").click();
        change("#sort-by", "sales-desc");
        change("#filter-date-from", "2026-10-21");
        change("#filter-job", "Expo");

        expect(element("#active-filter-count").textContent).toBe("2 active");
        expect(element("#clear-filters").disabled).toBe(false);
        element("#clear-filters").click();

        expect(element("#active-filter-count").hidden).toBe(true);
        expect(element("#clear-filters").disabled).toBe(true);
        expect(element("#sort-by").value).toBe("sales-desc");
        expect(elements(".shift-card")).toHaveLength(2);
    }));

    test("shows removable chips for active filters and keeps the rest", () => withApp({
        shifts: seededShifts(),
    }, ({ element, elements, openView, change, doc }) => {
        openView("previous-shifts");
        expect(element("#active-filters").hidden).toBe(true);

        element("#open-history-filters").click();
        change("#filter-date-from", "2026-10-21");
        change("#filter-job", "Expo");
        element("#done-history-filters").click();

        const chips = elements("#active-filters .filter-chip");
        expect(chips).toHaveLength(2);
        expect(chips[0].getAttribute("aria-label")).toBe("Remove filter: From Oct 21, 2026");
        expect(chips[1].textContent).toContain("Job: Expo");

        chips[1].click();
        expect(element("#filter-job").value).toBe("all");
        expect(elements("#active-filters .filter-chip")).toHaveLength(1);
        expect(element("#active-filter-count").textContent).toBe("1 active");
        expect(doc.activeElement.id).toBe("open-history-filters");
    }));

    test("sorts by sales from high to low", () => withApp({ shifts: seededShifts() }, ({ elements, openView, change }) => {
        openView("previous-shifts");
        change("#sort-by", "sales-desc");

        expect(elements(".shift-card .card-job").map((job) => job.textContent)).toEqual(["Expo", "Server"]);
    }));

    test("labels the next-day end of an overnight shift", () => withApp({
        shifts: [makeShift({
            date: "2026-10-22",
            clockIn: "22:00",
            clockOut: "06:00",
            breakStart: "23:30",
            breakEnd: "00:30",
        })],
    }, ({ element, openView }) => {
        openView("previous-shifts");

        expect(element(".card-clock-in").textContent).toBe("10:00 PM");
        expect(element(".card-clock-out").textContent).toBe("6:00 AM (next day)");
        expect(element(".card-break").textContent).toBe("11:30 PM - 12:30 AM (next day)");
        expect(element(".card-break").parentElement.hidden).toBe(false);
        expect(element(".card-hours").textContent).toBe("7h 0m");
    }));
});
