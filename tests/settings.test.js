import { describe, expect, test } from "./assert.js";
import { contrastRatio, makeShift, withApp } from "./app-harness.js";

const styleOptions = [
    "minimalist",
    "material",
    "neo-brutalist",
    "cyberpunk",
    "glassmorphism",
    "skeuomorphic",
    "high-contrast",
];

describe("Settings page", () => {
    test("shows the preferences, work setup, and data cards", () => withApp(({ element, elements, openView }) => {
        openView("settings");

        expect(elements(".settings-card")).toHaveLength(3);
        expect(element("#work-setup-title").textContent).toBe("Jobs & roles");
        expect(element(".work-setup-flow").textContent.replace(/\s+/g, " ").trim())
            .toContain("Restaurants › Roles › Shift templates");
    }));
});

describe("Visual styles", () => {
    test("offers every style", () => withApp(({ element }) => {
        expect([...element("#setting-style").options].map((option) => option.value)).toEqual(styleOptions);
    }));

    test("applies and saves the Material light theme", () => withApp(({ doc, element, openView, change, style, rootStyleValue, savedSettings }) => {
        openView("settings");
        change("#setting-mode", "light");
        change("#setting-style", "material");

        expect(doc.documentElement.dataset.style).toBe("material");
        expect(doc.documentElement.dataset.theme).toBe("light");
        expect(rootStyleValue("--bg")).toBe("#e9e2d6");
        expect(style(element(".panel")).borderRadius).toBe("5px");
        expect(doc.querySelector('meta[name="theme-color"]').content).toBe("#6750a4");
        expect(savedSettings().visualStyle).toBe("material");
    }));

    test("applies and saves the Material dark theme", () => withApp(({ doc, openView, change, rootStyleValue, savedSettings }) => {
        openView("settings");
        change("#setting-style", "material");
        change("#setting-mode", "dark");

        expect(doc.documentElement.dataset.theme).toBe("dark");
        expect(rootStyleValue("--bg")).toBe("#171923");
        expect(doc.querySelector('meta[name="theme-color"]').content).toBe("#d0bcff");
        expect(savedSettings().colorMode).toBe("dark");
    }));

    test("keeps style and color mode independent", () => withApp(({ doc, element, openView, change, style, rootStyleValue }) => {
        openView("settings");
        change("#setting-style", "neo-brutalist");
        change("#setting-mode", "dark");

        expect(rootStyleValue("--bg")).toBe("#171717");
        expect(style(element(".panel")).borderRadius).toBe("4px");

        change("#setting-mode", "light");

        expect(rootStyleValue("--bg")).toBe("#fff4c2");
        expect(doc.querySelector('meta[name="theme-color"]').content).toBe("#efbd26");

        change("#setting-style", "minimalist");
        change("#setting-mode", "dark");

        expect(rootStyleValue("--bg")).toBe("#202124");
    }));

    test("defines colors for every style in light and dark modes", () => withApp(({ doc, openView, change, style, rootStyleValue }) => {
        openView("settings");

        for (const visualStyle of styleOptions) {
            change("#setting-style", visualStyle);
            for (const mode of ["light", "dark"]) {
                change("#setting-mode", mode);

                expect(doc.documentElement.dataset.style).toBe(visualStyle);
                expect(doc.documentElement.dataset.theme).toBe(mode);
                expect(style(doc.documentElement).colorScheme).toBe(mode);
                expect(rootStyleValue("--bg")).toBeTruthy();
                expect(doc.querySelector('meta[name="theme-color"]').content).toBeTruthy();
            }
        }
    }));

    test("keeps high-contrast text and buttons at AAA contrast", () => withApp(({ openView, change, rootStyleValue }) => {
        openView("settings");
        change("#setting-style", "high-contrast");

        for (const mode of ["light", "dark"]) {
            change("#setting-mode", mode);

            expect(contrastRatio(rootStyleValue("--text"), rootStyleValue("--bg"))).toBeGreaterThanOrEqual(7);
            expect(contrastRatio(rootStyleValue("--button-text"), rootStyleValue("--primary"))).toBeGreaterThanOrEqual(7);
        }

        change("#setting-mode", "dark");

        expect(rootStyleValue("--bg")).toBe("#000000");
        expect(rootStyleValue("--text")).toBe("#ffffff");
    }));

    test("follows the system when color mode is set to system", () => withApp(({ doc, openView, change, savedSettings }) => {
        openView("settings");
        change("#setting-mode", "dark");
        change("#setting-mode", "system");

        expect(doc.documentElement.hasAttribute("data-theme")).toBe(false);
        expect(savedSettings().colorMode).toBe("system");
    }));
});

describe("Currency", () => {
    test("changes how amounts are displayed and saves the choice", () => withApp({
        shifts: [makeShift({ foodSales: 325.5 })],
    }, ({ element, openView, change, savedSettings }) => {
        openView("settings");
        change("#setting-currency", "GBP");

        expect(element("#summary-total-sales").textContent).toBe("£325.50");
        expect(savedSettings().currency).toBe("GBP");
    }));
});

describe("Saved settings", () => {
    test("migrates legacy settings that predate color modes", () => withApp({
        settings: { theme: "neo-brutalist", weekStartsOn: "sunday", currency: "CAD" },
    }, ({ doc, element }) => {
        expect(doc.documentElement.dataset.style).toBe("neo-brutalist");
        expect(doc.documentElement.dataset.theme).toBe("light");
        expect(element("#setting-week-start").value).toBe("sunday");
        expect(element("#setting-currency").value).toBe("CAD");
    }));
});
