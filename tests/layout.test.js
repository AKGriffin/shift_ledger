import { describe, expect, test } from "./assert.js";
import { makeShift, withApp } from "./app-harness.js";

describe("Branding", () => {
    test("uses the app icon in the sidebar", () => withApp({ width: 390, height: 667 }, ({ doc }) => {
        expect(doc.querySelector(".brand img").getAttribute("src")).toBe("assets/icons/icon.svg");
    }));
});

describe("Accessibility", () => {
    test("offers a skip link to the main content", () => withApp(({ element }) => {
        const link = element(".skip-link");
        expect(link.getAttribute("href")).toBe("#main-content");
        expect(element("#main-content").tagName).toBe("MAIN");
    }));

    test("moves focus to the new page heading and updates the title when switching views", () => withApp(({ doc, element, openView }) => {
        expect(doc.title).toBe("Dashboard · Shift Ledger");
        openView("settings");
        expect(doc.activeElement).toBe(element("#settings h1"));
        expect(doc.title).toBe("Settings · Shift Ledger");
    }));

    test("keeps visible text in the accessible names of quick navigation buttons", () => withApp(({ elements }) => {
        elements(".mobile-bottom-nav-button").forEach((button) => {
            expect(button.hasAttribute("aria-label")).toBe(false);
            expect(button.textContent.trim().length > 0).toBe(true);
        });
    }));

    test("uses a plain disclosure for shift actions instead of an unsupported menu role", () => withApp({
        shifts: [makeShift()],
    }, ({ element, elements, openView }) => {
        openView("previous-shifts");
        expect(elements("[role='menu'], [role='menuitem']")).toHaveLength(0);
        expect(element(".card-menu-toggle").hasAttribute("aria-haspopup")).toBe(false);
        expect(element(".card-menu-toggle").getAttribute("aria-expanded")).toBe("false");
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

    test("keeps the dashboard overview copy visible and hides its actions on phones", () => withApp({
        width: 390,
        height: 844,
    }, ({ element, style }) => {
        expect(style(element(".dashboard-heading-actions")).display).toBe("none");
        expect(style(element(".dashboard-heading .view-heading > p:not(.eyebrow)")).display).not.toBe("none");
    }));

    test("uses one consistent page heading and mobile top spacing across main views", () => withApp({
        width: 390,
        height: 844,
    }, ({ element, openView }) => {
        const headers = [
            ["dashboard", ".dashboard-heading"],
            ["new-shift", ".form-header-card"],
            ["previous-shifts", ".history-page-heading"],
            ["settings", ".settings-page-header"],
        ];
        let expectedTop;

        headers.forEach(([view, selector]) => {
            openView(view);
            const heading = element(`#${view} h1`);
            const header = element(selector);

            expect(heading).toBeTruthy();
            expect(element(`#${view}`).querySelectorAll("h1")).toHaveLength(1);
            expect(element(`#${view} .view-heading`)).toBeTruthy();
            expect(heading.closest(".panel")).toBe(null);
            const [eyebrow, copy] = [".eyebrow", "p:not(.eyebrow)"].map((part) => element(`#${view} .view-heading ${part}`).getBoundingClientRect());
            expect(heading.getBoundingClientRect().top).toBeGreaterThan(eyebrow.top);
            expect(copy.top).toBeGreaterThan(heading.getBoundingClientRect().top);
            expect(Math.round(copy.left)).toBe(Math.round(eyebrow.left));
            if (expectedTop === undefined) {
                expectedTop = header.getBoundingClientRect().top;
            } else {
                expect(header.getBoundingClientRect().top).toBe(expectedTop);
            }
        });
    }));

    test("starts at the top when switching views", () => withApp({
        width: 390,
        height: 500,
    }, ({ win, element, openView }) => {
        win.scrollTo(0, 200);
        expect(win.scrollY).toBeGreaterThan(0);

        openView("settings");
        expect(win.scrollY).toBe(0);

        win.scrollTo(0, 200);
        element('.mobile-bottom-nav [data-view="dashboard"]').click();
        expect(win.scrollY).toBe(0);
    }));

    test("stacks dashboard summary stats as label-and-value rows on phones", () => withApp({
        width: 390,
        height: 844,
    }, ({ element, elements, doc, win }) => {
        const cards = elements("#dashboard .stat-card");
        const metrics = elements("#week-summary .period-metric");

        [cards, metrics].forEach((group) => {
            group.slice(1).forEach((item, index) => {
                expect(item.getBoundingClientRect().top).toBeGreaterThan(group[index].getBoundingClientRect().top);
                expect(item.getBoundingClientRect().left).toBe(group[index].getBoundingClientRect().left);
            });
            const label = group[0].querySelector("span").getBoundingClientRect();
            const value = group[0].querySelector("strong").getBoundingClientRect();
            expect(value.left).toBeGreaterThan(label.right - 1);
            expect(Math.abs(value.top - label.top)).toBeLessThanOrEqual(label.height);
        });
        expect(element("#week-summary").getBoundingClientRect().width).toBeGreaterThan(0);
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(win.innerWidth);
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
        expect(element("#form-title").closest(".panel")).toBe(null);
    }));

    test("flows the form in one vertical column on a wide screen", () => withApp({ width: 1400, height: 1000 }, ({ element, elements, openView }) => {
        openView("new-shift");

        const rect = (selector) => element(selector).getBoundingClientRect();
        const ids = [
            "shift-date", "shift-meal-period", "shift-job", "shift-clock-in", "shift-clock-out",
            "shift-break-start", "shift-break-end", "shift-baw-sales", "shift-food-sales",
            "shift-additional-sales", "shift-cc-tips", "shift-tip-out-paid",
        ];
        const lefts = ids.map((id) => rect(`#${id}`).left);

        ids.slice(1).forEach((id, index) => {
            expect(rect(`#${id}`).top).toBeGreaterThan(rect(`#${ids[index]}`).top);
        });
        expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThanOrEqual(60);
        expect(rect("#shift-form").width).toBeLessThanOrEqual(680);
        expect(elements("#shift-form fieldset").length).toBeGreaterThan(0);
    }));

    test("keeps workplace and role in their own card when workplace mode is enabled", () => withApp({
        workplaces: {
            version: 1,
            setupDismissed: true,
            workplaces: [{
                id: "wp-1",
                name: "Bistro",
                archived: false,
                roles: [{ id: "r-1", name: "Server", archived: false }],
            }],
        },
    }, ({ element, openView }) => {
        openView("new-shift");

        const generalCard = element("#shift-date").closest("fieldset");
        const workplaceCard = element("#shift-workplace-card");

        expect(workplaceCard.hidden).toBe(false);
        expect(workplaceCard.querySelector("legend").textContent).toBe("Workplace and role");
        expect(workplaceCard).not.toBe(generalCard);
        expect(generalCard.contains(element("#shift-job"))).toBe(true);
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
        expect(elements("#single-report-fields fieldset:first-child .sub-card")).toHaveLength(1);
        expect(top("#shift-food-sales")).toBeGreaterThan(top("#shift-baw-sales"));
        expect(top("#shift-liquor-sales")).toBeGreaterThan(top("#shift-food-sales"));
        expect(top("#shift-na-sales")).toBeGreaterThan(top("#shift-liquor-sales"));
        expect(top("#additional-sales-card-title")).toBeGreaterThan(top("#shift-na-sales"));
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
