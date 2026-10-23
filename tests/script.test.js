import { expect, test } from "./assert.js";

const SHIFT_STORAGE_KEY = "shift-ledger-shifts-v1";
const SETTINGS_STORAGE_KEY = "shift-ledger-settings-v1";

test("brand uses the app icon and the mobile menu fits a standard phone viewport", async () => {
    const createAppFrame = async (width, height) => {
        const frame = document.createElement("iframe");
        frame.title = "Mobile menu layout test";
        frame.style.cssText = `position:fixed;left:-1300px;top:0;width:${width}px;height:${height}px;`;

        const loaded = new Promise((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error("The mobile layout test frame did not load.")), 10000);
            frame.addEventListener("load", () => {
                window.clearTimeout(timeout);
                resolve();
            }, { once: true });
        });
        frame.src = "../index.html";
        document.body.appendChild(frame);
        await loaded;
        await new Promise((resolve) => frame.contentWindow.requestAnimationFrame(() => (
            frame.contentWindow.requestAnimationFrame(resolve)
        )));
        return frame;
    };

    const standardFrame = await createAppFrame(390, 667);
    const compactFrame = await createAppFrame(320, 568);
    const shortFrame = await createAppFrame(320, 400);

    try {
        const app = standardFrame.contentDocument;
        expect(app.querySelector(".brand img").getAttribute("src")).toBe("assets/icons/icon.svg");
        expect(app.querySelector(".mobile-brand img").getAttribute("src")).toBe("assets/icons/icon.svg");
        expect(app.querySelector("#mobile-home").classList.contains("is-visible")).toBe(true);
        expect(app.documentElement.scrollHeight <= standardFrame.contentWindow.innerHeight).toBe(true);
        expect(compactFrame.contentDocument.documentElement.scrollHeight <= compactFrame.contentWindow.innerHeight)
            .toBe(true);
        expect(shortFrame.contentDocument.documentElement.scrollHeight <= shortFrame.contentWindow.innerHeight)
            .toBe(true);
        expect(shortFrame.contentDocument.querySelector(".app-shell").scrollHeight
            > shortFrame.contentDocument.querySelector(".app-shell").clientHeight).toBe(true);
        app.querySelector('.mobile-menu-button[data-view="dashboard"]').click();
        expect(app.querySelectorAll(".period-metric")).toHaveLength(8);
        expect(app.documentElement.scrollWidth <= standardFrame.contentWindow.innerWidth).toBe(true);
    } finally {
        standardFrame.remove();
        compactFrame.remove();
        shortFrame.remove();
    }
});

