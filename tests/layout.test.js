import { describe, expect, test } from "./assert.js";
import { withApp } from "./app-harness.js";

describe("Branding", () => {
    test("uses the app icon in the sidebar and mobile menu", () => withApp({ width: 390, height: 667 }, ({ doc }) => {
        expect(doc.querySelector(".brand img").getAttribute("src")).toBe("assets/icons/icon.svg");
        expect(doc.querySelector(".mobile-brand img").getAttribute("src")).toBe("assets/icons/icon.svg");
    }));
});

describe("Mobile menu", () => {
    test("opens on phone-sized screens", () => withApp({ width: 390, height: 667 }, ({ element }) => {
        expect(element("#mobile-home").classList.contains("is-visible")).toBe(true);
    }));

    test("fits a standard phone without scrolling the page", () => withApp({ width: 390, height: 667 }, ({ doc, win }) => {
        expect(doc.documentElement.scrollHeight).toBeLessThanOrEqual(win.innerHeight);
    }));

    test("fits a compact phone without scrolling the page", () => withApp({ width: 320, height: 568 }, ({ doc, win }) => {
        expect(doc.documentElement.scrollHeight).toBeLessThanOrEqual(win.innerHeight);
    }));

    test("scrolls inside the app shell only when the screen is too short", () => withApp({ width: 320, height: 400 }, ({ doc, win, element }) => {
        const shell = element(".app-shell");

        expect(doc.documentElement.scrollHeight).toBeLessThanOrEqual(win.innerHeight);
        expect(shell.scrollHeight).toBeGreaterThan(shell.clientHeight);
    }));

    test("opens the dashboard without horizontal overflow", () => withApp({ width: 390, height: 667 }, ({ doc, win, element, elements }) => {
        element('.mobile-menu-button[data-view="dashboard"]').click();

        expect(elements(".period-metric")).toHaveLength(8);
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(win.innerWidth);
    }));

    test("keeps mobile history controls and its filter dialog within the viewport", () => withApp({
        width: 390,
        height: 844,
    }, ({ doc, win, element, openView }) => {
        openView("previous-shifts");

        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(win.innerWidth);
        expect(element("#sort-by").getBoundingClientRect().width).toBeGreaterThan(0);

        element("#open-history-filters").click();
        const bounds = element("#history-filter-dialog").getBoundingClientRect();

        expect(bounds.left).toBeGreaterThanOrEqual(0);
        expect(bounds.right).toBeLessThanOrEqual(win.innerWidth);
    }));
});

describe("New shift layout", () => {
    test("keeps the form heading separate from the entry cards", () => withApp(({ element, openView }) => {
        openView("new-shift");

        expect(element("#shift-form").previousElementSibling.classList.contains("form-header-card")).toBe(true);
        expect(element(".form-header-card").contains(element("#shift-form"))).toBe(false);
    }));

    test("flows the form in one vertical column on a wide screen", () => withApp({ width: 1400, height: 1000 }, ({ element, elements, openView }) => {
        openView("new-shift");

        const rect = (selector) => element(selector).getBoundingClientRect();
        const ids = [
            "shift-date", "shift-meal-period", "shift-job", "shift-clock-in", "shift-clock-out",
            "shift-break-start", "shift-break-end", "shift-food-sales", "shift-additional-sales",
            "shift-baw-sales", "shift-cc-tips", "shift-tip-out-paid",
        ];
        const lefts = ids.map((id) => rect(`#${id}`).left);

        ids.slice(1).forEach((id, index) => {
            expect(rect(`#${id}`).top).toBeGreaterThan(rect(`#${ids[index]}`).top);
        });
        expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThanOrEqual(60);
        expect(rect("#shift-form").width).toBeLessThanOrEqual(680);
        expect(elements("#shift-form fieldset").length).toBeGreaterThan(0);
    }));

    test("stacks the inputs inside each sub card", () => withApp({ width: 1400, height: 1000 }, ({ element, openView }) => {
        openView("new-shift");

        const top = (selector) => element(selector).getBoundingClientRect().top;

        expect(top("#shift-clock-out")).toBeGreaterThan(top("#shift-clock-in"));
        expect(top("#shift-cash-tips")).toBeGreaterThan(top("#shift-cc-tips"));
        expect(top("#shift-auto-gratuity")).toBeGreaterThan(top("#shift-cash-tips"));
        expect(top("#shift-tip-out-received")).toBeGreaterThan(top("#shift-tip-out-paid"));
    }));

    test("stacks the form cards on a phone without horizontal overflow", () => withApp({ width: 390, height: 844 }, ({ doc, element, win, openView }) => {
        openView("new-shift");

        const top = (selector) => element(selector).getBoundingClientRect().top;

        expect(top("#shift-meal-period")).toBeGreaterThan(top("#shift-date"));
        expect(top("#break-card-title")).toBeGreaterThan(top("#shift-clock-out"));
        expect(top("#sales-card-title")).toBeGreaterThan(top("#shift-date"));
        expect(top("#shift-additional-sales")).toBeGreaterThan(top("#shift-food-sales"));
        expect(top("#shift-liquor-sales")).toBeGreaterThan(top("#shift-additional-sales"));
        expect(top("#tipout-card-title")).toBeGreaterThan(top("#shift-auto-gratuity"));
        expect(top("#single-report-fields fieldset:last-child")).toBeGreaterThan(top("#single-report-fields fieldset:first-child"));
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(win.innerWidth);
    }));

    test("keeps double-shift report details in one vertical column", () => withApp({
        width: 1400,
        height: 1000,
    }, ({ element, fire, openView }) => {
        openView("new-shift");
        const mealPeriod = element("#shift-meal-period");
        mealPeriod.value = "Double";
        fire(mealPeriod, "change");

        const report = element('[data-report-period="lunch"]');
        const sales = report.querySelector(".report-data-group[aria-label='Sales']");
        const tips = report.querySelector(".report-data-group[aria-label='Tips']");

        expect(report.querySelectorAll(".sub-card")).toHaveLength(0);
        expect(report.querySelectorAll("[data-report-field]")).toHaveLength(10);
        expect(tips.getBoundingClientRect().top).toBeGreaterThan(sales.getBoundingClientRect().top);
        expect(Math.round(tips.getBoundingClientRect().left)).toBe(Math.round(sales.getBoundingClientRect().left));
    }));

    test("stacks double-shift groups on a phone without horizontal overflow", () => withApp({
        width: 390,
        height: 844,
    }, ({ doc, element, fire, openView, win }) => {
        openView("new-shift");
        const mealPeriod = element("#shift-meal-period");
        mealPeriod.value = "Double";
        fire(mealPeriod, "change");

        const report = element('[data-report-period="lunch"]');
        const sales = report.querySelector(".report-data-group[aria-label='Sales']");
        const tips = report.querySelector(".report-data-group[aria-label='Tips']");

        expect(tips.getBoundingClientRect().top).toBeGreaterThan(sales.getBoundingClientRect().top);
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(win.innerWidth);
    }));
});
