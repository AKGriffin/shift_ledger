import { describe, expect, test } from "./assert.js";
import { contrastRatio, makeShift, RECOVERY_STORAGE_KEY, withApp } from "./app-harness.js";

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
    test("shows the appearance, formats, dashboard, work setup, and data cards", () => withApp(({ element, elements, openView }) => {
        openView("settings");

        expect(elements(".settings-card")).toHaveLength(5);
        expect(element("#appearance-title").textContent).toBe("Appearance");
        expect(element("#formats-title").textContent).toBe("Formats & display");
        expect(element("#work-setup-title").textContent).toBe("Jobs & roles");
        expect(element("#dashboard-settings-title").textContent).toBe("Dashboard");
        expect(element("#export-csv").textContent).toBe("Download CSV");
        expect(element(".work-setup-flow").textContent.replace(/\s+/g, " ").trim())
            .toContain("Restaurants › Roles › Shift templates");
    }));

    test("labels every setting and links it to a hint", () => withApp(({ doc, elements, openView }) => {
        openView("settings");

        const selects = elements("#settings .settings-grid select");
        expect(selects).toHaveLength(5);
        selects.forEach((select) => {
            const hint = doc.getElementById(select.getAttribute("aria-describedby"));
            expect(hint.textContent.trim().length).toBeGreaterThan(0);
            expect(doc.querySelector(`label[for="${select.id}"]`).textContent.trim().length).toBeGreaterThan(0);
        });
    }));
});

describe("CSV export", () => {
    test("uses the exported date range and includes a single job when applicable", () => withApp({
        shifts: [
            makeShift({ date: "2026-10-22", job: "Server" }),
            makeShift({ date: "2026-10-20", job: "Server" }),
        ],
    }, ({ element, win, openView }) => {
        const anchorPrototype = win.HTMLAnchorElement.prototype;
        const originalClick = anchorPrototype.click;
        let filename;
        anchorPrototype.click = function captureDownload() {
            filename = this.download;
        };

        try {
            openView("settings");
            element("#export-csv").click();
        } finally {
            anchorPrototype.click = originalClick;
        }

        expect(filename).toBe("shift-ledger-shifts-2026-10-20-to-2026-10-22-server.csv");
    }));

    test("omits a job name for mixed-job exports and uses one date when appropriate", () => withApp({
        shifts: [
            makeShift({ date: "2026-10-21", job: "Server" }),
            makeShift({ date: "2026-10-21", job: "Expo" }),
        ],
    }, ({ element, win, openView }) => {
        const anchorPrototype = win.HTMLAnchorElement.prototype;
        const originalClick = anchorPrototype.click;
        let filename;
        anchorPrototype.click = function captureDownload() {
            filename = this.download;
        };

        try {
            openView("settings");
            element("#export-csv").click();
        } finally {
            anchorPrototype.click = originalClick;
        }

        expect(filename).toBe("shift-ledger-shifts-2026-10-21.csv");
    }));
});