function contrastRatio(firstHex, secondHex) {
    const linearize = (channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (hex) => {
        const color = hex.replace("#", "");
        const channels = [0, 2, 4].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
        return channels.reduce((sum, channel, index) => (
            sum + linearize(channel) * [0.2126, 0.7152, 0.0722][index]
        ), 0);
    };
    const first = luminance(firstHex);
    const second = luminance(secondHex);
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test("app workflow validates, saves, edits, filters, and deletes shifts", async () => {
    const previousShifts = localStorage.getItem(SHIFT_STORAGE_KEY);
    const previousSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const frame = document.createElement("iframe");
    frame.title = "Shift Ledger app test";
    frame.style.cssText = "position:fixed;left:-1300px;top:0;width:1200px;height:1000px;";

    localStorage.removeItem(SHIFT_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);

    try {
        const loaded = new Promise((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error("The app test frame did not load.")), 10000);
            frame.addEventListener("load", () => {
                window.clearTimeout(timeout);
                resolve();
            }, { once: true });
        });
        frame.src = "../index.html";
        document.body.appendChild(frame);
        await loaded;

        const app = frame.contentDocument;
        const element = (selector) => {
            const found = app.querySelector(selector);
            if (!found) {
                throw new Error(`App test element not found: ${selector}`);
            }
            return found;
        };
        const enterShift = ({ date, job, sales, ccTips, cashTips, tipsPaidOut, tipOutReceived, notes }) => {
            element('.main-nav [data-view="new-shift"]').click();
            const values = {
                "shift-date": date,
                "shift-meal-period": "Dinner",
                "shift-job": job,
                "shift-clock-in": "16:00",
                "shift-clock-out": "22:00",
                "shift-food-sales": String(sales),
                "shift-cc-tips": String(ccTips),
                "shift-cash-tips": String(cashTips),
                "shift-tip-out-paid": String(tipsPaidOut),
                "shift-tip-out-received": String(tipOutReceived),
                "shift-notes": notes,
            };
            Object.entries(values).forEach(([id, value]) => {
                const field = app.getElementById(id);
                if (!field) {
                    throw new Error(`App test field not found: ${id}`);
                }
                field.value = value;
            });
            element("#shift-form").dispatchEvent(new frame.contentWindow.Event("submit", {
                bubbles: true,
                cancelable: true,
            }));
        };
        const savedShifts = () => JSON.parse(localStorage.getItem(SHIFT_STORAGE_KEY) || "[]");

        expect(element("#summary-total-shifts").textContent).toBe("0");

        element('.main-nav [data-view="new-shift"]').click();
        element("#shift-form").dispatchEvent(new frame.contentWindow.Event("submit", {
            bubbles: true,
            cancelable: true,
        }));
        expect(element("#form-status").textContent).toContain("Date is required.");
        expect(savedShifts()).toHaveLength(0);

        const notesWithMarkup = '<img src=x onerror="alert(1)">';
        enterShift({
            date: "2026-10-20",
            job: "Server",
            sales: 100,
            ccTips: 20,
            cashTips: 5,
            tipsPaidOut: 3,
            tipOutReceived: 2,
            notes: notesWithMarkup,
        });
        expect(element("#form-status").textContent).toBe("Shift saved.");
        expect(savedShifts()).toHaveLength(1);

        enterShift({
            date: "2026-10-21",
            job: "Expo",
            sales: 200,
            ccTips: 50,
            cashTips: 10,
            tipsPaidOut: 0,
            tipOutReceived: 0,
            notes: "Second shift",
        });
        expect(element("#summary-total-shifts").textContent).toBe("2");
        expect(element("#summary-total-sales").textContent).toBe("$300.00");
        expect(element("#summary-total-tips").textContent).toBe("$84.00");
        expect(savedShifts()).toHaveLength(2);
        element('.main-nav [data-view="dashboard"]').click();
        expect(app.querySelectorAll(".period-metric")).toHaveLength(8);
        expect(frame.contentWindow.getComputedStyle(element(".period-card")).gridTemplateColumns.split(" "))
            .toHaveLength(2);

        element('.main-nav [data-view="previous-shifts"]').click();
        expect(app.querySelectorAll(".shift-card")).toHaveLength(2);
        const serverCard = [...app.querySelectorAll(".shift-card")]
            .find((card) => card.querySelector(".card-job").textContent === "Server");
        expect(serverCard).toBeDefined();
        expect(frame.contentWindow.getComputedStyle(serverCard.querySelector(".shift-card-summary"))
            .gridTemplateColumns.split(" ")).toHaveLength(2);
        expect(serverCard.querySelectorAll(".card-primary-metrics p")).toHaveLength(4);
        expect(serverCard.querySelector(".card-notes").textContent).toBe(notesWithMarkup);
        expect(serverCard.querySelector(".card-notes img")).toBeNull();
        serverCard.querySelector(".edit-shift").click();
        expect(element("#form-title").textContent).toBe("Edit Shift");
        app.getElementById("shift-food-sales").value = "125.50";
        element("#shift-form").dispatchEvent(new frame.contentWindow.Event("submit", {
            bubbles: true,
            cancelable: true,
        }));
        expect(element("#summary-total-sales").textContent).toBe("$325.50");
        expect(savedShifts().find((shift) => shift.job === "Server").foodSales).toBe(125.5);

        element("#filter-job").value = "Expo";
        element("#filter-job").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.querySelectorAll(".shift-card")).toHaveLength(1);
        expect(element(".card-job").textContent).toBe("Expo");

        element('.main-nav [data-view="settings"]').click();
        expect(app.querySelectorAll(".settings-card")).toHaveLength(3);
        expect(element("#work-setup-title").textContent).toBe("Jobs & roles");
        expect(element(".work-setup-flow").textContent.replace(/\s+/g, " ").trim())
            .toContain("Restaurants › Roles › Shift templates");
        element("#setting-mode").value = "light";
        element("#setting-mode").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        element("#setting-style").value = "material";
        element("#setting-style").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.documentElement.dataset.style).toBe("material");
        expect(app.documentElement.dataset.theme).toBe("light");
        expect(frame.contentWindow.getComputedStyle(app.documentElement).getPropertyValue("--bg").trim())
            .toBe("#e9e2d6");
        expect(frame.contentWindow.getComputedStyle(element(".panel")).borderRadius).toBe("5px");
        expect(app.querySelector('meta[name="theme-color"]').content).toBe("#6750a4");
        expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)).visualStyle).toBe("material");

        element("#setting-mode").value = "dark";
        element("#setting-mode").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.documentElement.dataset.theme).toBe("dark");
        expect(frame.contentWindow.getComputedStyle(app.documentElement).getPropertyValue("--bg").trim())
            .toBe("#171923");
        expect(app.querySelector('meta[name="theme-color"]').content).toBe("#d0bcff");
        expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)).colorMode).toBe("dark");

        element("#setting-style").value = "neo-brutalist";
        element("#setting-style").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.documentElement.dataset.style).toBe("neo-brutalist");
        expect(frame.contentWindow.getComputedStyle(element(".panel")).borderRadius).toBe("4px");
        expect(frame.contentWindow.getComputedStyle(app.documentElement).getPropertyValue("--bg").trim())
            .toBe("#171717");

        element("#setting-mode").value = "light";
        element("#setting-mode").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.documentElement.dataset.theme).toBe("light");
        expect(frame.contentWindow.getComputedStyle(app.documentElement).getPropertyValue("--bg").trim())
            .toBe("#fff4c2");
        expect(app.querySelector('meta[name="theme-color"]').content).toBe("#efbd26");

        element("#setting-style").value = "minimalist";
        element("#setting-style").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        element("#setting-mode").value = "dark";
        element("#setting-mode").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.documentElement.dataset.style).toBe("minimalist");
        expect(app.documentElement.dataset.theme).toBe("dark");
        expect(frame.contentWindow.getComputedStyle(app.documentElement).getPropertyValue("--bg").trim())
            .toBe("#202124");

        const styleOptions = [
            "minimalist",
            "material",
            "neo-brutalist",
            "cyberpunk",
            "glassmorphism",
            "skeuomorphic",
            "high-contrast",
        ];
        expect([...element("#setting-style").options].map((option) => option.value)).toEqual(styleOptions);
        for (const style of styleOptions) {
            element("#setting-style").value = style;
            element("#setting-style").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
            for (const mode of ["light", "dark"]) {
                element("#setting-mode").value = mode;
                element("#setting-mode").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
                expect(app.documentElement.dataset.style).toBe(style);
                expect(app.documentElement.dataset.theme).toBe(mode);
                expect(frame.contentWindow.getComputedStyle(app.documentElement).colorScheme).toBe(mode);
                expect(frame.contentWindow.getComputedStyle(app.documentElement).getPropertyValue("--bg").trim())
                    .toBeTruthy();
                expect(app.querySelector('meta[name="theme-color"]').content).toBeTruthy();
                if (style === "high-contrast") {
                    const rootStyle = frame.contentWindow.getComputedStyle(app.documentElement);
                    expect(contrastRatio(
                        rootStyle.getPropertyValue("--text").trim(),
                        rootStyle.getPropertyValue("--bg").trim()
                    ) >= 7).toBe(true);
                    expect(contrastRatio(
                        rootStyle.getPropertyValue("--button-text").trim(),
                        rootStyle.getPropertyValue("--primary").trim()
                    ) >= 7).toBe(true);
                }
            }
        }

        element("#setting-style").value = "high-contrast";
        element("#setting-style").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(frame.contentWindow.getComputedStyle(app.documentElement).getPropertyValue("--bg").trim())
            .toBe("#000000");
        expect(frame.contentWindow.getComputedStyle(app.documentElement).getPropertyValue("--text").trim())
            .toBe("#ffffff");

        element("#setting-mode").value = "system";
        element("#setting-mode").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.documentElement.hasAttribute("data-theme")).toBe(false);
        expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)).colorMode).toBe("system");

        element("#setting-style").value = "material";
        element("#setting-style").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        element("#setting-mode").value = "light";
        element("#setting-mode").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));

        element("#setting-currency").value = "GBP";
        element("#setting-currency").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(element("#summary-total-sales").textContent).toBe("£325.50");
        expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)).currency).toBe("GBP");

        element('.main-nav [data-view="previous-shifts"]').click();
        element(".shift-card .delete-shift").click();
        expect(element("#summary-total-shifts").textContent).toBe("1");
        expect(element("#summary-total-sales").textContent).toBe("£125.50");
        expect(savedShifts()).toHaveLength(1);

        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
            theme: "neo-brutalist",
            weekStartsOn: "sunday",
            currency: "CAD",
        }));
        const migrationFrame = app.createElement("iframe");
        const migrated = new Promise((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error("Legacy settings test frame did not load.")), 10000);
            migrationFrame.addEventListener("load", () => {
                window.clearTimeout(timeout);
                resolve();
            }, { once: true });
        });
        migrationFrame.src = "../index.html";
        document.body.appendChild(migrationFrame);
        await migrated;
        expect(migrationFrame.contentDocument.documentElement.dataset.style).toBe("neo-brutalist");
        expect(migrationFrame.contentDocument.documentElement.dataset.theme).toBe("light");
        expect(migrationFrame.contentDocument.getElementById("setting-week-start").value).toBe("sunday");
        expect(migrationFrame.contentDocument.getElementById("setting-currency").value).toBe("CAD");
        migrationFrame.remove();
    } finally {
        frame.remove();
        if (previousShifts === null) {
            localStorage.removeItem(SHIFT_STORAGE_KEY);
        } else {
            localStorage.setItem(SHIFT_STORAGE_KEY, previousShifts);
        }
        if (previousSettings === null) {
            localStorage.removeItem(SETTINGS_STORAGE_KEY);
        } else {
            localStorage.setItem(SETTINGS_STORAGE_KEY, previousSettings);
        }
    }
});
