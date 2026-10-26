import { describe, expect, test } from "./assert.js";
import { withApp } from "./app-harness.js";

describe("Branding", () => {
    test("uses the app icon in the sidebar", () => withApp({ width: 390, height: 667 }, ({ doc }) => {
        expect(doc.querySelector(".brand img").getAttribute("src")).toBe("assets/icons/icon.svg");
    }));
});

describe("Mobile navigation", () => {
    test("opens the dashboard on phone-sized screens", () => withApp({ width: 390, height: 667 }, ({ element }) => {
        expect(element("#dashboard").classList.contains("is-visible")).toBe(true);
        expect(element('.mobile-bottom-nav [data-view="dashboard"]').getAttribute("aria-current")).toBe("page");
    }));

    test("opens the dashboard without horizontal overflow", () => withApp({ width: 390, height: 667 }, ({ doc, win, elements }) => {
        expect(elements(".period-metric")).toHaveLength(8);
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(win.innerWidth);
    }));

    test("keeps the main mobile views within thumb reach and marks the active view", () => withApp({
        width: 390,
        height: 844,
    }, ({ element, win }) => {
        const nav = element(".mobile-bottom-nav");
        const bounds = nav.getBoundingClientRect();

        expect(nav.querySelectorAll("button")).toHaveLength(4);
        expect(bounds.bottom).toBeLessThanOrEqual(win.innerHeight);
        expect(bounds.top).toBeGreaterThan(win.innerHeight / 2);

        element('.mobile-bottom-nav [data-view="new-shift"]').click();
        expect(element("#new-shift").classList.contains("is-visible")).toBe(true);
        expect(element('.mobile-bottom-nav [data-view="new-shift"]').getAttribute("aria-current")).toBe("page");
    }));

    test("hides dashboard actions and the overview blurb on phones", () => withApp({
        width: 390,
        height: 844,
    }, ({ element, style }) => {
        expect(style(element(".dashboard-heading-actions")).display).toBe("none");
        expect(style(element(".dashboard-heading p:last-child")).display).toBe("none");
    }));

    test("hides the bottom navigation on wide screens", () => withApp({ width: 1200, height: 800 }, ({ element, style }) => {
        expect(style(element(".mobile-bottom-nav")).display).toBe("none");
    }));

    test("uses browser back and forward to revisit mobile app views", () => withApp({
        width: 390,
        height: 667,
    }, ({ element, win }) => {
        element('.mobile-bottom-nav [data-view="previous-shifts"]').click();
        expect(win.history.state.shiftLedgerView).toBe("previous-shifts");
        expect(element("#previous-shifts").classList.contains("is-visible")).toBe(true);

        win.dispatchEvent(new win.PopStateEvent("popstate", {
            state: { shiftLedgerView: "dashboard" },
        }));
        expect(element("#dashboard").classList.contains("is-visible")).toBe(true);

        win.dispatchEvent(new win.PopStateEvent("popstate", {
            state: { shiftLedgerView: "previous-shifts" },
        }));
        expect(element("#previous-shifts").classList.contains("is-visible")).toBe(true);
    }));

    test("keeps an unfinished shift when navigating back to it", () => withApp({
        width: 390,
        height: 667,
    }, ({ element, fire, win }) => {
        element('.mobile-bottom-nav [data-view="new-shift"]').click();
        expect(win.history.state.shiftLedgerView).toBe("new-shift");
        const foodSales = element("#shift-food-sales");
        foodSales.value = "25";
        fire(foodSales, "input");

        win.dispatchEvent(new win.PopStateEvent("popstate", {
            state: { shiftLedgerView: "dashboard" },
        }));
        expect(element("#dashboard").classList.contains("is-visible")).toBe(true);

        win.dispatchEvent(new win.PopStateEvent("popstate", {
            state: { shiftLedgerView: "new-shift" },
        }));
        expect(element("#new-shift").classList.contains("is-visible")).toBe(true);
        expect(foodSales.value).toBe("25");
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

    test("stacks the form cards on a phone without horizontal overflow", () => withApp({ width: 390, height: 844 }, ({ doc, element, elements, win, openView }) => {
        openView("new-shift");

        const top = (selector) => element(selector).getBoundingClientRect().top;

        expect(top("#shift-meal-period")).toBeGreaterThan(top("#shift-date"));
        expect(top("#break-card-title")).toBeGreaterThan(top("#shift-clock-out"));
        expect(elements("#single-report-fields fieldset:first-child .sub-card")).toHaveLength(0);
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