describe("Dashboard customization", () => {
    test("saves section and stat choices from Settings and applies them across dashboard views", () => withApp({
        shifts: [makeShift({ foodSales: 125, ccTips: 24 })],
    }, ({ element, elements, openView, fire, savedSettings }) => {
        openView("settings");
        const recentToggle = element('.dashboard-settings-card [data-dashboard-option="section"][data-dashboard-key="recent"]');
        recentToggle.checked = false;
        fire(recentToggle, "change");
        const tipsToggle = element('.dashboard-settings-card [data-dashboard-option="stat"][data-dashboard-key="tips"]');
        tipsToggle.checked = false;
        fire(tipsToggle, "change");

        expect(savedSettings().dashboard.sections.recent).toBe(false);
        expect(savedSettings().dashboard.stats.tips).toBe(false);
        expect(element('#dashboard [data-dashboard-section="recent"]').hidden).toBe(true);
        expect(element("#summary-total-tips").closest(".stat-card").hidden).toBe(true);
        expect(elements(".period-metric")).toHaveLength(6);
        expect(elements(".recent-metric")).toHaveLength(1);
        expect(element('#dashboard-customize-dialog [data-dashboard-option="section"][data-dashboard-key="recent"]').checked).toBe(false);
        expect(element('#dashboard-customize-dialog [data-dashboard-option="stat"][data-dashboard-key="tips"]').checked).toBe(false);
    }));

    test("opens dashboard options and hides empty stat sections when all stats are disabled", () => withApp(({ element, fire, openView }) => {
        element("#open-dashboard-customize").click();
        expect(element("#dashboard-customize-dialog").open).toBe(true);
        const statToggle = element('#dashboard-customize-dialog [data-dashboard-option="stat"][data-dashboard-key="shifts"]');
        statToggle.checked = false;
        fire(statToggle, "change");
        for (const key of ["hours", "sales", "tips"]) {
            const toggle = element(`#dashboard-customize-dialog [data-dashboard-option="stat"][data-dashboard-key="${key}"]`);
            toggle.checked = false;
            fire(toggle, "change");
        }

        expect(element('#dashboard [data-dashboard-section="totals"]').hidden).toBe(true);
        expect(element('#dashboard [data-dashboard-section="periods"]').hidden).toBe(true);
        element("#done-dashboard-customize").click();
        openView("settings");
        expect(element('.dashboard-settings-card [data-dashboard-option="stat"][data-dashboard-key="shifts"]').checked).toBe(false);
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

describe("Data reliability", () => {
    const restore = async ({ doc, win, element, fire }, payload) => {
        win.confirm = () => true;
        const input = element("#backup-file");
        const transfer = new win.DataTransfer();
        transfer.items.add(new win.File([payload], "backup.json", { type: "application/json" }));
        input.files = transfer.files;
        fire(input, "change");
        await new Promise((resolve) => win.setTimeout(resolve, 100));
        return doc;
    };

    test("keeps a recovery copy and warns when stored data cannot be read", () => withApp({
        shifts: "{not json",
    }, ({ element }) => {
        expect(element("#form-status").hidden).toBe(false);
        expect(element("#form-status").textContent).toContain("could not be read");
        expect(localStorage.getItem(RECOVERY_STORAGE_KEY)).toBe("{not json");
    }));

    test("skips unreadable stored shifts, keeps valid ones and preserves the original", () => withApp({
        shifts: [makeShift({ job: "Expo" }), { id: 9, date: "bad" }],
    }, ({ element, savedShifts }) => {
        expect(element("#summary-total-shifts").textContent).toBe("1");
        expect(element("#form-status").textContent).toContain("1 saved shift was unreadable");
        expect(JSON.parse(localStorage.getItem(RECOVERY_STORAGE_KEY))).toHaveLength(2);
        expect(savedShifts()).toHaveLength(2);
    }));

    test("restores a valid backup and rejects invalid times or meal periods", () => withApp({
        shifts: [makeShift()],
    }, async (app) => {
        const { element, savedShifts, openView } = app;
        openView("settings");

        await restore(app, JSON.stringify({ shifts: [makeShift({ job: "Bar" }), makeShift({ job: "Host" })] }));
        expect(savedShifts()).toHaveLength(2);
        expect(element("#form-status").textContent).toContain("Restored 2 shifts");

        await restore(app, JSON.stringify([makeShift({ clockIn: "25:99" })]));
        expect(element("#form-status").textContent).toContain("missing valid required fields");
        expect(savedShifts()).toHaveLength(2);

        await restore(app, JSON.stringify([makeShift({ mealPeriod: "Brunch" })]));
        expect(element("#form-status").textContent).toContain("missing valid required fields");
        expect(savedShifts()).toHaveLength(2);
    }));

    test("gives duplicate ids in a backup unique ids", () => withApp(async (app) => {
        app.openView("settings");
        await restore(app, JSON.stringify([makeShift({ id: 5 }), makeShift({ id: 5, job: "Bar" })]));
        const ids = app.savedShifts().map((shift) => shift.id);
        expect(new Set(ids).size).toBe(2);
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
