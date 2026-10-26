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
        expect(serverCard).toBeDefined();
        expect(style(serverCard).borderTopWidth).toBe("1px");
        expect(element(".history-header-card").contains(element("#shift-list"))).toBe(false);
        expect(serverCard.querySelector(".card-title .card-job").textContent).toBe("Server");
        expect(serverCard.querySelectorAll(".card-primary-metrics .card-stat")).toHaveLength(3);
        expect(Array.from(serverCard.querySelectorAll(".card-stat-label"), (label) => label.textContent))
            .toEqual(["Hours", "Sales", "Net tips"]);
        expect(serverCard.querySelector(".card-sales").textContent).toBe("$100.00");
        expect(serverCard.querySelector(".card-tips").textContent).toBe("$31.00");
        expect(serverCard.querySelector(".card-auto-gratuity").textContent).toBe("$7.00");
        expect(serverCard.querySelector(".card-cc-tips").textContent).toBe("$20.00");
        expect(serverCard.querySelector(".card-tips-paid-out").textContent).toBe("$3.00");
        expect(serverCard.querySelector(".card-food-sales").textContent).toBe("$100.00");
    }));

    test("expands and collapses the sales and tips breakdown", () => withApp({ shifts: seededShifts() }, ({ element, openView }) => {
        openView("previous-shifts");
        const toggle = element(".card-toggle");
        const details = element(".card-details");

        expect(details.hidden).toBe(true);
        expect(toggle.getAttribute("aria-expanded")).toBe("false");
        toggle.click();
        expect(details.hidden).toBe(false);
        expect(toggle.getAttribute("aria-expanded")).toBe("true");
        toggle.click();
        expect(details.hidden).toBe(true);
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

    test("keeps sorting visible and opens an accessible filter dialog", () => withApp({
        shifts: seededShifts(),
    }, ({ doc, element, openView }) => {
        openView("previous-shifts");
        const openButton = element("#open-history-filters");
        const dialog = element("#history-filter-dialog");

        expect(element("#sort-by").closest("dialog")).toBeNull();
        expect(dialog.open).toBe(false);
        expect(openButton.getAttribute("aria-haspopup")).toBe("dialog");

        openButton.click();

        expect(dialog.open).toBe(true);
        expect(openButton.getAttribute("aria-expanded")).toBe("true");
        expect(doc.activeElement.id).toBe("filter-date-from");
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
        change("#sort-by", "sales-desc");
        element("#open-history-filters").click();
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
        expect(element(".card-hours").textContent).toBe("7h 0m");
    }));
});
