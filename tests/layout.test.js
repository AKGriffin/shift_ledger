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

    test("groups form cards side by side when there is room", () => withApp({ width: 1400, height: 1000 }, ({ element, openView }) => {
        openView("new-shift");

        const general = element(".form-context-grid fieldset:first-child").getBoundingClientRect();
        const time = element(".form-context-grid fieldset:last-child").getBoundingClientRect();
        const sales = element("#single-report-fields fieldset:first-child").getBoundingClientRect();
        const tips = element("#single-report-fields fieldset:last-child").getBoundingClientRect();
        const date = element("#shift-date").closest(".field").getBoundingClientRect();
        const mealPeriod = element("#shift-meal-period").closest(".field").getBoundingClientRect();
        const foodSales = element("#shift-food-sales").closest(".field").getBoundingClientRect();
        const beerWineSales = element("#shift-baw-sales").closest(".field").getBoundingClientRect();

        expect(general.top).toBe(time.top);
        expect(sales.top).toBe(tips.top);
        expect(mealPeriod.top).toBeGreaterThan(date.top);
        expect(beerWineSales.top).toBeGreaterThan(foodSales.top);
    }));

    test("stacks the form cards on a phone without horizontal overflow", () => withApp({ width: 390, height: 844 }, ({ doc, element, win, openView }) => {
        openView("new-shift");

        const general = element(".form-context-grid fieldset:first-child").getBoundingClientRect();
        const time = element(".form-context-grid fieldset:last-child").getBoundingClientRect();
        const sales = element("#single-report-fields fieldset:first-child").getBoundingClientRect();
        const tips = element("#single-report-fields fieldset:last-child").getBoundingClientRect();

        expect(time.top).toBeGreaterThan(general.top);
        expect(tips.top).toBeGreaterThan(sales.top);
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(win.innerWidth);
    }));
});
